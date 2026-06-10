```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PasswordStrength {
  score: number;
  label: 'weak' | 'medium' | 'strong';
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'error' | 'success' | 'info'>('error');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'weak',
    requirements: {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecial: false,
    },
  });

  const validateEmail = (email: string): string => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
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
    let score = 0;
    let label: 'weak' | 'medium' | 'strong' = 'weak';

    if (metRequirements >= 5) {
      score = 100;
      label = 'strong';
    } else if (metRequirements >= 3) {
      score = 60;
      label = 'medium';
    } else {
      score = 30;
      label = 'weak';
    }

    return { score, label, requirements };
  };

  const validatePassword = (password: string): string => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    const strength = calculatePasswordStrength(password);
    if (!strength.requirements.hasUppercase || !strength.requirements.hasLowercase || 
        !strength.requirements.hasNumber || !strength.requirements.hasSpecial) {
      return 'Password must contain at least one uppercase, lowercase, number, and special character';
    }
    return '';
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return '';
  };

  useEffect(() => {
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    }
  }, [password]);

  useEffect(() => {
    if (touched.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    }
  }, [email, touched.email]);

  useEffect(() => {
    if (touched.password) {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  }, [password, touched.password]);

  useEffect(() => {
    if (touched.confirmPassword) {
      setErrors((prev) => ({ 
        ...prev, 
        confirmPassword: validateConfirmPassword(confirmPassword, password) 
      }));
    }
  }, [confirmPassword, password, touched.confirmPassword]);

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleInputChange = () => {
    if (alertMessage) {
      setAlertMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
    });

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword, password);

    setErrors({
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    if (emailError || passwordError || confirmPasswordError) {
      return;
    }

    setIsLoading(true);
    setAlertMessage('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setAlertType('error');
          setAlertMessage('Email already registered');
        } else if (response.status >= 500) {
          setAlertType('error');
          setAlertMessage('Service temporarily unavailable. Please try again.');
        } else {
          setAlertType('error');
          setAlertMessage(data.message || 'Registration failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      setAlertType('success');
      setAlertMessage('Account created successfully! Redirecting to login...');
      
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (error) {
      setAlertType('error');
      setAlertMessage('Service temporarily unavailable. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
              Create your account
            </h1>
            <p className="text-neutral-600 text-sm">
              Enter your details to get started
            </p>
          </div>

          {alertMessage && (
            <div
              className={`mb-6 p-4 rounded-md ${
                alertType === 'error'
                  ? 'bg-error_bg text-error'
                  : alertType === 'success'
                  ? 'bg-success_bg text-success'
                  : 'bg-neutral-100 text-neutral-900'
              }`}
              role="alert"
            >
              <div className="flex items-start">
                <span className="flex-1 text-sm font-medium">{alertMessage}</span>
                <button
                  onClick={() => setAlertMessage('')}
                  className="ml-2 text-current opacity-70 hover:opacity-100"
                  aria-label="Dismiss alert"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-900 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleInputChange();
                }}
                onBlur={() => handleBlur('email')}
                disabled={isLoading}
                autoComplete="email"
                className={`w-full px-4 py-2.5 rounded-md border ${
                  errors.email && touched.email
                    ? 'border-error focus:ring-error/20'
                    : 'border-neutral-200 focus:border-primary focus:ring-primary/20'
                } focus:outline-none focus:ring-4 transition-all disabled:bg-neutral-100 disabled:cursor-not-allowed`}
                aria-invalid={!!(errors.email && touched.email)}
                aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
              />
              {errors.email && touched.email && (
                <p
                  id="email-error"
                  className="mt-2 text-sm text-error"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-900 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange();
                  }}
                  onBlur={() => handleBlur('password')}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className={`w-full px-4 py-2.5 pr-12 rounded-md border ${
                    errors.password && touched.password
                      ? 'border-error focus:ring-error/20'
                      : 'border-neutral-200 focus:border-primary focus:ring-primary/20'
                  } focus:outline-none focus:ring-4 transition-all disabled:bg-neutral-100 disabled:cursor-not-allowed`}
                  aria-invalid={!!(errors.password && touched.password)}
                  aria-describedby={errors.password && touched.password ? 'password-error' : 'password-strength'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">