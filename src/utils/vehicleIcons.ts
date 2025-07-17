// Vehicle icon utility for managing existing assets
export type VehicleType = 
  | 'car' | 'bike' | 'truck' | 'bus' | 'ambulance' | 'boat' | 'bulldozer' 
  | 'crane' | 'cycle' | 'dumper' | 'garbage' | 'jcb' | 'jeep' | 'mixer' 
  | 'mpv' | 'pickup' | 'school' | 'suv' | 'tanker' | 'tempo' | 'tractor' 
  | 'train' | 'van' | 'asseet';

export type VehicleStatus = 
  | 'running' | 'stop' | 'idle' | 'inactive' | 'overspeed' | 'nodata';

export type IconMode = 'live' | 'status';

// Map backend vehicle types to our asset folder names
const vehicleTypeMap: Record<string, VehicleType> = {
  'car': 'car',
  'bike': 'bike',
  'truck': 'truck',
  'bus': 'bus',
  'school_bus': 'school',
  'ambulance': 'ambulance',
  'boat': 'boat',
  'bulldozer': 'bulldozer',
  'crane': 'crane',
  'cycle': 'cycle',
  'dumper': 'dumper',
  'garbage': 'garbage',
  'jcb': 'jcb',
  'jeep': 'jeep',
  'mixer': 'mixer',
  'mpv': 'mpv',
  'pickup': 'pickup',
  'suv': 'suv',
  'tanker': 'tanker',
  'tempo': 'tempo',
  'tractor': 'tractor',
  'train': 'train',
  'van': 'van',
  'asset': 'asseet', // Note: folder is named 'Asseet'
};

// ENHANCED: Determine vehicle status based on GPS data, avoid "no data" unless GPS table is empty
export const getVehicleStatus = (
  _isOnline: boolean, // This parameter is kept for compatibility but will be ignored
  speed: number,
  ignition: string,
  overspeedLimit: number = 60,
  hasGPSData: boolean = true,
  lastDataTime?: Date
): VehicleStatus => {
  // ENHANCED: Only show no-data if GPS data table has literally NO records for this device/vehicle
  // This should be rare - most vehicles should have some historical GPS data
  if (!hasGPSData) {
    return 'nodata';
  }
  
  // FIXED: Only show inactive if last GPS data is more than 1 hour old
  if (lastDataTime) {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastDataTime.getTime()) / (1000 * 60);
    
    if (diffMinutes >= 60) { // More than 1 hour
      return 'inactive';
    }
  }
  
  // FIXED: Speed > 5 km/h = running (regardless of ignition/connection)
  if (speed > 5) {
    if (speed > overspeedLimit) {
      return 'overspeed';
    }
    return 'running';
  }
  
  // For speeds <= 5, check ignition status to differentiate between idle and stopped
  if (ignition === "ON") {
    // Ignition on but not moving (or moving very slowly)
    return 'idle';
  } else {
    // Ignition off (or empty/null) - use 'stop' instead of 'stopped'
    return 'stop';
  }
};

// Enhanced function to get vehicle icon path based on mode (live/status) and context
export const getVehicleIconPath = (
  vehicleType: string,
  status: VehicleStatus,
  mode: IconMode = 'live',
  isHistoricalMode: boolean = false
): string => {
  const mappedType = vehicleTypeMap[vehicleType.toLowerCase()] || 'car';
  const folderName = getFolderName(mappedType);
  
  try {
    // Map status to available PNG files
    const statusFileMap: Record<VehicleStatus, string> = {
      'running': 'running',
      'idle': 'idle', 
      'stop': 'stop',
      'inactive': 'inactive',
      'overspeed': 'overspeed',
      'nodata': 'nodata'
    };
    
    const statusFile = statusFileMap[status] || 'idle';
    let imagePath: string;
    
    if (mode === 'live' || isHistoricalMode) {
      // Use live folder for live mode and historical mode (shows vehicle movement)
      const liveFolderName = getLiveFolderName(mappedType);
      imagePath = new URL(`../assets/Icon/${folderName}/${liveFolderName}/live_${mappedType}_${statusFile}.png`, import.meta.url).href;
      // Loading PNG icon
    } else {
      // Use status folder for status panels and static displays
      const statusFolderName = getStatusFolderName(mappedType);
      imagePath = new URL(`../assets/Icon/${folderName}/${statusFolderName}/${mappedType}_${statusFile}.png`, import.meta.url).href;
              // Loading STATUS PNG icon
    }
    
    return imagePath;
    
      } catch {
      // Failed to load PNG icon, trying fallbacks
    
    // Try enhanced fallback logic with better status matching
    return getIconWithFallback(mappedType, status, mode, isHistoricalMode);
  }
};

