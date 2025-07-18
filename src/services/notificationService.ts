import { apiService } from './apiService';
import { APP_CONFIG } from '../config/app_config';
import { ENV_CONFIG } from '../config/environment';

export interface CreateNotificationRequest {
  title: string;
  body: string;
  type?: string;
  image_url?: string;
  image_data?: string; // Add image_data field for uploaded files
  sound?: string;
  priority?: string;
  data?: Record<string, unknown>;
  user_ids: number[];
  send_immediately?: boolean;
}

export interface UpdateNotificationRequest {
  title: string;
  body: string;
  type?: string;
  image_url?: string;
  image_data?: string; // Add image_data field for uploaded files
  sound?: string;
  priority?: string;
  data?: Record<string, unknown>;
  user_ids: number[];
  send_immediately?: boolean;
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  type: string;
  priority: string;
  image_url?: string;
  image_data?: string; // Add image_data field for uploaded files
  sound?: string;
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
  creator: {
    name: string;
  };
  users: Array<{
    id: number;
    name: string;
    phone: string;
  }>;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Extend User type for FCM token (if not already present)
export interface UserWithFCMToken {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: number;
  role_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  fcm_token?: string;
}

export interface SendNotificationToDeviceResponse {
  success: boolean;
  message?: string;
  error?: string;
  notification_id?: string;
  tokens_sent?: number;
  tokens_delivered?: number;
  tokens_failed?: number;
  details?: Array<{
    token: string;
    success: boolean;
    response: unknown;
  }>;
}

class NotificationService {
  private readonly baseEndpoint: string;

  constructor() {
    // Ensure the endpoint is always defined
    this.baseEndpoint = '/api/v1/admin/notification-management';
    
    // Validate the endpoint
    if (!this.baseEndpoint || this.baseEndpoint === 'undefined') {
      throw new Error('NotificationService: Invalid baseEndpoint configuration');
    }
    
    // Removed debug logs
  }

  // Get the base endpoint with validation
  public getBaseEndpoint(): string {
    if (!this.baseEndpoint || this.baseEndpoint === 'undefined') {
      throw new Error('NotificationService: baseEndpoint is not properly configured');
    }
    return this.baseEndpoint;
  }

  async getNotifications(page: number = 1, limit: number = 10): Promise<NotificationResponse> {
    const endpoint = `${this.baseEndpoint}?page=${page}&limit=${limit}`;
    const response = await apiService.get<NotificationResponse>(endpoint);
    return response;
  }

  async getNotification(id: number): Promise<{ success: boolean; message: string; data: Notification }> {
    const endpoint = `${this.baseEndpoint}/${id}`;
    const response = await apiService.get<{ success: boolean; message: string; data: Notification }>(endpoint);
    return response;
  }

  async createNotification(data: CreateNotificationRequest): Promise<{ success: boolean; message: string; data: Notification }> {
    const endpoint = this.baseEndpoint;
    
    // Ensure user_ids are properly formatted for backend (convert to positive integers)
    const processedData = {
      ...data,
      user_ids: data.user_ids.map(id => Math.abs(id)) // Ensure positive integers
    };
    
    const response = await apiService.post<{ success: boolean; message: string; data: Notification }>(endpoint, processedData);
    return response;
  }

  async updateNotification(id: number, data: UpdateNotificationRequest): Promise<{ success: boolean; message: string; data: Notification }> {
    const endpoint = `${this.baseEndpoint}/${id}`;
    
    // Ensure user_ids are properly formatted for backend (convert to positive integers)
    const processedData = {
      ...data,
      user_ids: data.user_ids.map(id => Math.abs(id)) // Ensure positive integers
    };
    
    const response = await apiService.put<{ success: boolean; message: string; data: Notification }>(endpoint, processedData);
    return response;
  }

  async deleteNotification(id: number): Promise<{ success: boolean; message: string }> {
    const endpoint = `${this.baseEndpoint}/${id}`;
    const response = await apiService.delete<{ success: boolean; message: string }>(endpoint);
    return response;
  }

  async sendNotification(id: number): Promise<{ success: boolean; message: string; response?: unknown }> {
    const endpoint = `${this.baseEndpoint}/${id}/send`;
    // Ensure the endpoint is properly formatted
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    // Test the URL construction
    // Removed debug logs
    // Test the health endpoint first
    try {
      await apiService.get<{ status: string }>('health');
    } catch {
      // Removed debug logs
    }
    // Test direct fetch to verify the URL
    try {
      const testUrl = 'http://84.247.131.246:8080/health';
      await fetch(testUrl);
    } catch {
      // Removed debug logs
    }
    
    const response = await apiService.post<{ success: boolean; message: string; response?: unknown }>(cleanEndpoint, {});
    return response;
  }

  async sendNotificationToDevice({
    title,
    body,
    tokens,
    image_url,
    data,
    priority = 'high',
  }: {
    title: string;
    body: string;
    tokens: string[];
    image_url?: string;
    data?: Record<string, unknown>;
    priority?: 'high' | 'normal';
  }): Promise<SendNotificationToDeviceResponse> {
    const endpoint = `https://ravipangali.com.np/user/api/firebase/apps/${APP_CONFIG.RP_FIREBASE_APP_ID}/notifications/`;
    
    // Process image_url to include backend base URL if it's a relative path
    let processedImageUrl = image_url;
    if (image_url && !image_url.startsWith('http') && !image_url.startsWith('https')) {
      // If it's a relative path, prepend the backend base URL
      processedImageUrl = `${ENV_CONFIG.API_BASE_URL}${image_url.startsWith('/') ? '' : '/'}${image_url}`;
    }
    
    const payload = {
      email: APP_CONFIG.RP_ACCOUNT_EMAIL,
      password: APP_CONFIG.RP_ACCOUNT_PASSWORD,
      title,
      body,
      tokens,
      image_url: processedImageUrl,
      data,
      priority,
    };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    return result;
  }
}

// Create and export the service instance
export const notificationService = new NotificationService(); 