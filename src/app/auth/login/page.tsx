```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError('');
    setFormError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setFormError('');

    // Validate email format
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!email || !password) {
      setFormError('Please enter both email and password');
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
        if (response.status === 423) {
          // Account locked
          setFormError(data.message || 'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.');
        } else if (response.status === 401) {
          // Invalid credentials
          setFormError('Invalid email or password');
        } else {
          setFormError(data.message || 'An error occurred during login');
        }
        return;
      }

      // Store token (in httpOnly cookie via backend or localStorage)
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      setFormError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-[#D1D5DB] px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[32px] leading-[40px] font-bold text-[#111827] mb-2">
              Welcome back
            </h1>
            <p className="text-[16px] leading-[24px] text-[#6B7280]">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="mb-6 p-4 bg-[#FEE2E2] border border-[#DC2626] rounded-md">
              <p className="text-[14px] leading-[20px] text-[#DC2626] font-medium">
                {formError}
              </p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Email Input */}
            <div className="mb-6">
              <label 
                htmlFor="email" 
                className="block text-[14px] leading-[20px] font-medium text-[#111827] mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                disabled={isLoading}
                className={`w-full px-4 py-2 text-[16px] leading-[24px] border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                  emailError
                    ? 'border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]'
                    : 'border-[#D1D5DB] focus:ring-[#4F46E5] focus:border-[#4F46E5]'
                } ${isLoading ? 'bg-[#F3F4F6] cursor-not-allowed' : 'bg-white'}`}
                placeholder="Enter your email"
                autoComplete="email"
              />
              {emailError && (
                <p className="mt-2 text-[12px] leading-[16px] text-[#DC2626]">
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <label 
                htmlFor="password" 
                className="block text-[14px] leading-[20px] font-medium text-[#111827] mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  className={`w-full px-4 py-2 pr-12 text-[16px] leading-[24px] border border-[#D1D5DB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] transition-colors ${
                    isLoading ? 'bg-[#F3F4F6] cursor-not-allowed' : 'bg-white'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] focus:outline-none disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 text-[16px] leading-[24px] font-medium text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4F46E5] ${
                isLoading
                  ? 'bg-[#4F46E5] opacity-50 cursor-not-allowed'
                  : 'bg-[#4F46E5] hover:bg-[#4338CA]'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-[14px] leading-[20px] text-[#6B7280]">
              Don't have an account?{' '}
              <Link 
                href="/auth/register" 
                className="text-[#4F46E5] hover:text-[#4338CA] font-medium focus:outline-none focus:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```
```