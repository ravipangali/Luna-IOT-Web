import React from 'react';
import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '../../config/googleMaps';

interface GoogleMapWrapperProps {
  children: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const GoogleMapWrapper: React.FC<GoogleMapWrapperProps> = ({
  children,
  onLoad,
  onError
}) => {
  const handleLoad = () => {
    console.log('Google Maps API loaded successfully');
    onLoad?.();
  };

  const handleError = (error: Error) => {
    console.error('Google Maps API failed to load:', error);
    onError?.(error);
  };

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_CONFIG.apiKey}
      libraries={GOOGLE_MAPS_CONFIG.libraries}
      onLoad={handleLoad}
      onError={handleError}
      loadingElement={
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Google Maps...</p>
          </div>
        </div>
      }
    >
      {children}
    </LoadScript>
  );
};

export default GoogleMapWrapper; 