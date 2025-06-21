import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  History, 
  Satellite, 
  Battery, 
  KeyRound,
  Power,
  Fuel,
  Signal,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiService } from '@/services/apiService';
import { vehicleController } from '@/controllers/vehicleController';
import { getLiveIconPath, getStatusIconPath } from '@/utils/vehicleIcons';
import { API_CONFIG } from '@/config/api';

// Types
interface Vehicle {
  imei: string;
  reg_no: string;
  name: string;
  vehicle_type: string;
  device?: {
    sim_no: string;
    sim_operator: string;
  };
}

interface GPSData {
  id?: number;
  imei: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  altitude?: number;
  ignition: string;
  charger: string;
  gps_tracking: string;
  oil_electricity: string;
  device_status: string;
  voltage_level?: number;
  voltage_status: string;
  gsm_signal?: number;
  gsm_status: string;
  satellites?: number;
  device?: {
    sim_no: string;
    sim_operator: string;
  };
  vehicle?: Vehicle;
}

interface IndividualTrackingData {
  success: boolean;
  imei: string;
  message: string;
  has_status: boolean;
  has_location: boolean;
  status_data?: GPSData;
  location_data?: GPSData;
  location_is_historical?: boolean;
}

interface WebSocketMessage {
  type: string;
  timestamp: string;
  data: LocationUpdate | StatusUpdate;
}

interface LocationUpdate {
  imei: string;
  vehicle_name?: string;
  reg_no?: string;
  vehicle_type?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  altitude?: number;
  timestamp: string;
  protocol_name: string;
  location_valid: boolean;
}

