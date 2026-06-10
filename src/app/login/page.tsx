```typescript
'use client';

import { useState, FormEvent, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Validation helper
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Types
interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({ email: false, password: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Auto-dismiss toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password]);

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    if (!email) {
      setErrors((prev) => ({ ...prev, email: 'Email is required' }));
    } else if (!validateEmail(email)) {
      setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
    } else {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    if (!password) {
      setErrors((prev) => ({ ...prev, password: 'Password is required' }));
    } else {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          remember_me: rememberMe,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Successful login - redirect to dashboard within 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        // Failed login - clear fields and show error
        setEmail('');
        setPassword('');
        setTouched({ email: false, password: false });
        setToastMessage('Invalid email or password');
        setShowToast(true);
      }
    } catch (error) {
      setEmail('');
      setPassword('');
      setTouched({ email: false, password: false });
      setToastMessage('Invalid email or password');
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {showToast && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg shadow-md px-4 py-3 flex items-center gap-3 animate-fade-in"
        >
          <svg
            className="w-5 h-5 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium text-red-800">{toastMessage}</span>
          <button
            onClick={() => setShowToast(false)}
            className="ml-2 text-red-600 hover:text-red-800"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-semibold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) {
                    if (!e.target.value) {
                      setErrors((prev) => ({ ...prev, email: 'Email is required' }));
                    } else if (!validateEmail(e.target.value)) {
                      setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
                    } else {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }
                }}
                onBlur={handleEmailBlur}
                disabled={isSubmitting}
                className={`
                  appearance-none relative block w-full px-3 py-2 border rounded-md
                  text-gray-900 placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 focus:z-10
                  sm:text-sm transition-colors
                  ${errors.email && touched.email ? 'border-red-600 bg-red-50' : 'border-gray-300 bg-white'}
                  ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}
                `}
                placeholder="you@example.com"
                aria-invalid={errors.email && touched.email ? 'true' : 'false'}
                aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
              />
              {errors.email && touched.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) {
                      if (!e.target.value) {
                        setErrors((prev) => ({ ...prev, password: 'Password is required' }));
                      } else {
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }
                  }}
                  onBlur={handlePasswordBlur}
                  disabled={isSubmitting}
                  className={`
                    appearance-none relative block w-full px-3 py-2 pr-10 border rounded-md
                    text-gray-900 placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 focus:z-10
                    sm:text-sm transition-colors
                    ${errors.password && touched.password ? 'border-red-600 bg-red-50' : 'border-gray-300 bg-white'}
                    ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}
                  `}
                  placeholder="••••••••"
                  aria-invalid={errors.password &&