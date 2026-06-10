```typescript
import React, { useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/router';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

interface FormTouched {
  email: boolean;
  password: boolean;
}

const LoginForm: React.FC = () => {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({
    email: false,
    password: false,
  });
  const [showErrorToast, setShowErrorToast] = useState(false);

  const validateEmail = (value: string): string | undefined => {
    if (!value) {
      return 'Email is required';
    }
    // RFC 5322 simplified email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return 'Password is required';
    }
    return undefined;
  };

  const handleEmailBlur = useCallback(() => {
    setTouched(prev => ({ ...prev, email: true }));
    const error = validateEmail(email);
    setErrors(prev => ({ ...prev, email: error }));
  }, [email]);

  const handlePasswordBlur = useCallback(() => {
    setTouched(prev => ({ ...prev, password: true }));
    const error = validatePassword(password);
    setErrors(prev => ({ ...prev, password: error }));
  }, [password]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      const error = validateEmail(value);
      setErrors(prev => ({ ...prev, email: error }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      const error = validatePassword(value);
      setErrors(prev => ({ ...prev, password: error }));
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate all fields
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

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
          email,
          password,
          remember_me: rememberMe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setErrors({ general: 'Invalid email or password' });
          setShowErrorToast(true);
          setEmail('');
          setPassword('');
          setTouched({ email: false, password: false });
          
          setTimeout(() => {
            setShowErrorToast(false);
          }, 5000);
        } else if (response.status === 429) {
          setErrors({ general: 'Too many login attempts. Please try again later.' });
          setShowErrorToast(true);
          
          setTimeout(() => {
            setShowErrorToast(false);
          }, 5000);
        } else {
          throw new Error(data.message || 'An error occurred');
        }
        return;
      }

      // Successful login - redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
      setShowErrorToast(true);
      
      setTimeout(() => {
        setShowErrorToast(false);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push('/password-reset');
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      {/* Error Toast */}
      {showErrorToast && errors.general && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-md"
        >
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-red-800 font-medium text-sm">{errors.general}</span>
          <button
            onClick={() => setShowErrorToast(false)}
            className="ml-auto text-red-600 hover:text-red-800"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
            type="email"
            autoComplete="email"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            disabled={isLoading}
            className={`w-full px-4 py-3 border rounded-lg text-base font-normal bg-white transition-colors
              ${errors.email && touched.email
                ? 'border-red-600 focus:border-red-600 focus:ring-2 focus:ring-red-100'
                : 'border-gray-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
              }
              ${isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}
              focus:outline-none
            `}
            aria-invalid={errors.email && touched.email ? 'true' : 'false'}
            aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
          />
          {errors.email && touched.email && (
            <div
              id="email-error"
              role="alert"
              className="mt-2 flex items-center gap-2 text-red-600 text-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errors.email}</span>
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              disabled={isLoading}
              className={`w-full px-4 py-3 pr-12 border rounded-lg text-base font-normal bg-white transition-colors
                ${errors.password && touched.password
                  ? 'border-red-600 focus:border-red-600 focus:ring-2 focus:ring-red-100'
                  : 'border-gray-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                }
                ${isLoading ? 'bg-gray-50 cursor-not-allowed' : ''}
                focus:outline-none
              `}
              aria-invalid={errors.password && touched.password ? 'true' : 'false'}
              aria-describedby={errors.password && touched.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={handleTogglePasswordVisibility}
              disabled={isLoading}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 rounded p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.