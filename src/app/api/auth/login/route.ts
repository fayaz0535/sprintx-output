```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REMEMBER_ME_EXPIRY = '30d';

async function logLoginAttempt(
  email: string,
  ipAddress: string,
  successful: boolean
) {
  try {
    await pool.query(
      `INSERT INTO login_attempts (email, ip_address, successful, attempted_at)
       VALUES ($1, $2, $3, NOW())`,
      [email, ipAddress, successful]
    );
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

async function checkRateLimit(email: string, ipAddress: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as attempt_count
       FROM login_attempts
       WHERE (email = $1 OR ip_address = $2)
       AND successful = false
       AND attempted_at > NOW() - INTERVAL '15 minutes'`,
      [email, ipAddress]
    );

    const attemptCount = parseInt(result.rows[0]?.attempt_count || '0');
    return attemptCount < 5;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true;
  }
}

function hashToken(token: string): string {
  return bcrypt.hashSync(token, 10);
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = validation.data;

    const isAllowed = await checkRateLimit(email, ipAddress);
    if (!isAllowed) {
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
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await logLoginAttempt(email, ipAddress, true);

    await client.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    const accessToken = uuidv4();
    const refreshToken = uuidv4();

    const accessTokenHash = hashToken(accessToken);
    const refreshTokenHash = hashToken(refreshToken);

    const expiryDuration = rememberMe ? REMEMBER_ME_EXPIRY : REFRESH_TOKEN_EXPIRY;
    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    await client.query(
      `INSERT INTO sessions (user_id, access_token_hash, refresh_token_hash, expires_at, remember_me, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [user.id, accessTokenHash, refreshTokenHash, expiresAt, rememberMe, ipAddress, userAgent]
    );

    const jwtPayload = {
      userId: user.id,
      email: user.email,
      tokenId: accessToken,
    };

    const jwtToken = sign(
      jwtPayload,
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken: jwtToken,
        refreshToken: refreshToken,
      },
      { status: 200 }
    );

    const cookieExpiry = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    response.cookies.set('accessToken', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieExpiry,
      path: '/',
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieExpiry,
      path: '/',
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