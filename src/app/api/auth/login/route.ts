```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const SESSION_DURATION_HOURS = 24;
const REFRESH_TOKEN_DURATION_DAYS = 30;

async function checkLoginAttempts(email: string, ipAddress: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count 
       FROM login_attempts 
       WHERE email = $1 
       AND ip_address = $2 
       AND success = false 
       AND attempted_at > NOW() - INTERVAL '${LOCKOUT_DURATION_MINUTES} minutes'`,
      [email, ipAddress]
    );
    
    const attemptCount = parseInt(result.rows[0].count);
    return attemptCount < MAX_LOGIN_ATTEMPTS;
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

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

async function createSession(
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<{ token: string; refreshToken: string }> {
  const token = generateToken();
  const refreshToken = generateToken();
  
  const tokenHash = await hashToken(token);
  const refreshTokenHash = await hashToken(refreshToken);
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);
  
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO sessions (user_id, token_hash, refresh_token_hash, expires_at, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, tokenHash, refreshTokenHash, expiresAt, ipAddress, userAgent]
    );
    
    await client.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [userId]
    );
  } finally {
    client.release();
  }
  
  return { token, refreshToken };
}

export async function POST(request: NextRequest) {
  let email = '';
  let ipAddress = '';
  
  try {
    const body = await request.json();
    
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }
    
    email = validationResult.data.email;
    const password = validationResult.data.password;
    
    ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                request.headers.get('x-real-ip') || 
                '127.0.0.1';
    
    const canAttemptLogin = await checkLoginAttempts(email, ipAddress);
    
    if (!canAttemptLogin) {
      await logLoginAttempt(email, ipAddress, false, 'Too many attempts');
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
        },
        { status: 429 }
      );
    }
    
    const client = await pool.connect();
    let user;
    
    try {
      const result = await client.query(
        `SELECT id, email, password_hash, first_name, last_name, is_active 
         FROM users 
         WHERE email = $1`,
        [email]
      );
      
      user = result.rows[0];
    } finally {
      client.release();
    }
    
    if (!user) {
      await logLoginAttempt(email, ipAddress, false, 'User not found');
      return NextResponse.json(
        {
          error: 'Invalid email or password. Please try again.',
        },
        { status: 401 }
      );
    }
    
    if (!user.is_active) {
      await logLoginAttempt(email, ipAddress, false, 'Account inactive');
      return NextResponse.json(
        {
          error: 'Account is inactive. Please contact support.',
        },
        { status: 403 }
      );
    }
    
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      await logLoginAttempt(email, ipAddress, false, 'Invalid password');
      return NextResponse.json(
        {
          error: 'Invalid email or password. Please try again.',
        },
        { status: 401 }
      );
    }
    
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const { token, refreshToken } = await createSession(
      user.id,
      ipAddress,
      userAgent
    );
    
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
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
    
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + SESSION_DURATION_HOURS);
    
    const refreshTokenExpires = new Date();
    refreshTokenExpires.setDate(refreshTokenExpires.getDate() + REFRESH_TOKEN_DURATION_DAYS);
    
    response.cookies.set('session_token', token, {
      ...cookieOptions,
      expires: tokenExpires,
    });
    
    response.cookies.set('refresh_token', refreshToken, {
      ...cookieOptions,
      expires: refreshTokenExpires,
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    
    if (email && ipAddress) {
      try {
        await logLoginAttempt(email, ipAddress, false, 'Server error');
      } catch (logError) {
        console.error('Failed to log login attempt:', logError);
      }
    }
    
    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}
```