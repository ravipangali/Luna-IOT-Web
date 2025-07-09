import { vehicleController } from '../controllers/vehicleController';
import { gpsController, type GPSData } from '../controllers/gpsController';
import { websocketService, type GPSUpdate, type LocationUpdate, type StatusUpdate } from './websocketService';
import { type VehicleStatus, getLiveIconPath, getStatusIconPath, getVehicleStatus } from '../utils/vehicleIcons';
import { reverseGeocodingService } from './reverseGeocodingService';
import type { Vehicle, ApiResponse } from '../types/models';
import { apiService } from './apiService';
import { API_CONFIG } from '../config/api';

export interface EnhancedVehicleData {
  // Vehicle info
  id: string;
  imei: string;
  reg_no: string;
  name: string;
  vehicleType: string;
  
  // GPS location data
  latitude: number | null;
  longitude: number | null;
  speed: number;
  course: number;
  altitude?: number;
  
  // Device status data
  ignition: string;
  isOnline: boolean;
  status: VehicleStatus;
  connectionStatus: 'connected' | 'disconnected';
  lastUpdate: Date;
  
  // Enhanced data
  address?: string;
  satellites?: number;
  gsm_signal?: number;
  voltage_level?: number;
  
  // Device info
  device?: {
    sim_no: string;
    sim_operator: string;
    protocol: string;
  };
  
  // Status data from WebSocket
  battery?: {
    level: number;
    voltage: number;
    status: string;
    charging: boolean;
  };
  
  signal?: {
    level: number;
    bars: number;
    status: string;
    percentage: number;
  };
  
  device_status?: {
    activated: boolean;
    gps_tracking: boolean;
    oil_connected: boolean;
    engine_running: boolean;
    satellites: number;
  };
  
  // Icon paths
  liveIconPath: string;
  statusIconPath: string;
  
  // Overspeed limit
  overspeedLimit: number;
  
  // Additional vehicle data
  odometer?: number;
  mileage?: number;
  min_fuel?: number;
}

interface VehicleTrackingOptions {
  includeOffline?: boolean;
  statusFilter?: VehicleStatus[];
  searchQuery?: string;
  limit?: number;
  userId?: string;
}

class EnhancedVehicleTrackingService {
  private vehicleCache = new Map<string, EnhancedVehicleData>();
  private lastUpdateTime = new Map<string, Date>();
  private subscribers = new Set<(vehicles: EnhancedVehicleData[]) => void>();
  private isConnected = false;

  constructor() {
    this.setupWebSocketListeners();
  }

  // Setup WebSocket event listeners for separated location and status updates
  private setupWebSocketListeners() {
    // Listen for location updates (coordinates)
    websocketService.on('location_update', (data: unknown) => {
      if (typeof data === 'object' && data !== null && 'imei' in data) {
        this.handleLocationUpdate(data as LocationUpdate);
      }
    });

    // Listen for status updates (device status)
    websocketService.on('status_update', (data: unknown) => {
      if (typeof data === 'object' && data !== null && 'imei' in data) {
        this.handleStatusUpdate(data as StatusUpdate);
      }
    });

    // Listen for legacy GPS updates (backward compatibility)
    websocketService.on('gps_update', (data: unknown) => {
      if (typeof data === 'object' && data !== null && 'imei' in data) {
        this.handleGPSUpdate(data as GPSUpdate);
      }
    });

    websocketService.on('device_status', (data: unknown) => {
      if (typeof data === 'object' && data !== null && 'imei' in data && 'status' in data) {
        this.handleDeviceStatus(data as { imei: string; status: string; [key: string]: unknown });
      }
    });

    websocketService.on('connect', () => {
      this.isConnected = true;
    });

    websocketService.on('disconnect', () => {
      this.isConnected = false;
    });
  }

