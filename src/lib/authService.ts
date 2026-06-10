```typescript
import { apiClient } from './apiClient';

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export interface EmailValidation {
  isValid: boolean;
  error?: string;
}

export class AuthService {
  private static SESSION_TOKEN_KEY = 'session_token';
  private static USER_KEY = 'user';

  /**
   * Register a new user with email and password
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/register', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error('Email already registered');
      }
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  }

  /**
   * Login user with email and password
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', data);
      const { user, session } = response.data;
      
      // Store session token and user data
      this.setSessionToken(session.token);
      this.setUser(user);
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      }
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      // Continue with local cleanup even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      this.clearSession();
    }
  }

  /**
   * Get current session information
   */
  static async getSession(): Promise<AuthResponse | null> {
    try {
      const response = await apiClient.get<AuthResponse>('/api/auth/session');
      const { user, session } = response.data;
      
      // Update stored user data
      this.setUser(user);
      this.setSessionToken(session.token);
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.clearSession();
        return null;
      }
      throw error;
    }
  }

  /**
   * Request password reset email
   */
  static async forgotPassword(data: ForgotPasswordData): Promise<void> {
    try {
      await apiClient.post('/api/auth/forgot-password', data);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to send password reset email');
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(data: ResetPasswordData): Promise<void> {
    try {
      await apiClient.post('/api/auth/reset-password', data);
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Reset link expired. Please request a new one.');
      }
      throw new Error(error.response?.data?.detail || 'Password reset failed');
    }
  }

  /**
   * Verify if reset token is valid
   */
  static async verifyResetToken(token: string): Promise<boolean> {
    try {
      await apiClient.get(`/api/auth/verify-reset-token?token=${token}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/api/user/profile');
      this.setUser(response.data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch user profile');
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): EmailValidation {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      return {
        isValid: false,
        error: 'Email is required'
      };
    }
    
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        error: 'Please enter a valid email address'
      };
    }
    
    return {
      isValid: true
    };
  }

  /**
   * Validate password requirements
   */
  static validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (!password) {
      return {
        isValid: false,
        errors: ['Password is required'],
        strength: 'weak'
      };
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!hasNumber) {
      errors.push('Password must contain at least one number');
    }
    
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }
    
    // Calculate strength
    const criteriaCount = [hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length;
    
    if (password.length >= 8 && criteriaCount === 4) {
      strength = 'strong';
    } else if (password.length >= 8 && criteriaCount >= 2) {
      strength = 'medium';
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    const token = this.getSessionToken();
    const user = this.getUser();
    
    return !!(token && user);
  }

  /**
   * Get stored session token
   */
  static getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.SESSION_TOKEN_KEY);
  }

  /**
   * Set session token
   */
  private static setSessionToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.SESSION_TOKEN_KEY, token);
  }

  /**
   * Get stored user
   */
  static getUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) return null;
    
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  /**
   * Set user data
   */
  private static setUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear session data
   */
  static clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SESSION_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

export default AuthService;
```