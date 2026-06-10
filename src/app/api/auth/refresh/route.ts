```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = refreshTokenSchema.parse(body);

    // Hash the refresh token to compare with database
    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Verify refresh token exists and is not expired
    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token_hash: refreshTokenHash,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid or expired refresh token' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: errorData.detail || 'Failed to refresh token' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return new access token and optionally new refresh token
    return NextResponse.json(
      {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
        user: data.user,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```