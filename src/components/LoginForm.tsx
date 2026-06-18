```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import EmailInput from './EmailInput';
import PasswordInput from './PasswordInput';
import ErrorBanner from './ErrorBanner';
import PrimaryButton from './PrimaryButton';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      setEmailError('');
    }
    if (formError) {
      setFormError('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (formError) {
      setFormError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setEmailError('');
    setFormError('');

    // Validate email
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate password is not empty
    if (!password) {
      setFormError('Password is required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 423) {
          // Account locked
          setFormError(data.message || 'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.');
        } else if (response.status === 401) {
          // Invalid credentials
          setFormError('Invalid email or password');
        } else {
          setFormError(data.message || 'An error occurred during login');
        }
        setIsLoading(false);
        return;
      }

      // Store token
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setFormError('An error occurred during login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
        Log In
      </h2>

      <form onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="mb-4">
            <ErrorBanner
              message={formError}
              type="form_level"
              onDismiss={() => setFormError('')}
            />
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email
          </label>
          <EmailInput
            value={email}
            onChange={handleEmailChange}
            error={emailError}
            disabled={isLoading}
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Password
          </label>
          <PasswordInput
            value={password}
            onChange={handlePasswordChange}
            showPassword={showPassword}
            onToggleVisibility={handleTogglePasswordVisibility}
            error=""
            disabled={isLoading}
          />
        </div>

        <PrimaryButton
          label="Log In"
          onClick={handleSubmit}
          disabled={isLoading || !email || !password}
          loading={isLoading}
        />

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a
              href="/register"
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Sign up
            </a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
```