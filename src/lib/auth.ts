```typescript
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);
const JWT_ISSUER = 'auth-service';
const JWT_AUDIENCE = 'auth-client';

export interface User {
  id: string;
  email: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface AuthError {
  message: string;
  code: string;
}

/**
 * Generate JWT access token
 * @param user - User object
 * @returns JWT access token string
 */
export async function generateAccessToken(user: User): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('15m') // 15 minutes
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate JWT refresh token
 * @param user - User object
 * @param rememberMe - Whether to extend token lifetime
 * @returns JWT refresh token string
 */
export async function generateRefreshToken(
  user: User,
  rememberMe: boolean = false
): Promise<string> {
  const expirationTime = rememberMe ? '30d' : '7d';

  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(expirationTime)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode JWT token
 * @param token - JWT token string
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as unknown as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Login with email and password
 * @param credentials - Login credentials
 * @returns Login response with user and tokens
 * @throws Error if authentication fails
 */
export async function login(
  credentials: LoginCredentials
): Promise<LoginResponse> {
  const { email, password, rememberMe = false } = credentials;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, rememberMe }),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Invalid email or password');
  }

  const data = await response.json();
  return data;
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - Refresh token string
 * @returns New access token
 * @throws Error if refresh fails
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<string> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const data: RefreshTokenResponse = await response.json();
  return data.accessToken;
}

/**
 * Logout user and revoke tokens
 * @param refreshToken - Refresh token to revoke
 * @throws Error if logout fails
 */
export async function logout(refreshToken?: string): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to logout');
  }
}

/**
 * Get current authenticated user
 * @param accessToken - Access token
 * @returns User object
 * @throws Error if request fails
 */
export async function getCurrentUser(accessToken: string): Promise<User> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  const data = await response.json();
  return data.user;
}

/**
 * Request password reset
 * @param email - User email address
 * @throws Error if request fails
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/auth/password-reset-request`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to request password reset');
  }
}

/**
 * Store tokens in localStorage
 * @param tokens - Auth tokens object
 */
export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

/**
 * Get stored access token
 * @returns Access token or null
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/**
 * Get stored refresh token
 * @returns Refresh token or null
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * Check if user is authenticated
 * @returns Boolean indicating authentication status
 */
export function isAuthenticated(): boolean {
  const accessToken = getAccessToken();
  return !!accessToken;
}

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get validation error message for email
 * @param email - Email string
 * @param touched - Whether field has been touched
 * @returns Error message or null
 */
export function getEmailError(email: string, touched: boolean): string | null {
  if (!touched) return null;
  if (!email) return 'Email is required';
  if (!isValidEmail(email)) return 'Please enter a valid email address';
  return null;
}

/**
 * Get validation error message for password
 * @param password - Password string
 * @param touched - Whether field has been touched
 * @returns Error message or null
 */
export function getPasswordError(
  password: string,
  touched: boolean
): string | null {
  if (!touched) return null;
  if (!password) return 'Password is required';
  return null;
}

/**
 * Handle authentication error
 * @param error - Error object
 * @returns User-friendly error message
 */
export function handleAuthError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Setup automatic token refresh
 * @param onTokenRefreshed - Callback when token is refreshed
 * @returns Cleanup function
 */
export function setupTokenRefresh(
  onTokenRefreshed?: (accessToken: string) => void
): () => void {
  const intervalId = setInterval(
    async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return;

      try {
        const newAccessToken = await refreshAccessToken(refreshToken);
        localStorage.setItem('accessToken', newAccessToken);
        onTokenRefreshed?.(newAccessToken);
      } catch (error) {
        console.error('Failed to refresh token:', error);
        clearTokens();
      }
    },
    14 * 60 * 1000
  ); // Refresh every 14 minutes (access token expires in 15 minutes)

  return () => clearInterval(intervalId);
}
```