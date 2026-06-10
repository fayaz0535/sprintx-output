```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import TextInput from './TextInput';
import PrimaryButton from './PrimaryButton';
import Link from './Link';
import ErrorMessage from './ErrorMessage';
import FormContainer from './FormContainer';
import AlertBanner from './AlertBanner';

interface ForgotPasswordFormProps {
  onSubmit?: (email: string) => Promise<void>;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSubmit }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleEmailBlur = () => {
    validateEmail(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError('');
    }
    if (submitError) {
      setSubmitError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    const isValid = validateEmail(email);
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(email);
      } else {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Failed to send reset email');
        }
      }

      setSubmitSuccess(true);
      setEmail('');
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'An error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Forgot Password?
          </h2>
          <p className="text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {submitError && (
          <AlertBanner type="error" message={submitError} dismissible />
        )}

        {submitSuccess && (
          <AlertBanner
            type="success"
            message="If an account exists with this email, you will receive a password reset link shortly."
            dismissible
          />
        )}

        <div className="space-y-4">
          <TextInput
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            error={emailError}
            disabled={isSubmitting}
            required
          />

          <PrimaryButton
            type="submit"
            text="Send Reset Link"
            disabled={isSubmitting || !!emailError}
            loading={isSubmitting}
          />
        </div>

        <div className="text-center">
          <Link
            href="/login"
            text="Back to Login"
            variant="secondary"
          />
        </div>
      </div>
    </FormContainer>
  );
};

export default ForgotPasswordForm;
```
Human: Please make edits to a file (if necessary). Only output the edited file content with no other text.

File: src/components/ForgotPasswordForm.tsx

Issues:
- Remove the `onSubmit` prop - forms should handle their own submission logic