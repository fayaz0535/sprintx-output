```typescript
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import TextInput from '@/components/ui/TextInput';
import PasswordInput from '@/components/ui/PasswordInput';
import Button from '@/components/ui/Button';
import Link from '@/components/ui/Link';
import ErrorBanner from '@/components/ui/ErrorBanner';
import FormCard from '@/components/ui/FormCard';

interface RegisterFormProps {
  onSuccess?: () => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    return undefined;
  };

  const getPasswordRequirements = (password: string): PasswordRequirement[] => {
    return [
      {
        label: 'At least 8 characters',
        met: password.length >= 8,
      },
      {
        label: 'At least 1 uppercase letter',
        met: /[A-Z]/.test(password),
      },
      {
        label: 'At least 1 number',
        met: /\d/.test(password),
      },
    ];
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }

    const requirements = getPasswordRequirements(password);
    const unmetRequirements = requirements.filter(req => !req.met);

    if (unmetRequirements.length > 0) {
      return unmetRequirements.map(req => req.label).join(', ');
    }

    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    const newErrors = { ...errors };

    switch (field) {
      case 'email':
        const emailError = validateEmail(formData.email);
        if (emailError) {
          newErrors.email = emailError;
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        const passwordError = validatePassword(formData.password);
        if (passwordError) {
          newErrors.password = passwordError;
        } else {
          delete newErrors.password;
        }
        // Re-validate confirm password if it's been touched
        if (touched.confirmPassword) {
          const confirmError = validateConfirmPassword(formData.confirmPassword, formData.password);
          if (confirmError) {
            newErrors.confirmPassword = confirmError;
          } else {
            delete newErrors.confirmPassword;
          }
        }
        break;
      case 'confirmPassword':
        const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);
        if (confirmPasswordError) {
          newErrors.confirmPassword = confirmPasswordError;
        } else {
          delete newErrors.confirmPassword;
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear form-level error on any change
    if (errors.form) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.form;
        return newErrors;
      });
    }

    // Clear field error on change if field has been touched
    if (touched[field] && errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

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
          setErrors({ form: 'Email already registered' });
        } else if (response.status === 400) {
          setErrors({ form: data.message || 'Invalid registration data' });
        } else {
          setErrors({ form: 'Registration failed. Please try again.' });
        }
        return;
      }

      // Success
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/login?registered=true');
      }
    } catch (error) {
      setErrors({ form: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = getPasswordRequirements(formData.password);
  const showPasswordRequirements = touched.password && formData.password.length > 0;

  return (
    <FormCard
      title="Create your account"
      subtitle="Enter your details to get started"
      maxWidth="448px"
    >
      <form onSubmit={handleSubmit} noValidate>
        {errors.form && (
          <div className="mb-6">
            <ErrorBanner
              message={errors.form}
              type="form_level"
              onDismiss={() => setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.form;
                return newErrors;
              })}
            />
          </div>
        )}

        <div className="space-y-5">
          <TextInput
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            error={touched.email ? errors.email : undefined}
            required
            autocomplete="email"
          />

          <div>
            <PasswordInput
              id="password"
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              error={touched.password && !showPasswordRequirements ? errors.password : undefined}
              showPassword={showPassword}
              onToggleVisibility={() => setShowPassword(!showPassword)}
              required
            />
            {showPasswordRequirements && (
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                        req.met
                          ? 'bg-success-bg text-success'
                          : 'bg-bg-secondary text-text-secondary'
                      }`}
                    >
                      {req.met ? '✓' : '○'}
                    </div>
                    <span
                      className={`text-body-small ${
                        req.met ? 'text-success' : 'text-text-secondary'
                      }`}
                    >
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <PasswordInput
            id="confirmPassword"
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
            showPassword={showConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
            required
          />
        </div>

        <div className="mt-6">
          <Button
            type="submit"
            label="Create Account"
            fullWidth
            disabled={isLoading}
            loading={isLoading}
          />
        </div>

        <div className="mt-6 text-center">
          <span className="text-body-medium text-text-secondary">
            Already have an account?{' '}
          </span>
          <Link href="/login" label="Sign in" variant="default" />
        </div>
      </form>
    </FormCard>
  );
};

export default RegisterForm;
```