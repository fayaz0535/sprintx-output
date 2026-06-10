```typescript
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days
const SESSION_TOKEN_EXPIRES_IN = 24 * 60 * 60; // 24 hours
const REMEMBER_ME_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days

export interface User {
  id: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  remember_me: boolean;
  expires_at: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh' | 'session';
  session_id?: string;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(user: User): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    type: 'access',
  } as AuthTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRES_IN)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(user: User, sessionId: string): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    type: 'refresh',
    session_id: sessionId,
  } as AuthTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRES_IN)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate session token for cookie-based auth
 */
export async function generateSessionToken(user: User, sessionId: string, rememberMe: boolean): Promise<string> {
  const expiresIn = rememberMe ? REMEMBER_ME_EXPIRES_IN : SESSION_TOKEN_EXPIRES_IN;
  
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    type: 'session',
    session_id: sessionId,
  } as AuthTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<AuthTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AuthTokenPayload;
  } catch (error) {
    throw new AuthError('Invalid or expired token', 401);
  }
}

/**
 * Hash password using crypto (to be used with backend)
 */
export async function hashPassword(password: string): Promise<string> {
  // This is a placeholder - actual hashing should be done on backend
  // Frontend should send plain password over HTTPS
  return password;
}

/**
 * Validate password meets requirements
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new AuthError(error.detail || 'Invalid email or password', response.status);
  }

  const data: AuthResponse = await response.json();
  return data;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (sessionToken) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Clear client-side cookies
  cookieStore.delete('session_token');
  cookieStore.delete('refresh_token');
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new AuthError('Failed to refresh token', response.status);
  }

  const data: AuthResponse = await response.json();
  return data;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email