```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

async function logLoginAttempt(
  email: string,
  ipAddress: string | null,
  success: boolean
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO login_attempts (email, ip_address, success, attempted_at)
       VALUES ($1, $2, $3, NOW())`,
      [email, ipAddress, success]
    );
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    'SELECT id, email, password_hash, created_at, updated_at, last_login_at FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function updateLastLogin(userId: string): Promise<void> {
  await pool.query(
    'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
    [userId]
  );
}

async function createRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [userId, tokenHash, expiresAt]
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

export async function POST(request: NextRequest) {
  let email = '';
  const ipAddress = getClientIp(request);

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
          success: false,
          errors,
        },
        { status: 400 }
      );
    }

    const { email: validatedEmail, password } = validationResult.data;
    email = validatedEmail;

    // Get user from database
    const user = await getUserByEmail(email);

    if (!user) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password',
        },
        { status: 401 }
      );
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = generateRefreshToken();

    // Save refresh token to database
    await createRefreshToken(user.id, refreshToken);

    // Update last login
    await updateLastLogin(user.id);

    // Log successful login
    await logLoginAttempt(email, ipAddress, true);

    // Create response with httpOnly cookie
    const response = NextResponse.json(
      {
        success: true,
        data: {
          accessToken,
          user: {
            id: user.id,
            email: user.email,
          },
        },
      },
      { status: 200 }
    );

    // Set refresh token as httpOnly cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_EXPIRES_IN / 1000, // maxAge is in seconds
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);

    // Log failed attempt if we have the email
    if (email) {
      await logLoginAttempt(email, ipAddress, false);
    }

    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('connect')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unable to connect. Please try again later',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to connect. Please try again later',
      },
      { status: 500 }
    );
  }
}
```