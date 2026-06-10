```typescript
import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface AuthError {
  message: string;
  field?: string;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(
        `${API_BASE_URL}/api/auth/login`,
        {
          email: credentials.email,
          password: credentials.password,
          remember_me: credentials.rememberMe || false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { access_token, refresh_token } = response.data;

      // Store tokens
      this.accessToken = access_token;
      this.refreshToken = refresh_token;

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);

        // If remember me is checked, also store in a longer-lived storage
        if (credentials.rememberMe) {
          localStorage.setItem('remember_me', 'true');
        }
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await axios.post(
          `${API_BASE_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          }
        );
      }
    } catch (error) {
      // Continue with local logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<AuthResponse> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post<AuthResponse>(
        `${API_BASE_URL}/api/auth/refresh`,
        {
          refresh_token: this.refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { access_token, refresh_token } = response.data;

      this.accessToken = access_token;
      this.refreshToken = refresh_token;

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
      }

      return response.data;
    } catch (error) {
      this.clearTokens();
      throw this.handleError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    try {
      if (!this.accessToken) {
        throw new Error('No access token available');
      }

      const response = await axios.get<User>(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Try to refresh token
        try {
          await this.refreshAccessToken();
          return this.getCurrentUser();
        } catch (refreshError) {
          this.clearTokens();
          throw refreshError;
        }
      }
      throw this.handleError(error);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/api/auth/forgot-password`,
        { email },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Clear all tokens and authentication state
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('remember_me');
    }
  }

  /**
   * Handle API errors and return user-friendly messages
   */
  private handleError(error: unknown): AuthError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail?: string; message?: string }>;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const detail = axiosError.response.data?.detail || axiosError.response.data?.message;

        switch (status) {
          case 401:
            return {
              message: detail || 'Invalid email or password',
            };
          case 400:
            return {
              message: detail || 'Invalid request. Please check your input.',
            };
          case 404:
            return {
              message: 'Service not found. Please try again later.',
            };
          case 429:
            return {
              message: 'Too many attempts. Please try again later.',
            };
          case 500:
          case 502:
          case 503:
            return {
              message: 'Server error. Please try again later.',
            };
          default:
            return {
              message: detail || 'An unexpected error occurred. Please try again.',
            };
        }
      } else if (axiosError.request) {
        return {
          message: 'Unable to connect to the server. Please check your internet connection.',
        };
      }
    }

    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    return {
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;
```