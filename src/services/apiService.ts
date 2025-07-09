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
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{ 
    resolve: (value: string | null) => void; 
    reject: (error: Error) => void 
  }> = [];

  constructor() {
    // Use VPS helper for automatic configuration
    const urls = buildAPIUrls();
    this.baseURL = urls.baseURL;
    this.defaultHeaders = API_CONFIG.DEFAULT_HEADERS;
    this.timeout = API_CONFIG.TIMEOUT;
    
    console.log('🔧 API Service initialized with base URL:', this.baseURL);
  }

  // Get auth headers from authService
  private getAuthHeaders(): Record<string, string> {
    return authService.getAuthHeaders();
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
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

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
      
      if (error instanceof Error) {
        throw new ApiError(0, error.message);
      }
      
      throw new ApiError(0, 'Unknown error occurred');
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

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    return this.withRetry(() => this.fetchWithAuth<T>(url, { method: 'GET' }));
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    return this.withRetry(() =>
      this.fetchWithAuth<T>(url, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      })
    );
  }

  // PUT request
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    return this.withRetry(() =>
      this.fetchWithAuth<T>(url, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      })
    );
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    return this.withRetry(() => this.fetchWithAuth<T>(url, { method: 'DELETE' }));
  }

  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    return this.get<DashboardStats>('/api/v1/dashboard/stats');
  }

  async getSettings(): Promise<Setting> {
    return this.get<Setting>('/api/v1/settings');
  }

  // Force delete methods
  async forceDeleteAllBackupData(): Promise<{ success: boolean; message: string; deleted_count: number }> {
    return this.delete<{ success: boolean; message: string; deleted_count: number }>('/api/v1/dashboard/force-delete-all-backup');
  }

  async forceDeleteUsersBackupData(): Promise<{ success: boolean; message: string; deleted_count: number }> {
    return this.delete(API_CONFIG.ENDPOINTS.USERS_FORCE_DELETE_BACKUP);
  }

  async forceDeleteDevicesBackupData(): Promise<{ success: boolean; message: string; deleted_count: number }> {
    return this.delete(API_CONFIG.ENDPOINTS.DEVICES_FORCE_DELETE_BACKUP);
  }

  async forceDeleteVehiclesBackupData(): Promise<{ success: boolean; message: string; deleted_count: number }> {
    return this.delete(API_CONFIG.ENDPOINTS.VEHICLES_FORCE_DELETE_BACKUP);
  }

  async forceDeleteDeviceModelsBackupData(): Promise<{ success: boolean; message: string; deleted_count: number }> {
    return this.delete(API_CONFIG.ENDPOINTS.DEVICE_MODELS_FORCE_DELETE_BACKUP);
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