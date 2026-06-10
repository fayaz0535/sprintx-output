```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import EmailInput from '../ui/EmailInput';
import FormButton from '../ui/FormButton';
import ValidationMessage from '../ui/ValidationMessage';
import AuthFormContainer from '../ui/AuthFormContainer';
import LinkButton from '../ui/LinkButton';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

interface FormState {
  email: string;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

interface FormErrors {
  email: string | null;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSuccess }) => {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    email: '',
    isSubmitting: false,
    error: null,
    success: false,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({
    email: null,
  });

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      setFormErrors((prev) => ({ ...prev, email: 'Email is required' }));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
      return false;
    }

    setFormErrors((prev) => ({ ...prev, email: null }));
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormState((prev) => ({ ...prev, email: value, error: null }));
    if (formErrors.email) {
      validateEmail(value);
    }
  };

  const handleEmailBlur = () => {
    validateEmail(formState.email);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Reset states
    setFormState((prev) => ({ ...prev, error: null, success: false }));

    // Validate email
    if (!validateEmail(formState.email)) {
      return;
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true }));

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
        throw new Error(data.message || 'Failed to send reset email');
      }

      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        success: true,
        error: null,
      }));

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }));
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const footerLinks = (
    <div className="mt-6 text-center">
      <LinkButton
        label="Back to login"
        onClick={handleBackToLogin}
        variant="default"
      />
    </div>
  );

  return (
    <AuthFormContainer
      title="Forgot password?"
      subtitle="Enter your email address and we'll send you a link to reset your password"
      footerLinks={footerLinks}
    >
      {formState.success ? (
        <div className="space-y-4">
          <ValidationMessage
            message="Password reset email sent! Please check your inbox for instructions. The link will expire in 1 hour."
            type="success"
            visible={true}
          />
          <FormButton
            label="Back to login"
            onClick={handleBackToLogin}
            type="button"
            variant="primary"
            disabled={false}
            loading={false}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <EmailInput
              value={formState.email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              error={formErrors.email || undefined}
              disabled={formState.isSubmitting}
              autoComplete="email"
            />
          </div>

          {formState.error && (
            <ValidationMessage
              message={formState.error}
              type="error"
              visible={true}
            />
          )}

          <FormButton
            label="Send reset link"
            type="submit"
            variant="primary"
            disabled={formState.isSubmitting || !!formErrors.email}
            loading={formState.isSubmitting}
          />
        </form>
      )}
    </AuthFormContainer>
  );
};

export default ForgotPasswordForm;
```