import { API_CONFIG } from '../config/api';
import { apiService } from './apiService';

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: number;
  role_name: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  error?: string;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegisterData {
  name: string;
  phone: string;
  email: string;
  password: string;
}

class AuthService {
  private readonly tokenKey = 'luna_auth_token';
  private readonly userKey = 'luna_auth_user';

  // Get token from sessionStorage
  getToken(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  // Get user from sessionStorage
  getUser(): User | null {
    const userData = sessionStorage.getItem(this.userKey);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearAuth();
        return null;
      }
    }
    return null;
  }

  // Store authentication data in sessionStorage
  private setAuth(token: string, user: User): void {
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Clear authentication data from sessionStorage
  clearAuth(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 0; // Admin role is 0
  }

  // Get authorization headers
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const data: AuthResponse = await apiService.post<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH_LOGIN, credentials);

      if (data.success && data.token && data.user) {
        this.setAuth(data.token, data.user);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Network error occurred',
        error: 'Failed to connect to server',
      };
    }
  }

  // Register
  async register(registerData: RegisterData): Promise<AuthResponse> {
    try {
      // Default role to 1 (client)
      const requestData = {
        ...registerData,
        role: 1
      };

      const data: AuthResponse = await apiService.post<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH_REGISTER, requestData);

      if (data.success && data.token && data.user) {
        this.setAuth(data.token, data.user);
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Network error occurred',
        error: 'Failed to connect to server',
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await apiService.post(API_CONFIG.ENDPOINTS.AUTH_LOGOUT, {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Get current user info from server
  async me(): Promise<AuthResponse> {
    try {
      const data: AuthResponse = await apiService.get<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH_ME);

      if (data.success && data.user) {
        // Update stored user data
        const currentToken = this.getToken();
        if (currentToken) {
          this.setAuth(currentToken, data.user);
        }
      } else if (!data.success) {
        // Token might be expired, clear auth
        this.clearAuth();
      }

      return data;
    } catch (error) {
      console.error('Me endpoint error:', error);
      this.clearAuth();
      return {
        success: false,
        message: 'Network error occurred',
        error: 'Failed to connect to server',
      };
    }
  }

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    try {
      const data: AuthResponse = await apiService.post<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH_REFRESH, {});

      if (data.success && data.token && data.user) {
        this.setAuth(data.token, data.user);
      } else {
        this.clearAuth();
      }

      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuth();
      return {
        success: false,
        message: 'Network error occurred',
        error: 'Failed to connect to server',
      };
    }
  }

  // Make authenticated API request (simplified - no auto-refresh to prevent loops)
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...(options.headers || {}),
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }
}

export const authService = new AuthService(); 