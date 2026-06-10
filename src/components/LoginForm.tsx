```typescript
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [apiError, setApiError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const redirectUrl = (router.query.redirect as string) || '/dashboard';
          router.replace(redirectUrl);
        }
      } catch (error) {
        // User not authenticated, continue to show login form
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError) {
      validateEmail(value);
    }
    setApiError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordError) {
      validatePassword(value);
    }
    setApiError('');
  };

  const handleTogglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError('');

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Successful login
      if (onSuccess) {
        onSuccess();
      }

      // Redirect to dashboard or original requested route
      const redirectUrl = (router.query.redirect as string) || '/dashboard';
      
      setTimeout(() => {
        router.push(redirectUrl);
      }, 500);

    } catch (error) {
      setApiError('Invalid email or password');
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push('/forgot-password');
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-[#111827] mb-6 text-center">
            Log In
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Input */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#111827] mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 text-base border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 ${
                  emailError
                    ? 'border-[#DC2626] bg-[#FEE2E2] focus:ring-[#DC2626] focus:border-[#DC2626]'
                    : 'border-[#D1D5DB] bg-[#FFFFFF] focus:ring-[#4F46E5] focus:ring-opacity-20 focus:border-[#4F46E5]'
                } ${
                  isLoading ? 'bg-[#F3F4F6] cursor-not-allowed' : ''
                }`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {emailError && (
                <p className="mt-2 text-sm text-[#991B1B]" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#111827] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  className={`w-full px-4 py-2 pr-12 text-base border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 ${
                    passwordError
                      ? 'border-[#DC2626] bg-[#FEE2E2] focus:ring-[#DC2626] focus:border-[#DC2626]'
                      : 'border-[#D1D5DB] bg-[#FFFFFF] focus:ring-[#4F46E5] focus:ring-opacity-20 focus:border-[#4F46E5]'
                  } ${
                    isLoading ? 'bg-[#F3F4F6] cursor-not-allowed' : ''
                  }`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={handleTogglePasswordVisibility}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#111827] focus:outline-none focus:text-[#111827] disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                >
                  {isPasswordVisible ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-2 text-sm text-[#991B1B]" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            {/* API Error */}
            {apiError && (
              <div className="mb-4 p-3 bg-[#FEE2E2] border border-[#DC2626] rounded-md">
                <p className="text-sm text-[#991B1B]" role="alert">
                  {apiError}
                </p>
              </div>
            )}

            {/* Forgot Password Link */}
            <div className="mb-6 text-right">
              <a
                href="/forgot-password"
                onClick={handleForgotPasswordClick}
                className="text-sm text-[#4F46E5] hover:text-[#