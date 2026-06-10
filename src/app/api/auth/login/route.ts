```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import crypto from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret';
const TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function checkRateLimit(email: string, ipAddress: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT COUNT(*) as attempts 
       FROM login_attempts 
       WHERE email = $1 
       AND ip_address = $2 
       AND success = false 
       AND attempted_at > NOW() - INTERVAL '${LOCKOUT_DURATION_MINUTES} minutes'`,
      [email, ipAddress]
    );
    
    return parseInt(result.rows[0].attempts) < MAX_LOGIN_ATTEMPTS;
  } finally {
    client.release();
  }
}

async function logLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean,
  failureReason?: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO login_attempts (email, ip_address, success, failure_reason, attempted_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [email, ipAddress, success, failureReason || null]
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      '0.0.0.0';
    
    const canAttemptLogin = await checkRateLimit(email, ipAddress);
    if (!canAttemptLogin) {
      await logLoginAttempt(email, ipAddress, false, 'rate_limit_exceeded');
      return NextResponse.json(
        { 
          error: 'Too many failed login attempts. Please try again later.',
        },
        { status: 429 }
      );
    }

    const userResult = await client.query(
      `SELECT id, email, password_hash, first_name, last_name, is_active 
       FROM users 
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      await logLoginAttempt(email, ipAddress, false, 'user_not_found');
      return NextResponse.json(
        { error: 'Invalid email or password. Please try again.' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      await logLoginAttempt(email, ipAddress, false, 'account_inactive');
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      await logLoginAttempt(email, ipAddress, false, 'invalid_password');
      return NextResponse.json(
        { error: 'Invalid email or password. Please try again.' },
        { status: 401 }
      );
    }

    const accessToken = sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    const refreshToken = sign(
      { 
        userId: user.id, 
        type: 'refresh' 
      },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    const tokenHash = hashToken(accessToken);
    const refreshTokenHash = hashToken(refreshToken);
    const userAgent = request.headers.get('user-agent') || '';

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO sessions (user_id, token_hash, refresh_token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes', $4, $5)`,
      [user.id, tokenHash, refreshTokenHash, ipAddress, userAgent]
    );

    await client.query(
      `UPDATE users 
       SET last_login_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [user.id]
    );

    await client.query('COMMIT');

    await logLoginAttempt(email, ipAddress, true);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      },
      { status: 200 }
    );

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
```