```typescript
// Authentication-related types for the login system

/**
 * Login credentials submitted by the user
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Successful authentication response from the API
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/**
 * User data returned after successful authentication
 */
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

/**
 * Request body for token refresh
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Response from token refresh endpoint
 */
export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Request body for forgot password
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Response from forgot password endpoint
 */
export interface ForgotPasswordResponse {
  message: string;
}

/**
 * Request body for password reset
 */
export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

/**
 * Response from password reset endpoint
 */
export interface ResetPasswordResponse {
  message: string;
}

/**
 * Email verification response
 */
export interface VerifyResponse {
  valid: boolean;
  user?: User;
}

/**
 * Authentication error response structure
 */
export interface AuthError {
  message: string;
  code: string;
  status: number;
}

/**
 * Login form validation errors
 */
export interface LoginFormErrors {
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
  showPassword: boolean;
  isSubmitting: boolean;
  errors: LoginFormErrors;
}

/**
 * Authentication context state
 */
export interface AuthContextState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

/**
 * Authentication context actions
 */
export interface AuthContextActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

/**
 * Combined authentication context
 */
export type AuthContextType = AuthContextState & AuthContextActions;

/**
 * Local storage keys for auth data
 */
export enum AuthStorageKeys {
  ACCESS_TOKEN = 'auth_access_token',
  REFRESH_TOKEN = 'auth_refresh_token',
  USER = 'auth_user',
}

/**
 * Authentication error codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'invalid_credentials',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  UNAUTHORIZED = 'unauthorized',
  TOKEN_EXPIRED = 'token_expired',
  VALIDATION_ERROR = 'validation_error',
}

/**
 * Login attempt record
 */
export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string | null;
  success: boolean;
  attempted_at: string;
}

/**
 * Refresh token record
 */
export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
}

/**
 * Password reset token record
 */
export interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;
}
```