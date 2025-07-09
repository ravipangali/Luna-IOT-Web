import { apiService } from '../services/apiService';
import type { ApiResponse, Vehicle, VehicleDetailsResponse, VehicleFormData, UserVehicle } from '../types/models';

export const getVehicles = async (): Promise<ApiResponse<Vehicle[]>> => {
  return apiService.get<ApiResponse<Vehicle[]>>('/vehicles');
};

export const getVehicle = async (imei: string): Promise<Vehicle> => {
  const response = await apiService.get<VehicleDetailsResponse>(`/vehicles/${imei}`);
  return response.data;
};

export const createVehicle = async (vehicleData: VehicleFormData): Promise<ApiResponse<Vehicle>> => {
  return apiService.post<ApiResponse<Vehicle>>('/vehicles', vehicleData);
};

export const updateVehicle = async (imei: string, vehicleData: Partial<VehicleFormData>): Promise<ApiResponse<Vehicle>> => {
  return apiService.put<ApiResponse<Vehicle>>(`/vehicles/${imei}`, vehicleData);
};

export const setMainUser = async (vehicleId: string, userAccessId: number): Promise<ApiResponse<UserVehicle>> => {
  return apiService.put<ApiResponse<UserVehicle>>(`/user-vehicles/vehicle/${vehicleId}/set-main-user`, {
    user_access_id: userAccessId,
  });
};