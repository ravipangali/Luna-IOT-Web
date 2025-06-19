import { 
  getLiveIconPath, 
  getVehicleStatus as getVehicleStatusFromIcon,
  createGoogleMapsIcon,
  getStatusColor as getIconStatusColor,
  type VehicleStatus
} from './vehicleIcons';

// Vehicle interface for maps
export interface MapVehicle {
  id: string;
  imei: string;
  reg_no: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  ignition: string;
  lastUpdate: Date;
  isOnline: boolean;
  vehicleType?: string;
  overspeedLimit?: number;
  hasGPSData?: boolean;
  isReceivingLiveData?: boolean;
  
  // CRITICAL FIX: Add pre-calculated status to prevent inconsistency
  vehicleStatus?: VehicleStatus; // Use this instead of recalculating
  
  trail?: Array<{
    lat: number;
    lng: number;
    timestamp: Date;
    speed: number;
    isVisited?: boolean; // For historical playback
  }>;
}

// Re-export types from vehicleIcons for convenience
export type { VehicleStatus, VehicleType } from './vehicleIcons';

// Get vehicle status based on conditions - Enhanced with GPS data validation
// CRITICAL FIX: Use pre-calculated status if available, otherwise calculate
export const getVehicleStatus = (vehicle: MapVehicle): VehicleStatus => {
  // If we have a pre-calculated status, use it to ensure consistency
  if (vehicle.vehicleStatus) {
    return vehicle.vehicleStatus;
  }
  
  // Fallback to calculation (for backwards compatibility)
  return getVehicleStatusFromIcon(
    vehicle.isOnline, // This parameter is ignored in the actual function
    vehicle.speed,
    vehicle.ignition,
    vehicle.overspeedLimit || 60,
    vehicle.hasGPSData ?? true,
    vehicle.lastUpdate // Pass GPS timestamp for age calculation
  );
};

// Get vehicle icon URL based on type and status using our asset system
export const getVehicleIconUrl = (vehicleType: string = 'car', status: VehicleStatus): string => {
  return getLiveIconPath(vehicleType, status);
};

// Create custom marker icon using our existing assets
export const createVehicleMarkerIcon = (
  vehicleType: string = 'car',
  status: VehicleStatus,
  scale: number = 1
): google.maps.Icon => {
  const iconPath = getLiveIconPath(vehicleType, status);
  const size = 32 * scale;
  
  return createGoogleMapsIcon(iconPath, size);
};

// Get status color
export const getStatusColor = (status: VehicleStatus): string => {
  return getIconStatusColor(status);
};

// Get vehicle emoji based on type (fallback for when icons don't load)
export const getVehicleEmoji = (vehicleType: string): string => {
  switch (vehicleType.toLowerCase()) {
    case 'bike': return '🏍️';
    case 'truck': return '🚛';
    case 'bus': return '🚌';
    case 'school_bus': case 'school': return '🚐';
    case 'ambulance': return '🚑';
    case 'car': return '🚗';
    case 'pickup': return '🛻';
    case 'van': return '🚐';
    case 'tractor': return '🚜';
    case 'train': return '🚊';
    case 'boat': return '⛵';
    case 'cycle': return '🚴';
    default: return '🚗';
  }
};

// Calculate bounds for multiple vehicles
export const calculateBounds = (vehicles: MapVehicle[]): google.maps.LatLngBounds | null => {
  if (vehicles.length === 0) return null;
  
  const bounds = new google.maps.LatLngBounds();
  vehicles.forEach(vehicle => {
    bounds.extend({ lat: vehicle.latitude, lng: vehicle.longitude });
  });
  
  return bounds;
};

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Convert degrees to radians
const toRad = (value: number): number => {
  return value * Math.PI / 180;
};

// Format speed display
export const formatSpeed = (speed: number): string => {
  return `${speed.toFixed(1)} km/h`;
};

// Format distance display
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m`;
  }
  return `${distance.toFixed(2)} km`;
};

// Format time display
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Check if vehicle is in a geofence (simple circle for now)
export const isVehicleInGeofence = (
  vehicle: MapVehicle,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): boolean => {
  const distance = calculateDistance(
    vehicle.latitude,
    vehicle.longitude,
    centerLat,
    centerLng
  );
  return distance <= radiusKm;
};

// Get map center for vehicles
export const getMapCenter = (vehicles: MapVehicle[]): { lat: number; lng: number } => {
  if (vehicles.length === 0) {
    return { lat: 27.7172, lng: 85.3240 }; // Default to Kathmandu
  }
  
  const latSum = vehicles.reduce((sum, vehicle) => sum + vehicle.latitude, 0);
  const lngSum = vehicles.reduce((sum, vehicle) => sum + vehicle.longitude, 0);
  
  return {
    lat: latSum / vehicles.length,
    lng: lngSum / vehicles.length,
  };
}; 