// Enhanced fallback system for icon loading
const getIconWithFallback = (
  mappedType: VehicleType,
  status: VehicleStatus,
  mode: IconMode,
  isHistoricalMode: boolean
): string => {
  const folderName = getFolderName(mappedType);
  
  // Try different status fallbacks in priority order
  const fallbackStatuses = ['idle', 'stop', 'running', 'inactive', 'nodata'];
  
  for (const fallbackStatus of fallbackStatuses) {
    try {
      let fallbackPath: string;
      
      if (mode === 'live' || isHistoricalMode) {
        const liveFolderName = getLiveFolderName(mappedType);
        fallbackPath = new URL(`../assets/Icon/${folderName}/${liveFolderName}/live_${mappedType}_${fallbackStatus}.png`, import.meta.url).href;
        // Using fallback icon
      } else {
        const statusFolderName = getStatusFolderName(mappedType);
        fallbackPath = new URL(`../assets/Icon/${folderName}/${statusFolderName}/${mappedType}_${fallbackStatus}.png`, import.meta.url).href;
                  // Using STATUS fallback
      }
      
      return fallbackPath;
    } catch {
      continue;
    }
  }
  
  // Try default car icon as ultimate fallback
  try {
    if (mode === 'live' || isHistoricalMode) {
      const carFallback = new URL('../assets/Icon/Car/Live/live_car_idle.png', import.meta.url).href;
              // Using car fallback icon
      return carFallback;
    } else {
      const carFallback = new URL('../assets/Icon/Car/Status/car_idle.png', import.meta.url).href;
              // Using STATUS car fallback icon
      return carFallback;
    }
  } catch {
    // Ultimate SVG fallback
          // All PNG icons failed, using SVG fallback
    const statusColors: Record<VehicleStatus, string> = {
      'running': '#10B981',   // Green
      'idle': '#F59E0B',      // Orange  
      'stop': '#EF4444',      // Red
      'inactive': '#6B7280',  // Gray
      'overspeed': '#DC2626', // Dark Red
      'nodata': '#9CA3AF'     // Light Gray
    };
    
    const color = statusColors[status] || statusColors['idle'];
    const vehicleIcon = createVehicleSVGIcon(mappedType, color);
    
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(vehicleIcon)}`;
  }
};

// Get live icon path for map markers (using PNG images from live folder)
export const getLiveIconPath = (
  vehicleType: string,
  status: VehicleStatus
): string => {
  // For running state, we need to ensure we use the proper icon
  // Some vehicle types might use 'idle' icon for 'running' state
  if (status === 'running') {
    // Try to get a running-specific icon first
    try {
      const mappedType = vehicleTypeMap[vehicleType.toLowerCase()] || 'car';
      const folderName = getFolderName(mappedType);
      const liveFolderName = getLiveFolderName(mappedType);
      
      // First try with 'running' icon
      const runningPath = new URL(`../assets/Icon/${folderName}/${liveFolderName}/live_${mappedType}_running.png`, import.meta.url).href;
              // Using running icon for high-speed vehicle
      return runningPath;
    } catch {
      // If running icon doesn't exist, fall back to idle icon with green indicator
              // No running icon found, using idle icon instead
      return getVehicleIconPath(vehicleType, 'idle', 'live', false);
    }
  }
  
  return getVehicleIconPath(vehicleType, status, 'live', false);
};

// Get historical icon path for map markers in historical mode
export const getHistoricalIconPath = (
  vehicleType: string,
  status: VehicleStatus
): string => {
  return getVehicleIconPath(vehicleType, status, 'live', true);
};

// Get status icon path for vehicle information panels (using PNG images from status folder)
export const getStatusIconPath = (
  vehicleType: string,
  status: VehicleStatus
): string => {
  return getVehicleIconPath(vehicleType, status, 'status', false);
};

// Create custom SVG icons for different vehicle types
const createVehicleSVGIcon = (vehicleType: string, color: string): string => {
  const baseIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.3"/>
        </filter>
      </defs>
  `;
  
  const endIcon = `</svg>`;
  
  // Different shapes for different vehicle types
  switch (vehicleType.toLowerCase()) {
    case 'car':
    case 'suv':
    case 'jeep':
      return baseIcon + `
        <rect x="6" y="10" width="20" height="12" rx="2" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" filter="url(#shadow)"/>
        <circle cx="10" cy="24" r="2" fill="#333"/>
        <circle cx="22" cy="24" r="2" fill="#333"/>
        <rect x="8" y="12" width="16" height="6" rx="1" fill="#FFFFFF" opacity="0.3"/>
        <polygon points="16,8 18,10 14,10" fill="${color}"/>
      ` + endIcon;
      
    case 'truck':
    case 'pickup':
    case 'dumper':
      return baseIcon + `
        <rect x="4" y="8" width="24" height="16" rx="2" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" filter="url(#shadow)"/>
        <rect x="4" y="8" width="12" height="8" rx="1" fill="#FFFFFF" opacity="0.3"/>
        <circle cx="8" cy="26" r="2.5" fill="#333"/>
        <circle cx="24" cy="26" r="2.5" fill="#333"/>
        <polygon points="16,6 18,8 14,8" fill="${color}"/>
      ` + endIcon;
      
    case 'bus':
    case 'school':
      return baseIcon + `
        <rect x="3" y="8" width="26" height="16" rx="3" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" filter="url(#shadow)"/>
        <rect x="5" y="10" width="22" height="8" rx="1" fill="#FFFFFF" opacity="0.3"/>
        <circle cx="7" cy="26" r="2" fill="#333"/>
        <circle cx="25" cy="26" r="2" fill="#333"/>
        <rect x="6" y="11" width="3" height="3" fill="#87CEEB"/>
        <rect x="11" y="11" width="3" height="3" fill="#87CEEB"/>
        <rect x="16" y="11" width="3" height="3" fill="#87CEEB"/>
        <rect x="21" y="11" width="3" height="3" fill="#87CEEB"/>
        <polygon points="16,6 18,8 14,8" fill="${color}"/>
      ` + endIcon;
      
    case 'bike':
    case 'cycle':
      return baseIcon + `
        <circle cx="10" cy="20" r="6" fill="none" stroke="${color}" stroke-width="2" filter="url(#shadow)"/>
        <circle cx="22" cy="20" r="6" fill="none" stroke="${color}" stroke-width="2" filter="url(#shadow)"/>
        <line x1="10" y1="20" x2="16" y2="12" stroke="${color}" stroke-width="2"/>
        <line x1="16" y1="12" x2="22" y2="20" stroke="${color}" stroke-width="2"/>
        <circle cx="16" cy="12" r="1.5" fill="${color}"/>
        <polygon points="16,8 18,10 14,10" fill="${color}"/>
      ` + endIcon;
      
    case 'ambulance':
      return baseIcon + `
        <rect x="4" y="8" width="24" height="16" rx="2" fill="#FFFFFF" stroke="${color}" stroke-width="2" filter="url(#shadow)"/>
        <circle cx="8" cy="26" r="2.5" fill="#333"/>
        <circle cx="24" cy="26" r="2.5" fill="#333"/>
        <rect x="6" y="10" width="20" height="8" rx="1" fill="#FFFFFF" opacity="0.3"/>
        <line x1="16" y1="12" x2="16" y2="18" stroke="#EF4444" stroke-width="2"/>
        <line x1="13" y1="15" x2="19" y2="15" stroke="#EF4444" stroke-width="2"/>
        <polygon points="16,6 18,8 14,8" fill="${color}"/>
      ` + endIcon;
      
    case 'boat':
      return baseIcon + `
        <path d="M6 18 L26 18 L24 22 L8 22 Z" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" filter="url(#shadow)"/>
        <rect x="8" y="12" width="16" height="6" rx="1" fill="#FFFFFF" opacity="0.3"/>
        <line x1="16" y1="8" x2="16" y2="18" stroke="${color}" stroke-width="2"/>
        <polygon points="16,8 20,12 16,12" fill="${color}"/>
        <path d="M6 22 Q16 24 26 22" stroke="#87CEEB" stroke-width="2" fill="none"/>
      ` + endIcon;
      
    default:
      // Default vehicle icon
      return baseIcon + `
        <rect x="6" y="10" width="20" height="12" rx="2" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" filter="url(#shadow)"/>
        <circle cx="10" cy="24" r="2" fill="#333"/>
        <circle cx="22" cy="24" r="2" fill="#333"/>
        <rect x="8" y="12" width="16" height="6" rx="1" fill="#FFFFFF" opacity="0.3"/>
        <polygon points="16,8 18,10 14,10" fill="${color}"/>
      ` + endIcon;
  }
};

