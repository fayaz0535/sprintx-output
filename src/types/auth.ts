```typescript
// Authentication related types and interfaces

export interface User {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  rememberMe: boolean;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface PasswordReset {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
}

// Request types
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyTokenRequest {
  token: string;
}

// Response types
export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
  };
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LogoutResponse {
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user?: User;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface RefreshResponse {
  token: string;
  expiresAt: string;
}

export interface MeResponse {
  user: User;
}

// Error types
export interface AuthError {
  message: string;
  field?: string;
  code?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AuthErrorResponse {
  error: string;
  errors?: ValidationError[];
  statusCode: number;
}

// Form state types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

// Form validation types
export interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
}

// Auth context types
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// Auth state types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

// API client types
export interface AuthApiClient {
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<LogoutResponse>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  verifyToken: (token: string) => Promise<VerifyTokenResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  me: () => Promise<MeResponse>;
  refresh: () => Promise<RefreshResponse>;
}

// Session storage types
export interface SessionData {
  token: string;
  expiresAt: string;
  rememberMe: boolean;
}

// Constants
export const PASSWORD_MIN_LENGTH = 8;
export const SESSION_EXPIRY_HOURS = 24;
export const REMEMBER_ME_EXPIRY_DAYS = 30;
export const PASSWORD_RESET_EXPIRY_HOURS = 1;

export const PASSWORD_REGEX = {
  minLength: /.{8,}/,
  hasUppercase: /[A-Z]/,
  hasNumber: /[0-9]/,
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Route types
export type AuthRoute = '/login' | '/register' | '/forgot-password' | '/reset-password';
export type ProtectedRoute = '/dashboard' | '/profile' | '/settings';
```