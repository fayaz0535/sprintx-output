```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import EmailInput from './EmailInput';
import PasswordInput from './PasswordInput';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import ErrorBanner from './ErrorBanner';
import SuccessBanner from './SuccessBanner';
import PrimaryButton from './PrimaryButton';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSuccess?: () => void;
}

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode, onSuccess }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);

  const passwordRequirements: PasswordRequirement[] = [
    {
      id: 'min-length',
      label: 'Minimum 8 characters',
      test: (pwd) => pwd.length >= 8,
      met: false,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter',
      test: (pwd) => /[A-Z]/.test(pwd),
      met: false,
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter',
      test: (pwd) => /[a-z]/.test(pwd),
      met: false,
    },
    {
      id: 'number',
      label: 'At least one number',
      test: (pwd) => /\d/.test(pwd),
      met: false,
    },
    {
      id: 'special',
      label: 'At least one special character',
      test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
      met: false,
    },
  ];

  const [requirements, setRequirements] = useState(passwordRequirements);

  useEffect(() => {
    if (mode === 'register') {
      const updatedRequirements = passwordRequirements.map((req) => ({
        ...req,
        met: req.test(password),
      }));
      setRequirements(updatedRequirements);
    }
  }, [password, mode]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return passwordRequirements.every((req) => req.test(password));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handlePasswordFocus = () => {
    if (mode === 'register') {
      setShowPasswordStrength(true);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      return data.exists || false;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    // Validate email
    if (!validateEmail(email)) {
      setErrors((prev) => ({
        ...prev,
        email: 'Please enter a valid email address',
      }));
      return;
    }

    // Validate password
    if (mode === 'register' && !validatePassword(password)) {
      setErrors((prev) => ({
        ...prev,
        password: 'Password does not meet all requirements',
      }));
      return;
    }

    if (mode === 'login' && !password) {
      setErrors((prev) => ({
        ...prev,
        password: 'Password is required',
      }));
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        // Check if email already exists
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
          setErrors({
            email: 'This email is already registered',
          });
          setLoading(false);
          return;
        }

        // Register user
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          setSuccessMessage('Account created successfully! Redirecting to login...');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else {
          const data = await response.json();
          setErrors({
            general: data.message || 'Registration failed. Please try again.',
          });
        }
      } else {
        // Login user
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          const data = await response.json();
          // Store token in localStorage or cookie
          localStorage.setItem('auth_token', data.token);
          
          if (onSuccess) {
            onSuccess();
          } else {
            router.push('/dashboard');
          }
        } else {
          const data = await response.json();
          
          // Handle account lockout
          if (response.status === 423) {
            setErrors({
              general: data.message || 'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.',
            });
          } else {
            setErrors({
              general: 'Invalid email or password',
            });
          }
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setErrors({
        general: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const dismissError = useCallback((field?: keyof FormErrors) => {
    if (field) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } else {
      setErrors({});
    }
  }, []);

  const dismissSuccess = useCallback(() => {
    setSuccessMessage('');
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {mode === 'register' ? 'Create Account' : 'Welcome Back'}
        </h1>
        <p className="text-gray-600 mb-6">
          {mode === 'register'
            ? 'Sign up to get started'
            : 'Sign in to your account'}
        </p>

        {successMessage && (
          <div className="mb-4">
            <SuccessBanner message={successMessage} onDismiss={dismissSuccess} />
          </div>
        )}

        {errors.general && (
          <div className="mb-4">
            <ErrorBanner
              message={errors.general}
              type="form_level"
              onDismiss={() => dismissError('general')}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <EmailInput
              value={email}
              onChange={handleEmailChange}
              error={errors.email}
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <PasswordInput
              value={password}
              onChange={handlePasswordChange}
              showPassword={showPassword}
              onToggleVisibility={handleTogglePasswordVisibility}
              error={errors.password}
              disabled={loading}
              onFocus={handlePasswordFocus}
            />
          </div>

          {mode === 'register' && showPasswordStrength && (
            <PasswordStrengthIndicator
              password={password}
              requirements={requirements}
            />
          )}

          <div className="pt-2">
            <PrimaryButton
              label={mode === 'register' ? 'Create Account' : 'Sign In'}
              onClick={() => {}}
              disabled={loading}
              loading={loading}
            />
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                  disabled={loading}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => router.push('/register')}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                  disabled={loading}
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
```