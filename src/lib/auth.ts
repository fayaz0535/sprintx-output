```typescript
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Validation schemas
export const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
};

export const passwordSchema = z
  .string()
  .min(passwordRequirements.minLength, `Password must be at least ${passwordRequirements.minLength} characters`)
  .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least 1 number');

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

// Types
export interface User {
  id: string;
  email: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  remember_me: boolean;
  expires_at: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ApiError {
  detail: string;
  field?: string;
}

// Auth service
class AuthService {
  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: 'An unexpected error occurred',
      }));
      throw new Error(error.detail);
    }
    
    return response.json();
  }

  async register(data: RegisterRequest): Promise<{ message: string }> {
    const validated = registerSchema.parse(data);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(validated),
    });

    return this.handleResponse(response);
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const validated = loginSchema.parse({
      email: data.email,
      password: data.password,
    });

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...validated,
        remember_me: data.remember_me || false,
      }),
      credentials: 'include',
    });

    const authResponse = await this.handleResponse<AuthResponse>(response);
    
    // Store token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', authResponse.token);
      localStorage.setItem('auth_expires_at', authResponse.expires_at);
    }
    
    return authResponse;
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(token || undefined),
        credentials: 'include',
      });
    } finally {
      // Clear local storage regardless of API response
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_expires_at');
      }
    }
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    const validated = forgotPasswordSchema.parse(data);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(validated),
    });

    return this.handleResponse(response);
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; user_id?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-token?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const validated = resetPasswordSchema.parse(data);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(validated),
    });

    return this.handleResponse(response);
  }

  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(token),
      credentials: 'include',
    });

    return this.handleResponse(response);
  }

  async refreshToken(): Promise<AuthResponse> {
    const token = this.getToken();
    
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: this.getHeaders(token || undefined),
      credentials: 'include',
    });

    const authResponse = await this.handleResponse<AuthResponse>(response);
    
    // Update stored token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', authResponse.token);
      localStorage.setItem('auth_expires_at', authResponse.expires_at);
    }
    
    return authResponse;
  }

  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    return localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    const expiresAt = localStorage.getItem('auth_expires_at');
    
    if (!expiresAt) {
      return false;
    }

    return new Date(expiresAt) > new Date();
  }

  isTokenExpiringSoon(minutesThreshold: number = 5): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const expiresAt = localStorage.getItem('auth_expires_at');
    
    if (!expiresAt) {
      return false;
    }

    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    const thresholdTime = minutesThreshold * 60 * 1000;

    return (expirationTime - currentTime) < thresholdTime;
  }
}

// Validation helpers
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < passwordRequirements.minLength) {
    errors.push(`Password must be at least ${passwordRequirements.minLength} characters`);
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }

  if (passwordRequirements.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }

  return errors;
}

export function validateEmail(email: string): string | null {
  try {
    emailSchema.parse(email);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid email';
    }
    return 'Invalid email';
  }
}

// Password hashing utilities (for reference, actual hashing should be done server-side)
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Token generation utility
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// Export singleton instance
export const authService = new AuthService();

// Export default
export default authService;
```
```