```typescript
import type { 
  RegisterRequest, 
  LoginRequest, 
  ForgotPasswordRequest, 
  ResetPasswordRequest,
  AuthResponse,
  User 
} from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class AuthClient {
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private storeToken(token: string, rememberMe: boolean = false): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
    if (rememberMe) {
      localStorage.setItem('remember_me', 'true');
    }
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_me');
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Invalid email or password');
    }

    const authResponse: AuthResponse = await response.json();
    
    if (authResponse.token) {
      this.storeToken(authResponse.token, data.rememberMe || false);
    }

    return authResponse;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearToken();
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      this.clearToken();
      throw new Error('Session expired');
    }

    const authResponse: AuthResponse = await response.json();
    
    if (authResponse.token) {
      const rememberMe = localStorage.getItem('remember_me') === 'true';
      this.storeToken(authResponse.token, rememberMe);
    }

    return authResponse;
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send reset email');
    }

    return response.json();
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to reset password');
    }

    return response.json();
  }

  async validateResetToken(token: string): Promise<{ valid: boolean }> {
    const response = await fetch(
      `${API_BASE_URL}/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      return { valid: false };
    }

    return response.json();
  }

  async getUserProfile(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('Unauthorized');
      }
      throw new Error('Failed to fetch user profile');
    }

    return response.json();
  }

  isAuthenticated(): boolean {
    return this.getStoredToken() !== null;
  }

  getToken(): string | null {
    return this.getStoredToken();
  }
}

export const authClient = new AuthClient();
```