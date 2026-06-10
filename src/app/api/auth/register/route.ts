```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';

const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(254, 'Email too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[^A-Za-z0-9]/,
      'Password must contain at least one special character'
    ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path[0],
        message: err.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUserResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUserResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user
      const createUserResult = await client.query(
        `INSERT INTO users (email, password_hash, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, now(), now())
         RETURNING id, email, is_verified, created_at`,
        [normalizedEmail, passwordHash, false]
      );

      const user = createUserResult.rows[0];

      // Generate verification token
      const verificationToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

      await client.query(
        `INSERT INTO verification_tokens (user_id, token, expires_at, created_at)
         VALUES ($1, $2, $3, now())`,
        [user.id, verificationToken, expiresAt]
      );

      await client.query('COMMIT');

      // Send verification email (async, don't wait)
      sendVerificationEmail(user.email, verificationToken).catch((error) => {
        console.error('Failed to send verification email:', error);
      });

      return NextResponse.json(
        {
          message: 'Registration successful. Please check your email to verify your account.',
          user: {
            id: user.id,
            email: user.email,
            isVerified: user.is_verified,
            createdAt: user.created_at,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
```