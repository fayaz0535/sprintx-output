```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase, lowercase, number, and special character'
    ),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase, lowercase, number, and special character'
    ),
});

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function generateSessionToken(): string {
  return randomBytes(64).toString('hex');
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await pool.query(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

async function validateSession(token: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );

  return result.rows[0]?.user_id || null;
}

async function deleteSession(token: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
}

async function handleRegister(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [validatedData.email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(validatedData.password);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [validatedData.email, passwordHash]
    );

    return NextResponse.json(
      { message: 'Account created successfully', userId: result.rows[0].id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

async function handleLogin(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE email = $1',
      [validatedData.email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const isValidPassword = await verifyPassword(
      validatedData.password,
      user.password_hash
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const sessionToken = await createSession(user.id);

    const response = NextResponse.json(
      { message: 'Login successful', userId: user.id },
      { status: 200 }
    );

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

async function handleLogout(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionToken = req.cookies.get('session_token')?.value;

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    response.cookies.delete('session_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

async function handleSession(req: NextRequest): Promise<NextResponse> {
  try {
    const sessionToken = req.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const userId = await validateSession(sessionToken);

    if (!userId) {
      const response = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
      response.cookies.delete('session_token');
      return response;
    }

    const result = await pool.query(
      'SELECT id, email, created_at, last_login FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

async function handleForgotPassword(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validatedData = forgotPasswordSchema.parse(body);

    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [validatedData.email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'If the email exists, a reset link has been sent' },
        { status: 200 }
      );
    }

    const userId = result.rows[0].id;
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    // In a real application, send email here
    console.log(`Password reset token for ${validatedData.email}: ${token}`);

    return NextResponse.json(
      { message: 'If the email exists, a reset link has been sent' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}

async function handleResetPassword(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validatedData = resetPasswordSchema.parse(body);

    const result = await pool.query(
      'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = false',
      [validatedData.token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Reset link expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const userId = result.rows[0].user_id;
    const passwordHash = await hashPassword(validatedData.password);

    await pool.query('BEGIN');

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [validatedData.token]
    );

    await pool.query('COMMIT');

    return NextResponse.json(
      { message: 'Password reset successful' },
      { status: 200 }
    );
  } catch (error) {
    await pool.query('ROLLBACK');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }