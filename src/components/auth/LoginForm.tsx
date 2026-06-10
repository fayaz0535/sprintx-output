```typescript
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import TextInput from '@/components/ui/atoms/TextInput';
import PasswordInput from '@/components/ui/molecules/PasswordInput';
import Button from '@/components/ui/atoms/Button';
import Link from '@/components/ui/atoms/Link';
import AlertBanner from '@/components/ui/molecules/AlertBanner';
import FormCard from '@/components/ui/organisms/FormCard';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface ApiError {
  message: string;
  field?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  redirectTo = '/dashboard' 
}) => {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
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
    const newErrors: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password)
    };

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    if (touched.email || email) {
      setErrors(prev => ({
        ...prev,
        email: validateEmail(email)
      }));
    }
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    if (touched.password || password) {
      setErrors(prev => ({
        ...prev,
        password: validatePassword(password)
      }));
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      setErrors(prev => ({
        ...prev,
        email: validateEmail(value)
      }));
    }
    if (globalError) {
      setGlobalError('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      setErrors(prev => ({
        ...prev,
        password: validatePassword(value)
      }));
    }
    if (globalError) {
      setGlobalError('');
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setTouched({ email: true, password: true });
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setGlobalError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setGlobalError('Invalid email or password');
        } else if (response.status === 429) {
          setGlobalError('Too many login attempts. Please try again later.');
        } else if (response.status >= 500) {
          setGlobalError('Unable to connect. Please try again.');
        } else {
          setGlobalError(data.message || 'An error occurred. Please try again.');
        }
        return;
      }

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken);
        }
      }

      if (onSuccess) {
        onSuccess();
      }

      router.push(redirectTo);
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setGlobalError('Unable to connect. Please check your internet connection.');
      } else {
        setGlobalError('Unable to connect. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormCard title="Sign in to your account">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {globalError && (
          <AlertBanner
            message={globalError}
            variant="error"
            onDismiss={() => setGlobalError('')}
          />
        )}

        <TextInput
          id="email"
          name="email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={touched.email ? errors.email : undefined}
          required
          autoComplete="email"
          disabled={isLoading}
        />

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          error={touched.password ? errors.password : undefined}
          required
          showPassword={showPassword}
          onToggleVisibility={handleTogglePasswordVisibility}
          disabled={isLoading}
        />

        <div className="flex items-center justify-end">
          <Link href="/auth/forgot-password" variant="inline">
            Forgot Password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          loading={isLoading}
          className="w-full"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>

        <div className="text-center text-sm text-muted">
          Don't have an account?{' '}
          <Link href="/auth/register" variant="inline">
            Sign up
          </Link>
        </div>
      </form>
    </FormCard>
  );
};

export default LoginForm;
```