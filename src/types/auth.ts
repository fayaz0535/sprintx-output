```typescript
// Authentication-related type definitions

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
  expiresAt: string;
  rememberMe: boolean;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

// Authentication request/response types
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

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  success: boolean;
}

// Authentication state types
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
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

export interface ValidationResult {
  isValid: boolean;
  errors: LoginFormErrors;
}

// API error types
export interface AuthError {
  message: string;
  code?: string;
  field?: string;
}

export interface ApiErrorResponse {
  error: AuthError;
  statusCode: number;
}

// Component prop types
export interface PasswordVisibilityState {
  isVisible: boolean;
  toggle: () => void;
}

export interface AuthFormState {
  isSubmitting: boolean;
  errors: LoginFormErrors;
  touched: {
    email: boolean;
    password: boolean;
  };
}

// Token types
export interface DecodedAccessToken {
  sub: string; // user id
  email: string;
  exp: number;
  iat: number;
  rememberMe?: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  rememberMe?: boolean;
}

// Session management types
export interface SessionInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}

export interface SessionListResponse {
  sessions: SessionInfo[];
}

// Auth hook return types
export interface UseAuthReturn extends AuthContextValue {}

export interface UseLoginFormReturn {
  formData: LoginFormData;
  errors: LoginFormErrors;
  touched: AuthFormState['touched'];
  isSubmitting: boolean;
  handleChange: (field: keyof LoginFormData, value: string | boolean) => void;
  handleBlur: (field: keyof LoginFormData) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
}

export interface UsePasswordToggleReturn {
  isVisible: boolean;
  toggle: () => void;
}

// Storage types
export interface StoredAuthData {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresAt: number;
}

// Guard types
export type AuthGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
  requiredAuth?: boolean;
};

// Route protection types
export enum AuthRequirement {
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  OPTIONAL = 'optional'
}

export interface ProtectedRouteConfig {
  path: string;
  requirement: AuthRequirement;
  redirectTo?: string;
}
```