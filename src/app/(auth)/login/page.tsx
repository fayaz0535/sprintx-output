```typescript
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmailInput from '@/components/ui/EmailInput';
import PasswordInput from '@/components/ui/PasswordInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import FormValidationMessage from '@/components/ui/FormValidationMessage';
import AlertBanner from '@/components/ui/AlertBanner';
import TextLink from '@/components/ui/TextLink';

interface LoginFormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          router.push('/dashboard');
        }
      } catch (error) {
        // User not logged in, continue to login page
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [router]);

  const validateEmail = (email: string): string | undefined => {
    if (!email) {
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
    if (errors.email || generalError) {
      setErrors(prev => ({ ...prev, email: undefined }));
      setGeneralError('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, password: value }));
    if (errors.password || generalError) {
      setErrors(prev => ({ ...prev, password: undefined }));
      setGeneralError('');
    }
  };

  const handleEmailBlur = () => {
    const emailError = validateEmail(formData.email);
    if (emailError) {
      setErrors(prev => ({ ...prev, email: emailError }));
    }
  };

  const handlePasswordBlur = () => {
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setErrors(prev => ({ ...prev, password: passwordError }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      const firstErrorField = errors.email ? 'email' : 'password';
      document.getElementById(firstErrorField)?.focus();
      return;
    }

    setIsLoading(true);
    setGeneralError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/dashboard');
      } else {
        if (response.status === 401) {
          setGeneralError('Invalid email or password');
        } else if (response.status === 503) {
          setGeneralError('Service temporarily unavailable. Please try again.');
        } else {
          setGeneralError(data.message || 'An error occurred. Please try again.');
        }
      }
    } catch (error) {
      setGeneralError('Service temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900 text-center">
            Sign in to your account
          </h1>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Or{' '}
            <TextLink
              label="create a new account"
              href="/register"
              underline={true}
              ariaLabel="Navigate to registration page"
            />
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <AlertBanner
            message={generalError}
            type="error"
            visible={!!generalError}
            onDismiss={() => setGeneralError('')}
            icon={true}
          />

          <form className="space-y-6 mt-6" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-900 mb-2"
              >
                Email address
              </label>
              <EmailInput
                value={formData.email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                error={errors.email}
                disabled={isLoading}
                autoComplete="email"
              />
              <FormValidationMessage
                message={errors.email || ''}
                fieldId="email"
                visible={!!errors.email}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-900 mb-2"
              >
                Password
              </label>
              <PasswordInput
                value={formData.password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                error={errors.password}
                showToggle={true}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <FormValidationMessage
                message={errors.password || ''}
                fieldId="password"
                visible={!!errors.password}
              />
            </div>

            <div className="flex items-center justify-end">
              <TextLink
                label="Forgot your password?"
                href="/forgot-password"
                underline={false}
                ariaLabel="Navigate to password reset page"
              />
            </div>

            <div>
              <PrimaryButton
                label="Sign in"
                type="submit"
                disabled={isLoading}
                loading={isLoading}
                ariaLabel="Sign in to your account"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```