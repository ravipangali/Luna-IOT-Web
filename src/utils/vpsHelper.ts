// VPS Configuration Helper for Luna IoT Frontend
// This utility helps configure the frontend to connect to your VPS automatically

interface VPSConfig {
  host: string;
  httpPort: string;
  wsPort: string;
  isSecure: boolean;
}

// Common VPS IP patterns to auto-detect
const VPS_PATTERNS = [
  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // IPv4 pattern
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/, // Domain pattern
];

/**
 * Detects if the current hostname looks like a VPS
 */
function isVPSEnvironment(): boolean {
  // Check if window is available (for SSR compatibility)
  if (typeof window === 'undefined') {
    return false;
  }
  
  const hostname = window.location.hostname;
  
  // Local development indicators
  if (hostname === 'system.mylunago.com') {
    return false;
  }
  
  // Check against VPS patterns
  const isVPS = VPS_PATTERNS.some(pattern => pattern.test(hostname));
  return isVPS;
}

/**
 * Gets the appropriate backend configuration
 */
export function getBackendConfig(): VPSConfig {
  // Check environment variables first
  const envHost = import.meta.env.VITE_API_HOST;
  const envPort = import.meta.env.VITE_API_PORT;
  const envSecure = import.meta.env.VITE_API_SECURE === 'true';
  
  if (envHost && envHost !== 'undefined' && envHost.trim() !== '') {
    const config = {
      host: envHost,
      httpPort: envPort || '443',
      wsPort: envPort || '443',
      isSecure: envSecure || true
    };
    
    // Additional validation to ensure no undefined values
    if (config.host === 'undefined' || config.httpPort === 'undefined' || config.wsPort === 'undefined') {
      // Force fallback values
      config.host = 'system.mylunago.com';
      config.httpPort = '443';
      config.wsPort = '443';
      config.isSecure = true;
    }
    
    return config;
  }
  
  // Check if window is available (for SSR compatibility)
  if (typeof window === 'undefined') {
    const config = {
      host: 'system.mylunago.com',
      httpPort: '443',
      wsPort: '443',
      isSecure: true
    };
    
    // Additional validation to ensure no undefined values
    if (config.host === 'undefined' || config.httpPort === 'undefined' || config.wsPort === 'undefined') {
      // Force fallback values
      config.host = 'system.mylunago.com';
      config.httpPort = '443';
      config.wsPort = '443';
      config.isSecure = true;
    }
    
    return config;
  }
  
  // Auto-detect based on current location
  if (isVPSEnvironment()) {
    // Use current hostname as backend (assumes frontend and backend on same VPS)
    const config = {
      host: window.location.hostname || 'system.mylunago.com',
      httpPort: '443',
      wsPort: '443',
      isSecure: window.location.protocol === 'https:'
    };
    
    // Force use of the correct backend host for now
    config.host = 'system.mylunago.com';
    config.isSecure = true;
    
    // Additional validation to ensure no undefined values
    if (config.host === 'undefined' || config.httpPort === 'undefined' || config.wsPort === 'undefined') {
      // Force fallback values
      config.host = 'system.mylunago.com';
      config.httpPort = '443';
      config.wsPort = '443';
      config.isSecure = true;
    }
    
    return config;
  }
  
  // Default configuration
  const config = {
    host: 'system.mylunago.com',
    httpPort: '443',
    wsPort: '443',
    isSecure: true
  };
  
  // Always use the correct backend host
  config.host = 'system.mylunago.com';
  config.isSecure = true;
  
  // Additional validation to ensure no undefined values
  if (config.host === 'undefined' || config.httpPort === 'undefined' || config.wsPort === 'undefined') {
    // Force fallback values
    config.host = 'system.mylunago.com';
    config.httpPort = '443';
    config.wsPort = '443';
    config.isSecure = true;
  }
  
  return config;
}

/**
 * Builds complete API URLs
 */
export function buildAPIUrls() {
  const config = getBackendConfig();
  
  // Ensure all config values are defined and valid
  if (!config.host || !config.httpPort || !config.wsPort || 
      config.host === 'undefined' || config.httpPort === 'undefined' || config.wsPort === 'undefined' ||
      config.host.trim() === '' || config.httpPort.trim() === '' || config.wsPort.trim() === '') {
    // Fallback to safe defaults
    const fallbackConfig = {
      host: 'system.mylunago.com',
      httpPort: '443',
      wsPort: '443',
      isSecure: true
    };
    
    const protocol = fallbackConfig.isSecure ? 'https' : 'http';
    const wsProtocol = fallbackConfig.isSecure ? 'wss' : 'ws';
    
    return {
      baseURL: `${protocol}://${fallbackConfig.host}`,
      wsURL: `${wsProtocol}://${fallbackConfig.host}/ws`,
      healthURL: `${protocol}://${fallbackConfig.host}/health`
    };
  }
  
  const protocol = config.isSecure ? 'https' : 'http';
  const wsProtocol = config.isSecure ? 'wss' : 'ws';
  
  const urls = {
    baseURL: `${protocol}://${config.host}`,
    wsURL: `${wsProtocol}://${config.host}/ws`,
    healthURL: `${protocol}://${config.host}/health`
  };
  
  // Final validation to ensure no undefined values in URLs
  if (urls.baseURL.includes('undefined') || urls.wsURL.includes('undefined') || urls.healthURL.includes('undefined')) {
    // Use fallback URLs
    urls.baseURL = 'https://system.mylunago.com';
    urls.wsURL = 'wss://system.mylunago.com/ws';
    urls.healthURL = 'https://system.mylunago.com/health';
  }
  
  return urls;
}

/**
 * Tests the backend connection
 */
export async function testBackendConnection(): Promise<{
  success: boolean;
  message: string;
  config: VPSConfig;
  responseTime?: number;
}> {
  const urls = buildAPIUrls();
  const startTime = Date.now();
  
  try {
    const response = await fetch(urls.healthURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        success: true,
        message: 'Backend connection successful',
        config: getBackendConfig(),
        responseTime
      };
    } else {
      return {
        success: false,
        message: `Backend responded with status: ${response.status}`,
        config: getBackendConfig(),
        responseTime
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      config: getBackendConfig(),
      responseTime
    };
  }
}

/**
 * Logs the current configuration for debugging
 */
export function logConfiguration() {
  // This function is intentionally empty to remove debug logging
}

/**
 * Generates environment configuration for deployment
 */
export function generateEnvConfig(vpsIP?: string): string {
  const ip = vpsIP || 'system.mylunago.com';
  return `# Luna IoT Frontend Environment Configuration
# Copy this to your .env file

# API Configuration
VITE_API_HOST=${ip}
VITE_API_PORT=443
VITE_API_SECURE=true

# App Configuration
VITE_APP_NAME=Luna IoT Tracking System

# Development flags
NODE_ENV=production
`;
}

// Auto-run configuration logging in development
if (import.meta.env.DEV) {
  logConfiguration();
} 