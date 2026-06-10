```typescript
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import EmailInput from './EmailInput';
import PasswordInput from './PasswordInput';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import PrimaryButton from './PrimaryButton';
import FormValidationMessage from './FormValidationMessage';
import AlertBanner from './AlertBanner';
import TextLink from './TextLink';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

interface AuthFormProps {
  mode: AuthMode;
  resetToken?: string;
  onSuccess?: () => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword?: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface PasswordStrength {
  level: 'weak' | 'medium' | 'strong';
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

const AuthForm: React.FC<AuthFormProps> = ({ mode, resetToken, onSuccess }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertType, setAlertType] = useState<'error' | 'success' | 'info'>('error');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const metRequirements = Object.values(requirements).filter(Boolean).length;
    let level: 'weak' | 'medium' | 'strong' = 'weak';

    if (metRequirements === 5) {
      level = 'strong';
    } else if (metRequirements >= 3) {
      level = 'medium';
    }

    return { level, requirements };
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    const strength = calculatePasswordStrength(password);
    if (!strength.requirements.hasUppercase || 
        !strength.requirements.hasLowercase || 
        !strength.requirements.hasNumber || 
        !strength.requirements.hasSpecial) {
      return 'Password must contain uppercase, lowercase, number, and special character';
    }
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  useEffect(() => {
    if (mode === 'register' || mode === 'reset-password') {
      if (formData.password) {
        setPasswordStrength(calculatePasswordStrength(formData.password));
      } else {
        setPasswordStrength(null);
      }
    }
  }, [formData.password, mode]);

  useEffect(() => {
    if (mode === 'reset-password' && resetToken) {
      verifyResetToken();
    }
  }, [mode, resetToken]);

  const verifyResetToken = async () => {
    try {
      const response = await fetch(`/api/auth/verify-reset-token?token=${resetToken}`);
      if (!response.ok) {
        setAlertMessage('Reset link expired. Please request a new one.');
        setAlertType('error');
        setTimeout(() => router.push('/auth/login'), 3000);
      }
    } catch (error) {
      setAlertMessage('Service temporarily unavailable. Please try again.');
      setAlertType('error');
    }
  };

  const handleChange = (field: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (alertMessage) {
      setAlertMessage('');
    }
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: keyof FormData) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  const validateField = (field: keyof FormData, value: string) => {
    let error: string | undefined;

    switch (field) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = (mode === 'register' || mode === 'reset-password') 
          ? validatePassword(value) 
          : !value ? 'Password is required' : undefined;
        if (mode === 'register' && formData.confirmPassword && touched.confirmPassword) {
          const confirmError = validateConfirmPassword(formData.confirmPassword, value);
          setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
        }
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(value, formData.password);
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    newErrors.email = validateEmail(formData.email);
    
    if (mode === 'login') {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
    } else if (mode === 'register' || mode === 'reset-password') {
      newErrors.password = validatePassword(formData.password);
      if (formData.confirmPassword !== undefined) {
        newErrors.confirmPassword = validateConfirmPassword(formData.confirmPassword, formData.password);
      }
    }

    setErrors(newErrors);
    setTouched({
      email: true,
      password: true,
      confirmPassword: mode === 'register' || mode === 'reset-password',
    });

    return !Object.values(newErrors).some(error => error !== undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot-password') {
      const emailError = validateEmail(formData.email);
      if (emailError) {
        setErrors({ email: emailError });
        setTouched({ email: true });
        return;
      }
    } else {
      if (!validateForm()) {
        return;
      }
    }

    setIsSubmitting(true);
    setAlertMessage('');

    try {
      let endpoint = '';
      let body: any = {};

      switch (mode) {
        case 'register':
          endpoint = '/api/auth/register';
          body = { email: formData.email, password: formData.password };
          break;
        case 'login':
          endpoint = '/api/auth/login';
          body = { email: formData.email, password: formData.password };
          break;
        case 'forgot-password':
          endpoint = '/api/auth/forgot-password';
          body = { email: formData.email };
          break;
        case 'reset-password':
          endpoint = '/api/auth/reset-password';
          body = { token: resetToken, password: formData.password };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && mode === 'register') {
          setAlertMessage('Email already registered');
        } else if (response.status === 401 && mode === 'login') {
          setAlertMessage('Invalid email or password');
        } else if (response.status === 400) {
          setAlertMessage(data.detail || 'Invalid request. Please check your input.');
        } else {
          setAlertMessage('Service temporarily unavailable. Please try again.');
        }
        setAlertType('error');
        return;
      }

      if (mode === 'register') {
        setAlertMessage('Account created successfully! Redirecting to login...');
        setAlertType('success');
        setTimeout(() => router.push('/auth/login'), 2000);
      } else if (mode === 'login') {
        setAlertMessage('Login successful! Redirecting...');
        setAlertType('success');
        if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => router.push('/dashboard'), 1000);
        }
      } else if (mode === 'forgot-password') {
        setAlertMessage('Password reset email sent. Please check your inbox.');
        setAlertType('success');
        setFormData({ email: '', password: '', confirmPassword: '' });
      } else if (mode === 'reset-password') {
        setAlertMessage('Password reset successful! Redirecting to login...');
        setAlertType('success');
        setTimeout(() => router.push('/auth/login'), 2000);
      }

    } catch (error) {
      setAlertMessage('Service temporarily unavailable. Please try again.');
      setAlertType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'register':
        return 'Create Account';
      case 'login':
        return 'Welcome Back';
      case 'forgot-password':
        return 'Reset Password';
      case 'reset-password':
        return 'Set New Password';
    }
  };

  const getButtonLabel = () => {
    switch (mode) {
      case 'register':
        return 'Create Account';
      case 'login':
        return 'Sign In';
      case 'forgot-password':
        return 'Send Reset Link';
      case 'reset-password':
        return 'Reset Password';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6 text-center">
        {getTitle()}
      </h1