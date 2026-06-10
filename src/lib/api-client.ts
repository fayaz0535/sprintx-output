```typescript
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    last_login_at: string | null;
  };
}

interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

interface ResetPasswordResponse {
  message: string;
}

interface VerifyTokenResponse {
  valid: boolean;
  user: {
    id: string;
    email: string;
  };
}

interface ApiError {
  detail: string;
  status_code: number;
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.initializeInterceptors();
    this.loadTokensFromStorage();
  }

  private initializeInterceptors(): void {
    // Request interceptor to add access token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            this.isRefreshing = false;
            this.onAccessTokenRefreshed(newAccessToken);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.isRefreshing = false;
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private onAccessTokenRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private loadTokensFromStorage(): void {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  private saveTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await this.client.post<LoginResponse>('/api/auth/login', credentials);
      const { access_token, refresh_token } = response.data;
      this.saveTokens(access_token, refresh_token);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.client.post<RefreshTokenResponse>('/api/auth/refresh', {
        refresh_token: this.refreshToken,
      });
      
      const { access_token } = response.data;
      this.accessToken = access_token;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access_token);
      }
      
      return access_token;
    } catch (error) {
      this.clearTokens();
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout', {
        refresh_token: this.refreshToken,
      });
    } catch (error) {
      // Continue with local logout even if server request fails
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
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
      throw this.handleError(error);
    }
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    try {
      const response = await this.client.post<ResetPasswordResponse>(
        '/api/auth/reset-password',
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async verifyToken(): Promise<VerifyTokenResponse> {
    try {
      const response = await this.client.get<VerifyTokenResponse>('/api/auth/verify');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiError>;
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        const detail = axiosError.response.data?.detail || 'An error occurred';

        switch (status) {
          case 401:
            return new Error('Invalid email or password');
          case 404:
            return new Error('Resource not found');
          case 422:
            return new Error(detail);
          case 429:
            return new Error('Too many attempts. Please try again later');
          case 500:
          case 502:
          case 503:
            return new Error('Unable to connect. Please try again later');
          default:
            return new Error(detail);
        }
      } else if (axiosError.request) {
        return new Error('Unable to connect. Please try again later');
      }
    }

    return new Error('An unexpected error occurred');
  }
}

const apiClient = new ApiClient();

export default apiClient;
export type {
  LoginCredentials,
  LoginResponse,
  RefreshTokenResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyTokenResponse,
  ApiError,
};
```