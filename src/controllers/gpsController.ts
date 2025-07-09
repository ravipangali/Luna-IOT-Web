import type { ApiResponse, PaginatedResponse } from '../types/models';
import { apiService } from '../services/apiService';
import { API_CONFIG } from '../config/api';

export interface GPSData {
  id?: string;
  imei: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  altitude?: number;
  ignition: string;
  protocol_name: string;
  satellites?: number;
  gps_real_time?: boolean;
  gps_positioned?: boolean;
  charger: string;
  gps_tracking: string;
  oil_electricity: string;
  device_status: string;
  voltage_level?: number;
  voltage_status?: string;
  gsm_signal?: number;
  gsm_status?: string;
}

export interface IndividualTrackingData {
  success: boolean;
  imei: string;
  message: string;
  has_status: boolean;
  has_location: boolean;
  status_data?: GPSData;
  location_data?: GPSData;
  location_is_historical?: boolean;
}

export interface GPSRoute {
  imei: string;
  start_time: string;
  end_time: string;
  total_distance: number;
  points: GPSData[];
}

class GPSController {
  async getGPSData(page: number = 1, limit: number = 10): Promise<PaginatedResponse<GPSData>> {
    try {
      const response = await apiService.getPaginated<GPSData>(
        API_CONFIG.ENDPOINTS.GPS,
        page,
        limit
      );
      return response;
    } catch (error) {
      console.error('Error fetching GPS data:', error);
      throw error;
    }
  }

  async getLatestGPSData(): Promise<ApiResponse<GPSData[]>> {
    try {
      const response = await apiService.get<ApiResponse<GPSData[]>>(
        `${API_CONFIG.ENDPOINTS.GPS}/latest`
      );
      return response;
    } catch (error) {
      console.error('Error fetching latest GPS data:', error);
      throw error;
    }
  }

  async getLatestValidGPSData(): Promise<ApiResponse<GPSData[]>> {
    try {
      const response = await apiService.get<ApiResponse<GPSData[]>>(
        API_CONFIG.ENDPOINTS.GPS_LATEST_VALID
      );
      return response;
    } catch (error) {
      console.error('Error fetching latest valid GPS data:', error);
      throw error;
    }
  }

  async getGPSDataByIMEI(imei: string, page: number = 1, limit: number = 10): Promise<PaginatedResponse<GPSData>> {
    try {
      const response = await apiService.getPaginated<GPSData>(
        API_CONFIG.ENDPOINTS.GPS_BY_IMEI(imei),
        page,
        limit
      );
      return response;
    } catch (error) {
      console.error('Error fetching GPS data by IMEI:', error);
      throw error;
    }
  }

  async getLatestGPSDataByIMEI(imei: string): Promise<ApiResponse<GPSData>> {
    try {
      const response = await apiService.get<ApiResponse<GPSData>>(
        API_CONFIG.ENDPOINTS.GPS_LATEST_BY_IMEI(imei)
      );
      return response;
    } catch (error) {
      console.error('Error fetching latest GPS data by IMEI:', error);
      throw error;
    }
  }

