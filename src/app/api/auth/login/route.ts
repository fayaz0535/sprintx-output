```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

interface User {
  id: string;
  email: string;
  password_hash: string;
}

interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  is_persistent: boolean;
  expires_at: Date;
}

const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const createSession = async (
  userId: string,
  isPersistent: boolean,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ sessionToken: string; expiresAt: Date }> => {
  const sessionToken = generateToken();
  const tokenHash = hashToken(sessionToken);
  
  // Session expires in 24 hours for non-persistent, 30 days for persistent
  const expiresAt = new Date();
  if (isPersistent) {
    expiresAt.setDate(expiresAt.getDate() + 30);
  } else {
    expiresAt.setHours(expiresAt.getHours() + 24);
  }

  const query = `
    INSERT INTO sessions (user_id, token_hash, is_persistent, expires_at, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;

  await pool.query(query, [
    userId,
    tokenHash,
    isPersistent,
    expiresAt,
    ipAddress,
    userAgent,
  ]);

  return { sessionToken, expiresAt };
};

const createRefreshToken = async (userId: string): Promise<{ refreshToken: string; expiresAt: Date }> => {
  const refreshToken = generateToken();
  const tokenHash = hashToken(refreshToken);
  
  // Refresh token expires in 90 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const query = `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id
  `;

  await pool.query(query, [userId, tokenHash, expiresAt]);

  return { refreshToken, expiresAt };
};

const updateLastLogin = async (userId: string): Promise<void> => {
  const query = `
    UPDATE users
    SET last_login_at = now()
    WHERE id = $1
  `;

  await pool.query(query, [userId]);
};

const getClientIp = (request: NextRequest): string | null => {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
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

    // Find user by email
    const userQuery = `
      SELECT id, email, password_hash
      FROM users
      WHERE email = $1
    `;

    const userResult = await pool.query<User>(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get client information
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent');

    // Create session
    const { sessionToken, expiresAt: sessionExpiresAt } = await createSession(
      user.id,
      rememberMe,
      ipAddress,
      userAgent
    );

    // Create refresh token if remember me is checked
    let refreshToken: string | null = null;
    let refreshExpiresAt: Date | null = null;
    
    if (rememberMe) {
      const refreshData = await createRefreshToken(user.id);
      refreshToken = refreshData.refreshToken;
      refreshExpiresAt = refreshData.expiresAt;
    }

    // Update last login timestamp
    await updateLastLogin(user.id);

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
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiresAt,
      path: '/',
    });

    // Set refresh token cookie if remember me is checked
    if (refreshToken && refreshExpiresAt) {
      response.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: refreshExpiresAt,
        path: '/',
      });
    }

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