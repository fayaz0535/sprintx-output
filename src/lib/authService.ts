```typescript
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DecodedToken {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

export interface AuthError {
  message: string;
  code?: string;
  field?: string;
}

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

class AuthService {
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          remember_me: credentials.rememberMe || false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          throw {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          } as AuthError;
        }

        if (response.status === 422) {
          throw {
            message: errorData.detail || 'Invalid input',
            code: 'VALIDATION_ERROR',
            field: errorData.field,
          } as AuthError;
        }

        throw {
          message: errorData.message || 'An error occurred during login',
          code: 'LOGIN_ERROR',
        } as AuthError;
      }

      const data: LoginResponse = await response.json();

      this.setTokens(data.accessToken, data.refreshToken);

      return data;
    } catch (error) {
      if ((error as AuthError).code) {
        throw error;
      }

      throw {
        message: 'Network error. Please check your connection and try again.',
        code: 'NETWORK_ERROR',
      } as AuthError;
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();

      if (refreshToken) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          resolve(token);
        });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = this.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data: LoginResponse = await response.json();

      this.setTokens(data.accessToken, data.refreshToken);
      this.onRefreshed(data.accessToken);

      return data.accessToken;
    } catch (error) {
      this.clearTokens();
      return null;
    } finally {
      this.isRefreshing = false;
      this.refreshSubscribers = [];
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      const accessToken = this.getAccessToken();

      if (!accessToken) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          const newToken = await this.refreshAccessToken();
          return newToken !== null;
        }
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.message || 'Failed to send password reset email',
          code: 'FORGOT_PASSWORD_ERROR',
        } as AuthError;
      }
    } catch (error) {
      if ((error as AuthError).code) {
        throw error;
      }

      throw {
        message: 'Network error. Please try again.',
        code: 'NETWORK_ERROR',
      } as AuthError;
    }
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const decoded = this.decodeToken(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  decodeToken(token: string): DecodedToken {
    return jwtDecode<DecodedToken>(token);
  }

  getCurrentUser(): DecodedToken | null {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      return this.decodeToken(token);
    } catch {
      return null;
    }
  }

  private onRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
  }

  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAccessToken();

    const headers = {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : '',
    };

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();

      if (newToken) {
        const newHeaders = {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        };

        response = await fetch(url, {
          ...options,
          headers: newHeaders,
          credentials: 'include',
        });
      }
    }

    return response;
  }
}

const authService = new AuthService();

export default authService;
```