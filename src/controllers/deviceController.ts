import type { Device, DeviceFormData, PaginatedResponse, ApiResponse } from '../types/models';
import { apiService } from '../services/apiService';
import { API_CONFIG } from '../config/api';

interface ActiveDevice {
  imei: string;
  status: string;
  last_seen?: string;
  vehicle_reg?: string;
}

class DeviceController {
  async getDevices(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Device>> {
    try {
      const response = await apiService.getPaginated<Device>(
        API_CONFIG.ENDPOINTS.DEVICES,
        page,
        limit
      );
      return response;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }

  async getDevice(id: string): Promise<ApiResponse<Device>> {
    try {
      const response = await apiService.get<ApiResponse<Device>>(
        API_CONFIG.ENDPOINTS.DEVICE_BY_ID(id)
      );
      return response;
    } catch (error) {
      console.error('Error fetching device:', error);
      throw error;
    }
  }

  async getDeviceByIMEI(imei: string): Promise<ApiResponse<Device>> {
    try {
      const response = await apiService.get<ApiResponse<Device>>(
        API_CONFIG.ENDPOINTS.DEVICE_BY_IMEI(imei)
      );
      return response;
    } catch (error) {
      console.error('Error fetching device by IMEI:', error);
      throw error;
    }
  }

  async createDevice(data: DeviceFormData): Promise<ApiResponse<Device>> {
    try {
      const response = await apiService.post<ApiResponse<Device>>(
        API_CONFIG.ENDPOINTS.DEVICES,
        data
      );
      return response;
    } catch (error: unknown) {
      console.error('Error creating device:', error);
      
      // Type guard for ApiError
      const apiError = error as { status?: number; message?: string };
      
      // Enhanced error handling
      if (apiError.status === 400) {
        // Format validation errors
        if (apiError.message && apiError.message.includes('IMEI')) {
          throw new Error(`IMEI validation failed: ${apiError.message}`);
        } else if (apiError.message && apiError.message.includes('SIM')) {
          throw new Error(`SIM validation failed: ${apiError.message}`);
        }
      } else if (apiError.status === 409 || (apiError.message && apiError.message.includes('already exists'))) {
        throw new Error('A device with this IMEI already exists');
      } else if (apiError.message && (
          apiError.message.includes('foreign key constraint') || 
          apiError.message.includes('associated with a vehicle')
        )) {
        throw new Error('This IMEI is already associated with a vehicle');
      }
      
      // If no specific error was caught, throw a generic one with the original message if possible
      throw new Error(apiError.message || 'Failed to create device. Please try again later.');
    }
  }

  async updateDevice(id: string, data: Partial<DeviceFormData>): Promise<ApiResponse<Device>> {
    try {
      const response = await apiService.put<ApiResponse<Device>>(
        API_CONFIG.ENDPOINTS.DEVICE_BY_ID(id),
        data
      );
      return response;
    } catch (error) {
      console.error('Error updating device:', error);
      throw error;
    }
  }

  async deleteDevice(id: string): Promise<ApiResponse<null>> {
    try {
      const response = await apiService.delete<ApiResponse<null>>(
        API_CONFIG.ENDPOINTS.DEVICE_BY_ID(id)
      );
      return response;
    } catch (error) {
      console.error('Error deleting device:', error);
      throw error;
    }
  }

  async searchDevices(query: string): Promise<ApiResponse<Device[]>> {
    try {
      // For now, we'll implement a client-side search by getting all devices
      // In the future, the backend can provide a search endpoint
      const response = await this.getDevices(1, 100); // Get more devices for search
      const filteredDevices = response.data.filter(device =>
        device.imei.toLowerCase().includes(query.toLowerCase()) ||
        device.sim_no.toLowerCase().includes(query.toLowerCase()) ||
        device.sim_operator.toLowerCase().includes(query.toLowerCase())
      );

      return {
        success: true,
        message: 'Search completed',
        data: filteredDevices
      };
    } catch (error) {
      console.error('Error searching devices:', error);
      throw error;
    }
  }

  // Additional method to check device connection status
  async getActiveDevices(): Promise<ApiResponse<ActiveDevice[]>> {
    try {
      const response = await apiService.get<ApiResponse<ActiveDevice[]>>(
        API_CONFIG.ENDPOINTS.CONTROL_ACTIVE_DEVICES
      );
      return response;
    } catch (error) {
      console.error('Error fetching active devices:', error);
      throw error;
    }
  }
}

export const deviceController = new DeviceController();
export default deviceController; 