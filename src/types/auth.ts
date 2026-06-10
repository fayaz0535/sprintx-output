```typescript
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
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
  lastLoginAt: string | null;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  isPersistent: boolean;
  expiresAt: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  revokedAt: string | null;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  session: Session;
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
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokens: AuthTokens | null;
}

export interface VerifyResponse {
  valid: boolean;
  user?: User;
}

export interface RefreshResponse {
  tokens: AuthTokens;
  expiresAt: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface AuthError {
  message: string;
  code: string;
  statusCode: number;
}

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: AuthTokens }
  | { type: 'REFRESH_TOKEN_FAILURE' }
  | { type: 'VERIFY_SUCCESS'; payload: User }
  | { type: 'VERIFY_FAILURE' }
  | { type: 'CLEAR_ERROR' };

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginApiResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  session: Session;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface VerifyTokenRequest {
  token: string;
}
```