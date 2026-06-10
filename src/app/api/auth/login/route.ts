```typescript
import { NextRequest, NextResponse } from 'next/server';
import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

interface LoginRequestBody {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Database connection helper (mocked for this implementation)
async function queryDatabase(query: string, params: any[]) {
  // In a real implementation, this would use pg or another PostgreSQL client
  // For now, returning mock structure
  throw new Error('Database connection not configured');
}

// Helper to hash refresh token
async function hashToken(token: string): Promise<string> {
  return hash(token, 10);
}

// Helper to generate refresh token
function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

// Helper to get client IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Helper to get device info
function getDeviceInfo(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return userAgent.substring(0, 500);
}

// Log login attempt
async function logLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean
): Promise<void> {
  try {
    await queryDatabase(
      `INSERT INTO login_attempts (email, ip_address, success, created_at)
       VALUES ($1, $2, $3, now())`,
      [email, ipAddress, success]
    );
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}

// Find user by email
async function findUserByEmail(email: string) {
  try {
    const result = await queryDatabase(
      `SELECT id, email, password_hash, last_login_at, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
}

// Update last login time
async function updateLastLogin(userId: string): Promise<void> {
  try {
    await queryDatabase(
      `UPDATE users
       SET last_login_at = now(), updated_at = now()
       WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
}

// Create refresh token
async function createRefreshToken(
  userId: string,
  token: string,
  deviceInfo: string,
  ipAddress: string,
  expiresInDays: number
): Promise<void> {
  const tokenHash = await hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  
  try {
    await queryDatabase(
      `INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [userId, tokenHash, deviceInfo, ipAddress, expiresAt]
    );
  } catch (error) {
    console.error('Failed to create refresh token:', error);
    throw error;
  }
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequestBody = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: {
            email: !email ? 'Email is required' : undefined,
            password: !password ? 'Password is required' : undefined,
          },
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: {
            email: 'Please enter a valid email address',
          },
        },
        { status: 400 }
      );
    }

    const ipAddress = getClientIP(request);

    // Find user
    const user = await findUserByEmail(email.toLowerCase());

    if (!user) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password_hash);

    if (!isPasswordValid) {
      await logLoginAttempt(email, ipAddress, false);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Log successful attempt
    await logLoginAttempt(email, ipAddress, true);

    // Update last login
    await updateLastLogin(user.id);

    // Generate JWT access token
    const accessToken = sign(
      {
        userId: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Generate refresh token
    const refreshToken = generateRefreshToken();
    const deviceInfo = getDeviceInfo(request);
    const refreshTokenExpiryDays = rememberMe ? REFRESH_TOKEN_EXPIRES_DAYS : 1;

    await createRefreshToken(
      user.id,
      refreshToken,
      deviceInfo,
      ipAddress,
      refreshTokenExpiryDays
    );

    // Prepare response
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          lastLoginAt: user.last_login_at,
        },
        accessToken,
      },
      { status: 200 }
    );

    // Set refresh token as HTTP-only cookie
    const cookieMaxAge = rememberMe
      ? REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60
      : 24 * 60 * 60;

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred during login',
      },
      { status: 500 }
    );
  }
}
```