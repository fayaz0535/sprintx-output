```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';

interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  {
    id: 'length',
    label: '8+ characters',
    test: (password: string) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Uppercase A-Z',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'Lowercase a-z',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'Number 0-9',
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: 'special',
    label: 'Special !@#$%',
    test: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onError }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

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

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    const unmetRequirements = passwordRequirements.filter(req => !req.test(password));
    if (unmetRequirements.length > 0) {
      return 'Password does not meet requirements';
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

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    const newErrors: FormErrors = { ...errors };
    
    if (field === 'email') {
      newErrors.email = validateEmail(formData.email);
    } else if (field === 'password') {
      newErrors.password = validatePassword(formData.password);
      if (touched.confirmPassword) {
        newErrors.confirmPassword = validateConfirmPassword(formData.confirmPassword, formData.password);
      }
    } else if (field === 'confirmPassword') {
      newErrors.confirmPassword = validateConfirmPassword(formData.confirmPassword, formData.password);
    }
    
    setErrors(newErrors);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (touched[field]) {
      const newErrors: FormErrors = { ...errors };
      
      if (field === 'email') {
        newErrors.email = validateEmail(value);
      } else if (field === 'password') {
        newErrors.password = validatePassword(value);
        if (touched.confirmPassword) {
          newErrors.confirmPassword = validateConfirmPassword(formData.confirmPassword, value);
        }
      } else if (field === 'confirmPassword') {
        newErrors.confirmPassword = validateConfirmPassword(value, formData.password);
      }
      
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.confirmPassword, formData.password),
    };
    
    setErrors(newErrors);
    setTouched({ email: true, password: true, confirmPassword: true });
    
    return !newErrors.email && !newErrors.password && !newErrors.confirmPassword;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409 || data.message?.includes('already')) {
          setErrors({ general: 'Email already registered' });
          onError?.('Email already registered');
        } else {
          setErrors({ general: data.message || 'Registration failed. Please try again.' });
          onError?.(data.message || 'Registration failed');
        }
        return;
      }
      
      onSuccess?.();
      router.push('/login?registered=true');
    } catch (error) {
      const errorMessage = 'An error occurred. Please try again.';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (): 'empty' | 'weak' | 'medium' | 'strong' => {
    if (!formData.password) return 'empty';
    
    const metRequirements = passwordRequirements.filter(req => req.test(formData.password)).length;
    
    if (metRequirements <= 2) return 'weak';
    if (metRequirements <= 4) return 'medium';
    return 'strong';
  };

  const strength = getPasswordStrength();
  const strengthColors = {
    empty: 'bg-gray-200',
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-sm text-gray-600">Sign up to get started</p>
        </div>

        {errors.general && (
          <div
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start"
            role="alert"
            aria-live="polite"
          >
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-red-800">{errors.general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              disabled={isSubmitting}
              autoComplete="email"
              className={`w-full px-4 py-2.5 text-base border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                errors.email && touched.email
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              aria-invalid={!!(errors.email && touched.email)}
              aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
              aria-required="true"
            />
            {errors.email && touched.email && (
              <p
                id="email-error"
                className="mt-2 text-sm text-red-600 flex items-center"
                role="alert"
              >
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"