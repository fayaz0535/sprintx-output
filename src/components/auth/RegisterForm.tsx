```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import InputField from '../common/InputField';
import PasswordInput from '../common/PasswordInput';
import Button from '../common/Button';
import ValidationMessage from '../common/ValidationMessage';
import PasswordStrengthIndicator from '../common/PasswordStrengthIndicator';
import AlertBanner from '../common/AlertBanner';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
  regex: RegExp;
}

const RegisterForm: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const passwordRequirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: formData.password.length >= 8,
      regex: /.{8,}/,
    },
    {
      id: 'uppercase',
      label: 'At least 1 uppercase letter',
      met: /[A-Z]/.test(formData.password),
      regex: /[A-Z]/,
    },
    {
      id: 'number',
      label: 'At least 1 number',
      met: /\d/.test(formData.password),
      regex: /\d/,
    },
  ];

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return passwordRequirements.every((req) => req.regex.test(password));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate email
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password does not meet requirements';
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }

    // Clear alert message when user starts typing
    if (alertMessage) {
      setAlertMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setAlertMessage(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setErrors({
            email: 'This email is already registered',
          });
          setAlertMessage({
            type: 'error',
            message: 'This email is already registered',
          });
        } else {
          setAlertMessage({
            type: 'error',
            message: data.message || 'Registration failed. Please try again.',
          });
        }
        return;
      }

      // Registration successful
      setAlertMessage({
        type: 'success',
        message: 'Account created successfully! Redirecting to login...',
      });

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      setAlertMessage({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (): 'weak' | 'medium' | 'strong' => {
    const metRequirements = passwordRequirements.filter((req) => req.met).length;
    if (metRequirements === 0) return 'weak';
    if (metRequirements === passwordRequirements.length) return 'strong';
    return 'medium';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create your account
          </h1>
          <p className="text-sm text-gray-700">
            Get started by filling in the information below
          </p>
        </div>

        {alertMessage && (
          <div className="mb-6">
            <AlertBanner
              type={alertMessage.type}
              message={alertMessage.message}
              dismissible={true}
              onDismiss={() => setAlertMessage(null)}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-6">
            <InputField
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              error={errors.email}
              required={true}
              disabled={isLoading}
            />

            <div>
              <PasswordInput
                label="Password"
                value={formData.password}
                onChange={(value) => handleInputChange('password', value)}
                error={errors.password}
                showToggle={true}
                required={true}
                disabled={isLoading}
              />

              {formData.password && (
                <div className="mt-3">
                  <PasswordStrengthIndicator
                    password={formData.password}
                    requirements={passwordRequirements}
                    strength={getPasswordStrength()}
                  />
                </div>
              )}
            </div>

            <PasswordInput
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={(value) => handleInputChange('confirmPassword', value)}
              error={errors.confirmPassword}
              showToggle={true}
              required={true}
              disabled={isLoading}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                label="Create Account"
                loading={isLoading}
                disabled={isLoading}
                fullWidth={true}
              />
            </div>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-700">
            Already have an account?{' '}
            <a
              href="/login"
              className="font-medium text-primary hover:text-primary_hover transition-colors"
            >
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
```