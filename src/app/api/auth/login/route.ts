```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 1;
const REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER = 30;

function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return bcrypt.hashSync(token, 10);
}

async function createSession(
  userId: string,
  rememberMe: boolean,
  ipAddress: string | null,
  userAgent: string | null
): Promise<string> {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresInDays = rememberMe ? REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER : REFRESH_TOKEN_EXPIRES_DAYS;
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await pool.query(
    `INSERT INTO sessions (user_id, refresh_token_hash, remember_me, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, refreshTokenHash, rememberMe, expiresAt, ipAddress, userAgent]
  );

  return refreshToken;
}

function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return null;
}

function getUserAgent(request: NextRequest): string | null {
  return request.headers.get('user-agent');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.reduce((acc, error) => {
        acc[error.path[0]] = error.message;
        return acc;
      }, {} as Record<string, string>);
      
      return NextResponse.json(
        { 
          success: false,
          errors,
          message: 'Validation failed'
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = validationResult.data;

    const userResult = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);

    const refreshToken = await createSession(
      user.id,
      rememberMe,
      ipAddress,
      userAgent
    );

    const accessToken = generateAccessToken(user.id, user.email);

    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
        },
        accessToken,
      },
      { status: 200 }
    );

    const refreshTokenMaxAge = rememberMe 
      ? REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER * 24 * 60 * 60 
      : REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60;

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshTokenMaxAge,
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred during login. Please try again.',
      },
      { status: 500 }
    );
  }
}
```