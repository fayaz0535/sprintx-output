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
  accessTokenHash: string;
  refreshTokenHash: string;
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
  password: string;
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
  usedAt: string | null;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
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

export interface ForgotPasswordFormData {
  email: string;
}

export interface ForgotPasswordFormErrors {
  email?: string;
  general?: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordFormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: LoginResponse }
  | { type: 'LOGIN_FAILURE'; payload: AuthError }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_START' }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: RefreshTokenResponse }
  | { type: 'REFRESH_TOKEN_FAILURE'; payload: AuthError }
  | { type: 'VERIFY_TOKEN_START' }
  | { type: 'VERIFY_TOKEN_SUCCESS'; payload: User }
  | { type: 'VERIFY_TOKEN_FAILURE'; payload: AuthError }
  | { type: 'CLEAR_ERROR' };

export interface AuthContextValue {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  verifyToken: () => Promise<void>;
  clearError: () => void;
}
```