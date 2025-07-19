
import { authService } from './authService';

export interface UploadResponse {
  success: boolean;
  message: string;
  file_name?: string;
  file_path?: string;
  file_url?: string;
  error?: string;
}

class UploadService {
  private baseURL: string;

  constructor() {
    this.baseURL = 'https://system.mylunago.com';
  }

  async uploadNotificationImage(file: File): Promise<UploadResponse> {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return {
        success: false,
        message: 'Image size must be less than 5MB',
        error: 'file_too_large'
      };
    }

    // Validate file type
    if (!file.type.match('image/(jpeg|jpg|png|gif)')) {
      return {
        success: false,
        message: 'Only JPEG, PNG and GIF images are allowed',
        error: 'invalid_file_type'
      };
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadURL = `${this.baseURL}/api/v1/files/notifications/upload`;
      
      console.log('Uploading image to:', uploadURL);
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      let token = authService.getToken();
      let isAuthenticated = authService.isAuthenticated();
      let user = authService.getUser();
      
      // Fallback: check localStorage if sessionStorage is empty
      if (!token) {
        console.log('No token in sessionStorage, checking localStorage...');
        const localToken = localStorage.getItem('token') || localStorage.getItem('luna_auth_token');
        if (localToken) {
          console.log('Found token in localStorage, using it...');
          token = localToken;
          // Try to get user info from localStorage as well
          const localUser = localStorage.getItem('user') || localStorage.getItem('luna_auth_user');
          if (localUser) {
            try {
              user = JSON.parse(localUser);
              isAuthenticated = !!(token && user);
            } catch (e) {
              console.error('Error parsing user from localStorage:', e);
            }
          }
        }
      }
      
      console.log('Auth service token check:', {
        hasToken: !!token,
        tokenLength: token?.length,
        isAuthenticated,
        hasUser: !!user,
        userRole: user?.role
      });
      
      if (!token) {
        return {
          success: false,
          message: 'Authentication token not found. Please log in again.',
          error: 'no_token'
        };
      }
      
      if (!isAuthenticated) {
        return {
          success: false,
          message: 'User not authenticated. Please log in again.',
          error: 'not_authenticated'
        };
      }
      
      // Check if user is admin (required for file upload)
      // Allow upload if user role is 0 (admin) or if we can't determine role (fallback)
      const userRole = user?.role;
      if (userRole !== undefined && userRole !== 0) {
        return {
          success: false,
          message: 'Admin privileges required for file upload.',
          error: 'not_admin'
        };
      }

      const response = await fetch(uploadURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Note: Don't set Content-Type header for FormData, let browser set it with boundary
        },
        body: formData
      });

      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with status:', response.status, 'Error:', errorText);
        
        return {
          success: false,
          message: `Upload failed: ${response.status} ${response.statusText}`,
          error: 'upload_failed'
        };
      }

      const result = await response.json();
      console.log('Upload result:', result);

      if (result.success) {
        return {
          success: true,
          message: 'Image uploaded successfully',
          file_name: result.file_name,
          file_path: result.file_path,
          file_url: result.file_url
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to upload image',
          error: result.error || 'upload_failed'
        };
      }
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        message: 'Failed to upload image. Please try again.',
        error: 'network_error'
      };
    }
  }
}

export const uploadService = new UploadService(); 