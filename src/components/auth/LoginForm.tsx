```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import TextInput from '@/components/atoms/TextInput';
import PasswordInput from '@/components/molecules/PasswordInput';
import Checkbox from '@/components/atoms/Checkbox';
import PrimaryButton from '@/components/atoms/PrimaryButton';

interface LoginFormProps {
  onForgotPassword?: () => void;
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

const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [isLoading, setIsLoading] = useState(false);

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

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const error = validateEmail(formData.email);
    setErrors((prev) => ({ ...prev, email: error, general: undefined }));
  };

  const handlePasswordBlur = () => {
    setTouched((prev) => ({ ...prev, password: true }));
    const error = validatePassword(formData.password);
    setErrors((prev) => ({ ...prev, password: error, general: undefined }));
  };

  const handleEmailChange = (value: string) => {
    setFormData((prev) => ({ ...prev, email: value }));
    if (touched.email) {
      const error = validateEmail(value);
      setErrors((prev) => ({ ...prev, email: error, general: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setFormData((prev) => ({ ...prev, password: value }));
    if (touched.password) {
      const error = validatePassword(value);
      setErrors((prev) => ({ ...prev, password: error, general: undefined }));
    }
  };

  const handleRememberMeChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, rememberMe: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          setErrors({ general: 'Invalid email or password' });
        } else {
          setErrors({ general: data.message || 'An error occurred. Please try again.' });
        }
        return;
      }

      // Store token based on remember me preference
      if (formData.rememberMe) {
        localStorage.setItem('auth_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
      } else {
        sessionStorage.setItem('auth_token', data.access_token);
        if (data.refresh_token) {
          sessionStorage.setItem('refresh_token', data.refresh_token);
        }
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.email &&
      formData.password &&
      !errors.email &&
      !errors.password &&
      !isLoading
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-auto space-y-6"
      noValidate
      aria-label="Login form"
    >
      <div className="space-y-4">
        <TextInput
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={touched.email ? errors.email : undefined}
          placeholder="Enter your email"
          disabled={isLoading}
          aria-required="true"
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          value={formData.password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          error={touched.password ? errors.password : undefined}
          disabled={isLoading}
          aria-required="true"
          autoComplete="current-password"
        />

        {errors.general && (
          <div
            role="alert"
            aria-live="assertive"
            className="text-sm text-error font-medium"
          >
            {errors.general}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Checkbox
          label="Remember me"
          checked={formData.rememberMe}
          onChange={handleRememberMeChange}
          disabled={isLoading}
        />

        {onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm font-medium text-primary hover:text-primary_hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm transition-colors"
            disabled={isLoading}
            aria-label="Forgot password"
          >
            Forgot Password?
          </button>
        )}
      </div>

      <PrimaryButton
        type="submit"
        label="Sign In"
        loading={isLoading}
        disabled={!isFormValid()}
        fullWidth
        aria-label="Sign in to your account"
      />
    </form>
  );
};

export default LoginForm;
```