```typescript
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-characters-long'
);

const JWT_ACCESS_EXPIRY = '15m';
const JWT_REFRESH_EXPIRY_SESSION = '24h';
const JWT_REFRESH_EXPIRY_REMEMBER = '30d';

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DecodedToken {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  sessionId?: string;
  exp: number;
  iat: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ApiError {
  message: string;
  field?: string;
  code?: string;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export async function generateAccessToken(
  userId: string,
  email: string,
  sessionId?: string
): Promise<string> {
  return await new SignJWT({ userId, email, type: 'access', sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_EXPIRY)
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(
  userId: string,
  email: string,
  sessionId: string,
  rememberMe: boolean = false
): Promise<string> {
  const expiry = rememberMe ? JWT_REFRESH_EXPIRY_REMEMBER : JWT_REFRESH_EXPIRY_SESSION;
  
  return await new SignJWT({ userId, email, type: 'refresh', sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<DecodedToken> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as DecodedToken;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token', undefined, 'TOKEN_INVALID');
  }
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        remember_me: credentials.rememberMe || false,
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Invalid email or password' }));
      throw new AuthenticationError(
        error.message || 'Invalid email or password',
        error.field,
        error.code || 'AUTH_FAILED'
      );
    }

    const data = await response.json();
    return data as LoginResponse;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Unable to connect to server. Please try again.', undefined, 'NETWORK_ERROR');
  }
}

export async function logout(): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new AuthenticationError('Session expired. Please log in again.', undefined, 'REFRESH_FAILED');
    }

    const data = await response.json();
    return data.tokens as AuthTokens;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Unable to refresh session. Please log in again.', undefined, 'REFRESH_ERROR');
  }
}

export async function verifyAuth(): Promise<User> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${apiUrl}/api/auth/verify`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new AuthenticationError('Not authenticated', undefined, 'NOT_AUTHENTICATED');
    }

    const data = await response.json();
    return data.user as User;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Unable to verify authentication', undefined, 'VERIFY_ERROR');
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to send reset email' }));
      throw new AuthenticationError(error.message || 'Failed to send reset email', undefined, 'RESET_FAILED');
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Unable to send password reset email', undefined, 'NETWORK_ERROR');
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to reset password' }));
      throw new AuthenticationError(error.message || 'Failed to reset password', undefined, 'RESET_FAILED');
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Unable to reset password', undefined, 'NETWORK_ERROR');
  }
}

export async function getUserProfile(): Promise<User> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${apiUrl}/api/user/profile`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new AuthenticationError('Failed to fetch user profile', undefined, 'PROFILE_FAILED');
    }

    const data = await response.json();
    return data.user as User;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Unable to fetch user profile', undefined, 'NETWORK_ERROR');
  }
}

export function setAuthTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  localStorage.setItem('tokenExpiry', (Date.now() + tokens.expiresIn * 1000).toString());
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiry');
}

export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') return true;
  
  const expiry = localStorage.getItem('tokenExpiry');
  if (!expiry) return true;
  
  return Date.now() >= parseInt(expiry, 10);
}

export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = getAccessToken();
  
  if (!accessToken || isTokenExpired()) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthTokens();
      return null;
    }
    
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      setAuthTokens(newTokens);
      return newTokens.accessToken;
    } catch (error) {
      clearAuthTokens();
      return null;
    }
  }
  
  return accessToken;
}

export function hashToken(token: string): string {
  // Simple hash for demonstration - in production use proper crypto library
  return Buffer.from(token).toString('base64');
}
```