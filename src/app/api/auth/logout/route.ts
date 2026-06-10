```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    // Call FastAPI backend to invalidate the session
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // Clear cookies regardless of backend response
    // This ensures client-side cleanup even if backend fails
    const responseHeaders = new Headers();
    
    responseHeaders.append(
      'Set-Cookie',
      `access_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
    );
    
    responseHeaders.append(
      'Set-Cookie',
      `refresh_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Logout failed' }));
      
      // Still return success to client since cookies are cleared
      // But log the backend error
      console.error('Backend logout failed:', errorData);
      
      return NextResponse.json(
        { message: 'Logged out successfully' },
        { status: 200, headers: responseHeaders }
      );
    }

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even on error, clear the cookies to ensure logout
    const responseHeaders = new Headers();
    
    responseHeaders.append(
      'Set-Cookie',
      `access_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
    );
    
    responseHeaders.append(
      'Set-Cookie',
      `refresh_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
    );

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200, headers: responseHeaders }
    );
  }
}
```