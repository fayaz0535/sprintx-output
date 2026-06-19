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
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
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
    setSubmitError('');

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
            throw new Error('Invalid email or password. Please try again.');
          }
          throw new Error('An error occurred. Please try again.');
        }

        const data = await response.json();
        
        // Store session token if needed
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }

        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-8">
      <form 
        onSubmit={handleSubmit}
        role="form"
        aria-label="Login form"
        className="space-y-6"
        noValidate
      >
        {/* Email Input */}
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
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
              if (submitError) setSubmitError('');
            }}
            disabled={isLoading}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
            className={`
              w-full px-4 py-3 text-base rounded-lg border transition-all duration-150
              ${emailError 
                ? 'border-red-600 border-2 focus:ring-red-600 focus:border-red-600' 
                : 'border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600'
              }
              ${isLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              shadow-sm focus:outline-none
            `}
            placeholder=""
          />
          {emailError && (
            <div 
              id="email-error"
              role="alert"
              aria-live="polite"
              className="mt-2 text-sm text-red-600 flex items-start gap-1"
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{emailError}</span>
            </div>
          )}
        </div>

        {/* Password Input */}
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
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
                if (submitError) setSubmitError('');
              }}
              disabled={isLoading}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'password-error' : undefined}
              className={`
                w-full px-4 py-3 pr-12 text-base rounded-lg border transition-all duration-150
                ${passwordError 
                  ? 'border-red-600 border-2 focus:ring-red-600 focus:border-red-600' 
                  : 'border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600'
                }
                ${isLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                shadow-sm focus:outline-none
              `}
              placeholder=""
            />
            <button
              type="button"
              onClick={handleTogglePasswordVisibility}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
              tabIndex={0}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {passwordError && (
            <div 
              id="password-error"
              role="alert"
              aria-live="polite"
              className="mt-2 text-sm text-red-600 flex items-start gap-1"
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{passwordError}</span>
            </div>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-indigo-600 hover:text-indigo-800 underline focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded py-2 min-h-[44px] transition-colors duration-150"
          >
            Forgot Password?
          </button>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div 
            role="alert"
            aria-live="polite"
            className="p-3 text-sm text-red-600 bg-red-50 rounded-lg flex items-