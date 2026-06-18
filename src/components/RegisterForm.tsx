```typescript
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import EmailInput from './EmailInput';
import PasswordInput from './PasswordInput';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import ErrorBanner from './ErrorBanner';
import SuccessBanner from './SuccessBanner';
import PrimaryButton from './PrimaryButton';

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

const RegisterForm: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    {
      id: 'length',
      label: 'Minimum 8 characters',
      test: (pwd: string) => pwd.length >= 8,
      met: false,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter',
      test: (pwd: string) => /[A-Z]/.test(pwd),
      met: false,
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter',
      test: (pwd: string) => /[a-z]/.test(pwd),
      met: false,
    },
    {
      id: 'number',
      label: 'At least one number',
      test: (pwd: string) => /[0-9]/.test(pwd),
      met: false,
    },
    {
      id: 'special',
      label: 'At least one special character',
      test: (pwd: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      met: false,
    },
  ]);

  useEffect(() => {
    const updatedRequirements = requirements.map((req) => ({
      ...req,
      met: req.test(password),
    }));
    setRequirements(updatedRequirements);
  }, [password]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    
    const allRequirementsMet = requirements.every((req) => req.test(password));
    if (!allRequirementsMet) {
      setPasswordError('Password does not meet all requirements');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  const handleEmailBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handlePasswordBlur = () => {
    setIsPasswordFocused(false);
    if (password) {
      validatePassword(password);
    }
  };

  const handlePasswordFocus = () => {
    setIsPasswordFocused(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormError('');
    setSuccessMessage('');
    
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 || data.message?.includes('already registered')) {
          setFormError('This email is already registered');
        } else {
          setFormError(data.message || 'Registration failed. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('Account created successfully! Redirecting to login...');
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      setFormError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
        Create Account
      </h1>

      {formError && (
        <ErrorBanner
          message={formError}
          type="form_level"
          onDismiss={() => setFormError('')}
        />
      )}

      {successMessage && (
        <SuccessBanner
          message={successMessage}
          onDismiss={() => setSuccessMessage('')}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            Email Address
          </label>
          <EmailInput
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            error={emailError}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-900 mb-2"
          >
            Password
          </label>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            showPassword={showPassword}
            onToggleVisibility={handleTogglePasswordVisibility}
            error={passwordError}
            disabled={isSubmitting}
          />
          
          {(isPasswordFocused || password) && (
            <PasswordStrengthIndicator
              password={password}
              requirements={requirements}
            />
          )}
        </div>

        <PrimaryButton
          label="Create Account"
          onClick={handleSubmit}
          disabled={isSubmitting}
          loading={isSubmitting}
        />
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <a
            href="/login"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
```