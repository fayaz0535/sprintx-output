```typescript
import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { sql } from '@vercel/postgres';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const SESSION_DURATION_DAYS = 7;
const REFRESH_TOKEN_DURATION_DAYS = 30;

interface LoginRequestBody {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequestBody = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check for rate limiting based on recent failed attempts
    const recentAttempts = await sql`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE email = ${email.toLowerCase()}
        AND success = false
        AND attempted_at > NOW() - INTERVAL '${LOCKOUT_DURATION_MINUTES} minutes'
    `;

    const failedAttempts = parseInt(recentAttempts.rows[0]?.count || '0', 10);

    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      await sql`
        INSERT INTO login_attempts (email, ip_address, success, failure_reason)
        VALUES (${email.toLowerCase()}, ${ipAddress}::inet, false, 'rate_limited')
      `;

      return NextResponse.json(
        { 
          error: 'Too many failed login attempts. Please try again later.',
          retryAfter: LOCKOUT_DURATION_MINUTES * 60
        },
        { status: 429 }
      );
    }

    // Fetch user from database
    const userResult = await sql`
      SELECT id, email, password_hash, first_name, last_name, is_active
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;

    if (userResult.rows.length === 0) {
      // Log failed attempt
      await sql`
        INSERT INTO login_attempts (email, ip_address, success, failure_reason)
        VALUES (${email.toLowerCase()}, ${ipAddress}::inet, false, 'user_not_found')
      `;

      return NextResponse.json(
        { error: 'Invalid email or password. Please try again.' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Check if account is active
    if (!user.is_active) {
      await sql`
        INSERT INTO login_attempts (email, ip_address, success, failure_reason)
        VALUES (${email.toLowerCase()}, ${ipAddress}::inet, false, 'account_inactive')
      `;

      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    const passwordMatch = await compare(password, user.password_hash);

    if (!passwordMatch) {
      // Log failed attempt
      await sql`
        INSERT INTO login_attempts (email, ip_address, success, failure_reason)
        VALUES (${email.toLowerCase()}, ${ipAddress}::inet, false, 'invalid_password')
      `;

      return NextResponse.json(
        { error: 'Invalid email or password. Please try again.' },
        { status: 401 }
      );
    }

    // Generate session tokens
    const sessionToken = randomBytes(32).toString('hex');
    const refreshToken = randomBytes(32).toString('hex');

    const sessionTokenHash = createHash('sha256')
      .update(sessionToken)
      .digest('hex');
    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + REFRESH_TOKEN_DURATION_DAYS);

    // Create session in database
    const sessionResult = await sql`
      INSERT INTO sessions (
        user_id, 
        token_hash, 
        refresh_token_hash, 
        expires_at, 
        ip_address, 
        user_agent
      )
      VALUES (
        ${user.id}, 
        ${sessionTokenHash}, 
        ${refreshTokenHash}, 
        ${expiresAt.toISOString()}, 
        ${ipAddress}::inet, 
        ${userAgent}
      )
      RETURNING id
    `;

    // Update last login timestamp
    await sql`
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = ${user.id}
    `;

    // Log successful login attempt
    await sql`
      INSERT INTO login_attempts (email, ip_address, success)
      VALUES (${email.toLowerCase()}, ${ipAddress}::inet, true)
    `;

    // Prepare response
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      },
      { status: 200 }
    );

    // Set HTTP-only cookies for tokens
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: '/'
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_DURATION_DAYS * 24 * 60 * 60,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
```