import { gpsController } from '../controllers/gpsController';
import { reverseGeocodingService } from '../services/reverseGeocodingService';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

export interface GPSFallbackResult {
  coordinates: GPSCoordinates | null;
  address: string | null;
  source: 'current' | 'fallback' | 'none';
}

/**
 * GPS Fallback Utility
 * Implements the user's requirement:
 * - When websocket lat/lng are null, use database latest data
 * - Only get records where lat/lng are NOT null
 * - Show markers on map according to that data
 * - Get reverse geocoding from OpenStreetMap
 */
export class GPSUtils {
  
  /**
   * Get valid GPS coordinates with fallback
   * @param currentLat - Current latitude (may be null/invalid)
   * @param currentLng - Current longitude (may be null/invalid)
   * @param imei - Device IMEI for fallback lookup
   * @returns Promise with coordinates, address, and source
   */
  static async getValidGPSWithFallback(
    currentLat: number | null | undefined,
    currentLng: number | null | undefined,
    imei: string
  ): Promise<GPSFallbackResult> {
    
    // Check if current coordinates are valid
    const hasValidCurrent = this.isValidCoordinate(currentLat) && this.isValidCoordinate(currentLng);
    
    if (hasValidCurrent) {
      console.log(`✅ Using current coordinates for ${imei}: ${currentLat}, ${currentLng}`);
      
      const coordinates: GPSCoordinates = {
        latitude: currentLat!,
        longitude: currentLng!
      };
      
      // Get address for current coordinates
      const address = await this.getAddressForCoordinates(coordinates);
      
      return {
        coordinates,
        address,
        source: 'current'
      };
    }
    
    // Try fallback from database
    console.log(`❌ Invalid current coordinates for ${imei}, trying database fallback...`);
    
    try {
      const validGPSResponse = await gpsController.getLatestValidGPSDataByIMEI(imei);
      
      if (validGPSResponse.success && validGPSResponse.data && 
          validGPSResponse.data.latitude && validGPSResponse.data.longitude) {
        
        const coordinates: GPSCoordinates = {
          latitude: validGPSResponse.data.latitude,
          longitude: validGPSResponse.data.longitude
        };
        
        console.log(`🔄 Found fallback coordinates for ${imei}: ${coordinates.latitude}, ${coordinates.longitude}`);
        
        // Get address for fallback coordinates
        const address = await this.getAddressForCoordinates(coordinates);
        
        return {
          coordinates,
          address,
          source: 'fallback'
        };
      }
    } catch (error) {
      console.error(`Error getting fallback coordinates for ${imei}:`, error);
    }
    
    console.log(`❌ No valid coordinates found for ${imei}`);
    return {
      coordinates: null,
      address: null,
      source: 'none'
    };
  }
  
  /**
   * Get address for coordinates using reverse geocoding
   */
  static async getAddressForCoordinates(coordinates: GPSCoordinates): Promise<string | null> {
    try {
      return await reverseGeocodingService.getAddressFromCoords(
        coordinates.latitude, 
        coordinates.longitude
      );
    } catch (error) {
      console.error('Error getting address:', error);
      return null;
    }
  }
  
  /**
   * Check if a coordinate value is valid
   */
  static isValidCoordinate(coord: number | null | undefined): coord is number {
    return coord !== null && 
           coord !== undefined && 
           !isNaN(coord) && 
           coord !== 0 && 
           coord >= -180 && 
           coord <= 180;
  }
  
  /**
   * Check if GPS coordinates are valid for mapping
   */
  static areValidMapCoordinates(lat: number | null | undefined, lng: number | null | undefined): boolean {
    return this.isValidCoordinate(lat) && 
           this.isValidCoordinate(lng) &&
           lat! >= -90 && lat! <= 90 &&
           lng! >= -180 && lng! <= 180;
  }
  
  /**
   * Batch process multiple vehicles for GPS fallback
   */
  static async batchProcessVehicles(
    vehicles: Array<{ imei: string, latitude?: number | null, longitude?: number | null }>
  ): Promise<Map<string, GPSFallbackResult>> {
    const results = new Map<string, GPSFallbackResult>();
    
    // Process in chunks to avoid overwhelming the API
    const chunkSize = 5;
    for (let i = 0; i < vehicles.length; i += chunkSize) {
      const chunk = vehicles.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (vehicle) => {
        const result = await this.getValidGPSWithFallback(
          vehicle.latitude, 
          vehicle.longitude, 
          vehicle.imei
        );
        results.set(vehicle.imei, result);
      });
      
      await Promise.all(promises);
    }
    
    return results;
  }
  
  /**
   * Format coordinates for display
   */
  static formatCoordinates(coordinates: GPSCoordinates | null): string {
    if (!coordinates) {
      return 'No coordinates';
    }
    
    return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
  }
  
  /**
   * Get distance between two coordinates (in kilometers)
   */
  static getDistance(coord1: GPSCoordinates, coord2: GPSCoordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(coord2.latitude - coord1.latitude);
    const dLon = this.deg2rad(coord2.longitude - coord1.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1.latitude)) * Math.cos(this.deg2rad(coord2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
} 