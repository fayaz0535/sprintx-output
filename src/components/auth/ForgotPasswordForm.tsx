```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import TextInput from '../ui/TextInput';
import Button from '../ui/Button';
import Link from '../ui/Link';
import InlineError from '../ui/InlineError';
import AlertBanner from '../ui/AlertBanner';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

interface FormState {
  email: string;
}

interface FormErrors {
  email?: string;
  general?: string;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSuccess }) => {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formState.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
    
    // Clear general messages
    if (generalError) setGeneralError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'email' && value && !validateEmail(value)) {
      setErrors(prev => ({
        ...prev,
        email: 'Please enter a valid email address',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous messages
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formState.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setGeneralError('No account found with this email address');
        } else if (response.status === 429) {
          setGeneralError('Too many requests. Please try again later');
        } else {
          setGeneralError(data.message || 'Unable to process request. Please try again');
        }
        return;
      }

      setSuccessMessage('Password reset link has been sent to your email');
      setFormState({ email: '' });
      
      if (onSuccess) {
        onSuccess();
      }

      // Optional: Redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 5000);

    } catch (error) {
      setGeneralError('Unable to connect. Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Reset your password
        </h1>
        <p className="text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      {generalError && (
        <div className="mb-4">
          <AlertBanner
            message={generalError}
            variant="error"
            onDismiss={() => setGeneralError(null)}
          />
        </div>
      )}

      {successMessage && (
        <div className="mb-4">
          <AlertBanner
            message={successMessage}
            variant="success"
            onDismiss={() => setSuccessMessage(null)}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <TextInput
            id="email"
            name="email"
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={formState.email}
            onChange={handleInputChange}
            onBlur={handleBlur}
            error={errors.email}
            required
            autoComplete="email"
          />
          {errors.email && (
            <InlineError message={errors.email} fieldId="email" />
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          variant="primary"
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send reset link'}
        </Button>

        <div className="text-center">
          <Link href="/login" variant="inline">
            Back to login
          </Link>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          Don't have an account?{' '}
          <Link href="/signup" variant="inline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
```