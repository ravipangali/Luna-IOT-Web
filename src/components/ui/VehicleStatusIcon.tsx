import React from 'react';
import { getStatusIconPath, getStatusDisplayText, type VehicleStatus } from '../../utils/vehicleIcons';

interface VehicleStatusIconProps {
  vehicleType: string;
  status: VehicleStatus;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  className?: string;
}

export const VehicleStatusIcon: React.FC<VehicleStatusIconProps> = ({
  vehicleType,
  status,
  size = 'medium',
  showLabel = true,
  className = ''
}) => {
  const iconPath = getStatusIconPath(vehicleType, status);
  const statusText = getStatusDisplayText(status);
  
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };
  
  const iconSize = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`${iconSize} relative`}>
        <img
          src={iconPath}
          alt={`${vehicleType} ${statusText}`}
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to a simple colored circle if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = `w-full h-full rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-xs`;
            fallback.style.backgroundColor = getStatusColor(status);
            fallback.textContent = vehicleType.charAt(0).toUpperCase();
            target.parentNode?.appendChild(fallback);
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs mt-1 text-center font-medium">
          {statusText}
        </span>
      )}
    </div>
  );
};

// Helper function to get status color (duplicated here to avoid circular imports)
const getStatusColor = (status: VehicleStatus): string => {
  const colors: Record<VehicleStatus, string> = {
    'running': '#10B981',
    'stop': '#EF4444',
    'idle': '#F59E0B',
    'inactive': '#6B7280',
    'overspeed': '#DC2626',
    'nodata': '#9CA3AF',
  };
  return colors[status] || '#6B7280';
};

export default VehicleStatusIcon; 