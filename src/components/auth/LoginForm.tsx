```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import EmailInput from '@/components/atoms/EmailInput';
import PasswordInput from '@/components/molecules/PasswordInput';
import FormButton from '@/components/atoms/FormButton';
import ValidationMessage from '@/components/atoms/ValidationMessage';
import LinkButton from '@/components/atoms/LinkButton';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  redirectTo = '/dashboard' 
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
    if (touched.email) {
      setErrors(prev => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, password: value }));
    if (touched.password) {
      setErrors(prev => ({ ...prev, password: validatePassword(value) }));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: validateEmail(formData.email) }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    setErrors(prev => ({ ...prev, password: validatePassword(formData.password) }));
  };

  const validateForm = (): boolean => {
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    setErrors({
      email: emailError,
      password: passwordError
    });

    setTouched({
      email: true,
      password: true
    });

    return !emailError && !passwordError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(prev => ({ ...prev, general: undefined }));
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setErrors(prev => ({ 
            ...prev, 
            general: 'Invalid email or password' 
          }));
        } else {
          setErrors(prev => ({ 
            ...prev, 
            general: data.message || 'An error occurred during login' 
          }));
        }
        return;
      }

      // Store session token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      setSuccessMessage('Login successful! Redirecting...');

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Redirect after short delay
      setTimeout(() => {
        router.push(redirectTo);
      }, 500);

    } catch (error) {
      console.error('Login error:', error);
      setErrors(prev => ({ 
        ...prev, 
        general: 'Network error. Please check your connection and try again.' 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    router.push('/auth/forgot-password');
  };

  const handleRegisterClick = () => {
    router.push('/auth/register');
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="w-full space-y-6"
      noValidate
    >
      {errors.general && (
        <ValidationMessage
          message={errors.general}
          type="error"
          visible={true}
        />
      )}

      {successMessage && (
        <ValidationMessage
          message={successMessage}
          type="success"
          visible={true}
        />
      )}

      <div className="space-y-4">
        <EmailInput
          value={formData.email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={touched.email ? errors.email : undefined}
          disabled={isLoading}
          autoComplete="email"
        />

        <PasswordInput
          value={formData.password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          error={touched.password ? errors.password : undefined}
          disabled={isLoading}
          showToggle={true}
          autoComplete="current-password"
        />
      </div>

      <div className="flex items-center justify-end">
        <LinkButton
          label="Forgot password?"
          onClick={handleForgotPasswordClick}
          variant="underline"
        />
      </div>

      <FormButton
        label="Log in"
        type="submit"
        disabled={isLoading}
        loading={isLoading}
        variant="primary"
      />

      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-gray-600">Don't have an account?</span>
        <LinkButton
          label="Sign up"
          onClick={handleRegisterClick}
          variant="underline"
        />
      </div>
    </form>
  );
};

export default LoginForm;
```