interface StatusUpdate {
  imei: string;
  vehicle_name?: string;
  reg_no?: string;
  vehicle_type?: string;
  speed?: number;
  ignition: string;
  timestamp: string;
  protocol_name: string;
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
  is_moving: boolean;
  last_seen: string;
  connection_status: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// Helper functions for percentage conversion
const convertBatteryToPercentage = (batteryLevel: number): number => {
  // Convert from 0-6 scale to 0-100% (where 6=100%)
  return Math.round((batteryLevel / 6) * 100);
};

const convertSignalToPercentage = (signalLevel: number): number => {
  // Convert from 0-4 scale to 0-100% (where 4=100%)
  return Math.round((signalLevel / 4) * 100);
};

// Enhanced Status Icon Component
const StatusIcon: React.FC<{
  type: 'ignition' | 'oil' | 'electricity' | 'battery' | 'signal' | 'satellites';
  isActive: boolean;
  value?: string | number;
  size?: 'sm' | 'md' | 'lg';
}> = ({ type, isActive, value, size = 'sm' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const getIcon = () => {
    switch (type) {
      case 'ignition': return <KeyRound className={sizeClasses[size]} />;
      case 'oil': return <Fuel className={sizeClasses[size]} />;
      case 'electricity': return <Power className={sizeClasses[size]} />;
      case 'battery': return <Battery className={sizeClasses[size]} />;
      case 'signal': return <Signal className={sizeClasses[size]} />;
      case 'satellites': return <Satellite className={sizeClasses[size]} />;
    }
  };

  const getStatusColor = () => {
    if (!isActive) return 'text-gray-400 bg-gray-100';
    
    switch (type) {
      case 'ignition': return 'text-green-600 bg-green-100';
      case 'oil': return 'text-blue-600 bg-blue-100';
      case 'electricity': return 'text-yellow-600 bg-yellow-100';
      case 'battery': {
        // Dynamic color based on battery percentage
        if (value && typeof value === 'string' && value.includes('%')) {
          const percentage = parseInt(value.replace('%', ''));
          if (percentage >= 70) return 'text-green-600 bg-green-100';
          if (percentage >= 30) return 'text-yellow-600 bg-yellow-100';
          return 'text-red-600 bg-red-100';
        }
        return 'text-purple-600 bg-purple-100';
      }
      case 'signal': {
        // Dynamic color based on signal percentage
        if (value && typeof value === 'string' && value.includes('%')) {
          const percentage = parseInt(value.replace('%', ''));
          if (percentage >= 75) return 'text-green-600 bg-green-100';
          if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
          if (percentage >= 25) return 'text-orange-600 bg-orange-100';
          return 'text-red-600 bg-red-100';
        }
        return 'text-orange-600 bg-orange-100';
      }
      case 'satellites': return 'text-indigo-600 bg-indigo-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex items-center space-x-1.5">
      <div className={`p-1.5 rounded-full ${getStatusColor()} transition-all duration-200 hover:scale-105`}>
        {getIcon()}
      </div>
      {value && (
        <span className={`text-xs font-medium ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
          {value}
        </span>
      )}
    </div>
  );
};

// Note: Speedometer is now inline in the navbar

const IndividualVehicleTracking: React.FC = () => {
  const { imei } = useParams<{ imei: string }>();
  const navigate = useNavigate();

  // State
  const [vehicleInfo, setVehicleInfo] = useState<Vehicle | null>(null);
  const [statusData, setStatusData] = useState<GPSData | null>(null);
  const [locationData, setLocationData] = useState<GPSData | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('Fetching location...');
  const [isHistoricalLocation, setIsHistoricalLocation] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState<boolean>(true);
  const [historyMode, setHistoryMode] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [mapRotationEnabled, setMapRotationEnabled] = useState<boolean>(false);
  const [currentBearing, setCurrentBearing] = useState<number>(0);

  // Refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const routePointsRef = useRef<google.maps.LatLng[]>([]);

  // Enhanced reverse geocoding with better error handling and retry logic
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      console.log('🌍 Fetching reverse geocoding for:', lat, lng);
      setCurrentAddress('Getting address...');
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`,
        {
          headers: {
            'User-Agent': 'LunaIOT/1.0 (luna.iot@example.com)'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Nominatim HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🗺️ Nominatim response:', data);
      
      if (data && data.display_name) {
        setCurrentAddress(data.display_name);
        console.log('✅ Address from Nominatim:', data.display_name);
        return;
      } else if (data && data.error) {
        throw new Error(`Nominatim API error: ${data.error}`);
      } else {
        // Fallback: construct address from available components
        let fallbackAddress = '';
        if (data && data.address) {
          const addr = data.address;
          const parts = [
            addr.house_number,
            addr.road || addr.street,
            addr.suburb || addr.neighbourhood || addr.quarter,
            addr.city || addr.town || addr.village || addr.municipality,
            addr.state || addr.province,
            addr.country
          ].filter(Boolean);
          fallbackAddress = parts.join(', ');
        }
        
        if (fallbackAddress) {
          setCurrentAddress(fallbackAddress);
          console.log('✅ Constructed address from components:', fallbackAddress);
          return;
        } else {
          throw new Error('No address data available from Nominatim');
        }
      }
    } catch (error) {
      console.error('❌ Nominatim geocoding failed:', error);
      
      // Try BigDataCloud API as fallback
      try {
        console.log('🔄 Trying BigDataCloud geocoding service...');
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('🗺️ BigDataCloud response:', data);
          
          if (data && data.locality) {
            // Construct address from BigDataCloud response
            const parts = [
              data.locality,
              data.city,
              data.principalSubdivision,
              data.countryName
            ].filter(Boolean);
            const address = parts.join(', ');
            
            if (address) {
              setCurrentAddress(address);
              console.log('✅ Address from BigDataCloud:', address);
              return;
            }
          }
        }
        throw new Error('BigDataCloud API failed or no data');
      } catch (altError) {
        console.error('❌ BigDataCloud geocoding also failed:', altError);
      }
      
      // Final fallback: show coordinates
      const coordinates = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setCurrentAddress(coordinates);
      console.log('⚠️ Using coordinates as address:', coordinates);
    }
  }, []);

  // Initial data fetch from database
  const fetchInitialData = useCallback(async () => {
    if (!imei) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching initial data for IMEI:', imei);

      // Fetch vehicle info and combined tracking data
      const [vehicleResponse, trackingResponse] = await Promise.all([
        vehicleController.getVehicle(imei),
        apiService.get<IndividualTrackingData>(`/api/v1/gps/${imei}/individual-tracking`)
      ]);

      console.log('📋 Vehicle response:', vehicleResponse);
      console.log('📊 Tracking response:', trackingResponse);

      // Handle vehicle info
      if (vehicleResponse.success && vehicleResponse.data) {
        setVehicleInfo(vehicleResponse.data.data);
        console.log('✅ Vehicle info loaded:', vehicleResponse.data.data);
      } else {
        throw new Error(vehicleResponse.message || 'Vehicle not found');
      }

      // Handle tracking data
      if (trackingResponse.success) {
        if (trackingResponse.has_status && trackingResponse.status_data) {
          setStatusData(trackingResponse.status_data);
        }

        if (trackingResponse.has_location && trackingResponse.location_data) {
          setLocationData(trackingResponse.location_data);
          setIsHistoricalLocation(trackingResponse.location_is_historical || false);

          // Initial reverse geocoding for address (only on first load)
          if (trackingResponse.location_data.latitude && trackingResponse.location_data.longitude) {
            await reverseGeocode(trackingResponse.location_data.latitude, trackingResponse.location_data.longitude);
          }
        }
      }

      setLastUpdated(new Date());
      setIsInitialized(true);
    } catch (err) {
      console.error('❌ Error fetching initial data:', err);
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || apiError.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [imei, reverseGeocode]);

  // Wait for Google Maps to be ready
  const waitForGoogleMaps = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      // Check every 100ms for Google Maps
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps) {
          console.log('✅ Google Maps API loaded');
          resolve();
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
    });
  }, []);

  // Initialize Google Map
  const initializeMap = useCallback(async () => {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.log('⚠️ Map element not found');
      return;
    }

    try {
      // Wait for Google Maps to be available
      await waitForGoogleMaps();

      // Use default center if no location data yet
      const center = locationData?.latitude && locationData?.longitude 
        ? { lat: locationData.latitude, lng: locationData.longitude }
        : { lat: 27.7172, lng: 85.3240 }; // Default to Nepal

      const zoom = locationData?.latitude && locationData?.longitude ? 18 : 12;

      console.log('🗺️ Initializing Google Map with center:', center);

      mapRef.current = new window.google.maps.Map(mapElement, {
        center,
        zoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        disableDefaultUI: false,
        clickableIcons: false,
        gestureHandling: 'greedy',
        // Always set initial rotation based on course
        heading: locationData?.course || 0,
        tilt: 0,
        // Enable rotation control
        rotateControl: true,
        rotateControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER
        }
      });
      
      // Always enable map rotation
      setMapRotationEnabled(true);

      // Add marker if we have location data and vehicle info
      if (locationData?.latitude && locationData?.longitude && vehicleInfo) {
        // Determine initial vehicle state for marker icon
        const currentSpeed = locationData.speed || 0;
        const ignitionOn = statusData?.ignition === 'ON';
        let markerState: 'running' | 'idle' | 'stop' | 'inactive' = 'idle';
        
        if (ignitionOn && currentSpeed > 5) {
          markerState = 'running'; // Running state (speed > 5 km/h)
        } else if (ignitionOn && currentSpeed <= 5) {
          markerState = 'idle'; // Idle state (ignition on but not moving)
        } else {
          markerState = 'stop'; // Stopped state (ignition off)
        }
        
        // Create initial marker
        const iconPath = getLiveIconPath(vehicleInfo.vehicle_type, markerState);
        markerRef.current = new window.google.maps.Marker({
          position: { lat: locationData.latitude, lng: locationData.longitude },
          map: mapRef.current,
          title: `${vehicleInfo.reg_no} - ${vehicleInfo.name} (${markerState.toUpperCase()} - ${currentSpeed} km/h)`,
          icon: {
            url: iconPath,
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16)
          },
          // Add animation for initial marker
          animation: window.google.maps.Animation.DROP
        });
        
        console.log(`🎯 Initial vehicle marker set to ${markerState} state (speed: ${currentSpeed} km/h)`);
      }

      // Initialize polyline (purple thick path for route tracking while moving)
      polylineRef.current = new window.google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: '#8B5CF6', // Purple color for active movement
        strokeOpacity: 0.9,
        strokeWeight: 6, // Thick line for visibility
        icons: [
          {
            icon: {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#6D28D9',
              strokeWeight: 2,
              fillColor: '#8B5CF6',
              fillOpacity: 0.8,
            },
            offset: '100%',
            repeat: '50px'
          }
        ]
      });
      polylineRef.current.setMap(mapRef.current);
      