// Handle case variations in folder names
const getFolderName = (vehicleType: VehicleType): string => {
  const folderMap: Record<VehicleType, string> = {
    'car': 'Car',
    'bike': 'bike',
    'truck': 'Truck',
    'bus': 'Bus',
    'ambulance': 'Ambulance',
    'boat': 'Boat',
    'bulldozer': 'Bulldozer',
    'crane': 'Crane',
    'cycle': 'Cycle',
    'dumper': 'dumper',
    'garbage': 'Garbage',
    'jcb': 'JCB',
    'jeep': 'Jeep',
    'mixer': 'Mixer',
    'mpv': 'MPV',
    'pickup': 'Pickup',
    'school': 'school',
    'suv': 'SUV',
    'tanker': 'tanker',
    'tempo': 'Tempo',
    'tractor': 'Tractor',
    'train': 'Train',
    'van': 'Van',
    'asseet': 'Asseet',
  };
  
  return folderMap[vehicleType] || 'Car';
};

// Handle case variations in live/status folder names
const getLiveFolderName = (vehicleType: VehicleType): string => {
  // Different vehicles have different case for the "live" folder
  const liveFolderMap: Record<VehicleType, string> = {
    'car': 'Live',
    'pickup': 'Live',
    'bike': 'live',
    'truck': 'live',
    'bus': 'live',
    'ambulance': 'live',
    'boat': 'live',
    'bulldozer': 'live',
    'crane': 'live',
    'cycle': 'live',
    'dumper': 'live',
    'garbage': 'live',
    'jcb': 'live',
    'jeep': 'live',
    'mixer': 'live',
    'mpv': 'live',
    'school': 'live',
    'suv': 'live',
    'tanker': 'live',
    'tempo': 'live',
    'tractor': 'live',
    'train': 'live',
    'van': 'live',
    'asseet': 'live',
  };
  
  return liveFolderMap[vehicleType] || 'live';
};

