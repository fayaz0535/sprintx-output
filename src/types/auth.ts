```typescript
// User authentication types
export interface User {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Login request/response types
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

// Session types
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  rememberMe: boolean;
  expiresAt: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

// Token types
export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// Password reset types
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  success: boolean;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  success: boolean;
}

export interface ValidateResetTokenRequest {
  token: string;
}

export interface ValidateResetTokenResponse {
  valid: boolean;
  email?: string;
}

export interface PasswordReset {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  usedAt: string | null;
}

// Form validation types
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

export interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordFormErrors {
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ForgotPasswordFormErrors {
  email?: string;
  general?: string;
}

// Auth state types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// Auth context types
export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (data: ResetPasswordRequest) => Promise<void>;
  validateResetToken: (token: string) => Promise<ValidateResetTokenResponse>;
  clearError: () => void;
}

// API error types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  statusCode: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Validation rules
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar?: boolean;
}

export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: false,
};

// Token storage types
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// Authentication event types
export type AuthEvent = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'TOKEN_REFRESH'
  | 'TOKEN_EXPIRED'
  | 'SESSION_EXPIRED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_RESET_FAILURE';

export interface AuthEventPayload {
  event: AuthEvent;
  timestamp: string;
  userId?: string;
  error?: string;
}

// Route protection types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

// Session configuration
export interface SessionConfig {
  defaultExpirationMinutes: number;
  rememberMeExpirationDays: number;
  refreshTokenExpirationDays: number;
  passwordResetExpirationHours: number;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  defaultExpirationMinutes: 60,
  rememberMeExpirationDays: 30,
  refreshTokenExpirationDays: 7,
  passwordResetExpirationHours: 1,
};

// Authentication method types
export type AuthMethod = 'email' | 'oauth' | 'magic-link';

export interface AuthMethodConfig {
  method: AuthMethod;
  enabled: boolean;
}
```