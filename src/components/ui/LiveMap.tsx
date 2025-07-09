import React, { useState, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '../../config/googleMaps';
import {
  type MapVehicle,
  getVehicleStatus,
  createVehicleMarkerIcon,
  formatSpeed,
  formatTime,
  getStatusColor
} from '../../utils/mapUtils';

interface LiveMapProps {
  vehicles: MapVehicle[];
  selectedVehicle?: string;
  onVehicleSelect?: (vehicleId: string) => void;
  center?: [number, number];
  zoom?: number;
}

// Map container style
const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Vehicle marker component
const VehicleMarker: React.FC<{
  vehicle: MapVehicle;
  position: { lat: number; lng: number };
  isSelected: boolean;
  onSelect: (vehicleId: string) => void;
  showInfoWindow: boolean;
  onInfoWindowToggle: (vehicleId: string | null) => void;
}> = ({ vehicle, position, isSelected, onSelect, showInfoWindow, onInfoWindowToggle }) => {
  
  const status = getVehicleStatus(vehicle);
  
  // Create custom icon using our asset system
  const icon = useMemo(() => {
    try {
      return createVehicleMarkerIcon(vehicle.vehicleType || 'car', status, isSelected ? 1.2 : 1);
    } catch {
      // Fallback to simple colored marker if asset loading fails
      const color = getStatusColor(status);
      const size = isSelected ? 38 : 32;
      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" font-size="16" fill="white">🚗</text>
          </svg>
        `)}`,
        scaledSize: { width: size, height: size } as google.maps.Size,
        anchor: { x: size / 2, y: size / 2 } as google.maps.Point,
      };
    }
  }, [vehicle.vehicleType, status, isSelected]);

  const handleClick = useCallback(() => {
    onSelect(vehicle.id);
    onInfoWindowToggle(showInfoWindow ? null : vehicle.id);
  }, [vehicle.id, onSelect, onInfoWindowToggle, showInfoWindow]);

  const handleInfoWindowClose = useCallback(() => {
    onInfoWindowToggle(null);
  }, [onInfoWindowToggle]);

  return (
    <>
      <Marker
        position={position}
        icon={icon}
        onClick={handleClick}
        zIndex={isSelected ? 1000 : 1}
      />
      
      {showInfoWindow && (
        <InfoWindow
          position={position}
          onCloseClick={handleInfoWindowClose}
          options={{
            pixelOffset: { width: 0, height: -32 } as google.maps.Size,
          }}
        >
          <div className="p-3 min-w-[200px] max-w-[300px]">
            <div className="font-semibold text-lg mb-2 flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                vehicle.isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {vehicle.name || vehicle.reg_no}
            </div>
            
            <div className="space-y-1 text-sm">
              <div><strong>Registration:</strong> {vehicle.reg_no}</div>
              <div><strong>IMEI:</strong> {vehicle.imei}</div>
              <div><strong>Speed:</strong> {formatSpeed(vehicle.speed)}</div>
              <div><strong>Ignition:</strong> 
                <span className={`ml-1 ${
                  vehicle.ignition === 'ON' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {vehicle.ignition}
                </span>
              </div>
              <div><strong>Last Update:</strong> {formatTime(vehicle.lastUpdate)}</div>
              <div><strong>Location:</strong> {vehicle.latitude?.toFixed(6)}, {vehicle.longitude?.toFixed(6)}</div>
            </div>
            
            <div className={`mt-2 px-2 py-1 rounded text-xs font-medium inline-block ${
              vehicle.isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {vehicle.isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

// Main LiveMap component
export const LiveMap = React.memo<LiveMapProps>(({
  vehicles,
  selectedVehicle,
  onVehicleSelect,
  center,
  zoom = 7
}) => {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Filter vehicles to only show those with valid coordinates
  const vehiclesWithValidCoordinates = useMemo(
    () =>
      vehicles.filter(
        (
          vehicle
        ): vehicle is MapVehicle & { latitude: number; longitude: number } =>
          vehicle.latitude != null && vehicle.longitude != null
      ),
    [vehicles]
  );

  // Calculate map center and zoom based on filtered vehicles
  const mapCenter = useMemo(() => {
    // Always use the default center for Nepal view
    return center ? { lat: center[0], lng: center[1] } : { lat: 27.7172, lng: 85.3240 }; // Kathmandu, Nepal
  }, [center]);

  const handleVehicleSelect = useCallback((vehicleId: string) => {
    onVehicleSelect?.(vehicleId);
  }, [onVehicleSelect]);

  const handleInfoWindowToggle = useCallback((vehicleId: string | null) => {
    setSelectedMarker(vehicleId);
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* ALWAYS show the GoogleMap, regardless of whether there are valid vehicles */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={GOOGLE_MAPS_CONFIG.mapOptions}
      >
        {/* Only show markers for vehicles with valid coordinates */}
        {vehiclesWithValidCoordinates.map((vehicle) => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            position={{ lat: vehicle.latitude, lng: vehicle.longitude }}
            isSelected={selectedVehicle === vehicle.id}
            onSelect={handleVehicleSelect}
            showInfoWindow={selectedMarker === vehicle.id}
            onInfoWindowToggle={handleInfoWindowToggle}
          />
        ))}
      </GoogleMap>
      
      {/* Map legend - always show */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg z-10">
        <h4 className="font-semibold text-sm mb-2">Vehicle Status</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: getStatusColor('running') }}></div>
            <span>Running</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: getStatusColor('stop') }}></div>
            <span>Stopped</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: getStatusColor('idle') }}></div>
            <span>Idle</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: getStatusColor('inactive') }}></div>
            <span>Inactive</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: getStatusColor('overspeed') }}></div>
            <span>Overspeed</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: getStatusColor('nodata') }}></div>
            <span>No Data</span>
          </div>
        </div>
      </div>
      
      {/* Vehicle count and controls - always show */}
      <div className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg z-10">
        <div className="text-sm font-medium mb-2">
          Vehicles: {vehiclesWithValidCoordinates.length} / {vehicles.length}
        </div>
        <div className="text-xs text-gray-600 mb-2">
          Online: {vehiclesWithValidCoordinates.filter(v => v.isOnline).length}
        </div>
        {vehiclesWithValidCoordinates.length === 0 && vehicles.length > 0 && (
          <div className="text-xs text-orange-600">
            No valid GPS coordinates
          </div>
        )}
      </div>
    </div>
  );
});

export default LiveMap; 