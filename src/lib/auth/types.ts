```typescript
export interface User {
  id: string;
  email: string;
  accountLockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  isPersistent: boolean;
  createdAt: string;
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
  attemptedAt: string;
  ipAddress: string | null;
  success: boolean;
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  expiresAt: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
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

export interface ValidateResetTokenRequest {
  token: string;
}

export interface ValidateResetTokenResponse {
  valid: boolean;
  message?: string;
}

export interface AuthError {
  message: string;
  field?: string;
  code?: string;
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  meetsRequirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  sessionExpiresAt: string | null;
}

export interface AccountLockoutInfo {
  isLocked: boolean;
  lockedUntil: string | null;
  remainingMinutes: number | null;
  failedAttempts: number;
  maxAttempts: number;
}

export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; expiresAt: string } }
  | { type: 'AUTH_ERROR'; payload: AuthError }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_REFRESH'; payload: { expiresAt: string } }
  | { type: 'AUTH_CLEAR_ERROR' };

export const PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
};

export const ACCOUNT_LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
};

export const SESSION_CONFIG = {
  defaultExpirationMinutes: 60,
  persistentExpirationDays: 30,
  refreshTokenExpirationDays: 30,
};

export const PASSWORD_RESET_CONFIG = {
  tokenExpirationHours: 1,
};
```