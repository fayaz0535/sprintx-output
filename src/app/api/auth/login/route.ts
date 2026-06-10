```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
const REMEMBER_ME_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

async function checkLoginAttempts(email: string, ipAddress: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const lockoutTime = new Date(Date.now() - LOCKOUT_DURATION);
    const result = await client.query(
      `SELECT COUNT(*) as attempts 
       FROM login_attempts 
       WHERE email = $1 
       AND ip_address = $2 
       AND successful = false 
       AND attempted_at > $3`,
      [email, ipAddress, lockoutTime]
    );

    const attempts = parseInt(result.rows[0].attempts);
    return attempts < MAX_LOGIN_ATTEMPTS;
  } finally {
    client.release();
  }
}

async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  successful: boolean
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO login_attempts (email, ip_address, successful, attempted_at)
       VALUES ($1, $2, $3, NOW())`,
      [email, ipAddress, successful]
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validation
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Get client IP
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Check login attempts
    const canAttempt = await checkLoginAttempts(email, ipAddress);
    if (!canAttempt) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Find user
    const userResult = await client.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      await recordLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await recordLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Record successful login attempt
    await recordLoginAttempt(email, ipAddress, true);

    // Generate tokens
    const accessToken = generateToken();
    const refreshToken = generateToken();

    const accessTokenHash = await hashToken(accessToken);
    const refreshTokenHash = await hashToken(refreshToken);

    // Calculate expiry
    const expiresAt = new Date(
      Date.now() + (rememberMe ? REMEMBER_ME_EXPIRY : REFRESH_TOKEN_EXPIRY)
    );

    // Get user agent
    const userAgent = request.headers.get('user-agent') || '';

    // Create session
    await client.query(
      `INSERT INTO sessions 
       (user_id, access_token_hash, refresh_token_hash, expires_at, remember_me, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [user.id, accessTokenHash, refreshTokenHash, expiresAt, rememberMe, ipAddress, userAgent]
    );

    // Update last login
    await client.query(
      'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Create response with tokens
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken,
        refreshToken,
      },
      { status: 200 }
    );

    // Set HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    response.cookies.set('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_EXPIRY / 1000,
    });

    response.cookies.set('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: rememberMe ? REMEMBER_ME_EXPIRY / 1000 : REFRESH_TOKEN_EXPIRY / 1000,
    });

    return response;
  } catch (error) {
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