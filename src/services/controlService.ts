import { apiService } from './apiService';
import { API_CONFIG } from '../config/api';

export interface ControlResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export interface ControlRequest {
  imei?: string;
  device_id?: number;
}

class ControlService {
  // Cut oil and electricity
  async cutOilElectricity(imei: string): Promise<ControlResponse> {
    try {
      const response = await apiService.post(API_CONFIG.ENDPOINTS.CONTROL_CUT_OIL, {
        imei
      }) as any;
      return {
        success: true,
        message: response.message || 'Oil cut command sent successfully',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send cut oil command',
        message: this.extractErrorMessage(error)
      };
    }
  }

  // Connect oil and electricity
  async connectOilElectricity(imei: string): Promise<ControlResponse> {
    try {
      const response = await apiService.post(API_CONFIG.ENDPOINTS.CONTROL_CONNECT_OIL, {
        imei
      }) as any;
      return {
        success: true,
        message: response.message || 'Oil connect command sent successfully',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send connect oil command',
        message: this.extractErrorMessage(error)
      };
    }
  }

  // Get location command
  async getLocation(imei: string): Promise<ControlResponse> {
    try {
      const response = await apiService.post(API_CONFIG.ENDPOINTS.CONTROL_GET_LOCATION, {
        imei
      }) as any;
      return {
        success: true,
        message: response.message || 'Location request sent successfully',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send location request',
        message: this.extractErrorMessage(error)
      };
    }
  }

  // Get active devices
  async getActiveDevices(): Promise<ControlResponse> {
    try {
      const response = await apiService.get(API_CONFIG.ENDPOINTS.CONTROL_ACTIVE_DEVICES) as any;
      return {
        success: true,
        message: 'Active devices retrieved successfully',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get active devices',
        message: this.extractErrorMessage(error)
      };
    }
  }

  // Note: The following methods are commented out as the corresponding endpoints
  // don't exist in the current API configuration. They can be uncommented
  // when the backend implements these endpoints.
  
  /*
  // Quick cut oil by device ID
  async quickCutOil(deviceId: string): Promise<ControlResponse> {
    try {
      const response = await apiService.post(`/api/v1/control/quick-cut/${deviceId}`);
      return {
        success: true,
        message: response.message || 'Quick cut command sent successfully',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send quick cut command',
        message: this.extractErrorMessage(error)
      };
    }
  }

  // Quick connect oil by device ID
  async quickConnectOil(deviceId: string): Promise<ControlResponse> {
    try {
      const response = await apiService.post(`/api/v1/control/quick-connect/${deviceId}`);
      return {
        success: true,
        message: response.message || 'Quick connect command sent successfully',
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send quick connect command',
        message: this.extractErrorMessage(error)
      };
    }
  }
  */

  // Extract error message from error object
  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      if ('response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; message?: string } } };
        if (axiosError.response?.data?.error) {
          return axiosError.response.data.error;
        }
        if (axiosError.response?.data?.message) {
          return axiosError.response.data.message;
        }
      }
      if ('message' in error) {
        const errorWithMessage = error as { message: string };
        return errorWithMessage.message;
      }
    }
    return 'Unknown error occurred';
  }
}

// Create and export singleton instance
export const controlService = new ControlService();
export default controlService; 