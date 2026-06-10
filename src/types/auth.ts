```typescript
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: Pick<User, 'id' | 'email'>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
  expires_at: string;
}

export interface LogoutResponse {
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user?: User;
}

export interface UserProfileResponse {
  user: User;
}

export interface AuthError {
  message: string;
  field?: string;
  code?: string;
}

export interface PasswordRequirement {
  id: string;
  label: string;
  regex: RegExp;
  met: boolean;
}

export const PASSWORD_REQUIREMENTS: Omit<PasswordRequirement, 'met'>[] = [
  {
    id: 'length',
    label: '8+ characters',
    regex: /.{8,}/
  },
  {
    id: 'uppercase',
    label: 'Uppercase A-Z',
    regex: /[A-Z]/
  },
  {
    id: 'lowercase',
    label: 'Lowercase a-z',
    regex: /[a-z]/
  },
  {
    id: 'number',
    label: 'Number 0-9',
    regex: /[0-9]/
  },
  {
    id: 'special',
    label: 'Special !@#$%',
    regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
  }
];

export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

export interface PasswordValidation {
  isValid: boolean;
  strength: PasswordStrength;
  requirements: PasswordRequirement[];
  metCount: number;
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  validateToken: () => Promise<boolean>;
}

export interface EmailValidation {
  isValid: boolean;
  error?: string;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AUTH_ERROR_MESSAGES = {
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  EMAIL_EXISTS: 'Email already registered',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_INVALID: 'Password does not meet requirements',
  PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters',
  CREDENTIALS_INVALID: 'Invalid email or password',
  TOKEN_EXPIRED: 'Reset link has expired',
  TOKEN_INVALID: 'Invalid reset token',
  UNAUTHORIZED: 'You must be logged in to access this resource',
  SERVER_ERROR: 'An error occurred. Please try again later'
} as const;

export const AUTH_SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: 'Account created successfully! Please log in.',
  LOGIN_SUCCESS: 'Welcome back!',
  LOGOUT_SUCCESS: 'You have been logged out',
  RESET_EMAIL_SENT: 'Password reset email sent. Please check your inbox.',
  PASSWORD_RESET_SUCCESS: 'Password updated successfully! Please log in with your new password.'
} as const;

export const TOKEN_EXPIRY_HOURS = 1;
export const SESSION_COOKIE_NAME = 'auth_token';
export const SESSION_EXPIRY_DAYS = 7;
```