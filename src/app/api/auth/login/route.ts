```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface User {
  id: string;
  email: string;
  password_hash: string;
}

const SESSION_EXPIRY_SHORT = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_EXPIRY_LONG = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
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

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body: LoginRequest = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Find user by email
    const userResult = await client.query<User>(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await client.query(
      'UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1',
      [user.id]
    );

    // Generate session token
    const sessionToken = generateToken();
    const sessionTokenHash = hashToken(sessionToken);
    const sessionExpiry = rememberMe ? SESSION_EXPIRY_LONG : SESSION_EXPIRY_SHORT;
    const expiresAt = new Date(Date.now() + sessionExpiry);

    // Get client information
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create session
    const sessionResult = await client.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, remember_me, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [user.id, sessionTokenHash, expiresAt, rememberMe, ipAddress, userAgent]
    );

    const sessionId = sessionResult.rows[0].id;

    // Generate refresh token
    const refreshToken = generateToken();
    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshTokenHash, refreshExpiresAt]
    );

    await client.query('COMMIT');

    // Create response
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

    // Set session cookie
    const sessionCookieOptions = [
      `session_token=${sessionToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/',
      `Max-Age=${Math.floor(sessionExpiry / 1000)}`,
    ];

    response.headers.set('Set-Cookie', sessionCookieOptions.join('; '));

    // Set refresh token cookie
    const refreshCookieOptions = [
      `refresh_token=${refreshToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/api/auth/refresh',
      `Max-Age=${Math.floor(REFRESH_TOKEN_EXPIRY / 1000)}`,
    ];

    response.headers.append('Set-Cookie', refreshCookieOptions.join('; '));

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