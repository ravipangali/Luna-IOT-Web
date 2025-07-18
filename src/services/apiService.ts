import { buildAPIUrls } from '../utils/vpsHelper';
import { API_CONFIG } from '../config/api';
import type { PaginatedResponse, ApiResponse, DashboardStats, Setting } from '../types/models';
import { authService } from './authService';

// API Error class for better error handling
export class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// API Service class
class ApiService {
  private baseURL: string | null = null;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{ 
    resolve: (value: string | null) => void; 
    reject: (error: Error) => void 
  }> = [];

  constructor() {
    this.defaultHeaders = API_CONFIG.DEFAULT_HEADERS;
    this.timeout = API_CONFIG.TIMEOUT;
    
    // Initialize baseURL lazily
    this.initializeBaseURL();
  }

  private initializeBaseURL() {
    try {
      // Use VPS helper for automatic configuration
      const urls = buildAPIUrls();
      console.log('🔧 ApiService constructor - urls object:', urls);
      console.log('🔧 ApiService constructor - urls.baseURL:', urls.baseURL);
      console.log('🔧 ApiService constructor - urls.baseURL type:', typeof urls.baseURL);
      
      // Validate baseURL before setting it
      if (!urls.baseURL || urls.baseURL.includes('undefined')) {
        throw new Error('Invalid baseURL detected: ' + urls.baseURL);
      }
      
      this.baseURL = urls.baseURL;
      
      console.log('🔧 API Service initialized with base URL:', this.baseURL);
      console.log('🔧 API Service URLs object:', urls);
      console.log('🔧 API Service this.baseURL type:', typeof this.baseURL);
      console.log('🔧 API Service this.baseURL length:', this.baseURL?.length);
    } catch (error) {
      console.error('🔧 ERROR: Failed to initialize baseURL:', error);
      // Fallback to HTTP
      this.baseURL = 'http://84.247.131.246:8080';
      console.log('🔧 API Service using fallback base URL:', this.baseURL);
    }
    
    // Final validation to ensure baseURL is always valid
    if (!this.baseURL || this.baseURL.includes('undefined')) {
      console.error('🔧 CRITICAL ERROR: baseURL is still invalid after initialization:', this.baseURL);
      this.baseURL = 'http://84.247.131.246:8080';
      console.log(' API Service forced to fallback base URL:', this.baseURL);
    }
    
    console.log('🔧 API Service final baseURL:', this.baseURL);
  }

  // Get auth headers from authService
  private getAuthHeaders(): Record<string, string> {
    return authService.getAuthHeaders();
  }

  // Get base URL for debugging
  public getBaseURL(): string {
    if (!this.baseURL) {
      this.initializeBaseURL();
    }
    return this.baseURL || 'http://84.247.131.246:8080';
  }

  // Handle response with proper error handling
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('Content-Type') || '';
    const isJson = contentType.includes('application/json');
    
    if (response.ok) {
      if (!isJson) {
        // For non-JSON responses like images, etc.
        if (contentType.includes('text')) {
          return response.text() as unknown as T;
        }
        return response.blob() as unknown as T;
      }
      
      const data = await response.json();
      return data;
    }
    
    // Error handling
    let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
    if (isJson) {
      try {
        const errorData = await response.json();
        
        if (errorData.error) {
          errorMsg = errorData.error;
          console.error('API Error:', errorData);
        } else if (errorData.message) {
          errorMsg = errorData.message;
          console.error('API Message:', errorData);
        }
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
    }
    
    throw new ApiError(response.status, errorMsg);
  }

