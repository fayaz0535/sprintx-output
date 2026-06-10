```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h';
const LOCKOUT_DURATION_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  ),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const checkEmailSchema = z.object({
  email: z.string().email(),
});

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

async function isAccountLocked(userId: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT locked_until FROM login_attempts 
       WHERE user_id = $1 AND locked_until > NOW() 
       ORDER BY attempt_time DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length > 0) {
      return { locked: true, lockedUntil: result.rows[0].locked_until };
    }

    return { locked: false };
  } finally {
    client.release();
  }
}

async function getRecentFailedAttempts(userId: string): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE user_id = $1 
       AND success = false 
       AND attempt_time > NOW() - INTERVAL '15 minutes'
       AND (locked_until IS NULL OR locked_until < NOW())`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  } finally {
    client.release();
  }
}

async function recordLoginAttempt(
  userId: string, 
  success: boolean, 
  ipAddress: string,
  shouldLock: boolean = false
): Promise<void> {
  const client = await pool.connect();
  try {
    const lockedUntil = shouldLock 
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000) 
      : null;

    await client.query(
      `INSERT INTO login_attempts (user_id, attempt_time, success, ip_address, locked_until)
       VALUES ($1, NOW(), $2, $3, $4)`,
      [userId, success, ipAddress, lockedUntil]
    );
  } finally {
    client.release();
  }
}

async function resetFailedAttempts(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `DELETE FROM login_attempts WHERE user_id = $1 AND success = false`,
      [userId]
    );
  } finally {
    client.release();
  }
}

async function createSession(userId: string, token: string): Promise<void> {
  const client = await pool.connect();
  try {
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, last_activity, is_active)
       VALUES ($1, $2, $3, NOW(), true)`,
      [userId, tokenHash, expiresAt]
    );
  } finally {
    client.release();
  }
}

async function invalidateSession(token: string): Promise<void> {
  const client = await pool.connect();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    await client.query(
      `UPDATE sessions SET is_active = false WHERE user_id = $1 AND is_active = true`,
      [decoded.userId]
    );
  } finally {
    client.release();
  }
}

async function handleRegister(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const client = await pool.connect();
    try {
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [validatedData.email]
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: 'This email is already registered' },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(validatedData.password, 10);

      const result = await client.query(
        `INSERT INTO users (email, password_hash, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, email, created_at`,
        [validatedData.email, passwordHash]
      );

      return NextResponse.json(
        {
          message: 'Account created successfully',
          user: {
            id: result.rows[0].id,
            email: result.rows[0].email,
            createdAt: result.rows[0].created_at,
          },
        },
        { status: 201 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleLogin(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);
    const ipAddress = getClientIp(req);

    const client = await pool.connect();
    try {
      const userResult = await client.query(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [validatedData.email]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];

      const lockStatus = await isAccountLocked(user.id);
      if (lockStatus.locked) {
        return NextResponse.json(
          { 
            error: 'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.',
            lockedUntil: lockStatus.lockedUntil 
          },
          { status: 403 }
        );
      }

      const passwordMatch = await bcrypt.compare(validatedData.password, user.password_hash);

      if (!passwordMatch) {
        const failedAttempts = await getRecentFailedAttempts(user.id);
        const shouldLock = failedAttempts + 1 >= MAX_FAILED_ATTEMPTS;

        await recordLoginAttempt(user.id, false, ipAddress, shouldLock);

        if (shouldLock) {
          return NextResponse.json(
            { error: 'Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.' },
            { status: 403 }
          );
        }

        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      await resetFailedAttempts(user.id);
      await recordLoginAttempt(user.id, true, ipAddress);

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      await createSession(user.id, token);

      return NextResponse.json(
        {
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            email: user.email,
          },
        },
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleLogout(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    await invalidateSession(token);

    return NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleRefreshToken(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    const client = await pool.connect();
    try {
      const sessionResult = await client.query(
        `SELECT id FROM sessions 
         WHERE user_id = $1 
         AND is_active = true 
         AND expires_at > NOW()`,
        [decoded.userId]
      );

      if (sessionResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        );
      }

      await client.query(
        `UPDATE sessions 
         SET last_activity = NOW() 
         WHERE user_id = $1 AND is_active = true`,
        [decoded.userId]
      );

      const newToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      return NextResponse.json