```typescript
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production'
);

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface User {
  id: string;
  email: string;
  status: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(
  userId: string,
  email: string
): Promise<string> {
  const token = await new SignJWT({
    userId,
    email,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(
  userId: string,
  email: string
): Promise<string> {
  const token = await new SignJWT({
    userId,
    email,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET);

  return token;
}

/**
 * Generate both access and refresh tokens
 */
export async function generateAuthTokens(
  userId: string,
  email: string
): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId, email),
    generateRefreshToken(userId, email),
  ]);

  return { accessToken, refreshToken };
}

/**
 * Verify JWT access token
 */
export async function verifyAccessToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    if (payload.type !== 'access') {
      return {
        success: false,
        error: 'Invalid token type',
      };
    }

    return {
      success: true,
      payload: payload as unknown as JWTPayload,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

/**
 * Verify JWT refresh token
 */
export async function verifyRefreshToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    
    if (payload.type !== 'refresh') {
      return {
        success: false,
        error: 'Invalid token type',
      };
    }

    return {
      success: true,
      payload: payload as unknown as JWTPayload,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

/**
 * Set authentication cookies
 */
export async function setAuthCookies(tokens: AuthTokens): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  cookieStore.set('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

/**
 * Clear authentication cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
}

/**
 * Get access token from cookies
 */
export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value;
}

/**
 * Get refresh token from cookies
 */
export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('refreshToken')?.value;
}

/**
 * Get current authenticated user from cookies
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = await getAccessToken();
    
    if (!token) {
      return null;
    }

    const verifyResult = await verifyAccessToken(token);
    
    if (!verifyResult.success || !verifyResult.payload) {
      return null;
    }

    // Fetch user from backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength (minimum requirements)
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Rate limiting helper - check if IP/email has exceeded login attempts
 */
export function canAttemptLogin(attempts: number, maxAttempts: number = 5): boolean {
  return attempts < maxAttempts;
}

/**
 * Calculate rate limit reset time
 */
export function getRateLimitResetTime(lastAttempt: Date, lockoutMinutes: number = 15): Date {
  const resetTime = new Date(lastAttempt);
  resetTime.setMinutes(resetTime.getMinutes() + lockoutMinutes);
  return resetTime;
}

/**
 * Generate password reset token hash
 */
export async function generatePasswordResetToken(): Promise<string> {
  const token = crypto.randomUUID();
  return token;
}

/**
 * Hash password reset token for storage
 */
export async function hashResetToken(token: string): Promise<string> {
  return hashPassword(token);
}

/**
 * Verify password reset token
 */
export async function verifyResetToken(
  token: string,
  hash: string
): Promise<boolean> {
  return verifyPassword(token, hash);
}

/**
 * Extract device info from user agent
 */
export function extractDeviceInfo(userAgent: string): string {
  // Simple device info extraction - can be enhanced with a library like ua-parser-js
  const info = {
    browser: 'Unknown',
    os: 'Unknown',
  };

  if (userAgent.includes('Chrome')) info.browser = 'Chrome';
  else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
  else if (userAgent.includes('Safari')) info.browser = 'Safari';
  else if (userAgent.includes('Edge')) info.browser = 'Edge';

  if (userAgent.includes('Windows')) info.os = 'Windows';
  else if (userAgent.includes('Mac')) info.os = 'macOS';
  else if (userAgent.includes('Linux')) info.os = 'Linux';
  else if (userAgent.includes('Android')) info.os = 'Android';
  else if (userAgent.includes('iOS')) info.os = 'iOS';

  return `${info.browser} on ${info.os}`;
}

/**
 * Sanitize email for storage and comparison
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Calculate token expiry date
 */
export function calculateTokenExpiry(hours: number = 24): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}
```