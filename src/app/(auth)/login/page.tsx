```typescript
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginError {
  message: string;
  type?: 'error' | 'warning';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<LoginError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [showLockoutModal, setShowLockoutModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const verified = searchParams.get('verified');
    const resetSuccess = searchParams.get('reset');
    
    if (verified === 'true') {
      setSuccessMessage('Your email has been verified. You can now log in.');
    } else if (resetSuccess === 'true') {
      setSuccessMessage('Your password has been reset successfully. Please log in with your new password.');
    }
  }, [searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (lockoutTime && lockoutTime > 0) {
      interval = setInterval(() => {
        const remaining = Math.max(0, lockoutTime - Date.now());
        if (remaining === 0) {
          setLockoutTime(null);
          setShowLockoutModal(false);
          setGeneralError(null);
        } else {
          setLockoutTime(remaining);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lockoutTime]);

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    if (email.length > 254) return 'Email must be less than 254 characters';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    return undefined;
  };

  const handleInputChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'email' || field === 'password') {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    setGeneralError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          remember_me: formData.rememberMe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.locked_until) {
          const lockedUntil = new Date(data.locked_until).getTime();
          setLockoutTime(lockedUntil);
          setShowLockoutModal(true);
          setGeneralError({
            message: `Your account has been locked due to too many failed login attempts. Please try again in ${formatLockoutTime(lockedUntil - Date.now())}.`,
            type: 'error',
          });
        } else if (response.status === 403 && data.message?.includes('verify')) {
          setGeneralError({
            message: 'Please verify your email address before logging in.',
            type: 'warning',
          });
        } else if (response.status === 401) {
          setGeneralError({
            message: 'Invalid email or password. Please try again.',
            type: 'error',
          });
        } else {
          setGeneralError({
            message: data.message || 'An error occurred during login. Please try again.',
            type: 'error',
          });
        }
        setIsLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      router.push('/dashboard');
    } catch (error) {
      setGeneralError({
        message: 'Unable to connect to the server. Please check your connection and try again.',
        type: 'error',
      });
      setIsLoading(false);
    }
  };

  const formatLockoutTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setSuccessMessage('Verification email has been resent. Please check your inbox.');
        setGeneralError(null);
      }
    } catch (error) {
      console.error('Failed to resend verification email:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900">
          Sign in to your account
        </h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-md sm:rounded-lg sm:px-10">
          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-500"
                    aria-hidden="true"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    type="button"
                    onClick={() => setSuccessMessage(null)}
                    className="inline-flex text-green-800 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                    aria-label="Dismiss success message"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {generalError && (
            <div
              role="alert"
              aria-live="assertive"
              className={`mb-6 ${
                generalError.type === 'warning' ? 'bg-yellow-50 border-yellow-500' : 'bg-red-50 border-red-500'
              } border-l-4 p-4 rounded`}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className={`h-5 w-5 ${generalError.type === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}
                    aria-hidden="true"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`text-sm ${generalError.type === 'warning' ? 'text-yellow-900' : 'text-red-800'}`}>
                    {generalError.message}
                  </p>
                  {generalError.type === 'warning' && formData.email && (
                    <button
                      type="button"
                      onClick={handle