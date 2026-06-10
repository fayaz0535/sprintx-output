```typescript
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Session {
  id: string;
  userId: string;
  accessTokenHash: string;
  refreshTokenHash: string;
  expiresAt: string;
  rememberMe: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginResponse extends AuthResponse {}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
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
  confirmPassword?: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyAuthResponse {
  valid: boolean;
  user?: User;
}

export interface AuthError {
  message: string;
  code?: string;
  field?: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  successful: boolean;
  attemptedAt: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

export interface ValidationError {
  field: string;
  message: string;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  resetPassword: (request: ResetPasswordRequest) => Promise<void>;
  forgotPassword: (request: ForgotPasswordRequest) => Promise<void>;
  clearError: () => void;
}
```