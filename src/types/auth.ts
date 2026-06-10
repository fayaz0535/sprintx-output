```typescript
// src/types/auth.ts

/**
 * User authentication and session types
 */

export interface User {
  id: string;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  success: boolean;
  createdAt: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface EmailValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface PasswordValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface FormValidationState {
  email: EmailValidationResult;
  password: PasswordValidationResult;
  isValid: boolean;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface SessionInfo {
  user: User;
  expiresAt: string;
  rememberMe: boolean;
}

export interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface LoginFormState {
  data: LoginFormData;
  errors: LoginFormErrors;
  touched: {
    email: boolean;
    password: boolean;
  };
  isSubmitting: boolean;
  isPasswordVisible: boolean;
}

export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_REQUIRED: 'Password is required',
  NETWORK_ERROR: 'Network error. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  TOO_MANY_ATTEMPTS: 'Too many login attempts. Please try again later.',
} as const;

export const SESSION_STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user',
  REMEMBER_ME: 'auth_remember_me',
} as const;

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 900, // 15 minutes in seconds
  REFRESH_TOKEN: 2592000, // 30 days in seconds
  SESSION: 3600, // 1 hour in seconds (when remember me is not checked)
} as const;
```
```