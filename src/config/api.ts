// API Configuration for Luna IoT Frontend
// This will automatically detect if running in development or production

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// VPS/Production configuration
const VPS_CONFIG = {
  // Replace these with your actual VPS details
  HOST: '84.247.131.246',  // e.g., '203.161.xxx.xxx' or 'your-domain.com'
  HTTP_PORT: '8080',
  WS_PORT: '8080'  // WebSocket uses same port as HTTP server
};

// Development configuration
const DEV_CONFIG = {
  HOST: '84.247.131.246',
  HTTP_PORT: '8080',
  WS_PORT: '8080'
};

// Auto-select configuration based on environment
const config = isProduction ? VPS_CONFIG : DEV_CONFIG;

// Build API URLs
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${config.HOST}:${config.HTTP_PORT}`;
const WS_BASE_URL = import.meta.env.VITE_WS_URL || `ws://${config.HOST}:${config.WS_PORT}/ws`;

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  WS_URL: WS_BASE_URL,
  TIMEOUT: 30000, // 30 seconds
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  ENDPOINTS: {
    // Authentication endpoints
    AUTH_LOGIN: '/api/v1/auth/login',
    AUTH_REGISTER: '/api/v1/auth/register',
    AUTH_LOGOUT: '/api/v1/auth/logout',
    AUTH_ME: '/api/v1/auth/me',
    AUTH_REFRESH: '/api/v1/auth/refresh',
    
    // User endpoints
    USERS: '/api/v1/users',
    USER_BY_ID: (id: string) => `/api/v1/users/${id}`,
    
    // Device endpoints  
    DEVICES: '/api/v1/devices',
    DEVICE_BY_ID: (id: string) => `/api/v1/devices/${id}`,
    DEVICE_BY_IMEI: (imei: string) => `/api/v1/devices/imei/${imei}`,
    
    // Vehicle endpoints
    VEHICLES: '/api/v1/vehicles',
    VEHICLE: (imei: string) => `/api/v1/vehicles/${imei}`,
    VEHICLE_BY_IMEI: (imei: string) => `/api/v1/vehicles/${imei}`,
    VEHICLE_BY_REG: (regNo: string) => `/api/v1/vehicles/reg/${regNo}`,
    VEHICLES_BY_TYPE: (type: string) => `/api/v1/vehicles/type/${type}`,
    
    // GPS endpoints
    GPS: '/api/v1/gps',
    GPS_DATA: '/api/v1/gps',
    GPS_BY_IMEI: (imei: string) => `/api/v1/gps/${imei}`,
    GPS_LATEST: '/api/v1/gps/latest',
    GPS_LATEST_VALID: '/api/v1/gps/latest-valid',
    GPS_LATEST_BY_IMEI: (imei: string) => `/api/v1/gps/${imei}/latest`,
    GPS_LATEST_VALID_BY_IMEI: (imei: string) => `/api/v1/gps/${imei}/latest-valid`,
    GPS_ROUTE: (imei: string) => `/api/v1/gps/${imei}/route`,
    GPS_DELETE: (id: string) => `/api/v1/gps/${id}`,
    
    // NEW: Separate location and status endpoints
    GPS_LATEST_LOCATION: '/api/v1/gps/latest-location',
    GPS_LATEST_STATUS: '/api/v1/gps/latest-status',
    GPS_LOCATION_BY_IMEI: (imei: string) => `/api/v1/gps/${imei}/location`,
    GPS_STATUS_BY_IMEI: (imei: string) => `/api/v1/gps/${imei}/status`,
    
    // Control endpoints
    CONTROL_CUT_OIL: '/api/v1/control/cut-oil',
    CONTROL_CONNECT_OIL: '/api/v1/control/connect-oil',
    CONTROL_GET_LOCATION: '/api/v1/control/get-location',
    CONTROL_ACTIVE_DEVICES: '/api/v1/control/active-devices',
    
    // Health check
    HEALTH: '/health'
  }
};

// Console log for debugging
console.log('🌐 API Configuration:', {
  environment: isDevelopment ? 'development' : 'production',
  baseUrl: API_BASE_URL,
  wsUrl: WS_BASE_URL,
  config: config
});

// Export individual values for convenience
export const { BASE_URL, WS_URL, TIMEOUT, DEFAULT_HEADERS, ENDPOINTS } = API_CONFIG; 