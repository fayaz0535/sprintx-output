```typescript
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);
const JWT_EXPIRY = '24h';
const LOCKOUT_DURATION_MINUTES = 15;
const MAX_LOGIN_ATTEMPTS = 5;

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
  is_active: boolean;
}

export interface LoginAttempt {
  id: string;
  user_id: string;
  attempt_time: string;
  success: boolean;
  ip_address: string | null;
  locked_until: string | null;
}

export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: Omit<User, 'password_hash'>;
  error?: string;
  locked_until?: string;
}

/**
 * Validates password strength requirements
 */
export function validatePasswordStrength(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

/**
 * Checks if password meets all strength requirements
 */
export function isPasswordValid(password: string): boolean {
  const requirements = validatePasswordStrength(password);
  return Object.values(requirements).every(Boolean);
}

/**
 * Validates email format
 */
export function isEmailValid(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Hashes a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verifies a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates a JWT token for a user
 */
export async function createToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verifies and decodes a JWT token
 */
export async function verifyToken(token: string): Promise<{
  userId: string;
  email: string;
} | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as { userId: string; email: string };
  } catch (error) {
    return null;
  }
}

/**
 * Gets the current user from the session token
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  email: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return null;
    }

    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

/**
 * Sets the session token cookie
 */
export async function setSessionToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

/**
 * Clears the session token cookie
 */
export async function clearSessionToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
}

/**
 * Checks if a user account is locked due to failed login attempts
 */
export async function isAccountLocked(
  userId: string,
  db: any
): Promise<{ locked: boolean; locked_until?: Date }> {
  const now = new Date();
  
  // Get the most recent login attempt with lock information
  const result = await db.query(
    `SELECT locked_until 
     FROM login_attempts 
     WHERE user_id = $1 
       AND locked_until IS NOT NULL 
       AND locked_until > $2
     ORDER BY attempt_time DESC 
     LIMIT 1`,
    [userId, now]
  );

  if (result.rows.length > 0) {
    return {
      locked: true,
      locked_until: new Date(result.rows[0].locked_until),
    };
  }

  return { locked: false };
}

/**
 * Records a login attempt and handles account lockout logic
 */
export async function recordLoginAttempt(
  userId: string,
  success: boolean,
  ipAddress: string | null,
  db: any
): Promise<{ should_lock: boolean; locked_until?: Date }> {
  const now = new Date();

  if (success) {
    // Record successful attempt
    await db.query(
      `INSERT INTO login_attempts (user_id, attempt_time, success, ip_address, locked_until)
       VALUES ($1, $2, $3, $4, NULL)`,
      [userId, now, true, ipAddress]
    );

    // Clear any existing locks
    await db.query(
      `UPDATE login_attempts 
       SET locked_until = NULL 
       WHERE user_id = $1`,
      [userId]
    );

    return { should_lock: false };
  }

  // Count recent failed attempts (within last 15 minutes)
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const failedAttemptsResult = await db.query(
    `SELECT COUNT(*) as count 
     FROM login_attempts 
     WHERE user_id = $1 
       AND success = false 
       AND attempt_time > $2`,
    [userId, fifteenMinutesAgo]
  );

  const failedCount = parseInt(failedAttemptsResult.rows[0].count);

  let locked_until = null;
  if (failedCount >= MAX_LOGIN_ATTEMPTS - 1) {
    // This is the 5th failed attempt, lock the account
    locked_until = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
  }

  // Record failed attempt
  await db.query(
    `INSERT INTO login_attempts (user_id, attempt_time, success, ip_address, locked_until)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, now, false, ipAddress, locked_until]
  );

  return {
    should_lock: locked_until !== null,
    locked_until: locked_until || undefined,
  };
}

/**
 * Creates a session in the database
 */
export async function createSession(
  userId: string,
  token: string,
  db: any
): Promise<void> {
  const tokenHash = await hashPassword(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  await db.query(
    `INSERT INTO sessions (user_id, token_hash, created_at, expires_at, last_activity, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, tokenHash, now, expiresAt, now, true]
  );
}

/**
 * Invalidates a session in the database
 */
export async function invalidateSession(token: string, db: any): Promise<void> {
  const tokenHash = await hashPassword(token);
  
  await db.query(
    `UPDATE sessions 
     SET is_active = false 
     WHERE token_hash = $1`,
    [tokenHash]
  );
}

/**
 * Updates session last activity timestamp
 */
export async function updateSessionActivity(
  token: string,
  db: any
): Promise<void> {
  const tokenHash = await hashPassword(token);
  const now = new Date();

  await db.query(
    `UPDATE sessions 
     SET last_activity = $1 
     WHERE token_hash = $2 AND is_active = true`,
    [now, tokenHash]
  );
}

/**
 * Validates if a session is still active and not expired
 */
export async function validateSession(
  token: string,
  db: any
): Promise<boolean> {
  const tokenHash = await hashPassword(token);
  const now = new Date();

  const result = await db.query(
    `SELECT * 
     FROM sessions 
     WHERE token_hash = $1 
       AND is_active = true 
       AND expires_at > $2`,
    [tokenHash, now]
  );

  return result.rows.length > 0;
}

/**
 * Formats lockout duration for display
 */
export function formatLockoutDuration(locked_until: Date): string {
  const now = new Date();
  const diffMs = locked_until.getTime() - now.getTime();
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));

  if (diffMinutes <= 0) {
    return '0 minutes';
  }

  return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
}

/**
 * Password requirements configuration
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

/**
 * Generic error messages to prevent email enumeration
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'This email is already registered',
  INVALID_EMAIL: 'Please enter a valid email address',
  WEAK_PASSWORD: 'Password does not meet strength requirements',
  ACCOUNT_LOCKED: 'Account temporarily locked due to multiple failed attempts. Try again in',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You must be logged in to access this page',
};
```
```