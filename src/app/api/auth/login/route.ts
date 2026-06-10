```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_SESSION = '1d';
const REFRESH_TOKEN_EXPIRY_REMEMBER = '30d';

interface LoginRequestBody {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

interface Session {
  id: string;
  user_id: string;
  access_token_hash: string;
  refresh_token_hash: string;
  expires_at: string;
  remember_me: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Mock database functions - replace with actual database calls
async function getUserByEmail(email: string): Promise<User | null> {
  // This would query your PostgreSQL database
  // For now, returning null to simulate user not found
  // In production, use a proper database client like 'pg' or an ORM
  return null;
}

async function updateLastLogin(userId: string): Promise<void> {
  // Update users.last_login_at in database
}

async function createSession(
  userId: string,
  accessTokenHash: string,
  refreshTokenHash: string,
  expiresAt: Date,
  rememberMe: boolean,
  ipAddress: string | null,
  userAgent: string | null
): Promise<Session> {
  // Insert into sessions table and return the created session
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    access_token_hash: accessTokenHash,
    refresh_token_hash: refreshTokenHash,
    expires_at: expiresAt.toISOString(),
    remember_me: rememberMe,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date().toISOString(),
  };
}

async function logLoginAttempt(
  email: string,
  ipAddress: string,
  successful: boolean
): Promise<void> {
  // Insert into login_attempts table
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
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
  try {
    const body: LoginRequestBody = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validate request body
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent');

    // Retrieve user from database
    const user = await getUserByEmail(email.toLowerCase());

    // If user doesn't exist, return generic error (don't reveal which field is wrong)
    if (!user) {
      await logLoginAttempt(email.toLowerCase(), ipAddress || 'unknown', false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      await logLoginAttempt(email.toLowerCase(), ipAddress || 'unknown', false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate access token
    const accessToken = sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token
    const refreshTokenExpiry = rememberMe ? REFRESH_TOKEN_EXPIRY_REMEMBER : REFRESH_TOKEN_EXPIRY_SESSION;
    const refreshToken = sign(
      { userId: user.id, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: refreshTokenExpiry }
    );

    // Hash tokens for database storage
    const accessTokenHash = hashToken(accessToken);
    const refreshTokenHash = hashToken(refreshToken);

    // Calculate session expiry
    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 30);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 1);
    }

    // Create session in database
    await createSession(
      user.id,
      accessTokenHash,
      refreshTokenHash,
      expiresAt,
      rememberMe,
      ipAddress,
      userAgent
    );

    // Update last login timestamp
    await updateLastLogin(user.id);

    // Log successful login attempt
    await logLoginAttempt(email.toLowerCase(), ipAddress || 'unknown', true);

    // Set HTTP-only cookies
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

    // Set access token cookie
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    // Set refresh token cookie
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 1 day
      path: '/',
    });

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