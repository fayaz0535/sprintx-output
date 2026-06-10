```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Call FastAPI backend authentication endpoint
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle authentication failure
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      
      // Handle other errors from backend
      return NextResponse.json(
        { error: data.error || 'Authentication failed' },
        { status: response.status }
      );
    }

    // Successful authentication
    const { access_token, refresh_token, user } = data;

    // Create response with user data
    const nextResponse = NextResponse.json(
      { 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        }
      },
      { status: 200 }
    );

    // Set httpOnly cookies for tokens
    nextResponse.cookies.set({
      name: 'access_token',
      value: access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    nextResponse.cookies.set({
      name: 'refresh_token',
      value: refresh_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return nextResponse;
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle network or unexpected errors
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
```