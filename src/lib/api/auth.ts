```typescript
import { apiClient } from './client';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  expiresAt: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId?: string;
  email?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  detail: string;
  field?: string;
}

export class AuthAPI {
  static async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await apiClient.post<RegisterResponse>('/auth/register', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Registration failed. Please try again.');
    }
  }

  static async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', data);
      
      if (response.data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', response.data.token);
          localStorage.setItem('user_id', response.data.userId);
          localStorage.setItem('user_email', response.data.email);
          localStorage.setItem('token_expires_at', response.data.expiresAt);
        }
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  static async logout(): Promise<void> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      if (token) {
        await apiClient.post('/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_email');
        localStorage.removeItem('token_expires_at');
      }
    }
  }

  static async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    try {
      const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to send password reset email. Please try again.');
    }
  }

  static async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    try {
      const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to reset password. Please try again.');
    }
  }

  static async validateToken(token?: string): Promise<ValidateTokenResponse> {
    try {
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
      
      if (!authToken) {
        return { valid: false };
      }

      const response = await apiClient.get<ValidateTokenResponse>('/auth/validate-token', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  }

  static async getUserProfile(): Promise<UserProfile> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await apiClient.get<UserProfile>('/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to fetch user profile.');
    }
  }

  static getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  static getStoredUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('user_id');
  }

  static getStoredUserEmail(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('user_email');
  }

  static isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true;
    
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    
    return new Date(expiresAt) <= new Date();
  }

  static isAuthenticated(): boolean {
    const token = this.getStoredToken();
    return !!token && !this.isTokenExpired();
  }
}

export const authAPI = AuthAPI;
```
```