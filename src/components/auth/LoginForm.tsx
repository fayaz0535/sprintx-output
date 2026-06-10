```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import InputField from '../ui/InputField';
import PasswordInput from '../ui/PasswordInput';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import AlertBanner from '../ui/AlertBanner';

interface LoginFormProps {
  onForgotPassword?: () => void;
  onRegister?: () => void;
}

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword, onRegister }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [accountLockedMessage, setAccountLockedMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

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

  const handleInputChange = (field: keyof FormData) => (value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Clear general error when user makes changes
    if (generalError) {
      setGeneralError(null);
    }
    if (accountLockedMessage) {
      setAccountLockedMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setGeneralError(null);
    setAccountLockedMessage(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

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
        if (response.status === 423) {
          // Account locked
          setAccountLockedMessage(
            data.message || 'Account temporarily locked due to multiple failed attempts'
          );
        } else if (response.status === 401) {
          // Invalid credentials
          setGeneralError('Invalid email or password');
        } else {
          // Other errors
          setGeneralError(data.message || 'An error occurred. Please try again.');
        }
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setGeneralError('Unable to connect. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onForgotPassword) {
      onForgotPassword();
    } else {
      router.push('/auth/forgot-password');
    }
  };

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onRegister) {
      onRegister();
    } else {
      router.push('/auth/register');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Log In
          </h1>
          <p className="text-sm text-gray-700">
            Welcome back! Please enter your credentials.
          </p>
        </div>

        {accountLockedMessage && (
          <div className="mb-4">
            <AlertBanner
              message={accountLockedMessage}
              type="error"
              dismissible={true}
            />
          </div>
        )}

        {generalError && (
          <div className="mb-4">
            <AlertBanner
              message={generalError}
              type="error"
              dismissible={true}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <InputField
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(value) => handleInputChange('email')(value)}
              error={errors.email}
              required={true}
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <PasswordInput
              label="Password"
              value={formData.password}
              onChange={(value) => handleInputChange('password')(value)}
              error={errors.password}
              showToggle={true}
              required={true}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between mb-6">
            <Checkbox
              label="Remember me"
              checked={formData.rememberMe}
              onChange={(checked) => handleInputChange('rememberMe')(checked)}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleForgotPasswordClick}
              className="text-sm font-medium text-primary hover:text-primary_hover transition-colors"
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          </div>

          <div className="mb-4">
            <Button
              label="Log In"
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={isLoading}
              onClick={() => {}}
            />
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-700">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={handleRegisterClick}
                className="font-medium text-primary hover:text-primary_hover transition-colors"
                disabled={isLoading}
              >
                Sign Up
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
```