```typescript
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError('');

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
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setGeneralError('Invalid email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (error) {
      setGeneralError('Invalid email or password. Please try again.');
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          role="form"
          aria-label="Login form"
          noValidate
        >
          {generalError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-4 rounded-lg bg-red-50 border border-red-200"
            >
              <p className="text-sm text-red-600">{generalError}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={emailError ? 'email-error' : undefined}
              className={`
                block w-full px-4 py-3 text-base rounded-lg border transition-all duration-150
                ${emailError 
                  ? 'border-red-600 border-2 focus:ring-red-500 focus:border-red-600' 
                  : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600'
                }
                ${isLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                shadow-sm focus:outline-none
              `}
              style={{ fontSize: '16px' }}
            />
            {emailError && (
              <p
                id="email-error"
                role="alert"
                aria-live="polite"
                className="mt-2 text-sm text-red-600"
              >
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-900 mb-2"
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
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                aria-invalid={passwordError ? 'true' : 'false'}
                aria-describedby={passwordError ? 'password-error' : undefined}
                className={`
                  block w-full px-4 py-3 pr-12 text-base rounded-lg border transition-all duration-150
                  ${passwordError 
                    ? 'border-red-600 border-2 focus:ring-red-500 focus:border-red-600' 
                    : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600'
                  }
                  ${isLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                  shadow-sm focus:outline-none
                `}
                style={{ fontSize: '16px' }}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                style={{ minWidth: '44px', minHeight: '44px' }}
                tabIndex={0}
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
            {passwordError && (
              <p
                id="password-error"
                role="alert"
                aria-live="polite"
                className="mt-2 text-sm text-red-600"
              >
                {passwordError}
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
              className={`
                w-full flex justify-center items-center px-6 py-3 text-base font-semibold rounded-lg
                transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                ${isLoading 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
                }
              `}
              style={{ minHeight: '44px' }}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    role="status"
                    aria-label="Loading"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/forgot-password"
              className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded py-2"
              style={{ minHeight: '44