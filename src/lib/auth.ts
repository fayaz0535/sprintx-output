```typescript
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.REFRESH_SECRET || 'your-refresh-secret-key-change-in-production'
);

export interface TokenPayload {
  userId: string;
  email: string;
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  tokens?: AuthTokens;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

export interface VerifyResponse {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Generate JWT access token
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(payload: TokenPayload, rememberMe: boolean = false): Promise<string> {
  const expirationTime = rememberMe ? '30d' : '7d';
  
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(REFRESH_SECRET);

  return token;
}

/**
 * Verify JWT access token
 */
export async function verifyAccessToken(token: string): Promise<VerifyResponse> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return {
      valid: true,
      payload: payload as TokenPayload,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

/**
 * Verify JWT refresh token
 */
export async function verifyRefreshToken(token: string): Promise<VerifyResponse> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    
    return {
      valid: true,
      payload: payload as TokenPayload,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid refresh token',
    };
  }
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Invalid email or password',
      };
    }

    return {
      success: true,
      tokens: data.tokens,
      user: data.user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during login',
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to refresh token',
      };
    }

    return {
      success: true,
      tokens: data.tokens,
      user: data.user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during token refresh',
    };
  }
}

/**
 * Logout user and invalidate session
 */
export async function logout(accessToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json();
      return {
        success: false,
        error: data.message || 'Logout failed',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during logout',
    };
  }
}

/**
 * Verify current session/token
 */
export async function verifySession(accessToken: string): Promise<VerifyResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return {
        valid: false,
        error: 'Session invalid',
      };
    }

    const data = await response.json();

    return {
      valid: true,
      payload: data.user,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Session verification failed',
    };
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to send reset email',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password: newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to reset password',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(accessToken: string): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to fetch user profile',
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

/**
 * Store tokens in appropriate storage
 */
export function storeTokens(tokens: AuthTokens, rememberMe: boolean = false): void {
  if (typeof window === 'undefined') return;

  const storage = rememberMe ? localStorage : sessionStorage;
  
  storage.setItem('accessToken', tokens.accessToken);
  storage.setItem('refreshToken', tokens.refreshToken);
  storage.setItem('tokenExpiry', String(Date.now() + tokens.expiresIn * 1000));
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiry');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('tokenExpiry');
}

/**
 * Check if access token is expired
 */
export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') return true;

  const expiry = localStorage.getItem('tokenExpiry') || sessionStorage.getItem('tokenExpiry');
  
  if (!expiry) return true;

  return Date.now() >= parseInt(expiry, 10);
}

/**
 * Get authenticated user from token
 */
export async function getAuthenticatedUser(): Promise<TokenPayload | null> {
  const token = getAccessToken();
  
  if (!token) return null;

  if (isTokenExpired()) {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      clearTokens();
      return null;
    }

    const result = await refreshAccessToken(refreshToken);
    
    if (!result.success || !result.tokens) {
      clearTokens();
      return null;
    }

    storeTokens(result.tokens, !!localStorage.getItem('refreshToken'));
  }

  const verification = await verifyAccessToken(token);
  
  return verification.valid && verification.payload ? verification.payload : null;
}
```