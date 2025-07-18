import type { Vehicle, VehicleFormData, PaginatedResponse, ApiResponse, VehicleDetailsResponse, UserVehicle, MyVehicleResponse, Device } from '../types/models';
import { apiService } from '../services/apiService';
import { API_CONFIG } from '../config/api';

class VehicleController {
  async getVehicles(page: number = 1, limit: number = 10, userId?: string): Promise<PaginatedResponse<Vehicle>> {
    try {
      const params: Record<string, string> = {};
      if (userId) {
        params.userId = userId;
      }

      const response = await apiService.getPaginated<Vehicle>(
        API_CONFIG.ENDPOINTS.VEHICLES,
        page,
        limit,
        params
      );
      return response;
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  async getVehicle(imei: string): Promise<ApiResponse<VehicleDetailsResponse>> {
    try {
      const response = await apiService.get<ApiResponse<VehicleDetailsResponse>>(
        API_CONFIG.ENDPOINTS.VEHICLE_BY_IMEI(imei)
      );
      return response;
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      throw error;
    }
  }

  async getVehicleByRegNo(regNo: string): Promise<ApiResponse<Vehicle>> {
    try {
      const response = await apiService.get<ApiResponse<Vehicle>>(
        API_CONFIG.ENDPOINTS.VEHICLE_BY_REG_NO(regNo)
      );
      return response;
    } catch (error) {
      console.error('Error fetching vehicle by reg no:', error);
      throw error;
    }
  }

  async createVehicle(data: VehicleFormData): Promise<ApiResponse<Vehicle>> {
    try {
      console.log('Creating vehicle with data:', data);
      
      const response = await apiService.post<ApiResponse<Vehicle>>(
        API_CONFIG.ENDPOINTS.VEHICLES,
        data
      );
      
      console.log('Vehicle creation response:', response);
      return response;
    } catch (error) {
      console.error('Error creating vehicle:', error);
      
      // Parse error details for better user feedback
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      
      throw error;
    }
  }

  async updateVehicle(imei: string, data: Partial<VehicleFormData>): Promise<ApiResponse<Vehicle>> {
    try {
      const response = await apiService.put<ApiResponse<Vehicle>>(
        API_CONFIG.ENDPOINTS.VEHICLE_BY_IMEI(imei),
        data
      );
      return response;
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }

  async deleteVehicle(imei: string): Promise<ApiResponse<null>> {
    try {
      const response = await apiService.delete<ApiResponse<null>>(
        API_CONFIG.ENDPOINTS.VEHICLE_BY_IMEI(imei)
      );
      return response;
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }

  async searchVehicles(query: string): Promise<ApiResponse<Vehicle[]>> {
    try {
      // For now, we'll implement a client-side search by getting all vehicles
      // In the future, the backend can provide a search endpoint
      const response = await this.getVehicles(1, 100); // Get more vehicles for search
      const filteredVehicles = response.data.filter(vehicle =>
        vehicle.imei.toLowerCase().includes(query.toLowerCase()) ||
        vehicle.reg_no.toLowerCase().includes(query.toLowerCase()) ||
        vehicle.name.toLowerCase().includes(query.toLowerCase())
      );

      return {
        success: true,
        message: 'Search completed',
        data: filteredVehicles
      };
    } catch (error) {
      console.error('Error searching vehicles:', error);
      throw error;
    }
  }

  async setMainUser(vehicleId: string, userAccessId: number): Promise<ApiResponse<UserVehicle>> {
    try {
      const response = await apiService.put<ApiResponse<UserVehicle>>(
        API_CONFIG.ENDPOINTS.USER_VEHICLES_SET_MAIN_USER(vehicleId),
        { user_access_id: userAccessId }
      );
      return response;
    } catch (error) {
      console.error('Error setting main user:', error);
      throw error;
    }
  }

  async getMyVehicle(imei: string): Promise<ApiResponse<MyVehicleResponse>> {
    try {
      const response = await apiService.get<ApiResponse<MyVehicleResponse>>(
        API_CONFIG.ENDPOINTS.MY_VEHICLES_BY_IMEI(imei)
      );
      return response;
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      throw error;
    }
  }

  async getAvailableDevices(): Promise<ApiResponse<Device[]>> {
    try {
      const response = await apiService.get<ApiResponse<Device[]>>(
        API_CONFIG.ENDPOINTS.DEVICES
      );
      return response;
    } catch (error) {
      console.error('Error fetching available devices:', error);
      throw error;
    }
  }
}

export const vehicleController = new VehicleController();
export default vehicleController; 