  async getLatestValidGPSDataByIMEI(imei: string): Promise<ApiResponse<GPSData>> {
    try {
      console.log(`📍 Attempting to get latest valid GPS data for IMEI: ${imei}`);
      const response = await apiService.get<ApiResponse<GPSData>>(
        API_CONFIG.ENDPOINTS.GPS_LATEST_VALID_BY_IMEI(imei)
      );
      
      // Enhanced response handling
      if (response.success && response.data) {
        const hasValidCoords = response.data.latitude !== null && 
                              response.data.longitude !== null &&
                              response.data.latitude !== undefined && 
                              response.data.longitude !== undefined;
        
        console.log(`✅ GPS data retrieved for ${imei}:`, {
          hasValidCoords,
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          timestamp: response.data.timestamp
        });
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching latest valid GPS data by IMEI:', error);
      throw error;
    }
  }

  async getGPSRoute(imei: string, startDate?: string, endDate?: string): Promise<ApiResponse<GPSRoute>> {
    try {
      let endpoint = API_CONFIG.ENDPOINTS.GPS_ROUTE(imei);
      
      // Add date filters if provided
      if (startDate || endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        endpoint += `?${params.toString()}`;
      }
      
      const response = await apiService.get<ApiResponse<GPSRoute>>(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching GPS route:', error);
      throw error;
    }
  }

  async deleteGPSData(id: string): Promise<ApiResponse<null>> {
    try {
      const response = await apiService.delete<ApiResponse<null>>(
        API_CONFIG.ENDPOINTS.GPS_DELETE(id)
      );
      return response;
    } catch (error) {
      console.error('Error deleting GPS data:', error);
      throw error;
    }
  }

  // Helper method to filter GPS data by date range
  filterGPSDataByDateRange(gpsData: GPSData[], startDate: Date, endDate: Date): GPSData[] {
    return gpsData.filter(data => {
      const timestamp = new Date(data.timestamp);
      return timestamp >= startDate && timestamp <= endDate;
    });
  }

  // Helper method to calculate distance between two GPS points
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Helper method to calculate total distance for a route
  calculateRouteDistance(gpsPoints: GPSData[]): number {
    if (gpsPoints.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < gpsPoints.length; i++) {
      const prev = gpsPoints[i - 1];
      const curr = gpsPoints[i];
      
      if (prev.latitude && prev.longitude && curr.latitude && curr.longitude) {
        totalDistance += this.calculateDistance(
          prev.latitude, prev.longitude,
          curr.latitude, curr.longitude
        );
      }
    }
    
    return totalDistance;
  }

  // Helper method to get device statistics
  async getDeviceStatistics(imei: string, days: number = 7): Promise<{
    totalPoints: number;
    totalDistance: number;
    averageSpeed: number;
    onlineTime: number;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const response = await this.getGPSDataByIMEI(imei, 1, 1000); // Get more data for analysis
      const gpsData = this.filterGPSDataByDateRange(response.data, startDate, endDate);
      
      const totalPoints = gpsData.length;
      const totalDistance = this.calculateRouteDistance(gpsData);
      
      const speedData = gpsData.filter(d => d.speed && d.speed > 0);
      const averageSpeed = speedData.length > 0 
        ? speedData.reduce((sum, d) => sum + (d.speed || 0), 0) / speedData.length 
        : 0;
      
      // Calculate online time (time between first and last GPS point)
      const onlineTime = totalPoints > 1 
        ? (new Date(gpsData[totalPoints - 1].timestamp).getTime() - new Date(gpsData[0].timestamp).getTime()) / (1000 * 60 * 60) // hours
        : 0;
      
      return {
        totalPoints,
        totalDistance,
        averageSpeed,
        onlineTime
      };
    } catch (error) {
      console.error('Error calculating device statistics:', error);
      return {
        totalPoints: 0,
        totalDistance: 0,
        averageSpeed: 0,
        onlineTime: 0
      };
    }
  }

  // NEW: Get latest location data (coordinates only) for all devices
  async getLatestLocationData(): Promise<ApiResponse<GPSData[]>> {
    try {
      const response = await apiService.get<ApiResponse<GPSData[]>>(
        API_CONFIG.ENDPOINTS.GPS_LATEST_LOCATION
      );
      return response;
    } catch (error) {
      console.error('Error fetching latest location data:', error);
      throw error;
    }
  }

  // NEW: Get latest status data (device status only) for all devices  
  async getLatestStatusData(): Promise<ApiResponse<GPSData[]>> {
    try {
      const response = await apiService.get<ApiResponse<GPSData[]>>(
        API_CONFIG.ENDPOINTS.GPS_LATEST_STATUS
      );
      return response;
    } catch (error) {
      console.error('Error fetching latest status data:', error);
      throw error;
    }
  }

  // NEW: Get location data for specific device (coordinates with fallback)
  async getLocationDataByIMEI(imei: string): Promise<ApiResponse<GPSData>> {
    try {
      const response = await apiService.get<ApiResponse<GPSData>>(
        API_CONFIG.ENDPOINTS.GPS_LOCATION_BY_IMEI(imei)
      );
      return response;
    } catch (error) {
      console.error(`Error fetching location data for IMEI ${imei}:`, error);
      // Fallback to latest valid GPS data
      try {
        console.log(`📍 Falling back to latest valid GPS data for IMEI: ${imei}`);
        return await this.getLatestValidGPSDataByIMEI(imei);
      } catch (fallbackError) {
        console.error(`❌ Fallback also failed for IMEI ${imei}:`, fallbackError);
        throw error; // Throw original error
      }
    }
  }

  // NEW: Get status data for specific device (device status information)
  async getStatusDataByIMEI(imei: string): Promise<ApiResponse<GPSData>> {
    try {
      const response = await apiService.get<ApiResponse<GPSData>>(
        API_CONFIG.ENDPOINTS.GPS_STATUS_BY_IMEI(imei)
      );
      return response;
    } catch (error) {
      console.error(`Error fetching status data for IMEI ${imei}:`, error);
      // Fallback to latest valid GPS data
      try {
        console.log(`📊 Falling back to latest valid GPS data for status for IMEI: ${imei}`);
        return await this.getLatestValidGPSDataByIMEI(imei);
      } catch (fallbackError) {
        console.error(`❌ Status fallback also failed for IMEI ${imei}:`, fallbackError);
        throw error; // Throw original error
      }
    }
  }

  async getIndividualTrackingData(imei: string): Promise<IndividualTrackingData> {
    try {
      const response = await apiService.get<IndividualTrackingData>(
        API_CONFIG.ENDPOINTS.GPS_INDIVIDUAL_TRACKING(imei)
      );
      return response;
    } catch (error) {
      console.error(`Error fetching individual tracking data for IMEI ${imei}:`, error);
      throw error;
    }
  }
}

export const gpsController = new GPSController();
export default gpsController; 