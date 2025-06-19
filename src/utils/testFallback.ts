import { gpsController } from '../controllers/gpsController';
import { reverseGeocodingService } from '../services/reverseGeocodingService';
import { enhancedVehicleTrackingService } from '../services/enhancedVehicleTrackingService';

/**
 * Test utility to demonstrate GPS fallback functionality
 * This implements the user's requirement:
 * - When websocket lat/lng are null, use database latest data
 * - Only get records where lat/lng are NOT null
 * - Show markers on map according to that data
 * - Get reverse geocoding from OpenStreetMap
 */
export class FallbackTestUtility {
  
  // Test the GPS fallback functionality
  static async testGPSFallback(): Promise<void> {
    console.log('🧪 Testing GPS Fallback Functionality...');
    
    try {
      // 1. Test getting latest GPS data (may have null coordinates)
      console.log('\n1. Testing latest GPS data (with potential null coordinates)...');
      const latestGPS = await gpsController.getLatestGPSData();
      if (latestGPS.success && latestGPS.data) {
        console.log(`📊 Found ${latestGPS.data.length} devices with latest GPS data`);
        
        const nullCoordDevices = latestGPS.data.filter(gps => 
          !gps.latitude || !gps.longitude || gps.latitude === 0 || gps.longitude === 0
        );
        console.log(`❌ ${nullCoordDevices.length} devices have null/invalid coordinates`);
        
        if (nullCoordDevices.length > 0) {
          console.log('Devices with null coordinates:', nullCoordDevices.map(d => d.imei));
        }
      }
      
      // 2. Test getting latest VALID GPS data (only non-null coordinates)
      console.log('\n2. Testing latest valid GPS data (only non-null coordinates)...');
      const validGPS = await gpsController.getLatestValidGPSData();
      if (validGPS.success && validGPS.data) {
        console.log(`✅ Found ${validGPS.data.length} devices with valid coordinates`);
        
        // Show first few valid coordinates as examples
        const examples = validGPS.data.slice(0, 3);
        examples.forEach(gps => {
          console.log(`📍 ${gps.imei}: lat=${gps.latitude}, lng=${gps.longitude}`);
        });
      }
      
      // 3. Test reverse geocoding for one of the valid coordinates
      if (validGPS.success && validGPS.data && validGPS.data.length > 0) {
        console.log('\n3. Testing reverse geocoding...');
        const testGPS = validGPS.data[0];
        
        if (testGPS.latitude && testGPS.longitude) {
          console.log(`🌍 Getting address for ${testGPS.imei} at ${testGPS.latitude}, ${testGPS.longitude}...`);
          
          const address = await reverseGeocodingService.getAddressFromCoords(
            testGPS.latitude, 
            testGPS.longitude
          );
          
          if (address) {
            console.log(`📮 Address: ${address}`);
          } else {
            console.log('❌ Could not resolve address');
          }
        }
      }
      
      // 4. Test the batch fallback functionality
      console.log('\n4. Testing batch vehicle fallback...');
      await enhancedVehicleTrackingService.updateVehiclesWithFallback();
      
      console.log('\n✅ GPS Fallback Test Completed!');
      
    } catch (error) {
      console.error('❌ Error in GPS fallback test:', error);
    }
  }
  
  // Test reverse geocoding for specific coordinates
  static async testReverseGeocoding(lat: number, lng: number): Promise<void> {
    console.log(`🌍 Testing reverse geocoding for coordinates: ${lat}, ${lng}`);
    
    try {
      const address = await reverseGeocodingService.getAddressFromCoords(lat, lng);
      
      if (address) {
        console.log(`📮 Address: ${address}`);
      } else {
        console.log('❌ Could not resolve address');
      }
      
      // Show cache stats
      const cacheStats = reverseGeocodingService.getCacheStats();
      console.log(`💾 Cache stats: ${cacheStats.size} entries, ${cacheStats.expiry}ms expiry`);
      
    } catch (error) {
      console.error('❌ Error in reverse geocoding test:', error);
    }
  }
  
  // Test batch reverse geocoding
  static async testBatchReverseGeocoding(): Promise<void> {
    console.log('🌍 Testing batch reverse geocoding...');
    
    try {
      // Get some valid GPS coordinates
      const validGPS = await gpsController.getLatestValidGPSData();
      
      if (!validGPS.success || !validGPS.data || validGPS.data.length === 0) {
        console.log('❌ No valid GPS data found for batch test');
        return;
      }
      
      // Take first 5 coordinates for batch test
      const coordinates = validGPS.data.slice(0, 5).map(gps => ({
        lat: gps.latitude!,
        lon: gps.longitude!,
        id: gps.imei
      }));
      
      console.log(`📍 Processing ${coordinates.length} coordinates...`);
      
      const results = await reverseGeocodingService.batchReverseGeocode(coordinates);
      
      results.forEach((address, imei) => {
        console.log(`📮 ${imei}: ${address || 'Could not resolve'}`);
      });
      
    } catch (error) {
      console.error('❌ Error in batch reverse geocoding test:', error);
    }
  }
  
  // Simulate websocket GPS update with null coordinates to test fallback
  static async simulateNullCoordinatesFallback(imei: string): Promise<void> {
    console.log(`🧪 Simulating null coordinates fallback for IMEI: ${imei}`);
    
    try {
      // First, get the vehicle's valid coordinates from database
      const validGPS = await gpsController.getLatestValidGPSDataByIMEI(imei);
      
      if (!validGPS.success || !validGPS.data) {
        console.log(`❌ No valid GPS data found in database for ${imei}`);
        return;
      }
      
      console.log(`✅ Found valid coordinates in database: lat=${validGPS.data.latitude}, lng=${validGPS.data.longitude}`);
      
      // Get reverse geocoding for these coordinates
      if (validGPS.data.latitude && validGPS.data.longitude) {
        const address = await reverseGeocodingService.getAddressFromCoords(
          validGPS.data.latitude,
          validGPS.data.longitude
        );
        
        if (address) {
          console.log(`📮 Address: ${address}`);
        }
        
        console.log(`🎉 Fallback mechanism would successfully show marker at: ${validGPS.data.latitude}, ${validGPS.data.longitude}`);
      }
      
    } catch (error) {
      console.error(`❌ Error in null coordinates fallback simulation for ${imei}:`, error);
    }
  }
}

// Export for console testing (can be used in browser console)
// @ts-expect-error - Adding to window for debugging purposes
window.testFallback = FallbackTestUtility;

export default FallbackTestUtility; 