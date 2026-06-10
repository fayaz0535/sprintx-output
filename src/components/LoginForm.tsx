```typescript
'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

interface FormErrors {
  email?: string;
  password?: string;
}

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string>('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });
    if (errors.email) {
      setErrors({ ...errors, email: undefined });
    }
    if (authError) {
      setAuthError('');
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, password: value });
    if (errors.password) {
      setErrors({ ...errors, password: undefined });
    }
    if (authError) {
      setAuthError('');
    }
  };

  const handleEmailBlur = () => {
    if (formData.email && !validateEmail(formData.email)) {
      setErrors({ ...errors, email: 'Please enter a valid email address' });
    }
  };

  const handlePasswordBlur = () => {
    if (!formData.password) {
      setErrors({ ...errors, password: 'Password is required' });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setAuthError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else if (response.status === 401) {
        setAuthError('Invalid email or password');
      } else if (response.status >= 500 || !response.ok) {
        setAuthError('Unable to connect. Please try again later');
      }
    } catch (error) {
      setAuthError('Unable to connect. Please try again later');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full max-w-[400px] mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827] mb-6">
            Login
          </h1>
        </div>

        {authError && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-[#FEE2E2] border border-[#DC2626] text-[#DC2626] px-4 py-3 rounded-lg text-sm"
          >
            {authError}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#111827] mb-2"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            disabled={isSubmitting}
            aria-label="Email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`w-full px-4 py-2 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-opacity-10 transition-colors ${
              errors.email
                ? 'border-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#D1D5DB] focus:border-[#4F46E5]'
            } ${
              isSubmitting
                ? 'bg-[#F3F4F6] cursor-not-allowed'
                : 'bg-white'
            }`}
          />
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="mt-2 text-sm text-[#DC2626]"
            >
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#111827] mb-2"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              disabled={isSubmitting}
              aria-label="Password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={`w-full px-4 py-2 pr-12 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-opacity-10 transition-colors ${
                errors.password
                  ? 'border-[#DC2626] focus:border-[#DC2626]'
                  : 'border-[#D1D5DB] focus:border-[#4F46E5]'
              } ${
                isSubmitting
                  ? 'bg-[#F3F4F6] cursor-not-allowed'
                  : 'bg-white'
              }`}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={isSubmitting}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] focus:outline-none focus:text-[#111827] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showPassword ? (
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
          {errors.password && (
            <p
              id="password-error"
              role="alert"
              className="mt-2 text-sm text-[#DC2626]"
            >
              {errors.password}
            </p>
          )}
        </div>

        <div className="text-right">
          <a
            href="/forgot-password"
            className="text-sm text-[#4F46E5] hover:text-[#4338CA] hover:underline focus:outline-none focus:underline focus:text-[#4338CA]"
          >
            Forgot Password?
          </a>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#4F46E5] text-white py-3 px-4 rounded-lg font-medium text-base hover:bg-[#4338CA] active:bg-[#3730A3] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-opacity-50 transition-all hover:scale-[1.02] active:scale-100 flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="