      console.log('✅ Purple route polyline initialized for movement tracking');

      setMapLoading(false);
      console.log('✅ Google Map initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Google Map:', error);
      setMapLoading(false);
    }
  }, [locationData, vehicleInfo, waitForGoogleMaps, mapRotationEnabled, currentBearing]);

  // Rotate map based on vehicle bearing using moveCamera - always rotate regardless of mapRotationEnabled
  const rotateMap = useCallback((bearing: number) => {
    if (!mapRef.current) return;

    try {
      const currentHeading = mapRef.current.getHeading() || 0;
      const targetHeading = bearing;
      
      // Calculate the shortest rotation path
      let angleDiff = targetHeading - currentHeading;
      if (angleDiff > 180) angleDiff -= 360;
      if (angleDiff < -180) angleDiff += 360;
      
      // Always rotate the map to match the course
      // Get current center to maintain position
      const currentCenter = mapRef.current.getCenter();
      const currentZoom = mapRef.current.getZoom();
      
      // Use moveCamera for smooth rotation
      mapRef.current.moveCamera({
        center: currentCenter,
        zoom: currentZoom,
        heading: targetHeading,
        tilt: 0
      });
      
      setCurrentBearing(targetHeading);
      console.log(`🧭 Map rotated to bearing: ${targetHeading}°`);
    } catch (error) {
      console.error('❌ Error rotating map:', error);
    }
  }, []);

  // Toggle map rotation - but always keep it enabled in this implementation
  const toggleMapRotation = useCallback(() => {
    // Always enable rotation
    if (!mapRotationEnabled) {
      setMapRotationEnabled(true);
    }
    
    // Apply current vehicle bearing if available
    if (locationData?.course !== undefined && locationData?.course !== null && mapRef.current) {
      const currentCenter = mapRef.current.getCenter();
      const currentZoom = mapRef.current.getZoom();
      
      mapRef.current.moveCamera({
        center: currentCenter,
        zoom: currentZoom,
        heading: locationData.course,
        tilt: 0
      });
      
      setCurrentBearing(locationData.course);
      console.log(`🧭 Map rotation applied: ${locationData.course}°`);
    }
  }, [mapRotationEnabled, locationData?.course]);

  // Add or update marker with smooth animation and handle null values
  const updateMarker = useCallback((lat: number, lng: number, speed?: number, ignitionStatus?: string) => {
    if (!mapRef.current || !markerRef.current || !vehicleInfo) return;
    
    // Skip update if lat or lng is null/undefined
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      console.log('⚠️ Skipping marker update - invalid coordinates');
      return;
    }

    // Get current position for animation
    const currentPosition = markerRef.current.getPosition();
    const currentLat = currentPosition?.lat();
    const currentLng = currentPosition?.lng();
    
    // New position
    const newPosition = { lat, lng };
    
    // Smooth animation between positions
    if (currentLat && currentLng) {
      // Use animation only if points are different enough
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(currentLat, currentLng),
        new google.maps.LatLng(lat, lng)
      );
      
      // Only animate if distance is significant but not too large
      if (distance > 5 && distance < 1000) {
        // Adjust animation speed based on vehicle speed
        const animationDuration = speed && speed > 5 ? 500 : 1000; // Faster animation for higher speeds
        
        animateMarkerMovement(
          markerRef.current,
          { lat: currentLat, lng: currentLng },
          newPosition,
          animationDuration
        );
        
        // Always rotate map according to course during marker movement
        if (statusData?.course !== undefined && statusData?.course !== null) {
          // Use moveCamera for rotation during movement
          mapRef.current.moveCamera({
            center: new google.maps.LatLng(lat, lng),
            heading: statusData.course,
            zoom: mapRef.current.getZoom(),
            tilt: 0
          });
          console.log(`🧭 Rotating map during marker movement: ${statusData.course}°`);
        }
      } else {
        // For larger jumps, just set position directly
        markerRef.current.setPosition(newPosition);
      }
    } else {
      // No current position, just set directly
      markerRef.current.setPosition(newPosition);
    }
    
    // Update marker icon based on movement state (only if ignition status is provided)
    if (ignitionStatus !== undefined && ignitionStatus !== null) {
      const currentSpeed = speed !== undefined && speed !== null ? speed : 0;
      const ignitionOn = ignitionStatus === 'ON';
      let markerState: 'running' | 'idle' | 'stop' | 'inactive' = 'idle';
      
      if (ignitionOn && currentSpeed > 5) {
        markerState = 'running'; // Running state (speed > 5 km/h)
        console.log(`🚀 Vehicle moving at high speed: ${currentSpeed} km/h - using RUNNING state`);
      } else if (ignitionOn && currentSpeed <= 5) {
        markerState = 'idle'; // Idle state (ignition on but not moving)
      } else {
        markerState = 'stop'; // Stopped state (ignition off)
      }
      
      // Update the statusData to ensure consistent state across the app
      if (statusData) {
        statusData.speed = currentSpeed;
        statusData.ignition = ignitionStatus;
      }
      
      const iconPath = getLiveIconPath(vehicleInfo.vehicle_type, markerState);
      markerRef.current.setIcon({
        url: iconPath,
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      });
      
      // Update navbar vehicle icon
      updateNavbarVehicleIcon(vehicleInfo.vehicle_type, markerState);
      
      // Update marker title
      markerRef.current.setTitle(`${vehicleInfo.reg_no} - ${vehicleInfo.name} (${markerState.toUpperCase()} - ${currentSpeed} km/h)`);
      
      console.log(`🎯 Updated marker to ${markerState} state at coordinates: ${lat}, ${lng} (speed: ${currentSpeed} km/h)`);
    }
    
    // Center map on new position (preserve zoom)
    mapRef.current.setCenter(newPosition);
  }, [vehicleInfo]);
  
  // Function to animate marker movement
  const animateMarkerMovement = useCallback((
    marker: google.maps.Marker,
    startPos: {lat: number, lng: number},
    endPos: {lat: number, lng: number},
    duration: number
  ) => {
    const startTime = new Date().getTime();
    const animateStep = () => {
      const elapsed = new Date().getTime() - startTime;
      const percentage = elapsed / duration;
      
      if (percentage < 1) {
        const lat = startPos.lat + (endPos.lat - startPos.lat) * percentage;
        const lng = startPos.lng + (endPos.lng - startPos.lng) * percentage;
        marker.setPosition(new google.maps.LatLng(lat, lng));
        requestAnimationFrame(animateStep);
      } else {
        marker.setPosition(new google.maps.LatLng(endPos.lat, endPos.lng));
      }
    };
    animateStep();
  }, []);
  
  // Function to update navbar vehicle icon
  const updateNavbarVehicleIcon = useCallback((vehicleType: string, state: 'running' | 'idle' | 'stop' | 'inactive') => {
    const navbarVehicleIcon = document.querySelector('.vehicle-navbar-icon img') as HTMLImageElement;
    if (navbarVehicleIcon) {
      const iconPath = getStatusIconPath(vehicleType, state);
      navbarVehicleIcon.src = iconPath;
      console.log(`🚗 Updated navbar vehicle icon to ${state} state`);
    }
  }, []);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!imei || !isInitialized) return;

    try {
      const wsUrl = API_CONFIG.WS_URL;
      console.log('🔌 Connecting to WebSocket:', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.data?.imei !== imei) return;

          if (message.type === 'location_update') {
            const locationUpdate = message.data as LocationUpdate;
            
            if (locationUpdate.location_valid && locationUpdate.latitude && locationUpdate.longitude) {
              const newLocationData: GPSData = {
                imei: locationUpdate.imei,
                timestamp: locationUpdate.timestamp,
                latitude: locationUpdate.latitude,
                longitude: locationUpdate.longitude,
                speed: locationUpdate.speed,
                course: locationUpdate.course,
                altitude: locationUpdate.altitude,
                ignition: statusData?.ignition || 'OFF',
                charger: statusData?.charger || 'DISCONNECTED',
                gps_tracking: statusData?.gps_tracking || 'ENABLED',
                oil_electricity: statusData?.oil_electricity || 'CONNECTED',
                device_status: statusData?.device_status || 'ACTIVATED',
                voltage_status: statusData?.voltage_status || 'Normal',
                gsm_status: statusData?.gsm_status || 'Good',
                vehicle: vehicleInfo || undefined
              };

              setLocationData(newLocationData);
              setIsHistoricalLocation(false);
              setLastUpdated(new Date());

              // Only process location update if coordinates are valid
              if (locationUpdate.latitude !== undefined && locationUpdate.latitude !== null && 
                  locationUpdate.longitude !== undefined && locationUpdate.longitude !== null) {
                
                // Get current speed for route and marker updates (handle null)
                const currentSpeed = locationUpdate.speed !== undefined && locationUpdate.speed !== null 
                  ? locationUpdate.speed 
                  : (statusData?.speed !== undefined ? statusData.speed : 0);
  
                // Update marker with smooth animation (only if coordinates are valid)
                updateMarker(
                  locationUpdate.latitude, 
                  locationUpdate.longitude, 
                  currentSpeed,
                  statusData?.ignition
                );
  
                // Create a new point for the polyline
                const newPoint = new window.google.maps.LatLng(locationUpdate.latitude, locationUpdate.longitude);
                
                // Only add point if it's different from the last point (avoid duplicates)
                const lastPoint = routePointsRef.current[routePointsRef.current.length - 1];
                const shouldAddPoint = !lastPoint || 
                  Math.abs(lastPoint.lat() - locationUpdate.latitude) > 0.00001 || 
                  Math.abs(lastPoint.lng() - locationUpdate.longitude) > 0.00001;
                
                // Update polyline to follow roads
                if (shouldAddPoint) {
                  // If we have at least one previous point, use directions service to follow roads
                  if (routePointsRef.current.length > 0 && window.google.maps.DirectionsService) {
                    const directionsService = new window.google.maps.DirectionsService();
                    
                    const request = {
                      origin: lastPoint || newPoint,
                      destination: newPoint,
                      travelMode: window.google.maps.TravelMode.DRIVING
                    };
                    
                    directionsService.route(request, (result, status) => {
                      if (status === window.google.maps.DirectionsStatus.OK && result) {
                        // Extract path points from directions result
                        const pathPoints = result.routes[0].overview_path;
                        
                        // Add these points to our route
                        for (const point of pathPoints) {
                          routePointsRef.current.push(point);
                        }
                        
                        // Keep only last 200 points for performance
                        if (routePointsRef.current.length > 200) {
                          routePointsRef.current = routePointsRef.current.slice(-200);
                        }
                        
                        // Update polyline with road-following path
                        if (polylineRef.current) {
                          polylineRef.current.setPath(routePointsRef.current);
                          
                          // Style based on movement state
                          const isMoving = currentSpeed > 5;
                          polylineRef.current.setOptions({
                            strokeColor: '#8B5CF6', // Always purple
                            strokeWeight: isMoving ? 6 : 4, // Thicker when moving
                            strokeOpacity: isMoving ? 0.9 : 0.7 // More opaque when moving
                          });
                          
                          console.log(`🛣️ Updated polyline to follow road (${pathPoints.length} points added)`);
                        }
                      } else {
                        // Fallback to direct line if directions service fails
                        routePointsRef.current.push(newPoint);
                        
                        // Keep only last 200 points for performance
                        if (routePointsRef.current.length > 200) {
                          routePointsRef.current = routePointsRef.current.slice(-200);
                        }
                        
                        // Update polyline with direct path
                        if (polylineRef.current) {
                          polylineRef.current.setPath(routePointsRef.current);
                          
                          // Style based on movement state
                          const isMoving = currentSpeed > 5;
                          polylineRef.current.setOptions({
                            strokeColor: '#8B5CF6', // Always purple
                            strokeWeight: isMoving ? 6 : 4, // Thicker when moving
                            strokeOpacity: isMoving ? 0.9 : 0.7 // More opaque when moving
                          });
                          
                          console.log(`📍 Added direct route point (directions service failed)`);
                        }
                      }
                    });
                  } else {
                    // First point or no directions service, just add directly
                    routePointsRef.current.push(newPoint);
                    
                    // Keep only last 200 points for performance
                    if (routePointsRef.current.length > 200) {
                      routePointsRef.current = routePointsRef.current.slice(-200);
                    }
                    
                    // Update polyline with direct path
                    if (polylineRef.current) {
                      polylineRef.current.setPath(routePointsRef.current);
                      
                      // Style based on movement state
                      const isMoving = currentSpeed > 5;
                      polylineRef.current.setOptions({
                        strokeColor: '#8B5CF6', // Always purple
                        strokeWeight: isMoving ? 6 : 4, // Thicker when moving
                        strokeOpacity: isMoving ? 0.9 : 0.7 // More opaque when moving
                      });
                    }
                  }
                }
  
                // ALWAYS rotate map according to course if available (handle null)
                if (locationUpdate.course !== undefined && locationUpdate.course !== null) {
                  // Use moveCamera API for rotation
                  if (mapRef.current) {
                    const currentCenter = mapRef.current.getCenter();
                    const currentZoom = mapRef.current.getZoom();
                    
                    // Always rotate map according to course
                    mapRef.current.moveCamera({
                      center: currentCenter,
                      zoom: currentZoom,
                      heading: locationUpdate.course,
                      tilt: 0
                    });
                    
                    setCurrentBearing(locationUpdate.course);
                    console.log(`🧭 Rotating map to match vehicle course: ${locationUpdate.course}°`);
                    
                    // Ensure rotation is enabled
                    if (!mapRotationEnabled) {
                      setMapRotationEnabled(true);
                    }
                  }
                }
              } else {
                console.log('⚠️ Skipping location update - invalid coordinates');
              }

              reverseGeocode(locationUpdate.latitude, locationUpdate.longitude);
            }

          } else if (message.type === 'status_update') {
            const statusUpdate = message.data as StatusUpdate;

            // Only update fields that are not null/undefined
            const newStatusData: GPSData = {
              // Always update these fields
              imei: statusUpdate.imei,
              timestamp: statusUpdate.timestamp,
              
              // Preserve existing location data
              latitude: locationData?.latitude,
              longitude: locationData?.longitude,
              
              // Only update if not null/undefined
              speed: statusUpdate.speed !== undefined && statusUpdate.speed !== null 
                ? statusUpdate.speed 
                : statusData?.speed,
                
              // Preserve course data for bearing display
              course: statusData?.course,
                
              // Only update ignition if provided
              ignition: statusUpdate.ignition !== undefined && statusUpdate.ignition !== null
                ? statusUpdate.ignition
                : statusData?.ignition || 'OFF',
                
              // Preserve existing values if new ones are not provided
              charger: statusData?.charger || 'DISCONNECTED',
              
              gps_tracking: statusUpdate.device_status?.gps_tracking !== undefined
                ? (statusUpdate.device_status.gps_tracking ? 'ENABLED' : 'DISABLED')
                : statusData?.gps_tracking || 'DISABLED',
                
              oil_electricity: statusUpdate.device_status?.oil_connected !== undefined
                ? (statusUpdate.device_status.oil_connected ? 'CONNECTED' : 'DISCONNECTED')
                : statusData?.oil_electricity || 'DISCONNECTED',
                
              device_status: statusUpdate.device_status?.activated !== undefined
                ? (statusUpdate.device_status.activated ? 'ACTIVATED' : 'DEACTIVATED')
                : statusData?.device_status || 'DEACTIVATED',
                
              voltage_level: statusUpdate.battery?.voltage !== undefined
                ? statusUpdate.battery.voltage
                : statusData?.voltage_level,
                
              voltage_status: statusUpdate.battery?.status || statusData?.voltage_status || 'Normal',
              
              gsm_signal: statusUpdate.signal?.level !== undefined
                ? statusUpdate.signal.level
                : statusData?.gsm_signal,
                
              gsm_status: statusUpdate.signal?.status || statusData?.gsm_status || 'Good',
              
              satellites: statusUpdate.device_status?.satellites !== undefined
                ? statusUpdate.device_status.satellites
                : statusData?.satellites,
                
              vehicle: vehicleInfo || undefined
            };
            
            console.log('📊 Received status update:', statusUpdate);
            setStatusData(newStatusData);
            setLastUpdated(new Date());
            
            // Update navbar vehicle icon based on state
            if (vehicleInfo && newStatusData.ignition !== undefined && newStatusData.speed !== undefined) {
              const ignitionOn = newStatusData.ignition === 'ON';
              const speed = newStatusData.speed || 0;
              let markerState: 'running' | 'idle' | 'stop' | 'inactive' = 'idle';
              
              if (ignitionOn && speed > 5) {
                markerState = 'running'; // Running state (speed > 5 km/h)
              } else if (ignitionOn && speed <= 5) {
                markerState = 'idle'; // Idle state (ignition on but not moving)
              } else {
                markerState = 'stop'; // Stopped state (ignition off)
              }
              
              // Update navbar icon
              const navbarVehicleIcon = document.querySelector('.vehicle-navbar-icon img') as HTMLImageElement;
              if (navbarVehicleIcon) {
                const iconPath = getStatusIconPath(vehicleInfo.vehicle_type, markerState);
                navbarVehicleIcon.src = iconPath;
                console.log(`🚗 Updated navbar vehicle icon to ${markerState} state`);
              }
            }
          }

        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setTimeout(connectWebSocket, 5000);
      };

    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
    }
  }, [imei, isInitialized, vehicleInfo, statusData, locationData, updateMarker, reverseGeocode]);

  // Effects
  useEffect(() => {
    if (!imei) return;
    fetchInitialData();
  }, [imei, fetchInitialData]);

  // Initialize map when data is ready
  useEffect(() => {
    if (isInitialized) {
      initializeMap();
    }
  }, [isInitialized, initializeMap]);

  // 1-minute timer for reverse geocoding refresh
  useEffect(() => {
    if (!locationData?.latitude || !locationData?.longitude) return;

    console.log('🕐 Setting up 1-minute reverse geocoding timer');
    
    const intervalId = setInterval(async () => {
      console.log('⏰ 1-minute timer: Refreshing address...');
      await reverseGeocode(locationData.latitude!, locationData.longitude!);
    }, 60000); // 60 seconds = 1 minute

    return () => {
      console.log('🛑 Clearing reverse geocoding timer');
      clearInterval(intervalId);
    };
  }, [locationData?.latitude, locationData?.longitude, reverseGeocode]);

  // Update map when location data changes (preserve zoom from initial load)
  useEffect(() => {
    if (locationData?.latitude && locationData?.longitude && mapRef.current && vehicleInfo) {
      const center = { lat: locationData.latitude, lng: locationData.longitude };
      
      // Center map on new location (preserve user's zoom level)
      mapRef.current.setCenter(center);
      // Only set zoom on initial load if we don't have a marker yet
      if (!markerRef.current) {
        mapRef.current.setZoom(18);
      }
      
      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setPosition(center);
      } else {
        const iconPath = getLiveIconPath(vehicleInfo.vehicle_type, 'idle');
        markerRef.current = new window.google.maps.Marker({
          position: center,
          map: mapRef.current,
          title: `${vehicleInfo.reg_no} - ${vehicleInfo.name}`,
          icon: {
            url: iconPath,
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16)
          }
        });
      }
      
      // Always add initial point to route regardless of speed
      // This ensures the line starts drawing from the initial marker position
      const initialSpeed = locationData.speed || 0;
      const newPoint = new window.google.maps.LatLng(locationData.latitude, locationData.longitude);
      routePointsRef.current.push(newPoint);
      
      if (polylineRef.current) {
        polylineRef.current.setPath(routePointsRef.current);
        console.log(`📍 Added initial route point at coordinates: ${locationData.latitude}, ${locationData.longitude}`);
        
        // Set initial polyline style based on speed
        const isInitiallyMoving = initialSpeed > 5;
        polylineRef.current.setOptions({
          strokeColor: '#8B5CF6', // Always purple
          strokeWeight: isInitiallyMoving ? 6 : 4, // Thicker when moving
          strokeOpacity: isInitiallyMoving ? 0.9 : 0.7, // More opaque when moving
          icons: [{
            icon: {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: '#6D28D9',
              strokeWeight: 2,
              fillColor: '#8B5CF6',
              fillOpacity: 0.8,
            },
            offset: '100%',
            repeat: '100px'
          }]
        });
        
        // Apply initial map rotation based on course if available and vehicle is moving
        if (locationData.course !== undefined && locationData.course !== null) {
          if (isInitiallyMoving && !mapRotationEnabled) {
            console.log(`🧭 Auto-enabling map rotation due to initial movement (speed: ${initialSpeed} km/h)`);
            setMapRotationEnabled(true);
          }
          
          if (mapRotationEnabled) {
            console.log(`🧭 Setting initial map rotation to match vehicle course: ${locationData.course}°`);
            rotateMap(locationData.course);
          }
        }
      }
    }
  }, [locationData, vehicleInfo]);

  useEffect(() => {
    if (isInitialized && vehicleInfo) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isInitialized, vehicleInfo, connectWebSocket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Vehicle Data</h3>
          <p className="text-gray-600">Fetching tracking information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-white shadow-lg">
            <AlertDescription className="text-red-800">
              <div className="font-semibold mb-2">Error Loading Vehicle</div>
              {error}
            </AlertDescription>
          </Alert>
          <div className="text-center mt-6">
            <Button 
              onClick={() => navigate('/admin/live-tracking')} 
              variant="outline"
              className="bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Live Tracking
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!vehicleInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white rounded-xl shadow-lg p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Vehicle Not Found</h3>
          <p className="text-gray-600 mb-6">The requested vehicle could not be found in the system.</p>
          <Button 
            onClick={() => navigate('/admin/live-tracking')} 
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Live Tracking
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Two-Layer Navigation Bar */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        {/* First Layer - Main Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/admin/live-tracking')}
                variant="outline"
                size="sm"
                className="flex items-center hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <div className="h-8 w-px bg-gray-300"></div>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={getStatusIconPath(vehicleInfo.vehicle_type, 'idle')}
                    alt={vehicleInfo.vehicle_type}
                    className="w-10 h-10 object-contain"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    statusData?.ignition === 'ON' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    {vehicleInfo.reg_no}
                  </h1>
                  <p className="text-sm text-gray-500 truncate">
                    {vehicleInfo.name} • {vehicleInfo.imei}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {lastUpdated && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {lastUpdated.toLocaleTimeString()}
                </div>
              )}

              <Button
                onClick={() => setHistoryMode(!historyMode)}
                variant={historyMode ? "primary" : "outline"}
                size="sm"
                className="flex items-center"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>

              <Button
                onClick={toggleMapRotation}
                variant="primary"
                size="sm"
                className="flex items-center"
                title="Map rotation is always enabled"
              >
                🧭
                <span className="ml-1">ON</span>
              </Button>

              <Button
                onClick={() => {
                  // Clear route
                  routePointsRef.current = [];
                  if (polylineRef.current) {
                    polylineRef.current.setPath([]);
                    
                    // Re-add current marker position as the first point if available
                    if (markerRef.current) {
                      const currentPosition = markerRef.current.getPosition();
                      if (currentPosition) {
                        routePointsRef.current.push(currentPosition);
                        polylineRef.current.setPath([currentPosition]);
                        console.log('📍 Added current marker position as new route start point');
                      }
                    }
                  }
                  console.log('🗑️ Route cleared');
                }}
                variant="outline"
                size="sm"
                className="flex items-center"
                title="Clear purple route line"
              >
                🗑️
                <span className="ml-1">Clear Route</span>
              </Button>

              <Button
                onClick={() => {
                  setIsInitialized(false);
                  fetchInitialData();
                }}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Second Layer - Enhanced Status with Speedometer */}
        <div className="bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20 py-2">
              {/* Left Side - Status Icons with Data */}
              <div className="flex items-center space-x-8">
                

                {/* Status Icons with Enhanced Data */}
                <StatusIcon
                  type="ignition"
                  isActive={statusData?.ignition === 'ON'}
                  value={statusData?.ignition || 'OFF'}
                />
                <StatusIcon
                  type="oil"
                  isActive={statusData?.oil_electricity === 'CONNECTED'}
                  value={statusData?.oil_electricity === 'CONNECTED' ? 'OK' : 'OFF'}
                />
                <StatusIcon
                  type="electricity"
                  isActive={statusData?.oil_electricity === 'CONNECTED'}
                  value={statusData?.oil_electricity === 'CONNECTED' ? 'ON' : 'OFF'}
                />
                <StatusIcon
                  type="battery"
                  isActive={statusData?.voltage_level ? statusData.voltage_level > 2 : false}
                  value={statusData?.voltage_level ? `${convertBatteryToPercentage(statusData.voltage_level)}%` : 'N/A'}
                />
                <StatusIcon
                  type="signal"
                  isActive={statusData?.gsm_signal ? statusData.gsm_signal > 0 : false}
                  value={statusData?.gsm_signal ? `${convertSignalToPercentage(statusData.gsm_signal)}%` : 'N/A'}
                />
                <StatusIcon
                  type="satellites"
                  isActive={(statusData?.satellites || 0) > 3}
                  value={`${statusData?.satellites || 0} sats`}
                />

                {/* Bearing/Direction Indicator */}
                {(statusData?.course !== undefined && statusData?.course !== null) && (
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-full bg-purple-100`}>
                      🧭
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">
                        {statusData.course}°
                      </div>
                      <div className="text-xs text-gray-500">Bearing</div>
                    </div>
                  </div>
                )}

                {/* Vehicle State Badge */}
                <div className="flex items-center space-x-2">
                  {(() => {
                    const ignitionOn = statusData?.ignition === 'ON';
                    const speed = statusData?.speed || 0;
                    const isRunning = ignitionOn && speed > 5;
                    const isIdle = ignitionOn && speed <= 5;
                    
                    const getStateInfo = () => {
                      if (isRunning) return { color: 'bg-green-500', label: 'Running', variant: 'default' as const };
                      if (isIdle) return { color: 'bg-yellow-500', label: 'Idle', variant: 'warning' as const };
                      return { color: 'bg-red-500', label: 'Stopped', variant: 'danger' as const };
                    };
                    
                    const state = getStateInfo();
                    
                    return (
                      <>
                        <div className={`w-3 h-3 rounded-full ${state.color}`}></div>
                        <Badge 
                          variant={state.variant}
                          className="font-medium text-xs"
                        >
                          {state.label}
                        </Badge>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Right Side - Location Info */}
              <div className="flex items-center space-x-2 max-w-xs lg:max-w-sm overflow-hidden">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  {currentAddress ? (
                    <p className="text-sm text-gray-700 truncate leading-tight" title={currentAddress}>{currentAddress}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Loading address...</p>
                  )}
                  <div className="flex items-center space-x-2 mt-1">
                    {isHistoricalLocation && (
                      <Badge variant="secondary" className="text-xs py-0 px-1">
                        Historical
                      </Badge>
                    )}
                    {locationData && (
                      <div className="text-xs text-gray-500 truncate">
                        {locationData.latitude?.toFixed(4)}, {locationData.longitude?.toFixed(4)}
                        {locationData.altitude && ` • ${Math.round(locationData.altitude)}m`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Map */}
      <div className="h-[calc(100vh-140px)] relative">
        {mapLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Map</h3>
              <p className="text-gray-600">Initializing Google Maps...</p>
            </div>
          </div>
        )}
        <div id="map" className="w-full h-full"></div>
        
        {/* Map Rotation Compass Indicator */}
        {mapRotationEnabled && (
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-white rounded-full p-3 shadow-lg border border-gray-300">
              <div className="relative w-12 h-12">
                <div 
                  className="text-2xl transform transition-transform duration-300 flex items-center justify-center w-full h-full"
                  style={{ transform: `rotate(${currentBearing}deg)` }}
                >
                  🧭
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-600">
                  N
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Speedometer Overlay on Map */}
        <div className="absolute top-28 left-4 z-20">
          <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-4 shadow-2xl border-2 border-gray-400">
            <div className="w-40 h-40">
              <svg viewBox="0 0 160 160" className="w-full h-full">
                {/* Outer circle background */}
                <circle 
                  cx="80" 
                  cy="80" 
                  r="78" 
                  fill="url(#speedoGradientMap)" 
                  stroke="#9ca3af" 
                  strokeWidth="3"
                />
                
                {/* Define gradient */}
                <defs>
                  <radialGradient id="speedoGradientMap" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f3f4f6" />
                  </radialGradient>
                </defs>
                
                {/* Major and minor tick marks */}
                {Array.from({ length: 201 }, (_, i) => i * 5).map((speed) => {
                  const angle = (speed / 200) * 270 - 225; // 270-degree sweep
                  const radian = (angle * Math.PI) / 180;
                  const centerX = 80;
                  const centerY = 80;
                  
                  const isMajor = speed % 20 === 0;
                  const isMedium = speed % 10 === 0 && !isMajor;
                  
                  const outerRadius = 74;
                  const innerRadius = isMajor ? 60 : isMedium ? 66 : 70;
                  
                  const x1 = centerX + Math.cos(radian) * innerRadius;
                  const y1 = centerY + Math.sin(radian) * innerRadius;
                  const x2 = centerX + Math.cos(radian) * outerRadius;
                  const y2 = centerY + Math.sin(radian) * outerRadius;
                  
                  const strokeWidth = isMajor ? "3" : isMedium ? "2" : "1";
                  const strokeColor = isMajor ? "#374151" : "#6b7280";
                  
                  return (
                    <line
                      key={speed}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />
                  );
                })}
                
                {/* Speed numbers */}
                {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((speed) => {
                  const angle = (speed / 200) * 270 - 225;
                  const radian = (angle * Math.PI) / 180;
                  const centerX = 80;
                  const centerY = 80;
                  const labelRadius = 50;
                  
                  const x = centerX + Math.cos(radian) * labelRadius;
                  const y = centerY + Math.sin(radian) * labelRadius;
                  
                  return (
                    <text
                      key={speed}
                      x={x}
                      y={y + 3}
                      fontSize="12"
                      textAnchor="middle"
                      fill="#374151"
                      fontWeight="bold"
                      fontFamily="Arial, sans-serif"
                    >
                      {speed}
                    </text>
                  );
                })}
                
                {/* KM/H label */}
                <text
                  x="80"
                  y="60"
                  fontSize="10"
                  textAnchor="middle"
                  fill="#6b7280"
                  fontWeight="bold"
                >
                  KM/H
                </text>
                
                {/* Digital speed display background */}
                <rect
                  x="60"
                  y="100"
                  width="40"
                  height="16"
                  rx="3"
                  fill="#1f2937"
                  stroke="#374151"
                  strokeWidth="2"
                />
                
                {/* Digital speed text */}
                <text
                  x="80"
                  y="111"
                  fontSize="12"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {String(Math.round(statusData?.speed || 0)).padStart(3, '0')}
                </text>
                
                {/* Red speed pointer */}
                {(() => {
                  const currentSpeed = Math.min(statusData?.speed || 0, 200);
                  const angle = (currentSpeed / 200) * 270 - 225;
                  const radian = (angle * Math.PI) / 180;
                  const centerX = 80;
                  const centerY = 80;
                  const pointerLength = 55;
                  
                  const endX = centerX + Math.cos(radian) * pointerLength;
                  const endY = centerY + Math.sin(radian) * pointerLength;
                  
                  const baseLength = 12;
                  const baseEndX = centerX + Math.cos(radian) * baseLength;
                  const baseEndY = centerY + Math.sin(radian) * baseLength;
                  
                  return (
                    <>
                      {/* Pointer shadow */}
                      <line
                        x1={centerX + 1.5}
                        y1={centerY + 1.5}
                        x2={endX + 1.5}
                        y2={endY + 1.5}
                        stroke="rgba(0,0,0,0.4)"
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                      
                      {/* Main pointer */}
                      <line
                        x1={centerX}
                        y1={centerY}
                        x2={endX}
                        y2={endY}
                        stroke="#dc2626"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      
                      {/* Pointer base */}
                      <line
                        x1={centerX}
                        y1={centerY}
                        x2={baseEndX}
                        y2={baseEndY}
                        stroke="#dc2626"
                        strokeWidth="7"
                        strokeLinecap="round"
                      />
                      
                      {/* Center hub */}
                      <circle 
                        cx={centerX} 
                        cy={centerY} 
                        r="8" 
                        fill="url(#hubGradientMap)" 
                        stroke="#9ca3af"
                        strokeWidth="2"
                      />
                      
                      {/* Center hub gradient */}
                      <defs>
                        <radialGradient id="hubGradientMap" cx="30%" cy="30%" r="70%">
                          <stop offset="0%" stopColor="#f9fafb" />
                          <stop offset="100%" stopColor="#d1d5db" />
                        </radialGradient>
                      </defs>
                      
                      {/* Center dot */}
                      <circle 
                        cx={centerX} 
                        cy={centerY} 
                        r="3" 
                        fill="#dc2626" 
                      />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>
        {!mapLoading && !locationData?.latitude && !locationData?.longitude && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-center p-8">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <MapPin className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Waiting for GPS Data</h3>
              <p className="text-gray-500 mb-4">No valid location data available yet</p>
              {statusData && (
                <div className="bg-white rounded-lg p-4 shadow-sm max-w-sm mx-auto">
                  <p className="text-sm text-gray-600">
                    Device is <span className="font-medium">{statusData.ignition === 'ON' ? 'active' : 'inactive'}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Last seen: {new Date(statusData.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndividualVehicleTracking; 