// Status folder is typically "Status" or "status"
const getStatusFolderName = (vehicleType: VehicleType): string => {
  // Most use "Status" (capital), but some may use "status" (lowercase)
  const statusFolderMap: Record<VehicleType, string> = {
    'car': 'Status',
    'pickup': 'status',
    'bike': 'Status',
    'truck': 'status',
    'bus': 'status',
    'ambulance': 'status',
    'boat': 'status',
    'bulldozer': 'status',
    'crane': 'status',
    'cycle': 'status',
    'dumper': 'status',
    'garbage': 'status',
    'jcb': 'status',
    'jeep': 'status',
    'mixer': 'status',
    'mpv': 'status',
    'school': 'status',
    'suv': 'status',
    'tanker': 'status',
    'tempo': 'status',
    'tractor': 'status',
    'train': 'status',
    'van': 'status',
    'asseet': 'status',
  };
  
  return statusFolderMap[vehicleType] || 'status';
};

// Create Google Maps icon object from image path
export const createGoogleMapsIcon = (
  imagePath: string,
  size: number = 32
): google.maps.Icon => {
  return {
    url: imagePath,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
};

// Get all available vehicle types
export const getAvailableVehicleTypes = (): VehicleType[] => {
  return Object.values(vehicleTypeMap);
};

// Validate if a vehicle type exists
export const isValidVehicleType = (vehicleType: string): boolean => {
  return vehicleType.toLowerCase() in vehicleTypeMap;
};

// Get display name for vehicle type
export const getVehicleTypeDisplayName = (vehicleType: string): string => {
  const displayNames: Record<string, string> = {
    'car': 'Car',
    'bike': 'Bike/Motorcycle',
    'truck': 'Truck',
    'bus': 'Bus',
    'school_bus': 'School Bus',
    'ambulance': 'Ambulance',
    'boat': 'Boat',
    'bulldozer': 'Bulldozer',
    'crane': 'Crane',
    'cycle': 'Bicycle',
    'dumper': 'Dumper',
    'garbage': 'Garbage Truck',
    'jcb': 'JCB',
    'jeep': 'Jeep',
    'mixer': 'Mixer',
    'mpv': 'MPV',
    'pickup': 'Pickup',
    'suv': 'SUV',
    'tanker': 'Tanker',
    'tempo': 'Tempo',
    'tractor': 'Tractor',
    'train': 'Train',
    'van': 'Van',
    'asset': 'Asset',
  };
  
  return displayNames[vehicleType.toLowerCase()] || vehicleType;
};

// Get status color for UI elements
export const getStatusColor = (status: VehicleStatus): string => {
  const colors: Record<VehicleStatus, string> = {
    'nodata': '#9CA3AF',    // gray - no GPS data
    'inactive': '#3B82F6',  // blue - has data but not connected
    'stop': '#EF4444',      // red - connected, not running, ignition off
    'idle': '#F59E0B',      // yellow - connected, not running, ignition on
    'running': '#10B981',   // green - connected, running, normal speed
    'overspeed': '#F97316', // orange - connected, running, overspeed
  };
  
  return colors[status] || '#6B7280';
};

// Get status display text
export const getStatusDisplayText = (status: VehicleStatus): string => {
  const displayTexts: Record<VehicleStatus, string> = {
    'nodata': 'No Data',      // Vehicle/device in database but no GPS data
    'inactive': 'Inactive',   // Has data but not connected to server
    'stop': 'Stopped',        // Connected, not running, ignition off
    'idle': 'Idle',           // Connected, not running, ignition on
    'running': 'Running',     // Connected, running, normal speed
    'overspeed': 'Overspeed', // Connected, running, overspeed
  };
  
  return displayTexts[status] || status;
}; 