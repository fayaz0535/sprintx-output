```typescript
import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';

interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  submit?: string;
}

interface TouchedFields {
  email: boolean;
  password: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const router = useRouter();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({
    email: false,
    password: false,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    return undefined;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData(prev => ({ ...prev, email }));
    
    if (touched.email) {
      const emailError = validateEmail(email);
      setErrors(prev => ({ ...prev, email: emailError, submit: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData(prev => ({ ...prev, password }));
    
    if (touched.password) {
      const passwordError = validatePassword(password);
      setErrors(prev => ({ ...prev, password: passwordError, submit: undefined }));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    const emailError = validateEmail(formData.email);
    setErrors(prev => ({ ...prev, email: emailError }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    const passwordError = validatePassword(formData.password);
    setErrors(prev => ({ ...prev, password: passwordError }));
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, rememberMe: e.target.checked }));
  };

  const handleTogglePassword = () => {
    setShowPassword(prev => !prev);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ email: true, password: true });
    
    // Validate all fields
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    
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
          email: formData.email,
          password: formData.password,
          remember_me: formData.rememberMe,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          setErrors({ submit: 'Invalid email or password' });
          onError?.('Invalid email or password');
        } else {
          setErrors({ submit: data.message || 'An error occurred. Please try again.' });
          onError?.(data.message || 'An error occurred. Please try again.');
        }
        setIsLoading(false);
        return;
      }
      
      // Store tokens
      if (formData.rememberMe) {
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
      } else {
        sessionStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          sessionStorage.setItem('refresh_token', data.refresh_token);
        }
      }
      
      onSuccess?.();
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
      
    } catch (error) {
      setErrors({ submit: 'An error occurred. Please try again.' });
      onError?.('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push('/forgot-password');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6" noValidate>
      {/* Email Field */}
      <div className="space-y-2">
        <label 
          htmlFor="email" 
          className="block text-base font-medium text-[#111827]"
        >
          Email <span className="text-[#DC2626]">*</span>
        </label>
        <div className="relative">
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            disabled={isLoading}
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`
              w-full px-4 py-2 text-base font-normal text-[#111827] bg-white border rounded-md
              transition-all duration-200 outline-none
              placeholder:text-[#9CA3AF]
              disabled:bg-[#F3F4F6] disabled:opacity-60 disabled:cursor-not-allowed
              ${errors.email 
                ? 'border-[#DC2626] focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2' 
                : 'border-[#D1D5DB] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2'
              }
            `}
            placeholder="you@example.com"
          />
        </div>
        {errors.email && (
          <p 
            id="email-error" 
            role="alert" 
            className="mt-1 text-sm font-normal text-[#DC2626]"
          >
            {errors.email}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label 
          htmlFor="password" 
          className="block text-base font-medium text-[#111827]"
        >
          Password <span className="text-[#DC2626]">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={formData.password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            disabled={isLoading}
            required
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={`
              w-full px-4 py-2 pr-12 text-base font-normal text-[#111827] bg-white border rounded-md
              transition-all duration-200 outline-none
              placeholder:text-[#9CA3AF]
              disabled:bg-[#F3F4F6] disabled:opacity-60 disabled:cursor-not-allowed
              ${errors.password 
                ? 'border-[#DC2626] focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2' 
                : 'border-[#D1D5DB] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2'
              }
            `}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={handleTogglePassword}
            disabled={isLoading}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6B7280] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
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