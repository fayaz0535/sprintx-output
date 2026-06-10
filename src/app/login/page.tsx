```tsx
'use client';

import { useState, FormEvent, useCallback } from 'react';
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
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (generalError) setGeneralError('');
    if (emailTouched) {
      validateEmail(value);
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (generalError) setGeneralError('');
    if (passwordTouched) {
      validatePassword(value);
    }
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    validatePassword(password);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setEmailTouched(true);
    setPasswordTouched(true);
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);
    setGeneralError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else if (response.status === 401) {
        setGeneralError('Invalid email or password');
      } else if (response.status >= 500) {
        setGeneralError('Unable to connect. Please try again later');
      } else {
        setGeneralError('Unable to connect. Please try again later');
      }
    } catch (error) {
      setGeneralError('Unable to connect. Please try again later');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h1 className="text-[24px] font-semibold text-[#111827] leading-[1.5]">
            Sign in to your account
          </h1>
        </div>

        {generalError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 p-4 bg-[#FEE2E2] border border-[#DC2626] rounded-[8px]"
          >
            <p className="text-[14px] text-[#DC2626] leading-[1.5]">
              {generalError}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-6">
            <label
              htmlFor="email"
              className="block text-[14px] font-medium text-[#111827] mb-2 leading-[1.5]"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              disabled={isLoading}
              aria-label="Email address"
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={emailError ? 'email-error' : undefined}
              className={`w-full px-4 py-3 text-[16px] border rounded-[8px] leading-[1.5] transition-colors
                ${emailError ? 'border-[#DC2626] focus:border-[#DC2626]' : 'border-[#D1D5DB] focus:border-[#4F46E5]'}
                ${isLoading ? 'bg-[#F3F4F6] cursor-not-allowed' : 'bg-white'}
                focus:outline-none focus:ring-[3px] focus:ring-[rgba(79,70,229,0.1)]
                disabled:bg-[#F3F4F6] disabled:text-[#6B7280]`}
            />
            {emailError && (
              <p
                id="email-error"
                role="alert"
                className="mt-2 text-[14px] text-[#DC2626] leading-[1.5]"
              >
                {emailError}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-[14px] font-medium text-[#111827] mb-2 leading-[1.5]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                disabled={isLoading}
                aria-label="Password"
                aria-invalid={passwordError ? 'true' : 'false'}
                aria-describedby={passwordError ? 'password-error' : undefined}
                className={`w-full px-4 py-3 pr-12 text-[16px] border rounded-[8px] leading-[1.5] transition-colors
                  ${passwordError ? 'border-[#DC2626] focus:border-[#DC2626]' : 'border-[#D1D5DB] focus:border-[#4F46E5]'}
                  ${isLoading ? 'bg-[#F3F4F6] cursor-not-allowed' : 'bg-white'}
                  focus:outline-none focus:ring-[3px] focus:ring-[rgba(79,70,229,0.1)]
                  disabled:bg-[#F3F4F6] disabled:text-[#6B7280]`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6B7280] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] rounded disabled:opacity-60"
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
              <p
                id="password-error"
                role="alert"
                className="mt-2 text-[14px] text-[#DC2626] leading-[1.5]"
              >
                {passwordError}
              </p>
            )}
          </div>

          <div className="mb-6">
            <a
              href="/forgot-password"
              className="text-[14px] text-[#4F46E5] hover:text-[#4338CA] underline focus:outline-none focus:ring-2 focus:ring-[#4F46E5] rounded leading-[1.5]"
            >
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 text-[16px] font-medium text-white bg-[#4F46E5] rounded-[8px] leading-[1.5]
              hover:bg-[#4338CA] active:bg-[#3730A3] 
              disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-[3px] focus:ring-[rgba(79,70,229,0.1)]
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3