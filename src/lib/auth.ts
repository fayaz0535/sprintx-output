```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface AuthError {
  message: string;
  code?: string;
}

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(
        `${API_BASE_URL}/api/auth/login`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { tokens, user } = response.data;
      
      this.setTokens(tokens.access_token, tokens.refresh_token);
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid email or password. Please try again.');
        }
        if (error.response?.status === 429) {
          throw new Error('Too many login attempts. Please try again later.');
        }
        throw new Error(
          error.response?.data?.message || 'An error occurred during login. Please try again.'
        );
      }
      throw new Error('Network error. Please check your connection and try again.');
    }
  }

  public async logout(): Promise<void> {
    try {
      const token = this.getAccessToken();
      if (token) {
        await axios.post(
          `${API_BASE_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  public async refreshToken(): Promise<AuthTokens> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post<AuthTokens>(
        `${API_BASE_URL}/api/auth/refresh`,
        { refresh_token: refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const tokens = response.data;
      this.setTokens(tokens.access_token, tokens.refresh_token);
      
      return tokens;
    } catch (error) {
      this.clearTokens();
      throw new Error('Session expired. Please login again.');
    }
  }

  public async validateSession(): Promise<boolean> {
    try {
      const token = this.getAccessToken();
      if (!token) {
        return false;
      }

      const response = await axios.get(`${API_BASE_URL}/api/auth/validate-session`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          await this.refreshToken();
          return true;
        } catch (refreshError) {
          return false;
        }
      }
      return false;
    }
  }

  public async getUserProfile(): Promise<User> {
    try {
      const token = this.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await axios.get<User>(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          await this.refreshToken();
          return this.getUserProfile();
        } catch (refreshError) {
          throw new Error('Session expired. Please login again.');
        }
      }
      throw new Error('Failed to fetch user profile.');
    }
  }

  public async requestPasswordReset(email: string): Promise<void> {
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
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || 'Failed to send password reset email.'
        );
      }
      throw new Error('Network error. Please try again.');
    }
  }

  public setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  public getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }

  public getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  }

  public clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  public isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const authService = AuthService.getInstance();

export const validateEmail = (email: string): string | null => {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password || password.trim() === '') {
    return 'Password is required';
  }
  
  return null;
};

export const validateLoginForm = (
  email: string,
  password: string
): { email: string | null; password: string | null; isValid: boolean } => {
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  
  return {
    email: emailError,
    password: passwordError,
    isValid: !emailError && !passwordError,
  };
};
```
```