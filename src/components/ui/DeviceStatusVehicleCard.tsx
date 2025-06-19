import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlug,
  faPlugCircleXmark,
  faRoute,
  faBatteryFull,
  faBatteryHalf,
  faBatteryQuarter,
  faBatteryEmpty,
  faSatellite,
  faKey,
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import { getStatusIconPath } from '../../utils/vehicleIcons';
import { reverseGeocodingService } from '../../services/reverseGeocodingService';
import { gpsController } from '../../controllers/gpsController';

interface DeviceStatusData {
  battery?: {
    level: number;        // 0-100 percentage (converted from 0-6)
    voltage: number;      // Raw voltage level (0-6)
    status: string;       // "Normal", "Low", "Critical"
    charging: boolean;    // Whether charger is connected
  };
  signal?: {
    level: number;        // Raw signal level (0-4)
    bars: number;         // 0-5 bars
    status: string;       // "Excellent", "Good", "Fair", "Poor", "No Signal"
    percentage: number;   // 0-100 percentage (converted from 0-4)
  };
  device_status?: {
    activated: boolean;
    gps_tracking: boolean;
    oil_connected: boolean;
    engine_running: boolean;
    satellites: number;
  };
  alarm_status?: {
    active: boolean;
    type: string;
    code: number;
    emergency: boolean;
    overspeed: boolean;
    low_power: boolean;
    shock: boolean;
  };
}

interface DeviceStatusVehicleData {
  id: string;
  imei: string;
  reg_no: string;
  name: string;
  vehicleType: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  ignition: string;
  status: string;
  isOnline: boolean;
  lastUpdate: Date;
  address?: string;
  
  // Enhanced device status
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
  alarm_status?: {
    active: boolean;
    type: string;
    code: number;
    emergency: boolean;
    overspeed: boolean;
    low_power: boolean;
    shock: boolean;
  };
}

interface DeviceStatusVehicleCardProps {
  vehicle: DeviceStatusVehicleData;
  isSelected?: boolean;
  onSelect?: (vehicleId: string) => void;
  onLiveTrack?: (vehicleId: string) => void;
  onControlOil?: (vehicleId: string, action: 'cut' | 'connect') => void;
  showLiveTrackButton?: boolean;
  isControlLoading?: boolean;
}

