```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register'];
const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookies
  const token = request.cookies.get('session_token')?.value;

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

  // If user is authenticated and tries to access auth routes, redirect to dashboard
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is not authenticated and tries to access protected route
  if (!token && !isPublicRoute && pathname !== '/') {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set('redirect_after_login', pathname, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
    });
    return response;
  }

  // Validate token for protected routes
  if (token && !isPublicRoute) {
    try {
      const validateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/validate-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!validateResponse.ok) {
        // Token is invalid or expired
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session_token');
        response.cookies.set('session_expired', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60, // 1 minute
        });
        return response;
      }

      // Update last activity
      const response = NextResponse.next();
      response.headers.set('x-user-authenticated', 'true');
      return response;
    } catch (error) {
      // Network error or API unavailable
      console.error('Token validation error:', error);
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```