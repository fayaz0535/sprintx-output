```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || '', {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : undefined,
});

const ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    const refreshTokenHash = hashToken(refreshToken);

    // Find the session with the refresh token
    const sessions = await sql`
      SELECT 
        s.id,
        s.user_id,
        s.expires_at,
        s.ip_address,
        s.user_agent,
        u.email,
        u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.refresh_token_hash = ${refreshTokenHash}
      AND s.expires_at > NOW()
      LIMIT 1
    `;

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const session = sessions[0];

    // Check if user is still active
    if (!session.is_active) {
      await sql`
        DELETE FROM sessions
        WHERE id = ${session.id}
      `;

      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      );
    }

    // Generate new access token and refresh token
    const newAccessToken = generateToken();
    const newRefreshToken = generateToken();
    const newAccessTokenHash = hashToken(newAccessToken);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000);

    // Get IP address and user agent from request
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    // Update the session with new tokens
    await sql`
      UPDATE sessions
      SET 
        token_hash = ${newAccessTokenHash},
        refresh_token_hash = ${newRefreshTokenHash},
        expires_at = ${refreshExpiresAt.toISOString()},
        ip_address = ${ipAddress}::inet,
        user_agent = ${userAgent}
      WHERE id = ${session.id}
    `;

    // Update user's last login timestamp
    await sql`
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = ${session.user_id}
    `;

    // Create response
    const response = NextResponse.json(
      {
        message: 'Token refreshed successfully',
        access_token: newAccessToken,
        expires_in: ACCESS_TOKEN_EXPIRES_IN,
      },
      { status: 200 }
    );

    // Set new HTTP-only cookies
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_EXPIRES_IN,
      path: '/',
    });

    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_EXPIRES_IN,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);

    return NextResponse.json(
      { error: 'Internal server error during token refresh' },
      { status: 500 }
    );
  }
}
```