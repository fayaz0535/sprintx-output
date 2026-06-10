```typescript
import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onSubmit, 
  isLoading: externalLoading, 
  errorMessage: externalError 
}) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const loading = externalLoading ?? isLoading;
  const error = externalError ?? formError;

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('');
      return true;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailTouched) {
      validateEmail(value);
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setEmailTouched(true);

    if (!validateEmail(email)) {
      return;
    }

    if (!email || !password) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);

      if (onSubmit) {
        await onSubmit(email, password);
      } else {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Invalid email or password');
        }

        const data = await response.json();
        
        if (data.token) {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/password-reset');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8 text-center">
          Login
        </h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-6">
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder="Enter your email"
              disabled={loading}
              autoFocus
              className={`w-full px-4 py-2.5 rounded-md border text-base transition-colors
                ${emailError 
                  ? 'border-red-600 focus:border-red-600 focus:ring-red-100' 
                  : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-100'
                }
                ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                focus:outline-none focus:ring-4
                disabled:bg-gray-100 disabled:cursor-not-allowed
              `}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p 
                id="email-error" 
                className="mt-2 text-sm text-red-800"
                role="alert"
              >
                {emailError}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                disabled={loading}
                className={`w-full px-4 py-2.5 pr-12 rounded-md border text-base transition-colors
                  border-gray-300 focus:border-indigo-600 focus:ring-indigo-100
                  ${loading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                  focus:outline-none focus:ring-4
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                `}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 rounded p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2} 
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
                    strokeWidth={2} 
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
          </div>

          <div className="mb-6 text-right">
            <a
              href="/password-reset"
              onClick={handleForgotPasswordClick}
              className="text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none focus:underline transition-colors"
            >
              Forgot password?
            </a>
          </div>

          {error && (
            <div 
              className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md"
              role="alert"
            >
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!emailError}
            className={`w-full py-3 px-4 rounded-md text-base font-medium text-white transition-all
              ${loading || emailError
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:bg-indigo-800 active:bg-indigo-800'
              }
              focus:outline-none focus:ring-4 focus:ring-indigo-100
              disabled:bg-gray-400 disabled:cursor-not-allowed
              flex items-center justify-center
            `}
          >
            {loading ? (
              <>
                <svg 
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.