import { apiService } from './apiService';
import { ENDPOINTS } from '../config/api';
import type { DeviceModel, DeviceModelFormData, ApiResponse, PaginatedResponse } from '../types/models';

export const deviceModelService = {
  // Get all device models
  getAll: async (includeDevices?: boolean): Promise<ApiResponse<DeviceModel[]>> => {
    const endpoint = `${ENDPOINTS.DEVICE_MODELS}${includeDevices ? '?include_devices=true' : ''}`;
    return apiService.get<ApiResponse<DeviceModel[]>>(endpoint);
  },

  // Get a specific device model by ID
  getById: async (id: number, includeDevices?: boolean): Promise<ApiResponse<DeviceModel>> => {
    const endpoint = `${ENDPOINTS.DEVICE_MODEL_BY_ID(id.toString())}${includeDevices ? '?include_devices=true' : ''}`;
    return apiService.get<ApiResponse<DeviceModel>>(endpoint);
  },

  // Create a new device model
  create: async (deviceModel: DeviceModelFormData): Promise<ApiResponse<DeviceModel>> => {
    return apiService.post<ApiResponse<DeviceModel>>(ENDPOINTS.DEVICE_MODELS, deviceModel);
  },

  // Update an existing device model
  update: async (id: number, deviceModel: Partial<DeviceModelFormData>): Promise<ApiResponse<DeviceModel>> => {
    return apiService.put<ApiResponse<DeviceModel>>(ENDPOINTS.DEVICE_MODEL_BY_ID(id.toString()), deviceModel);
  },

  // Delete a device model
  delete: async (id: number): Promise<ApiResponse<void>> => {
    return apiService.delete<ApiResponse<void>>(ENDPOINTS.DEVICE_MODEL_BY_ID(id.toString()));
  },

  // Get paginated device models
  getPaginated: async (
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<DeviceModel>> => {
    return apiService.getPaginated<DeviceModel>(ENDPOINTS.DEVICE_MODELS, page, limit);
  }
}; 