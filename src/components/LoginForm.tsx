```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';

interface LoginFormProps {
  onSubmit?: (email: string, password: string, rememberMe: boolean) => Promise<void>;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Email is required';
    }
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

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    const emailError = validateEmail(email);
    setErrors(prev => ({ ...prev, email: emailError }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    const passwordError = validatePassword(password);
    setErrors(prev => ({ ...prev, password: passwordError }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ email: true, password: true });
    
    // Validate all fields
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    const newErrors: FormErrors = {};
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    
    // Don't submit if there are validation errors
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      if (onSubmit) {
        await onSubmit(email, password, rememberMe);
      } else {
        // Default API call
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
        
        if (!response.ok) {
          const data = await response.json();
          setErrors({ general: data.message || 'Invalid email or password' });
          return;
        }
        
        const data = await response.json();
        
        // Store tokens
        if (rememberMe) {
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
        } else {
          sessionStorage.setItem('access_token', data.access_token);
          sessionStorage.setItem('refresh_token', data.refresh_token);
        }
        
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      setErrors({ general: 'Invalid email or password' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 sm:p-8" noValidate>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
          Sign In
        </h1>
        
        {errors.general && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start"
          >
            <svg
              className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-red-800">{errors.general}</span>
          </div>
        )}
        
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email <span className="text-red-600">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            disabled={isSubmitting}
            className={`
              w-full px-4 py-2.5 text-base border rounded-md
              focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              transition-colors
              ${errors.email && touched.email ? 'border-red-600 bg-red-50' : 'border-gray-300'}
              ${!errors.email && touched.email ? 'border-green-500' : ''}
            `}
            placeholder="you@example.com"
            aria-invalid={errors.email && touched.email ? 'true' : 'false'}
            aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
          />
          {errors.email && touched.email && (
            <div
              id="email-error"
              role="alert"
              className="mt-2 flex items-start"
            >
              <svg
                className="w-4 h-4 text-red-600 mr-1.5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-red-600">{errors.email}</span>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Password <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handlePasswordBlur}
              disabled={isSubmitting}
              className={`
                w-full px-4 py-2.5 pr-12 text-base border rounded-md
                focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent
                disabled:bg-gray-100 disabled:cursor-not-allowed
                transition-colors
                ${errors.password && touched.password ? 'border-red-600 bg-red-50' : 'border-gray-300'}
                ${!errors.password && touched.password ? 'border-green-500' : ''}
              `}
              placeholder="••••••••"
              aria-invalid={errors.password && touched.password ? 'true' : 'false'}
              aria-describedby={errors.password && touched.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.543 7-1.84 0-3.516-.476-4.992-1.314" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">