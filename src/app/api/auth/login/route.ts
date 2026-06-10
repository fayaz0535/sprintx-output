```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const SESSION_EXPIRY_SHORT = 24 * 60 * 60 * 1000; // 1 day
const SESSION_EXPIRY_LONG = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

async function checkRateLimit(email: string, ipAddress: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const cutoffTime = new Date(Date.now() - RATE_LIMIT_WINDOW);
    
    const result = await client.query(
      `SELECT COUNT(*) as attempt_count 
       FROM login_attempts 
       WHERE email = $1 
       AND ip_address = $2 
       AND attempted_at > $3 
       AND successful = false`,
      [email, ipAddress, cutoffTime]
    );
    
    const attemptCount = parseInt(result.rows[0].attempt_count, 10);
    return attemptCount < MAX_ATTEMPTS;
  } finally {
    client.release();
  }
}

async function logLoginAttempt(
  email: string,
  ipAddress: string,
  successful: boolean
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO login_attempts (email, ip_address, successful) 
       VALUES ($1, $2, $3)`,
      [email, ipAddress, successful]
    );
  } finally {
    client.release();
  }
}

async function findUserByEmail(email: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function createSession(
  userId: string,
  rememberMe: boolean
): Promise<{ accessToken: string; refreshToken: string | null }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const accessToken = generateToken();
    const accessTokenHash = hashToken(accessToken);
    const sessionExpiry = new Date(
      Date.now() + (rememberMe ? SESSION_EXPIRY_LONG : SESSION_EXPIRY_SHORT)
    );
    
    await client.query(
      `INSERT INTO sessions (user_id, access_token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [userId, accessTokenHash, sessionExpiry]
    );
    
    let refreshToken = null;
    if (rememberMe) {
      refreshToken = generateToken();
      const refreshTokenHash = hashToken(refreshToken);
      const refreshExpiry = new Date(Date.now() + SESSION_EXPIRY_LONG);
      
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
         VALUES ($1, $2, $3)`,
        [userId, refreshTokenHash, refreshExpiry]
      );
    }
    
    await client.query('COMMIT');
    
    return { accessToken, refreshToken };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
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
    
    const { email, password, rememberMe } = validation.data;
    const ipAddress = getClientIp(request);
    
    const withinRateLimit = await checkRateLimit(email, ipAddress);
    if (!withinRateLimit) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const user = await findUserByEmail(email);
    
    if (!user) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    await logLoginAttempt(email, ipAddress, true);
    
    const { accessToken, refreshToken } = await createSession(
      user.id,
      rememberMe
    );
    
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 200 }
    );
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: rememberMe 
        ? SESSION_EXPIRY_LONG / 1000 
        : SESSION_EXPIRY_SHORT / 1000,
    };
    
    response.cookies.set('accessToken', accessToken, cookieOptions);
    
    if (refreshToken) {
      response.cookies.set('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: SESSION_EXPIRY_LONG / 1000,
      });
    }
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
```