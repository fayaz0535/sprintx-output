```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const SESSION_EXPIRY_HOURS = 24;
const PERSISTENT_SESSION_DAYS = 30;
const RESET_TOKEN_EXPIRY_HOURS = 1;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

async function getFailedAttempts(email: string): Promise<number> {
  const fifteenMinutesAgo = new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000);
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM login_attempts 
     WHERE email = $1 AND attempted_at > $2 AND success = false`,
    [email.toLowerCase(), fifteenMinutesAgo]
  );
  return parseInt(result.rows[0].count);
}

async function recordLoginAttempt(email: string, success: boolean, ipAddress: string | null) {
  await pool.query(
    `INSERT INTO login_attempts (email, success, ip_address) VALUES ($1, $2, $3)`,
    [email.toLowerCase(), success, ipAddress]
  );
}

async function clearLoginAttempts(email: string) {
  await pool.query(
    `DELETE FROM login_attempts WHERE email = $1`,
    [email.toLowerCase()]
  );
}

async function isAccountLocked(userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT account_locked_until FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return false;
  
  const lockedUntil = result.rows[0].account_locked_until;
  if (!lockedUntil) return false;
  
  return new Date(lockedUntil) > new Date();
}

async function lockAccount(userId: string) {
  const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
  await pool.query(
    `UPDATE users SET account_locked_until = $1, updated_at = NOW() WHERE id = $2`,
    [lockUntil, userId]
  );
}

async function unlockAccount(userId: string) {
  await pool.query(
    `UPDATE users SET account_locked_until = NULL, updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

async function handleRegister(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with 1 uppercase letter and 1 number' },
        { status: 400 }
      );
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)`,
      [email.toLowerCase(), passwordHash]
    );

    return NextResponse.json(
      { message: 'Account created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}

async function handleLogin(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, rememberMe = false } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;

    const failedAttempts = await getFailedAttempts(email);
    if (failedAttempts >= LOCKOUT_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Account temporarily locked due to multiple failed attempts' },
        { status: 423 }
      );
    }

    const userResult = await pool.query(
      'SELECT id, email, password_hash, account_locked_until FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      await recordLoginAttempt(email, false, ipAddress);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    if (await isAccountLocked(user.id)) {
      return NextResponse.json(
        { error: 'Account temporarily locked due to multiple failed attempts' },
        { status: 423 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await recordLoginAttempt(email, false, ipAddress);
      
      const updatedFailedAttempts = await getFailedAttempts(email);
      if (updatedFailedAttempts >= LOCKOUT_ATTEMPTS) {
        await lockAccount(user.id);
        return NextResponse.json(
          { error: 'Account temporarily locked due to multiple failed attempts' },
          { status: 423 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await recordLoginAttempt(email, true, ipAddress);
    await clearLoginAttempts(email);
    await unlockAccount(user.id);

    const token = generateToken();
    const tokenHash = hashToken(token);
    
    const expiresAt = rememberMe
      ? new Date(Date.now() + PERSISTENT_SESSION_DAYS * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, is_persistent) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, tokenHash, expiresAt, rememberMe]
    );

    const response = NextResponse.json(
      { 
        message: 'Login successful',
        user: { id: user.id, email: user.email }
      },
      { status: 200 }
    );

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

async function handleLogout(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;

    if (token) {
      const tokenHash = hashToken(token);
      await pool.query(
        'DELETE FROM sessions WHERE token_hash = $1',
        [tokenHash]
      );
    }

    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    response.cookies.delete('session_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}

async function handleRefresh(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    const tokenHash = hashToken(token);

    const sessionResult = await pool.query(
      `SELECT s.user_id, s.expires_at, s.is_persistent, u.email 
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = $1`,
      [tokenHash]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    const session = sessionResult.rows[0];

    if (new Date(session.expires_at) < new Date()) {
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    const newExpiresAt = session.is_persistent
      ? new Date(Date.now() + PERSISTENT_SESSION_DAYS * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    await pool.query(
      'UPDATE sessions SET expires_at = $1 WHERE token_hash = $2',
      [newExpiresAt, tokenHash]
    );

    const response = NextResponse.json(
      { 
        message: 'Session refreshed',
        user: { id: session.user_id, email: session.email }
      },
      { status: 200 }
    );

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: newExpiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'An error occurred during session refresh' },
      { status: 500 }
    );
  }
}

async function handleForgotPassword(req: NextRequest) {
  try {