  // Handle location updates from WebSocket (coordinates only)
  private async handleLocationUpdate(locationUpdate: LocationUpdate) {
    try {
      const existingVehicle = this.vehicleCache.get(locationUpdate.imei);
      
      if (existingVehicle) {
        console.log(`📍 Location update for ${locationUpdate.imei}: lat=${locationUpdate.latitude}, lng=${locationUpdate.longitude}`);
        
        // Update only location-related data
        const updatedVehicle: EnhancedVehicleData = {
          ...existingVehicle,
          latitude: locationUpdate.latitude,
          longitude: locationUpdate.longitude,
          speed: locationUpdate.speed || 0,
          course: locationUpdate.course || 0,
          altitude: locationUpdate.altitude,
          lastUpdate: new Date(locationUpdate.timestamp),
        };

        // Update status based on new location data
        updatedVehicle.status = this.calculateVehicleStatus(
          updatedVehicle.speed,
          updatedVehicle.ignition,
          updatedVehicle.overspeedLimit,
          true, // has GPS data since we received location update
          updatedVehicle.lastUpdate
        );

        // Update icon paths based on new status
        updatedVehicle.liveIconPath = getLiveIconPath(updatedVehicle.vehicleType, updatedVehicle.status);
        updatedVehicle.statusIconPath = getStatusIconPath(updatedVehicle.vehicleType, updatedVehicle.status);

        this.vehicleCache.set(locationUpdate.imei, updatedVehicle);
        this.lastUpdateTime.set(locationUpdate.imei, new Date());
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  // Handle status updates from WebSocket (device status only)
  private async handleStatusUpdate(statusUpdate: StatusUpdate) {
    try {
      const existingVehicle = this.vehicleCache.get(statusUpdate.imei);
      
      if (existingVehicle) {
        console.log(`📊 Status update for ${statusUpdate.imei}: ignition=${statusUpdate.ignition}, speed=${statusUpdate.speed}, status=${statusUpdate.connection_status}`);
        
        // Update only status-related data (keep existing coordinates)
        const updatedVehicle: EnhancedVehicleData = {
          ...existingVehicle,
          speed: statusUpdate.speed || 0,
          ignition: statusUpdate.ignition || 'OFF',
          isOnline: true, // WebSocket connection active
          connectionStatus: statusUpdate.connection_status === 'connected' ? 'connected' : 'disconnected',
          lastUpdate: new Date(statusUpdate.timestamp),
          
          // Update status information from WebSocket
          battery: statusUpdate.battery ? {
            level: statusUpdate.battery.level,
            voltage: statusUpdate.battery.voltage,
            status: statusUpdate.battery.status,
            charging: statusUpdate.battery.charging,
          } : existingVehicle.battery,
          
          signal: statusUpdate.signal ? {
            level: statusUpdate.signal.level,
            bars: statusUpdate.signal.bars,
            status: statusUpdate.signal.status,
            percentage: statusUpdate.signal.percentage,
          } : existingVehicle.signal,
          
          device_status: statusUpdate.device_status ? {
            activated: statusUpdate.device_status.activated,
            gps_tracking: statusUpdate.device_status.gps_tracking,
            oil_connected: statusUpdate.device_status.oil_connected,
            engine_running: statusUpdate.device_status.engine_running,
            satellites: statusUpdate.device_status.satellites,
          } : existingVehicle.device_status,
        };

        // Update status based on new status data
        updatedVehicle.status = this.calculateVehicleStatus(
          updatedVehicle.speed,
          updatedVehicle.ignition,
          updatedVehicle.overspeedLimit,
          true, // has GPS data since we received status update
          updatedVehicle.lastUpdate
        );

        // Update icon paths based on new status
        updatedVehicle.liveIconPath = getLiveIconPath(updatedVehicle.vehicleType, updatedVehicle.status);
        updatedVehicle.statusIconPath = getStatusIconPath(updatedVehicle.vehicleType, updatedVehicle.status);

        this.vehicleCache.set(statusUpdate.imei, updatedVehicle);
        this.lastUpdateTime.set(statusUpdate.imei, new Date());
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Error handling status update:', error);
    }
  }

  // Handle legacy GPS updates (backward compatibility)
  private async handleGPSUpdate(gpsUpdate: GPSUpdate) {
    try {
      const existingVehicle = this.vehicleCache.get(gpsUpdate.imei);
      
      if (existingVehicle) {
        const gpsTimestamp = new Date(gpsUpdate.timestamp);
        
        // Check if WebSocket has valid coordinates (location data)
        let finalLatitude = existingVehicle.latitude;
        let finalLongitude = existingVehicle.longitude;
        
        if (gpsUpdate.latitude !== null && gpsUpdate.latitude !== undefined && 
            gpsUpdate.longitude !== null && gpsUpdate.longitude !== undefined) {
          finalLatitude = gpsUpdate.latitude;
          finalLongitude = gpsUpdate.longitude;
          console.log(`📍 Legacy GPS update with coordinates for ${gpsUpdate.imei}: lat=${gpsUpdate.latitude}, lng=${gpsUpdate.longitude}`);
        } else {
          console.log(`📊 Legacy GPS update with status only for ${gpsUpdate.imei}: ignition=${gpsUpdate.ignition}, speed=${gpsUpdate.speed}`);
        }

        // Update vehicle with GPS data
        const updatedVehicle: EnhancedVehicleData = {
          ...existingVehicle,
          latitude: finalLatitude,
          longitude: finalLongitude,
          speed: gpsUpdate.speed || 0,
          course: gpsUpdate.course !== undefined ? gpsUpdate.course : (gpsUpdate.bearing || existingVehicle.course || 0),
          ignition: gpsUpdate.ignition || 'OFF',
          altitude: gpsUpdate.altitude,
          satellites: gpsUpdate.device_status?.satellites,
          isOnline: true, // WebSocket connection active
          connectionStatus: gpsUpdate.connection_status === 'connected' ? 'connected' : 'disconnected',
          lastUpdate: gpsTimestamp,
          // Determine status based on GPS data
          status: this.calculateVehicleStatus(
            gpsUpdate.speed || 0,
            gpsUpdate.ignition || 'OFF',
            existingVehicle.overspeedLimit,
            true, // has GPS data since we received WebSocket update
            gpsTimestamp
          ),
        };

        // Update icon paths based on new status
        updatedVehicle.liveIconPath = getLiveIconPath(updatedVehicle.vehicleType, updatedVehicle.status);
        updatedVehicle.statusIconPath = getStatusIconPath(updatedVehicle.vehicleType, updatedVehicle.status);

        // Add device status information from WebSocket update
        updatedVehicle.device_status = {
          activated: gpsUpdate.device_status?.activated ?? true,
          gps_tracking: gpsUpdate.device_status?.gps_tracking ?? true,
          oil_connected: gpsUpdate.device_status?.oil_connected ?? false,
          engine_running: gpsUpdate.device_status?.engine_running ?? (updatedVehicle.ignition === 'ON'),
          satellites: gpsUpdate.device_status?.satellites ?? 0,
        };

        // Add battery and signal information
        if (gpsUpdate.battery) {
          updatedVehicle.battery = {
            level: gpsUpdate.battery.level,
            voltage: gpsUpdate.battery.voltage,
            status: gpsUpdate.battery.status,
            charging: gpsUpdate.battery.charging,
          };
        }

        if (gpsUpdate.signal) {
          updatedVehicle.signal = {
            level: gpsUpdate.signal.level,
            bars: gpsUpdate.signal.bars,
            status: gpsUpdate.signal.status,
            percentage: gpsUpdate.signal.percentage,
          };
        }

        this.vehicleCache.set(gpsUpdate.imei, updatedVehicle);
        this.lastUpdateTime.set(gpsUpdate.imei, new Date());
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Error handling GPS update:', error);
    }
  }

  // Handle device status updates from WebSocket
  private handleDeviceStatus(deviceStatus: { imei: string; status: string; [key: string]: unknown }) {
    try {
      const existingVehicle = this.vehicleCache.get(deviceStatus.imei);
      
      if (existingVehicle) {
        const isConnected = deviceStatus.status === 'connected';
        
        // ENHANCED FIX: We don't care about device connection status for vehicle status
        // Only update connection indicator, keep GPS-based vehicle status unchanged
        const updatedVehicle: EnhancedVehicleData = {
          ...existingVehicle,
          isOnline: isConnected,
          connectionStatus: isConnected ? 'connected' : 'disconnected',
          // CRITICAL: Keep existing GPS-based status unchanged
          // Device connection/disconnection doesn't affect vehicle operational status
        };

        // Keep existing icon paths - they're based on GPS status, not connection status
        // Icons should only change when GPS data changes, not when device connects/disconnects

        // Update cache
        this.vehicleCache.set(deviceStatus.imei, updatedVehicle);
        
        console.log(`Device ${deviceStatus.imei} ${isConnected ? 'connected' : 'disconnected'}, keeping GPS-based status: ${existingVehicle.status}`);
        
        // Notify subscribers
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Error handling device status update:', error);
    }
  }

  // Load all vehicles from database with their last GPS data
  public async getAllVehicles(options: VehicleTrackingOptions = {}): Promise<EnhancedVehicleData[]> {
    try {
      // Step 1: Fetch the user's vehicles
      const vehicleResponse = await vehicleController.getVehicles(1, options.limit || 1000, options.userId);
      const userVehicles = vehicleResponse.data;

      if (!userVehicles || userVehicles.length === 0) {
        this.vehicleCache.clear();
        this.notifySubscribers();
        return [];
      }

      // Step 2: Fetch the latest GPS data for ALL devices in a single call, bypassing the controller
      const gpsResponse = await apiService.get<ApiResponse<GPSData[]>>(`${API_CONFIG.ENDPOINTS.GPS}/latest`);
      const latestGpsData = gpsResponse.data || [];

      // Step 3: Create a lookup map for efficient access
      const gpsDataMap = new Map<string, GPSData>();
      for (const gps of latestGpsData) {
        gpsDataMap.set(gps.imei, gps);
      }

      // Step 4: Combine vehicle and GPS data
      const enhancedVehicles = userVehicles.map(vehicle => {
        const gpsData = gpsDataMap.get(vehicle.imei);
        return this.createEnhancedVehicleData(vehicle, gpsData);
      });
      
      // Update the cache
      this.vehicleCache.clear();
      for (const vehicle of enhancedVehicles) {
        this.vehicleCache.set(vehicle.imei, vehicle);
      }
      
      this.notifySubscribers();
      return enhancedVehicles;

    } catch (error) {
      console.error('Error in getAllVehicles:', error);
      // In case of error, clear the cache and return an empty array to avoid showing stale data
      this.vehicleCache.clear();
      this.notifySubscribers();
      return [];
    }
  }

  // Load a single vehicle from database
  private async loadSingleVehicle(imei: string): Promise<void> {
    try {
      const vehicleResponse = await vehicleController.getVehicle(imei);
      if (!vehicleResponse.success || !vehicleResponse.data) return;

      const vehicle = vehicleResponse.data.data;
      
      // Get latest GPS data using the bulk endpoint and filtering
      const gpsResponse = await apiService.get<ApiResponse<GPSData[]>>(`${API_CONFIG.ENDPOINTS.GPS}/latest`);
      const latestGPS = gpsResponse.success && gpsResponse.data ? gpsResponse.data.find(d => d.imei === imei) : undefined;

      // Create enhanced vehicle data
      const enhancedVehicle = this.createEnhancedVehicleData(vehicle, latestGPS);
      this.vehicleCache.set(imei, enhancedVehicle);
      
      // Notify subscribers
      this.notifySubscribers();
    } catch (error) {
      console.error(`Error loading single vehicle ${imei}:`, error);
    }
  }

  // Create enhanced vehicle data from vehicle and GPS data
  private createEnhancedVehicleData(vehicle: Vehicle, gpsData?: GPSData): EnhancedVehicleData {
    const ignition = gpsData?.ignition || 'OFF';
    const speed = gpsData?.speed ?? 0;
    const overspeedLimit = vehicle.overspeed || 60;
    const hasGPSData = !!gpsData;

    // Determine status
    const status = this.calculateVehicleStatus(speed, ignition, overspeedLimit, hasGPSData, gpsData ? new Date(gpsData.timestamp) : undefined);
    
    return {
      id: vehicle.imei,
      imei: vehicle.imei,
      reg_no: vehicle.reg_no,
      name: vehicle.name,
      vehicleType: vehicle.vehicle_type,
      latitude: gpsData?.latitude ?? null,
      longitude: gpsData?.longitude ?? null,
      speed,
      course: gpsData?.course ?? 0,
      ignition,
      isOnline: hasGPSData,
      status,
      connectionStatus: 'connected',
      lastUpdate: gpsData ? new Date(gpsData.timestamp) : new Date(0),
      address: 'Loading...',
      satellites: gpsData?.satellites,
      gsm_signal: gpsData?.gsm_signal,
      voltage_level: gpsData?.voltage_level,
      device: vehicle.device,
      liveIconPath: getLiveIconPath(vehicle.vehicle_type, status),
      statusIconPath: getStatusIconPath(vehicle.vehicle_type, status),
      overspeedLimit: vehicle.overspeed,
      odometer: vehicle.odometer,
      mileage: vehicle.mileage,
      min_fuel: vehicle.min_fuel,
    };
  }

  public subscribe(callback: (vehicles: EnhancedVehicleData[]) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Notify all subscribers about updates
  private notifySubscribers(): void {
    const vehicles = Array.from(this.vehicleCache.values());
    this.subscribers.forEach(callback => {
      try {
        callback(vehicles);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  // Get cached vehicles
  public getCachedVehicles(): EnhancedVehicleData[] {
    return Array.from(this.vehicleCache.values());
  }

  // Get single vehicle by IMEI
  public getVehicle(imei: string): EnhancedVehicleData | null {
    return this.vehicleCache.get(imei) || null;
  }

  // Clear cache
  public clearCache(): void {
    this.vehicleCache.clear();
    this.lastUpdateTime.clear();
  }

  // Force refresh a single vehicle
  public async refreshVehicle(imei: string): Promise<EnhancedVehicleData | null> {
    await this.loadSingleVehicle(imei);
    return this.getVehicle(imei);
  }

  // Get connection status
  public isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  // Get vehicles with valid coordinates for map display
  // This implements the user's requirement: only show markers when we have valid coordinates
  public getVehiclesWithValidCoordinates(vehicles: EnhancedVehicleData[]): EnhancedVehicleData[] {
    return vehicles.filter(vehicle => {
      // Filter out vehicles with invalid coordinates (0,0 or no data)
      const hasValidCoords = vehicle.latitude !== 0 && vehicle.longitude !== 0 && 
                            vehicle.latitude && vehicle.longitude;
      
      if (!hasValidCoords) {
        console.log(`🚫 Filtering out ${vehicle.reg_no} - no valid coordinates (lat: ${vehicle.latitude}, lng: ${vehicle.longitude})`);
        return false;
      }
      
      return true;
    });
  }

  // Get vehicle count by status
  public getVehicleCountByStatus(): { total: number; online: number; offline: number; running: number; stop: number; idle: number; inactive: number; overspeed: number; nodata: number } {
    const vehicles = Array.from(this.vehicleCache.values());
    
    const stats = {
      total: vehicles.length,
      online: 0,
      offline: 0,
      running: 0,
      stop: 0,
      idle: 0,
      inactive: 0,
      overspeed: 0,
      nodata: 0,
    };

    vehicles.forEach(vehicle => {
      // Connection status
      if (vehicle.isOnline) {
        stats.online++;
      } else {
        stats.offline++;
      }

      // Vehicle status
      switch (vehicle.status) {
        case 'running':
          stats.running++;
          break;
        case 'stop':
          stats.stop++;
          break;
        case 'idle':
          stats.idle++;
          break;
        case 'inactive':
          stats.inactive++;
          break;
        case 'overspeed':
          stats.overspeed++;
          break;
        case 'nodata':
          stats.nodata++;
          break;
      }
    });

    return stats;
  }

  // Create enhanced vehicle data from GPS data and vehicle info
  public createEnhancedVehicleFromGPS(vehicle: Vehicle, gpsData: GPSData): EnhancedVehicleData {
    return this.createEnhancedVehicleData(vehicle, gpsData);
  }

  // Update vehicle cache - public method for external use
  public updateVehicleCache(imei: string, vehicleData: EnhancedVehicleData): void {
    this.vehicleCache.set(imei, vehicleData);
    this.lastUpdateTime.set(imei, new Date());
  }

  // Batch update vehicles with valid coordinates fallback (for performance)
  public async updateVehiclesWithFallback(): Promise<void> {
    try {
      // Get all vehicles that currently have null coordinates
      const vehiclesWithNullCoords = Array.from(this.vehicleCache.values())
        .filter(vehicle => !vehicle.latitude || !vehicle.longitude);

      if (vehiclesWithNullCoords.length === 0) {
        console.log('No vehicles with null coordinates found, skipping fallback update');
        return;
      }

      console.log(`🔄 Updating ${vehiclesWithNullCoords.length} vehicles with database fallback...`);

      // Get latest valid GPS data for all devices
      const validGPSResponse = await gpsController.getLatestValidGPSData();
      
      if (!validGPSResponse.success || !validGPSResponse.data) {
        console.error('Failed to fetch latest valid GPS data for fallback');
        return;
      }

      const validGPSMap = new Map<string, GPSData>();
      for (const gpsData of validGPSResponse.data) {
        validGPSMap.set(gpsData.imei, gpsData);
      }

      // Update vehicles with valid coordinates
      let updatedCount = 0;
      for (const vehicle of vehiclesWithNullCoords) {
        const validGPS = validGPSMap.get(vehicle.imei);
        
        if (validGPS && validGPS.latitude && validGPS.longitude) {
          const updatedVehicle: EnhancedVehicleData = {
            ...vehicle,
            latitude: validGPS.latitude,
            longitude: validGPS.longitude
          };

          // Get reverse geocoding for the fallback coordinates
          try {
            const address = await reverseGeocodingService.getAddressFromCoords(
              validGPS.latitude, 
              validGPS.longitude
            );
            if (address) {
              updatedVehicle.address = address;
            }
          } catch (geocodingError) {
            console.error(`Error getting address for ${vehicle.imei}:`, geocodingError);
          }

          this.vehicleCache.set(vehicle.imei, updatedVehicle);
          updatedCount++;
          console.log(`✅ Updated ${vehicle.imei} with fallback coordinates: lat=${validGPS.latitude}, lng=${validGPS.longitude}`);
        }
      }

      if (updatedCount > 0) {
        console.log(`🎉 Successfully updated ${updatedCount} vehicles with fallback coordinates`);
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('Error in batch fallback update:', error);
    }
  }

  // Calculate vehicle status based on GPS data - uses centralized logic from vehicleIcons.ts
  private calculateVehicleStatus(
    speed: number,
    ignition: string,
    overspeedLimit: number,
    hasGPSData: boolean,
    lastUpdate?: Date
  ): VehicleStatus {
    // Use the centralized vehicle status logic from vehicleIcons.ts to ensure consistency
    return getVehicleStatus(
      false, // isOnline parameter (ignored in the function)
      speed,
      ignition,
      overspeedLimit,
      hasGPSData,
      lastUpdate
    );
  }
}

// Export singleton instance
export const enhancedVehicleTrackingService = new EnhancedVehicleTrackingService(); 