```typescript
import { api } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    createdAt: string;
    lastLoginAt: string | null;
  };
  tokens: AuthTokens;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

/**
 * Authenticate user with email and password
 * @param credentials - User login credentials
 * @returns Authentication response with user data and tokens
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  
  // Store tokens in appropriate storage based on rememberMe flag
  if (credentials.rememberMe) {
    localStorage.setItem('accessToken', response.tokens.accessToken);
    localStorage.setItem('refreshToken', response.tokens.refreshToken);
  } else {
    sessionStorage.setItem('accessToken', response.tokens.accessToken);
    sessionStorage.setItem('refreshToken', response.tokens.refreshToken);
  }
  
  return response;
}

/**
 * Refresh access token using refresh token
 * @returns New authentication tokens
 */
export async function refreshToken(): Promise<AuthTokens> {
  const refreshToken = 
    localStorage.getItem('refreshToken') || 
    sessionStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await api.post<AuthTokens>('/auth/refresh', {
    refreshToken
  });
  
  // Update stored tokens
  const storage = localStorage.getItem('refreshToken') ? localStorage : sessionStorage;
  storage.setItem('accessToken', response.accessToken);
  storage.setItem('refreshToken', response.refreshToken);
  
  return response;
}

/**
 * Log out user and invalidate session
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    // Clear tokens regardless of API response
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  }
}

/**
 * Request password reset email
 * @param request - Email address for password reset
 */
export async function forgotPassword(request: ForgotPasswordRequest): Promise<void> {
  await api.post('/auth/forgot-password', request);
}

/**
 * Reset password using token from email
 * @param request - Reset token and new password
 */
export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await api.post('/auth/reset-password', request);
}

/**
 * Verify current authentication token
 * @returns Token validity and user data if valid
 */
export async function verifyToken(): Promise<VerifyTokenResponse> {
  const accessToken = 
    localStorage.getItem('accessToken') || 
    sessionStorage.getItem('accessToken');
  
  if (!accessToken) {
    return { valid: false };
  }
  
  try {
    const response = await api.get<VerifyTokenResponse>('/auth/verify');
    return response;
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Get current user profile
 * @returns User profile data
 */
export async function getUserProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>('/user/profile');
  return response;
}

/**
 * Get stored access token
 * @returns Access token or null if not found
 */
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

/**
 * Get stored refresh token
 * @returns Refresh token or null if not found
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

/**
 * Check if user is authenticated
 * @returns True if user has valid tokens
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * Clear all authentication data
 */
export function clearAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
}
```