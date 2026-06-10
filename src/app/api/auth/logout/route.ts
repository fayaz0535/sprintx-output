```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Call backend logout endpoint
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // Clear cookies regardless of backend response
    const responseHeaders = new Headers();
    responseHeaders.set(
      'Set-Cookie',
      'access_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    );
    responseHeaders.append(
      'Set-Cookie',
      'refresh_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    );

    if (!response.ok) {
      // Even if backend fails, we clear client-side tokens
      return NextResponse.json(
        { message: 'Logged out (session may still exist on server)' },
        { status: 200, headers: responseHeaders }
      );
    }

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    console.error('Logout error:', error);
    
    // Clear cookies even on error
    const responseHeaders = new Headers();
    responseHeaders.set(
      'Set-Cookie',
      'access_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    );
    responseHeaders.append(
      'Set-Cookie',
      'refresh_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    );

    return NextResponse.json(
      { message: 'Logged out (client-side only)' },
      { status: 200, headers: responseHeaders }
    );
  }
}
```