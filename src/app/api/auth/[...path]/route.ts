```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const LOCKOUT_DURATION_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const checkEmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Database query helpers
async function query(sql: string, params: any[] = []) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/db/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  
  if (!response.ok) {
    throw new Error('Database query failed');
  }
  
  return response.json();
}

// Helper functions
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

async function getClientIp(request: NextRequest): Promise<string> {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

async function checkAccountLockout(userId: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const result = await query(
    `SELECT locked_until FROM login_attempts 
     WHERE user_id = $1 AND locked_until > NOW() 
     ORDER BY attempt_time DESC LIMIT 1`,
    [userId]
  );

  if (result.rows && result.rows.length > 0) {
    return { locked: true, lockedUntil: new Date(result.rows[0].locked_until) };
  }

  return { locked: false };
}

async function getFailedAttemptCount(userId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM login_attempts 
     WHERE user_id = $1 
     AND success = false 
     AND attempt_time > NOW() - INTERVAL '15 minutes'
     AND (locked_until IS NULL OR locked_until < NOW())`,
    [userId]
  );

  return parseInt(result.rows[0]?.count || '0');
}

async function recordLoginAttempt(userId: string, success: boolean, ipAddress: string) {
  const failedCount = success ? 0 : await getFailedAttemptCount(userId) + 1;
  const shouldLock = failedCount >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000) : null;

  await query(
    `INSERT INTO login_attempts (user_id, attempt_time, success, ip_address, locked_until)
     VALUES ($1, NOW(), $2, $3, $4)`,
    [userId, success, ipAddress, lockedUntil]
  );

  if (success) {
    await query(
      `DELETE FROM login_attempts 
       WHERE user_id = $1 AND success = false`,
      [userId]
    );
  }

  return { shouldLock, lockedUntil };
}

async function createSession(userId: string, token: string) {
  const tokenHash = await hashPassword(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, last_activity)
     VALUES ($1, $2, $3, NOW())`,
    [userId, tokenHash, expiresAt]
  );
}

async function invalidateSession(token: string) {
  const tokenHash = await hashPassword(token);
  
  await query(
    `UPDATE sessions SET is_active = false WHERE token_hash = $1`,
    [tokenHash]
  );
}

async function updateSessionActivity(userId: string) {
  await query(
    `UPDATE sessions SET last_activity = NOW() 
     WHERE user_id = $1 AND is_active = true AND expires_at > NOW()`,
    [userId]
  );
}

// Route handlers
async function handleRegister(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows && existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    return NextResponse.json(
      { 
        message: 'Account created successfully',
        user: { id: user.id, email: user.email }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}

async function handleLogin(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    const ipAddress = await getClientIp(request);

    // Find user
    const userResult = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Check account lockout
    const lockout = await checkAccountLockout(user.id);
    if (lockout.locked) {
      const remainingMinutes = Math.ceil(
        (lockout.lockedUntil!.getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        { 
          error: `Account temporarily locked due to multiple failed attempts. Try again in ${remainingMinutes} minutes.`
        },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      const { shouldLock } = await recordLoginAttempt(user.id, false, ipAddress);
      
      if (shouldLock) {
        return NextResponse.json(
          { 
            error: 'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.'
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Successful login
    await recordLoginAttempt(user.id, true, ipAddress);
    const token = generateToken(user.id);
    await createSession(user.id, token);

    const response = NextResponse.json(
      { 
        message: 'Login successful',
        user: { id: user.id, email: user.email }
      },
      { status: 200 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

async function handleLogout(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      await invalidateSession(token);
    }

    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    response.cookies.delete('auth-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}

async function handleValidateToken(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { valid: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if session is still active
    const sessionResult = await query(
      `SELECT id FROM sessions 
       WHERE user_id = $1 
       AND is_active = true 
       AND expires_at > NOW()`,
      [decoded.userId]
    );

    if (!sessionResult