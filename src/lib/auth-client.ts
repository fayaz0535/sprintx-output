```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

interface RegisterRequest {
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

interface CheckEmailResponse {
  exists: boolean;
}

interface ValidateTokenResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
  };
}

interface ErrorResponse {
  detail: string;
}

class AuthClient {
  private client: AxiosInstance;
  private tokenKey = 'auth_token';

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor to add token to headers
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh and errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ErrorResponse>) => {
        const originalRequest = error.config as any;

        // If token expired and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            if (newToken && originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.clearToken();
            if (typeof window !== 'undefined') {
              window.location.href = '/login?session_expired=true';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.tokenKey, token);
  }

  private clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.tokenKey);
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/api/auth/register', data);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/api/auth/login', data);
      this.setToken(response.data.token);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearToken();
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const response = await this.client.post<AuthResponse>('/api/auth/refresh-token');
      this.setToken(response.data.token);
      return response.data.token;
    } catch (error) {
      this.clearToken();
      return null;
    }
  }

  /**
   * Validate current token
   */
  async validateToken(): Promise<ValidateTokenResponse> {
    try {
      const response = await this.client.get<ValidateTokenResponse>('/api/auth/validate-token');
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Check if email already exists
   */
  async checkEmail(email: string): Promise<boolean> {
    try {
      const response = await this.client.post<CheckEmailResponse>('/api/auth/check-email', {
        email,
      });
      return response.data.exists;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.getToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Clear authentication state
   */
  clearAuth(): void {
    this.clearToken();
  }

  /**
   * Handle API errors and extract meaningful messages
   */
  private handleError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      
      if (axiosError.response) {
        // Server responded with error
        const message = axiosError.response.data?.detail || 'An error occurred';
        console.error('API Error:', message, axiosError.response.status);
      } else if (axiosError.request) {
        // Request made but no response
        console.error('Network Error: No response received');
      } else {
        // Error setting up request
        console.error('Request Error:', axiosError.message);
      }
    } else {
      console.error('Unexpected Error:', error);
    }
  }

  /**
   * Get error message from axios error
   */
  getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      
      if (axiosError.response?.data?.detail) {
        return axiosError.response.data.detail;
      }
      
      if (axiosError.response?.status === 404) {
        return 'Service not available';
      }
      
      if (axiosError.response?.status === 500) {
        return 'Internal server error';
      }
      
      if (!axiosError.response) {
        return 'Network error. Please check your connection.';
      }
    }
    
    return 'An unexpected error occurred';
  }
}

// Export singleton instance
const authClient = new AuthClient();
export default authClient;

// Export class for testing or custom instances
export { AuthClient };

// Export types
export type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  CheckEmailResponse,
  ValidateTokenResponse,
  ErrorResponse,
};
```