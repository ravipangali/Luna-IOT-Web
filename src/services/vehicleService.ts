import { vehicleController } from '../controllers/vehicleController';
import { gpsController } from '../controllers/gpsController';
import type { Vehicle } from '../types/models';

export interface EnhancedVehicle extends Vehicle {
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  ignition?: boolean;
  lastUpdate?: Date;
  status?: string;
}

class VehicleService {
  async getVehicle(id: string): Promise<EnhancedVehicle> {
    try {
      const response = await vehicleController.getVehicle(id);
      if (response.success && response.data) {
        const vehicleData = response.data.data;
        // Get latest GPS data for the vehicle
        try {
          const gpsResponse = await gpsController.getLatestGPSDataByIMEI(vehicleData.imei);
          if (gpsResponse.success && gpsResponse.data) {
            // Merge GPS data with vehicle data
                         return {
               ...vehicleData,
               latitude: gpsResponse.data.latitude || 0,
               longitude: gpsResponse.data.longitude || 0,
              speed: gpsResponse.data.speed || 0,
              course: gpsResponse.data.course || 0,
              ignition: gpsResponse.data.ignition === 'ON',
              lastUpdate: new Date(gpsResponse.data.timestamp),
              status: this.determineVehicleStatus(gpsResponse.data),
            };
          }
        } catch (gpsError) {
          console.warn('Could not fetch GPS data for vehicle:', gpsError);
        }
        
        return vehicleData;
      } else {
        throw new Error(response.message || 'Vehicle not found');
      }
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      throw error;
    }
  }

  async getVehicles(): Promise<Vehicle[]> {
    try {
      const response = await vehicleController.getVehicles(1, 1000);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  private determineVehicleStatus(gpsData: { timestamp: string; ignition?: string; speed?: number }): string {
    if (!gpsData) return 'unknown';
    
    // Check if data is recent (within last hour)
    const lastUpdate = new Date(gpsData.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 1) {
      return 'offline';
    }
    
    if (gpsData.ignition === 'ON') {
      if (gpsData.speed && gpsData.speed > 0) {
        return 'running';
      } else {
        return 'idle';
      }
    } else {
      return 'stopped';
    }
  }
}

export const vehicleService = new VehicleService();
export default vehicleService; 