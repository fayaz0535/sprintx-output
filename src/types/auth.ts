```typescript
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
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
  expiresAt: string;
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

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user?: User;
}

export interface AuthError {
  message: string;
  field?: string;
  code?: string;
}

export interface ValidationError {
  field: string;
  message: string;
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

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  successful: boolean;
  attemptedAt: string;
}

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'LOGIN_FAILURE'; payload: AuthError }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'REFRESH_TOKEN_FAILURE' }
  | { type: 'SET_USER'; payload: User }
  | { type: 'CLEAR_ERROR' };
```