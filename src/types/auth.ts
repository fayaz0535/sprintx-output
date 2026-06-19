```typescript
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  refreshTokenHash: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ValidateSessionResponse {
  valid: boolean;
  user?: User;
  expiresAt?: string;
}

export interface AuthError {
  message: string;
  code: string;
  field?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface LoginFormState {
  data: LoginFormData;
  errors: LoginFormErrors;
  isSubmitting: boolean;
  showPassword: boolean;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  isValid: boolean;
  usedAt: string | null;
  createdAt: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  success: boolean;
  failureReason: string | null;
  attemptedAt: string;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  error: AuthError | null;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}
```