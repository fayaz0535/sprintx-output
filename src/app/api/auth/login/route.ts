```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

async function generateToken(userId: string, expiresIn: string) {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET_KEY);
}

async function hashToken(token: string): Promise<string> {
  return await bcrypt.hash(token, 10);
}

async function logLoginAttempt(
  email: string,
  ipAddress: string,
  successful: boolean
) {
  try {
    await pool.query(
      'INSERT INTO login_attempts (email, ip_address, successful) VALUES ($1, $2, $3)',
      [email, ipAddress, successful]
    );
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

async function checkRateLimit(email: string, ipAddress: string): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const result = await pool.query(
    `SELECT COUNT(*) as attempt_count 
     FROM login_attempts 
     WHERE (email = $1 OR ip_address = $2) 
     AND successful = false 
     AND attempted_at > $3`,
    [email, ipAddress, fiveMinutesAgo]
  );

  const attemptCount = parseInt(result.rows[0]?.attempt_count || '0');
  return attemptCount >= 5;
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = validationResult.data;
    
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const isRateLimited = await checkRateLimit(email, ipAddress);
    if (isRateLimited) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const userResult = await client.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await client.query('BEGIN');

    const accessTokenExpiry = rememberMe ? '30d' : '1h';
    const refreshTokenExpiry = rememberMe ? '30d' : '7d';
    
    const accessToken = await generateToken(user.id, accessTokenExpiry);
    const refreshToken = await generateToken(user.id, refreshTokenExpiry);

    const accessTokenHash = await hashToken(accessToken);
    const refreshTokenHash = await hashToken(refreshToken);

    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      expiresAt.setHours(expiresAt.getHours() + 1);
    }

    await client.query(
      `INSERT INTO sessions 
       (user_id, access_token_hash, refresh_token_hash, expires_at, remember_me, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, accessTokenHash, refreshTokenHash, expiresAt, rememberMe, ipAddress, userAgent]
    );

    await client.query(
      'UPDATE users SET last_login_at = now() WHERE id = $1',
      [user.id]
    );

    await logLoginAttempt(email, ipAddress, true);

    await client.query('COMMIT');

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 200 }
    );

    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 60 * 60;
    const refreshCookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshCookieMaxAge,
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