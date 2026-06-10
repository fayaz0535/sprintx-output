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

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getExpirationDate(rememberMe: boolean): Date {
  const expiresAt = new Date();
  if (rememberMe) {
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
  } else {
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours
  }
  return expiresAt;
}

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (real) {
    return real;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.reduce((acc, err) => {
        acc[err.path[0]] = err.message;
        return acc;
      }, {} as Record<string, string>);
      
      return NextResponse.json(
        { 
          error: 'Validation failed',
          errors 
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = validationResult.data;

    const userResult = await client.query(
      'SELECT id, email, password_hash, email_verified_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const sessionToken = generateToken();
    const sessionTokenHash = hashToken(sessionToken);
    const expiresAt = getExpirationDate(rememberMe);
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent');

    await client.query(
      `INSERT INTO sessions (user_id, token_hash, remember_me, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, sessionTokenHash, rememberMe, expiresAt, ipAddress, userAgent]
    );

    const refreshToken = generateToken();
    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 60); // 60 days

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshTokenHash, refreshExpiresAt]
    );

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: !!user.email_verified_at,
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

    response.cookies.set('session_token', sessionToken, {
      ...cookieOptions,
      expires: expiresAt,
    });

    response.cookies.set('refresh_token', refreshToken, {
      ...cookieOptions,
      expires: refreshExpiresAt,
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