```typescript
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface RegisterRequest {
  email: string;
  password: string;
}

interface RegisterResponse {
  message: string;
  user_id: string;
}

interface VerifyEmailRequest {
  token: string;
}

interface VerifyEmailResponse {
  message: string;
}

interface ResendVerificationRequest {
  email: string;
}

interface ResendVerificationResponse {
  message: string;
}

interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user: {
    id: string;
    email: string;
    is_verified: boolean;
  };
}

interface LogoutResponse {
  message: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}

interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

interface ResetPasswordResponse {
  message: string;
}

interface ValidateTokenResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    is_verified: boolean;
  };
}

interface UserProfile {
  id: string;
  email: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiErrorResponse {
  detail: string;
  field?: string;
  code?: string;
}

export class ApiError extends Error {
  public status: number;
  public detail: string;
  public field?: string;
  public code?: string;

  constructor(status: number, detail: string, field?: string, code?: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.field = field;
    this.code = code;
  }
}

class ApiClient {
  private client: AxiosInstance;
  private tokenKey = 'auth_token';

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorResponse>) => {
        if (error.response) {
          const { status, data } = error.response;
          
          if (status === 401) {
            this.clearToken();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }

          const detail = data?.detail || 'An unexpected error occurred';
          const field = data?.field;
          const code = data?.code;

          throw new ApiError(status, detail, field, code);
        } else if (error.request) {
          throw new ApiError(0, 'Network error. Please check your connection.');
        } else {
          throw new ApiError(0, 'An unexpected error occurred');
        }
      }
    );
  }

  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  public getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  public clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
    }
  }

  public async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.client.post<RegisterResponse>('/api/auth/register', data);
    return response.data;
  }

  public async verifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    const response = await this.client.post<VerifyEmailResponse>('/api/auth/verify-email', data);
    return response.data;
  }

  public async resendVerification(data: ResendVerificationRequest): Promise<ResendVerificationResponse> {
    const response = await this.client.post<ResendVerificationResponse>('/api/auth/resend-verification', data);
    return response.data;
  }

  public async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/auth/login', data);
    if (response.data.access_token) {
      this.setToken(response.data.access_token);
    }
    return response.data;
  }

  public async logout(): Promise<LogoutResponse> {
    try {
      const response = await this.client.post<LogoutResponse>('/api/auth/logout');
      return response.data;
    } finally {
      this.clearToken();
    }
  }

  public async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const response = await this.client.post<ForgotPasswordResponse>('/api/auth/forgot-password', data);
    return response.data;
  }

  public async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await this.client.post<ResetPasswordResponse>('/api/auth/reset-password', data);
    return response.data;
  }

  public async validateToken(): Promise<ValidateTokenResponse> {
    const response = await this.client.get<ValidateTokenResponse>('/api/auth/validate-token');
    return response.data;
  }

  public async getUserProfile(): Promise<UserProfile> {
    const response = await this.client.get<UserProfile>('/api/user/profile');
    return response.data;
  }

  public isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}

const apiClient = new ApiClient();

export default apiClient;
```