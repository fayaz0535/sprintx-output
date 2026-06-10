```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PasswordRequirement {
  id: string;
  label: string;
  validator: (password: string) => boolean;
  met: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    {
      id: 'minLength',
      label: 'At least 8 characters',
      validator: (pwd: string) => pwd.length >= 8,
      met: false,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      validator: (pwd: string) => /[A-Z]/.test(pwd),
      met: false,
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      validator: (pwd: string) => /[a-z]/.test(pwd),
      met: false,
    },
    {
      id: 'number',
      label: 'One number',
      validator: (pwd: string) => /\d/.test(pwd),
      met: false,
    },
    {
      id: 'special',
      label: 'One special character',
      validator: (pwd: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      met: false,
    },
  ]);

  useEffect(() => {
    if (password) {
      const updatedRequirements = requirements.map((req) => ({
        ...req,
        met: req.validator(password),
      }));
      setRequirements(updatedRequirements);
    } else {
      setRequirements(requirements.map((req) => ({ ...req, met: false })));
    }
  }, [password]);

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

  const validatePassword = (): boolean => {
    const allRequirementsMet = requirements.every((req) => req.met);
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (!allRequirementsMet) {
      setPasswordError('Password does not meet all requirements');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handlePasswordFocus = () => {
    setShowRequirements(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword();

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if email already exists
      const checkResponse = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        if (checkResponse.status === 409) {
          setEmailError('This email is already registered');
          setIsSubmitting(false);
          return;
        }
      }

      // Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setEmailError('This email is already registered');
        } else {
          setFormError(errorData.message || 'Registration failed. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to login with success message
      router.push('/auth/login?registered=true');
    } catch (error) {
      setFormError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const allRequirementsMet = requirements.every((req) => req.met);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-[#D1D5DB] p-8">
          <div className="mb-8">
            <h1 className="text-[32px] leading-[40px] font-bold text-[#111827] mb-2">
              Create an account
            </h1>
            <p className="text-[16px] leading-[24px] text-[#6B7280]">
              Get started with your free account
            </p>
          </div>

          {formError && (
            <div className="mb-6 p-4 bg-[#FEE2E2] border border-[#DC2626] rounded-md">
              <p className="text-[14px] leading-[20px] text-[#DC2626]">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-6">
              <label
                htmlFor="email"
                className="block text-[14px] leading-[20px] font-medium text-[#111827] mb-2"
              >
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                  if (formError) setFormError('');
                }}
                onBlur={handleEmailBlur}
                disabled={isSubmitting}
                className={`w-full px-4 py-2 text-[16px] leading-[24px] border rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5] transition-colors ${
                  emailError
                    ? 'border-[#DC2626] bg-[#FEE2E2]'
                    : 'border-[#D1D5DB] bg-white'
                } ${isSubmitting ? 'bg-[#F3F4F6] cursor-not-allowed' : ''}`}
                placeholder="you@example.com"
              />
              {emailError && (
                <p className="mt-2 text-[12px] leading-[16px] text-[#DC2626]">
                  {emailError}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-[14px] leading-[20px] font-medium text-[#111827] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                    if (formError) setFormError('');
                  }}
                  onFocus={handlePasswordFocus}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-2 pr-12 text-[16px] leading-[24px] border rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5] transition-colors ${
                    passwordError
                      ? 'border-[#DC2626] bg-[#FEE2E2]'
                      : 'border-[#D1D5DB] bg-white'
                  } ${isSubmitting ? 'bg-[#F3F4F6] cursor-not-allowed' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064