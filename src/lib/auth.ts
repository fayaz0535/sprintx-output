```typescript
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(
  process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret-min-32-chars'
);
const REFRESH_TOKEN_SECRET = new TextEncoder().encode(
  process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-min-32-chars'
);

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const SESSION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface User {
  id: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  access_token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  attempted_at: Date;
  successful: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface DecodedToken {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Hash a token using SHA-256 for database storage
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random token
 */
export function generateToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Create an access token JWT
 */
export async function createAccessToken(
  userId: string,
  email: string
): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(ACCESS_TOKEN_SECRET);
}

/**
 * Create a refresh token (opaque token, not JWT)
 */
export function createRefreshToken(): string {
  return generateToken(32);
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(
  token: string
): Promise<DecodedToken | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_TOKEN_SECRET);
    return payload as unknown as DecodedToken;
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookies
 */
export async function setAuthCookies(
  accessToken: string,
  refreshToken?: string,
  rememberMe: boolean = false
): Promise<void> {
  const cookieStore = cookies();
  
  // Set access token cookie (httpOnly, secure, sameSite)
  cookieStore.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? REFRESH_TOKEN_EXPIRY / 1000 : SESSION_TOKEN_EXPIRY / 1000,
    path: '/',
  });

  // Set refresh token cookie if provided and remember me is enabled
  if (refreshToken && rememberMe) {
    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_EXPIRY / 1000,
      path: '/',
    });
  }
}

/**
 * Clear authentication cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = cookies();
  
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<DecodedToken | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    return null;
  }

  return verifyAccessToken(accessToken);
}

/**
 * Check if a user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Get access token from cookies
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get('accessToken')?.value || null;
}

/**
 * Get refresh token from cookies
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get('refreshToken')?.value || null;
}

/**
 * Calculate token expiration date
 */
export function getTokenExpiration(expiryMs: number): Date {
  return new Date(Date.now() + expiryMs);
}

/**
 * Validate email format (RFC 5322 compliant)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Sanitize email address (lowercase, trim)
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Check if password meets minimum requirements
 */
export function isValidPassword(password: string): boolean {
  // Minimum 8 characters
  return password.length >= 8;
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Create CSRF token
 */
export function createCsrfToken(): string {
  return generateToken(32);
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);
  
  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}

/**
 * Rate limiting check - returns true if rate limit exceeded
 */
export function checkRateLimit(
  attempts: LoginAttempt[],
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now();
  const recentAttempts = attempts.filter(
    attempt => now - attempt.attempted_at.getTime() < windowMs
  );
  
  return recentAttempts.length >= maxAttempts;
}

/**
 * Calculate lockout time remaining in seconds
 */
export function getLockoutTimeRemaining(
  lastAttempt: Date,
  lockoutDurationMs: number = 15 * 60 * 1000 // 15 minutes
): number {
  const now = Date.now();
  const lockoutEnd = lastAttempt.getTime() + lockoutDurationMs;
  const remaining = Math.max(0, lockoutEnd - now);
  
  return Math.ceil(remaining / 1000);
}

/**
 * Format error messages for authentication failures
 */
export const AuthErrors = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_REQUIRED: 'Email is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  PASSWORD_REQUIRED: 'Password is required',
  RATE_LIMIT_EXCEEDED: 'Too many login attempts. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You must be logged in to access this resource',
  INVALID_TOKEN: 'Invalid or expired token',
  CSRF_VALIDATION_FAILED: 'Invalid request. Please try again.',
} as const;

export type AuthError = typeof AuthErrors[keyof typeof AuthErrors];
```