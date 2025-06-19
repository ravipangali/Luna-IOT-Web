import { API_CONFIG } from '../config/api';

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
  private readonly apiUrl = API_CONFIG.BASE_URL;
  private readonly tokenKey = 'luna_auth_token';
  private readonly userKey = 'luna_auth_user';

  // Get stored token from sessionStorage
  getToken(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  // Get stored user from sessionStorage
  getUser(): User | null {
    const userStr = sessionStorage.getItem(this.userKey);
    if (userStr) {
      try {
        return JSON.parse(userStr);
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
      const response = await fetch(`${this.apiUrl}${API_CONFIG.ENDPOINTS.AUTH_LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await response.json();

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

      const response = await fetch(`${this.apiUrl}${API_CONFIG.ENDPOINTS.AUTH_REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data: AuthResponse = await response.json();

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
      await fetch(`${this.apiUrl}${API_CONFIG.ENDPOINTS.AUTH_LOGOUT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Get current user info from server
  async me(): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiUrl}${API_CONFIG.ENDPOINTS.AUTH_ME}`, {
        method: 'GET',
        headers: {
          ...this.getAuthHeaders(),
        },
      });

      const data: AuthResponse = await response.json();

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
      const response = await fetch(`${this.apiUrl}${API_CONFIG.ENDPOINTS.AUTH_REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      const data: AuthResponse = await response.json();

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