```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    // Call FastAPI backend to invalidate tokens
    const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    // Clear cookies regardless of backend response
    // This ensures client-side logout even if backend fails
    const nextResponse = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear access token cookie
    nextResponse.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    // Clear refresh token cookie
    nextResponse.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    // Clear remember me cookie if exists
    nextResponse.cookies.set('remember_me', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return nextResponse;
  } catch (error) {
    console.error('Logout error:', error);

    // Still clear cookies on error to ensure client-side logout
    const nextResponse = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    nextResponse.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    nextResponse.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    nextResponse.cookies.set('remember_me', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return nextResponse;
  }
}
```