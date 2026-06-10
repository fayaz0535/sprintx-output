```typescript
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  message?: string;
}

export interface AuthError {
  message: string;
  field?: 'email' | 'password' | 'general';
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  lastAccessedAt: string;
}

export interface RefreshTokenResponse {
  user: User;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

export interface ValidationError {
  field: 'email' | 'password';
  message: string;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
```