```typescript
'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import TextInput from '@/components/ui/TextInput';
import PasswordInput from '@/components/ui/PasswordInput';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Link from '@/components/ui/Link';
import ErrorBanner from '@/components/ui/ErrorBanner';
import FormCard from '@/components/ui/FormCard';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  form?: string;
}

const LoginForm: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};
    
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailBlur = () => {
    const emailError = validateEmail(formData.email);
    setErrors(prev => ({
      ...prev,
      email: emailError,
    }));
  };

  const handlePasswordBlur = () => {
    const passwordError = validatePassword(formData.password);
    setErrors(prev => ({
      ...prev,
      password: passwordError,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
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
          setErrors({ form: 'Invalid email or password' });
        } else {
          setErrors({ form: data.message || 'An error occurred during login' });
        }
        return;
      }

      // Successful login - redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      setErrors({ form: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
    // Clear email error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, password: value }));
    // Clear password error when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  const handleRememberMeChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, rememberMe: checked }));
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleDismissError = () => {
    setErrors(prev => ({ ...prev, form: undefined }));
  };

  return (
    <FormCard
      title="Welcome back"
      subtitle="Sign in to your account to continue"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {errors.form && (
          <ErrorBanner
            message={errors.form}
            onDismiss={handleDismissError}
            type="form_level"
          />
        )}

        <TextInput
          id="email"
          label="Email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={!!errors.email}
          helperText={errors.email}
          required
          type="email"
          autocomplete="email"
        />

        <PasswordInput
          id="password"
          label="Password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          error={!!errors.password}
          helperText={errors.password}
          showPassword={showPassword}
          onToggleVisibility={handleTogglePasswordVisibility}
          required
        />

        <div className="flex items-center justify-between">
          <Checkbox
            id="rememberMe"
            label="Remember me"
            checked={formData.rememberMe}
            onChange={handleRememberMeChange}
            disabled={isLoading}
          />

          <Link
            href="/forgot-password"
            label="Forgot password?"
            variant="default"
          />
        </div>

        <Button
          label="Sign in"
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          fullWidth
        />

        <div className="text-center">
          <span className="text-sm text-gray-600">
            Don't have an account?{' '}
          </span>
          <Link
            href="/register"
            label="Sign up"
            variant="default"
          />
        </div>
      </form>
    </FormCard>
  );
};

export default LoginForm;
```