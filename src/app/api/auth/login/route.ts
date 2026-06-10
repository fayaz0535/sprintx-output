```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Database connection (you'll need to set up your actual DB connection)
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Find user by email
    const userResult = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

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

    // Generate session token
    const sessionToken = uuidv4();
    const tokenHash = await bcrypt.hash(sessionToken, 10);
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    // Create session in database
    await query(
      'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const jwtToken = sign(
      {
        userId: user.id,
        email: user.email,
        sessionToken,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    const cookieStore = cookies();
    cookieStore.set('auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000, // Convert to seconds
      path: '/',
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
        token: jwtToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
```