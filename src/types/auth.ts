```typescript
/**
 * Authentication-related TypeScript type definitions
 */

/**
 * User credentials for login
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * User data returned from authentication endpoints
 */
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Complete authentication response
 */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

/**
 * Login API request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

/**
 * Login API response
 */
export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Refresh token API request payload
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Refresh token API response
 */
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Logout API request payload
 */
export interface LogoutRequest {
  refresh_token?: string;
}

/**
 * Forgot password API request payload
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Forgot password API response
 */
export interface ForgotPasswordResponse {
  message: string;
  success: boolean;
}

/**
 * Verify token API response
 */
export interface VerifyTokenResponse {
  valid: boolean;
  user?: User;
}

/**
 * Session data
 */
export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  rememberMe: boolean;
  expiresAt: string;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Password reset token data
 */
export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  usedAt?: string | null;
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Authentication error
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

/**
 * Authentication state
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

/**
 * Form validation errors
 */
export interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

/**
 * Login form state
 */
export interface LoginFormState {
  email: string;
  password: string;
  rememberMe: boolean;
  showPassword: boolean;
  errors: ValidationErrors;
  isSubmitting: boolean;
  touched: {
    email: boolean;
    password: boolean;
  };
}

/**
 * Authentication context value
 */
export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

/**
 * JWT token payload
 */
export interface JWTPayload {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

/**
 * Authentication storage keys
 */
export enum AuthStorageKeys {
  ACCESS_TOKEN = 'auth_access_token',
  REFRESH_TOKEN = 'auth_refresh_token',
  USER = 'auth_user',
  REMEMBER_ME = 'auth_remember_me',
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  detail: string | { msg: string; type: string; loc?: string[] }[];
  status?: number;
}
```