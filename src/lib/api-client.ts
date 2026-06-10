```typescript
import axios, { AxiosError, AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    created_at: string;
    last_login: string | null;
  };
}

interface ForgotPasswordRequest {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}

interface UserResponse {
  id: string;
  email: string;
  created_at: string;
  last_login: string | null;
}

interface DashboardResponse {
  user: UserResponse;
  data: Record<string, unknown>;
}

interface ApiError {
  detail: string;
  status_code?: number;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getStoredToken();
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
    return {};
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private setStoredToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  private clearStoredToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await this.client.post<LoginResponse>(
        '/api/auth/login',
        credentials
      );
      
      if (response.data.access_token) {
        this.setStoredToken(response.data.access_token);
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Invalid email or password');
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post(
        '/api/auth/logout',
        {},
        {
          headers: this.getAuthHeaders(),
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearStoredToken();
    }
  }

  async getMe(): Promise<UserResponse> {
    try {
      const response = await this.client.get<UserResponse>('/api/auth/me', {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      this.clearStoredToken();
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to fetch user data');
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    try {
      const response = await this.client.post<ForgotPasswordResponse>(
        '/api/auth/forgot-password',
        data
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to process password reset');
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  async getDashboard(): Promise<DashboardResponse> {
    try {
      const response = await this.client.get<DashboardResponse>('/api/dashboard', {
        headers: this.getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to fetch dashboard data');
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }
}

const apiClient = new ApiClient();

export default apiClient;
export type {
  LoginCredentials,
  LoginResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  UserResponse,
  DashboardResponse,
  ApiError,
};
```