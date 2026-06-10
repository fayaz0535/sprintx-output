```typescript
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long'
);
const JWT_ACCESS_EXPIRY = '15m';
const JWT_REFRESH_EXPIRY = '7d';
const JWT_REFRESH_EXPIRY_REMEMBER = '30d';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  lastLoginAt?: Date;
}

export interface VerifyResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_CREDENTIALS' | 'UNAUTHORIZED' | 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'RATE_LIMITED'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function generateTokens(
  userId: string,
  email: string,
  sessionId: string,
  rememberMe: boolean = false
): Promise<AuthTokens> {
  const accessToken = await new SignJWT({
    userId,
    email,
    sessionId,
    type: 'access' as const,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_EXPIRY)
    .sign(JWT_SECRET);

  const refreshExpiry = rememberMe ? JWT_REFRESH_EXPIRY_REMEMBER : JWT_REFRESH_EXPIRY;
  const refreshToken = await new SignJWT({
    userId,
    email,
    sessionId,
    type: 'refresh' as const,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(refreshExpiry)
    .sign(JWT_SECRET);

  const expiresAt = new Date();
  expiresAt.setTime(
    expiresAt.getTime() +
      (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000)
  );

  return {
    accessToken,
    refreshToken,
    expiresAt,
  };
}

export async function verifyAccessToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    if (payload.type !== 'access') {
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    return {
      valid: true,
      payload: payload as TokenPayload,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'JWTExpired') {
        return {
          valid: false,
          error: 'Token expired',
        };
      }
      return {
        valid: false,
        error: 'Invalid token',
      };
    }
    return {
      valid: false,
      error: 'Unknown error',
    };
  }
}

export async function verifyRefreshToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    if (payload.type !== 'refresh') {
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    return {
      valid: true,
      payload: payload as TokenPayload,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'JWTExpired') {
        return {
          valid: false,
          error: 'Token expired',
        };
      }
      return {
        valid: false,
        error: 'Invalid token',
      };
    }
    return {
      valid: false,
      error: 'Unknown error',
    };
  }
}

export function hashToken(token: string): string {
  // In production, use a proper hashing library like bcrypt or crypto
  // This is a simplified version for demonstration
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getTokenFromRequest(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

export function setAuthCookies(
  tokens: AuthTokens,
  rememberMe: boolean = false
): { name: string; value: string; options: any }[] {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = 'lax' as const;
  
  const accessMaxAge = 15 * 60; // 15 minutes
  const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

  return [
    {
      name: 'access_token',
      value: tokens.accessToken,
      options: {
        httpOnly: true,
        secure,
        sameSite,
        maxAge: accessMaxAge,
        path: '/',
      },
    },
    {
      name: 'refresh_token',
      value: tokens.refreshToken,
      options: {
        httpOnly: true,
        secure,
        sameSite,
        maxAge: refreshMaxAge,
        path: '/',
      },
    },
  ];
}

export function clearAuthCookies(): { name: string; options: any }[] {
  return [
    {
      name: 'access_token',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 0,
        path: '/',
      },
    },
    {
      name: 'refresh_token',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 0,
        path: '/',
      },
    },
  ];
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt or argon2
  // This is a simplified version
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // In production, use bcrypt or argon2
  // This is a simplified version
  const crypto = require('crypto');
  const [salt, originalHash] = hash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return originalHash === verifyHash;
}

export function extractClientInfo(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const headers = request.headers;
  
  const ipAddress =
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    null;

  const userAgent = headers.get('user-agent') || null;

  return {
    ipAddress,
    userAgent,
  };
}

export function generatePasswordResetToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

export function isPasswordResetTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function getPasswordResetExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hour expiry
  return expiry;
}
```