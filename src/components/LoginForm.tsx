```typescript
import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void>;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
      if (onSubmit) {
        await onSubmit(email, password);
      } else {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            setGeneralError('Invalid email or password. Please try again.');
          } else {
            setGeneralError('An error occurred. Please try again.');
          }
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        
        // Store token if provided
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      }
    } catch (error) {
      setGeneralError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-8">
      <form
        onSubmit={handleSubmit}
        className="w-full"
        role="form"
        aria-label="Login form"
        noValidate
      >
        {/* Email Field */}
        <div className="mb-6">
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
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
              if (generalError) setGeneralError('');
            }}
            disabled={isLoading}
            autoComplete="email"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
            className={`w-full px-4 py-3 text-base rounded-lg border transition-all duration-150 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50 ${
              emailError
                ? 'border-red-600 border-2'
                : 'border-gray-300'
            } ${
              isLoading
                ? 'bg-gray-100 cursor-not-allowed'
                : 'bg-white'
            }`}
            style={{ fontSize: '16px' }}
          />
          {emailError && (
            <div
              id="email-error"
              role="alert"
              aria-live="polite"
              className="mt-2 text-sm text-red-600"
            >
              {emailError}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="mb-6">
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
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
                if (generalError) setGeneralError('');
              }}
              disabled={isLoading}
              autoComplete="current-password"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'password-error' : undefined}
              className={`w-full px-4 py-3 pr-12 text-base rounded-lg border transition-all duration-150 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50 ${
                passwordError
                  ? 'border-red-600 border-2'
                  : 'border-gray-300'
              } ${
                isLoading
                  ? 'bg-gray-100 cursor-not-allowed'
                  : 'bg-white'
              }`}
              style={{ fontSize: '16px' }}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
              tabIndex={0}
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                  aria-hidden="true"
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
                  aria-hidden="true"
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
            <div
              id="password-error"
              role="alert"
              aria-live="polite"
              className="mt-2 text-sm text-red-600"
            >
              {passwordError}
            </div>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-indigo-600 hover:text-indigo-800 underline focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50 rounded py-2 min-h-[44px]"
          >
            Forgot Password?
          </button>
        </div>

        {/* General Error Message */}
        {generalError && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600"
          >
            {generalError}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className={`w-full py-3 px-6 text-base font-semibold rounded-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-opacity-50 focus:ring-offset-2 min-h-[44px] flex items-center justify-center ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"