export const DeviceStatusVehicleCard: React.FC<DeviceStatusVehicleCardProps> = ({
  vehicle,
  isSelected = false,
  onSelect,
  onLiveTrack,
  onControlOil,
  showLiveTrackButton = true,
  isControlLoading = false
}) => {
  const [currentAddress, setCurrentAddress] = useState<string>(vehicle.address || '');
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const [fallbackCoordinates, setFallbackCoordinates] = useState<{lat: number, lng: number} | null>(null);

  // Enhanced GPS fallback - get valid coordinates if current ones are null/invalid
  const getValidCoordinates = async (): Promise<{lat: number, lng: number} | null> => {
    // First check if current coordinates are valid
    if (vehicle.latitude && vehicle.longitude && 
        vehicle.latitude !== 0 && vehicle.longitude !== 0) {
      return { lat: vehicle.latitude, lng: vehicle.longitude };
    }

    // If not valid, try to get latest valid coordinates from database
    try {
      console.log(`🔄 Getting fallback coordinates for ${vehicle.imei}...`);
      const validGPSResponse = await gpsController.getLatestValidGPSDataByIMEI(vehicle.imei);
      
      if (validGPSResponse.success && validGPSResponse.data && 
          validGPSResponse.data.latitude && validGPSResponse.data.longitude) {
        const coords = {
          lat: validGPSResponse.data.latitude,
          lng: validGPSResponse.data.longitude
        };
        console.log(`✅ Found valid fallback coordinates for ${vehicle.imei}: ${coords.lat}, ${coords.lng}`);
        setFallbackCoordinates(coords);
        return coords;
      }
    } catch (error) {
      console.error(`Error getting fallback coordinates for ${vehicle.imei}:`, error);
    }

    return null;
  };

  // Enhanced address fetching with fallback coordinates
  useEffect(() => {
    const fetchAddressWithFallback = async () => {
      // Skip if address already exists
      if (vehicle.address && currentAddress) {
        return;
      }

      setIsLoadingAddress(true);
      try {
        // Get valid coordinates (current or fallback)
        const coords = await getValidCoordinates();
        
        if (coords) {
          console.log(`🌍 Getting address for ${vehicle.imei} at ${coords.lat}, ${coords.lng}...`);
          const address = await reverseGeocodingService.getAddressFromCoords(coords.lat, coords.lng);
          if (address) {
            setCurrentAddress(address);
            console.log(`📮 Address resolved for ${vehicle.imei}: ${address}`);
          }
        } else {
          console.log(`❌ No valid coordinates found for ${vehicle.imei}`);
        }
      } catch (error) {
        console.error('Failed to fetch address:', error);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchAddressWithFallback();
  }, [vehicle.latitude, vehicle.longitude, vehicle.address, vehicle.imei]);

  // Map status string to VehicleStatus type
  const getVehicleStatus = (): 'running' | 'stop' | 'idle' | 'inactive' | 'overspeed' | 'nodata' => {
    switch (vehicle.status.toLowerCase()) {
      case 'running': return 'running';
      case 'stop': return 'stop';
      case 'idle': return 'idle';
      case 'inactive': return 'inactive';
      case 'overspeed': return 'overspeed';
      case 'nodata': return 'nodata';
      default: return vehicle.isOnline ? 'running' : 'stop';
    }
  };

  // Battery icon and color based on level
  const getBatteryIcon = () => {
    const level = vehicle.battery?.level || 0;
    if (level >= 75) return faBatteryFull;
    if (level >= 50) return faBatteryHalf;
    if (level >= 25) return faBatteryQuarter;
    return faBatteryEmpty;
  };

  const getBatteryColor = () => {
    const level = vehicle.battery?.level || 0;
    const isCharging = vehicle.battery?.charging || false;
    
    if (isCharging) return 'text-green-500';
    if (level >= 60) return 'text-green-500';
    if (level >= 30) return 'text-yellow-500';
    if (level >= 15) return 'text-orange-500';
    return 'text-red-500';
  };

  // Signal bars display - minimal design
  const getSignalBars = () => {
    const percentage = vehicle.signal?.percentage || 0;
    const bars = Math.min(5, Math.max(0, Math.ceil(percentage / 20))); // 5 bars total
    
    return Array.from({ length: 4 }, (_, i) => (
      <div
        key={i}
        className={`w-0.5 mr-0.5 rounded-sm ${
          i < bars ? 'bg-green-500' : 'bg-gray-300'
        }`}
        style={{ height: `${(i + 1) * 1.5 + 2}px` }}
      />
    ));
  };

  // GPS status color only
  const getGPSColor = () => {
    return vehicle.device_status?.gps_tracking ? 'text-green-500' : 'text-gray-400';
  };

  // Relay/Oil status icon and color
  const getRelayIcon = () => {
    return vehicle.device_status?.oil_connected ? faPlug : faPlugCircleXmark;
  };

  const getRelayColor = () => {
    return vehicle.device_status?.oil_connected ? 'text-green-500' : 'text-gray-400';
  };

  // Ignition color
  const getIgnitionColor = () => {
    return vehicle.ignition === 'ON' ? 'text-green-600' : 'text-red-600';
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  // Status color based on online/offline
  const getStatusColor = () => {
    return vehicle.isOnline ? '#10b981' : '#ef4444'; // green or red
  };

  // Determine which relay button to show
  const isRelayConnected = vehicle.device_status?.oil_connected || false;

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border transition-all duration-200 cursor-pointer ${
        isSelected 
          ? 'border-blue-400 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={() => onSelect?.(vehicle.id)}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center space-x-2">
          {/* Status Indicator */}
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getStatusColor() }}
          />
          
          {/* Vehicle Icon - Use Status folder images for vehicle cards */}
          <div className="h-8 w-12 flex items-center justify-center">
            {(() => {
              const status = getVehicleStatus();
              return (
                <img
                  src={getStatusIconPath(vehicle.vehicleType, status)}
                  alt={`${vehicle.vehicleType} ${status}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback to colored circle if icon fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-full h-full rounded-full border border-white flex items-center justify-center text-white font-bold text-[8px]';
                    fallback.style.backgroundColor = getStatusColor();
                    fallback.textContent = vehicle.vehicleType.charAt(0).toUpperCase();
                    target.parentNode?.appendChild(fallback);
                  }}
                />
              );
            })()}
          </div>
          
          {/* Vehicle Info */}
          <div className="flex-1">
            <h3 className="font-bold text-sm text-gray-900 leading-tight">
              {vehicle.reg_no}
            </h3>
            <p className="text-xs text-gray-500 leading-tight">
              {vehicle.name}
            </p>
          </div>
        </div>

        {/* Data Status */}
        <div className="text-xs text-gray-500">
          {formatTime(vehicle.lastUpdate)}
        </div>
      </div>

      {/* Location & Address Section */}
      <div className="px-2 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-100">
        {/* Coordinates */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1">
            <FontAwesomeIcon 
              icon={faMapMarkerAlt} 
              className={`text-xs ${fallbackCoordinates ? 'text-orange-500' : 'text-blue-500'}`} 
            />
            <span className="text-xs font-medium text-gray-700">
              Location {fallbackCoordinates ? '(Fallback)' : ''}
            </span>
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {(() => {
              const displayCoords = fallbackCoordinates || { lat: vehicle.latitude, lng: vehicle.longitude };
              return displayCoords.lat && displayCoords.lng 
                ? `${displayCoords.lat.toFixed(6)}, ${displayCoords.lng.toFixed(6)}`
                : 'No coordinates';
            })()}
          </div>
        </div>
        
        {/* Address */}
        <div className="min-h-[16px]">
          {isLoadingAddress ? (
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs text-blue-600 italic">Fetching address...</span>
            </div>
          ) : currentAddress ? (
            <div className="bg-white/70 rounded px-2 py-1 border border-blue-100">
              <p className="text-xs text-gray-700 leading-tight" title={currentAddress}>
                {currentAddress.length > 60 ? `${currentAddress.substring(0, 60)}...` : currentAddress}
              </p>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <FontAwesomeIcon 
                icon={faMapMarkerAlt} 
                className="text-xs text-gray-300" 
              />
              <span className="text-xs text-gray-400 italic">Address unavailable</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Icons Row - Compact */}
      <div className="px-2 py-1 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          {/* Relay */}
          <div className="flex flex-col items-center">
            <FontAwesomeIcon 
              icon={getRelayIcon()} 
              className={`text-xs ${getRelayColor()}`}
            />
          </div>

          {/* Battery */}
          <div className="flex flex-col items-center relative">
            <FontAwesomeIcon 
              icon={getBatteryIcon()} 
              className={`text-xs ${getBatteryColor()}`}
            />
            {vehicle.battery?.charging && (
              <div className="absolute -top-0.5 -right-0.5 text-[8px] text-green-500">⚡</div>
            )}
            <span className="text-[8px] text-gray-500 mt-0.5">{vehicle.battery?.level || 0}%</span>
          </div>

          {/* Signal */}
          <div className="flex flex-col items-center">
            <div className="flex items-end h-2">
              {getSignalBars()}
            </div>
            <span className="text-[8px] text-gray-500 mt-0.5">{vehicle.signal?.percentage || 0}%</span>
          </div>

          {/* GPS */}
          <div className="flex flex-col items-center">
            <FontAwesomeIcon 
              icon={faSatellite} 
              className={`text-xs ${getGPSColor()}`}
            />
          </div>

          {/* Ignition */}
          <div className="flex flex-col items-center">
            <FontAwesomeIcon 
              icon={faKey} 
              className={`text-xs ${getIgnitionColor()}`}
            />
          </div>

          {/* Speed */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-gray-700">{vehicle.speed}</span>
            <span className="text-[8px] text-gray-500">km/h</span>
          </div>
        </div>
      </div>

      {/* Compact Action Buttons */}
      <div className="p-2 border-t border-gray-100">
        <div className="flex space-x-1">
          {/* Live Track Button */}
          {showLiveTrackButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLiveTrack?.(vehicle.id);
              }}
              className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faRoute} className="mr-1 text-xs" />
              Track
            </button>
          )}
          
          {/* Dynamic Relay Control Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const action = isRelayConnected ? 'cut' : 'connect';
              onControlOil?.(vehicle.id, action);
            }}
            disabled={isControlLoading}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center ${
              isRelayConnected
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            } ${isControlLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isRelayConnected ? 'Turn Off Relay' : 'Turn On Relay'}
          >
            {isControlLoading ? (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />
            ) : (
              <FontAwesomeIcon 
                icon={isRelayConnected ? faPlugCircleXmark : faPlug} 
                className="mr-1 text-xs" 
              />
            )}
            {isRelayConnected ? 'Off' : 'On'}
          </button>
        </div>
      </div>
    </div>
  );
};

export type { DeviceStatusVehicleData, DeviceStatusData }; 