```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get session token from cookies
  const sessionToken = request.cookies.get('session_token')?.value
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Auth routes that should redirect if already authenticated
  const authRoutes = ['/login', '/']
  const isAuthRoute = authRoutes.includes(pathname)
  
  // Check if user is authenticated
  const isAuthenticated = await validateSession(sessionToken)
  
  // Redirect to login if trying to access protected route without auth
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    // Store the original URL to redirect back after login
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Redirect to dashboard if trying to access login page while authenticated
  if (isAuthRoute && isAuthenticated) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }
  
  return NextResponse.next()
}

async function validateSession(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false
  }
  
  try {
    // Validate session with backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': `session_token=${token}`,
      },
      cache: 'no-store',
    })
    
    return response.ok
  } catch (error) {
    console.error('Session validation error:', error)
    return false
  }
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/forgot-password',
  ],
}
```