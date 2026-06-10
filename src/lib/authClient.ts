```typescript
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface DecodedToken {
  exp: number;
  sub: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

const TOKEN_STORAGE_KEY = 'auth_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'auth_refresh_token';
const REMEMBER_ME_KEY = 'auth_remember_me';

class AuthClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadTokensFromStorage();
    }
  }

  private loadTokensFromStorage(): void {
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    const storage = rememberMe ? localStorage : sessionStorage;
    
    this.accessToken = storage.getItem(TOKEN_STORAGE_KEY);
    this.refreshToken = storage.getItem(REFRESH_TOKEN_STORAGE_KEY);

    if (this.accessToken) {
      this.scheduleTokenRefresh();
    }
  }

  private saveTokensToStorage(tokens: AuthTokens, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    
    storage.setItem(TOKEN_STORAGE_KEY, tokens.access_token);
    storage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());

    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;

    this.scheduleTokenRefresh();
  }

  private clearTokensFromStorage(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);

    this.accessToken = null;
    this.refreshToken = null;

    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  private scheduleTokenRefresh(): void {
    if (!this.accessToken) return;

    try {
      const decoded: DecodedToken = jwtDecode(this.accessToken);
      const expiresAt = decoded.exp * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      // Refresh 5 minutes before expiry
      const refreshTime = timeUntilExpiry - 5 * 60 * 1000;

      if (refreshTime > 0) {
        if (this.refreshTimeout) {
          clearTimeout(this.refreshTimeout);
        }

        this.refreshTimeout = setTimeout(() => {
          this.refreshAccessToken();
        }, refreshTime);
      } else {
        // Token already expired or about to expire, refresh immediately
        this.refreshAccessToken();
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  }

  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          remember_me: credentials.rememberMe || false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Invalid email or password');
      }

      const data = await response.json();
      
      this.saveTokensToStorage(
        {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_type: data.token_type,
        },
        credentials.rememberMe || false
      );

      return data.user;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokensFromStorage();
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      this.clearTokensFromStorage();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) {
        this.clearTokensFromStorage();
        return false;
      }

      const data = await response.json();
      const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
      
      this.saveTokensToStorage(
        {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_type: data.token_type,
        },
        rememberMe
      );

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokensFromStorage();
      return false;
    }
  }

  async verifyAuth(): Promise<User | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        // Try to refresh the token
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry verification with new token
          return this.verifyAuth();
        }
        this.clearTokensFromStorage();
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Auth verification error:', error);
      this.clearTokensFromStorage();
      return null;
    }
  }

  async getUserProfile(): Promise<User | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            return this.getUserProfile();
          }
        }
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
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
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send password reset email');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reset password');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    if (!this.accessToken) {
      return false;
    }

    try {
      const decoded: DecodedToken = jwtDecode(this.accessToken);
      const now = Date.now() / 1000;
      return decoded.exp > now;
    } catch (error) {
      return false;
    }
  }
}

const authClient = new AuthClient();

export default authClient;
export type { LoginCredentials, AuthTokens, User };
```