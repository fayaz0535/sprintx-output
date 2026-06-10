```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const SESSION_DURATION_HOURS = 24;
const REMEMBER_ME_DURATION_DAYS = 30;

const loginSchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  let client;

  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    const { email, password, rememberMe } = validatedData;

    client = await pool.connect();

    // Check if account is locked
    const lockoutQuery = await client.query(
      `SELECT failed_count, locked_until 
       FROM login_attempts 
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    const lockoutRecord = lockoutQuery.rows[0];

    if (lockoutRecord?.locked_until) {
      const lockedUntil = new Date(lockoutRecord.locked_until);
      const now = new Date();

      if (now < lockedUntil) {
        const remainingSeconds = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
        return NextResponse.json(
          {
            error: 'Account is temporarily locked due to too many failed login attempts',
            locked: true,
            remainingSeconds,
          },
          { status: 429 }
        );
      } else {
        // Lock has expired, reset the record
        await client.query(
          `UPDATE login_attempts 
           SET failed_count = 0, locked_until = NULL, updated_at = now() 
           WHERE email = $1`,
          [email.toLowerCase()]
        );
      }
    }

    // Get user from database
    const userQuery = await client.query(
      `SELECT id, email, password_hash, is_verified 
       FROM users 
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = userQuery.rows[0];

    // Validate credentials
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      // Increment failed attempts
      const failedCount = (lockoutRecord?.failed_count || 0) + 1;
      const shouldLock = failedCount >= LOCKOUT_THRESHOLD;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : null;

      if (lockoutRecord) {
        await client.query(
          `UPDATE login_attempts 
           SET failed_count = $1, locked_until = $2, last_attempt_at = now(), updated_at = now() 
           WHERE email = $3`,
          [failedCount, lockedUntil, email.toLowerCase()]
        );
      } else {
        await client.query(
          `INSERT INTO login_attempts (email, failed_count, locked_until, last_attempt_at) 
           VALUES ($1, $2, $3, now())`,
          [email.toLowerCase(), failedCount, lockedUntil]
        );
      }

      if (shouldLock) {
        return NextResponse.json(
          {
            error: 'Account locked due to too many failed login attempts',
            locked: true,
            remainingSeconds: LOCKOUT_DURATION_MINUTES * 60,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.is_verified) {
      return NextResponse.json(
        {
          error: 'Please verify your email address before logging in',
          requiresVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Reset failed login attempts on successful login
    await client.query(
      `DELETE FROM login_attempts WHERE email = $1`,
      [email.toLowerCase()]
    );

    // Create session token
    const expiresAt = new Date(
      Date.now() +
        (rememberMe
          ? REMEMBER_ME_DURATION_DAYS * 24 * 60 * 60 * 1000
          : SESSION_DURATION_HOURS * 60 * 60 * 1000)
    );

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      rememberMe,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: rememberMe ? `${REMEMBER_ME_DURATION_DAYS}d` : `${SESSION_DURATION_HOURS}h`,
    });

    // Store session in database
    await client.query(
      `INSERT INTO sessions (user_id, token, remember_me, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, token, rememberMe, expiresAt]
    );

    // Clean up expired sessions for this user
    await client.query(
      `DELETE FROM sessions 
       WHERE user_id = $1 AND expires_at < now()`,
      [user.id]
    );

    // Create response with session cookie
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
        },
        token,
      },
      { status: 200 }
    );

    // Set httpOnly cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe
        ? REMEMBER_ME_DURATION_DAYS * 24 * 60 * 60
        : SESSION_DURATION_HOURS * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
```