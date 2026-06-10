```typescript
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SESSION_TOKEN_EXPIRY = '24h';
const PERSISTENT_TOKEN_EXPIRY = '30d';

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
}

export interface SessionData {
  userId: string;
  email: string;
  isPersistent: boolean;
  expiresAt: Date;
}

/**
 * Generate access token (short-lived)
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate refresh token (long-lived)
 */
export async function generateRefreshToken(
  payload: TokenPayload,
  rememberMe: boolean = false
): Promise<string> {
  const expiry = rememberMe ? PERSISTENT_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY;

  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate session token for cookie-based authentication
 */
export async function generateSessionToken(
  payload: TokenPayload,
  isPersistent: boolean = false
): Promise<string> {
  const expiry = isPersistent ? PERSISTENT_TOKEN_EXPIRY : SESSION_TOKEN_EXPIRY;

  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    isPersistent,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hash token for database storage
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password requirements
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate login credentials
 */
export function validateLoginCredentials(credentials: LoginCredentials): {
  isValid: boolean;
  errors: { email?: string; password?: string };
} {
  const errors: { email?: string; password?: string } = {};

  if (!credentials.email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(credentials.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!credentials.password) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculate session expiry date
 */
export function getSessionExpiryDate(isPersistent: boolean): Date {
  const now = new Date();
  const expiryMs = isPersistent ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return new Date(now.getTime() + expiryMs);
}

/**
 * Check if session is expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Generate random token string
 */
export function generateRandomToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse authorization header
 */
export function parseAuthorizationHeader(
  authHeader: string | null
): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Get cookie options for session management
 */
export function getCookieOptions(isPersistent: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: isPersistent ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
  };
}

/**
 * Sanitize user data for client response
 */
export function sanitizeUser(user: {
  id: string;
  email: string;
  password_hash?: string;
  created_at?: Date;
  updated_at?: Date;
  last_login_at?: Date;
}) {
  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Extract client info from request
 */
export function extractClientInfo(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : request.headers.get('x-real-ip') || null;

  const userAgent = request.headers.get('user-agent') || null;

  return { ipAddress, userAgent };
}

/**
 * Error messages
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  INVALID_EMAIL: 'Please enter a valid email address',
  EMAIL_REQUIRED: 'Email is required',
  PASSWORD_REQUIRED: 'Password is required',
  INVALID_TOKEN: 'Invalid or expired token',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'Unauthorized access',
  SERVER_ERROR: 'An error occurred. Please try again.',
} as const;
```