  // Handle token refresh queue to prevent multiple simultaneous refresh attempts
  private processQueue(error: Error | null, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  // Generic fetch with error handling and authentication
  private async fetchWithAuth<T>(url: string, options: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log('🔧 fetchWithAuth - Making request to:', url);
      console.log('🔧 fetchWithAuth - Request options:', {
        method: options.method,
        headers: options.headers,
        body: options.body
      });

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        redirect: 'manual', // Prevent automatic redirects
        headers: {
          ...this.defaultHeaders,
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      console.log('🔧 fetchWithAuth - Response status:', response.status);
      console.log('🔧 fetchWithAuth - Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('🔧 fetchWithAuth - Response URL:', response.url);

      // Check if we were redirected
      if (response.url !== url) {
        console.warn('🔧 fetchWithAuth - Request was redirected from:', url, 'to:', response.url);
      }
      
      // Check if response is from Google
      if (response.url.includes('google.com') || response.url.includes('googleapis.com')) {
        console.error('🔧 CRITICAL ERROR: Response is from Google:', response.url);
        throw new Error('Request was redirected to Google');
      }

      // Handle 401 errors with token refresh
      if (response.status === 401) {
        // If we're already refreshing, queue this request
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          }).then(() => {
            // Retry request with new token
            return this.fetchWithAuth<T>(url, options);
          });
        }

        this.isRefreshing = true;

        try {
          const refreshResult = await authService.refreshToken();
          
          if (refreshResult.success) {
            this.processQueue(null, refreshResult.token);
            
            // Retry original request with new token
            const retryResponse = await fetch(url, {
              ...options,
              signal: controller.signal,
              redirect: 'manual', // Prevent automatic redirects
              headers: {
                ...this.defaultHeaders,
                ...this.getAuthHeaders(),
                ...options.headers,
              },
            });

            return await this.handleResponse<T>(retryResponse);
          } else {
            // Refresh failed, clear auth and redirect
            this.processQueue(new ApiError(401, 'Authentication failed'), null);
            authService.clearAuth();
            
            // Only redirect if we're not already on login page
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
            
            throw new ApiError(401, 'Authentication failed');
          }
        } catch (refreshError) {
          const error = refreshError instanceof Error ? refreshError : new Error('Token refresh failed');
          this.processQueue(error, null);
          authService.clearAuth();
          
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          
          throw new ApiError(401, 'Authentication failed');
        } finally {
          this.isRefreshing = false;
        }
      }

      return await this.handleResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      console.error('🔧 fetchWithAuth - Network error:', error);
      throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generic fetch for public endpoints (no auth)
  private async fetchWithErrorHandling<T>(url: string, options: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return await this.handleResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw new ApiError(0, error.message);
      }
      
      throw new ApiError(0, 'Unknown error occurred');
    }
  }

  // Generic retry logic
  private async withRetry<T>(operation: () => Promise<T>, retries: number = 3): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && error instanceof ApiError && error.status >= 500) {
        console.warn(`API request failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  // Validate URL construction
  private validateURL(url: string): void {
    if (url.includes('undefined')) {
      console.error('🔧 CRITICAL ERROR: URL contains undefined:', url);
      throw new Error('URL contains undefined values');
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.error('🔧 CRITICAL ERROR: URL is malformed:', url);
      throw new Error('URL is malformed');
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    if (!this.baseURL) {
      console.log('🔧 baseURL is null, reinitializing...');
      this.initializeBaseURL();
    }
    
    if (!this.baseURL) {
      console.error('🔧 ERROR: baseURL is still undefined after reinitialization!');
      throw new Error('API base URL is not configured');
    }
    
    // Validate baseURL doesn't contain undefined
    if (this.baseURL.includes('undefined')) {
      console.error('🔧 ERROR: baseURL contains undefined:', this.baseURL);
      this.initializeBaseURL(); // Try to reinitialize
      if (this.baseURL.includes('undefined')) {
        throw new Error('API base URL is malformed');
      }
    }
    
    // Ensure endpoint doesn't start with a slash if baseURL ends with one
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${this.baseURL}/${cleanEndpoint}`;
    
    console.log('🔧 GET request URL:', url);
    this.validateURL(url);
    return this.withRetry(() => this.fetchWithAuth<T>(url, { method: 'GET' }));
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    if (!this.baseURL) {
      console.log('🔧 baseURL is null, reinitializing...');
      this.initializeBaseURL();
    }
    
    if (!this.baseURL) {
      console.error('🔧 ERROR: baseURL is still undefined after reinitialization!');
      throw new Error('API base URL is not configured');
    }
    
    // Validate baseURL doesn't contain undefined
    if (this.baseURL.includes('undefined')) {
      console.error('🔧 ERROR: baseURL contains undefined:', this.baseURL);
      this.initializeBaseURL(); // Try to reinitialize
      if (this.baseURL.includes('undefined')) {
        throw new Error('API base URL is malformed');
      }
    }
    
    // Ensure endpoint doesn't start with a slash if baseURL ends with one
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${this.baseURL}/${cleanEndpoint}`;
    
    console.log('🔧 POST request URL:', url);
    console.log('🔧 POST request baseURL:', this.baseURL);
    console.log('🔧 POST request endpoint:', endpoint);
    console.log('🔧 POST request cleanEndpoint:', cleanEndpoint);
    
    // Check if URL contains any suspicious domains
    if (url.includes('google') || url.includes('batch')) {
      console.error('🔧 CRITICAL ERROR: URL contains suspicious domain:', url);
      throw new Error('URL contains suspicious domain');
    }
    
    // Log the full request details
    console.log('🔧 POST request full details:', {
      url,
      baseURL: this.baseURL,
      endpoint,
      cleanEndpoint,
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    
    this.validateURL(url);
    
    return this.withRetry(() =>
      this.fetchWithAuth<T>(url, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      })
    );
  }

  // PUT request
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    // Ensure endpoint doesn't start with a slash if baseURL ends with one
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${this.baseURL}/${cleanEndpoint}`;
    
    console.log('🔧 PUT request URL:', url);
    this.validateURL(url);
    return this.withRetry(() =>
      this.fetchWithAuth<T>(url, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      })
    );
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    // Ensure endpoint doesn't start with a slash if baseURL ends with one
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${this.baseURL}/${cleanEndpoint}`;
    
    console.log('🔧 DELETE request URL:', url);
    this.validateURL(url);
    return this.withRetry(() => this.fetchWithAuth<T>(url, { method: 'DELETE' }));
  }

  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    return this.get<DashboardStats>('/api/v1/dashboard/stats');
  }

  async getSettings(): Promise<Setting> {
    return this.get<Setting>('/api/v1/settings');
  }



  // Get paginated data
  async getPaginated<T>(
    endpoint: string,
    page: number = 1,
    limit: number = 10,
    params: Record<string, string> = {}
  ): Promise<PaginatedResponse<T>> {
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...params,
    });
    
    const url = `${this.baseURL}${endpoint}?${queryParams.toString()}`;
    
    return this.withRetry(() => this.fetchWithAuth<PaginatedResponse<T>>(url, { method: 'GET' }));
  }

  // Health check
  async healthCheck(): Promise<Record<string, unknown>> {
    const url = `${this.baseURL}/health`;
    return this.fetchWithErrorHandling(url, { method: 'GET' });
  }

  // Test connection to server
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  // User operations
  async createUser(userData: {
    name: string;
    phone: string;
    email: string;
    password: string;
    role: number;
    image?: string;
  }): Promise<ApiResponse<unknown>> {
    const endpoint = API_CONFIG.ENDPOINTS.USERS;
    
    // Add OTP to request - assuming it's required for user creation via admin
    const dataWithOtp = { ...userData, otp: '000000' }; // Placeholder OTP
    
    return this.post<ApiResponse<unknown>>(endpoint, dataWithOtp);
  }

  async updateUser(
    userId: string,
    userData: {
      name?: string;
      phone?: string;
      email?: string;
      password?: string;
      role?: number;
      image?: string;
    }
  ): Promise<ApiResponse<unknown>> {
    const endpoint = API_CONFIG.ENDPOINTS.USER_BY_ID(userId);
    return this.put<ApiResponse<unknown>>(endpoint, userData);
  }

  async getUserImage(id: number) {
    const endpoint = `${API_CONFIG.ENDPOINTS.USERS}/${id}/image`;
    return this.get<Blob>(endpoint);
  }

  async deleteUserImage(id: number) {
    const endpoint = `${API_CONFIG.ENDPOINTS.USERS}/${id}/image`;
    return this.delete<ApiResponse<unknown>>(endpoint);
  }
}

export const apiService = new ApiService();
export default apiService; 