```typescript
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface User {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
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
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface SessionData {
  user: User;
  expiresAt: Date;
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(user: User): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    type: 'access',
  } as JWTPayload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(user: User): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    type: 'refresh',
  } as JWTPayload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokens(user: User): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user),
  ]);

  return { accessToken, refreshToken };
}

/**
 * Verify JWT token and extract payload
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });

    return payload as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Verify access token specifically
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const payload = await verifyToken(token);

  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return payload;
}

/**
 * Verify refresh token specifically
 */
export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const payload = await verifyToken(token);

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return payload;
}

/**
 * Authenticate user with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid email or password');
    }
    throw new Error('Authentication failed');
  }

  const data = await response.json();
  return data;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const response = await fetch(`${apiUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  return data.tokens;
}

/**
 * Logout user and invalidate session
 */
export async function logout(accessToken: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const response = await fetch(`${apiUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(accessToken: string): Promise<User> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const response = await fetch(`${apiUrl}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user');
  }

  const data = await response.json();
  return data.user;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const response = await fetch(`${apiUrl}/api/auth/password-reset-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error('Password reset request failed');
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
 * Get error message for authentication errors
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Check if user is authenticated based on token presence and validity
 */
export async function isAuthenticated(accessToken: string | null): Promise<boolean> {
  if (!accessToken) {
    return false;
  }

  try {
    await verifyAccessToken(accessToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract user data from token payload
 */
export function getUserFromToken(payload: JWTPayload): User {
  return {
    id: payload.sub,
    email: payload.email,
  };
}

/**
 * Calculate token expiry date
 */
export function getTokenExpiryDate(payload: JWTPayload): Date | null {
  if (!payload.exp) {
    return null;
  }
  return new Date(payload.exp * 1000);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  const expiryDate = getTokenExpiryDate(payload);
  if (!expiryDate) {
    return true;
  }
  return expiryDate < new Date();
}

/**
 * Hash token for storage (used server-side)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
```