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
  const hostname = window.location.hostname;
  
  // Local development indicators
  if (hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')) {
    return false;
  }
  
  // Check against VPS patterns
  return VPS_PATTERNS.some(pattern => pattern.test(hostname));
}

/**
 * Gets the appropriate backend configuration
 */
export function getBackendConfig(): VPSConfig {
  // Check environment variables first
  const envHost = import.meta.env.VITE_API_HOST;
  const envPort = import.meta.env.VITE_API_PORT;
  const envSecure = import.meta.env.VITE_API_SECURE === 'true';
  
  if (envHost) {
    return {
      host: envHost,
      httpPort: envPort || '8080',
      wsPort: envPort || '8080',
      isSecure: envSecure
    };
  }
  
  // Auto-detect based on current location
  if (isVPSEnvironment()) {
    // Use current hostname as backend (assumes frontend and backend on same VPS)
    return {
      host: window.location.hostname,
      httpPort: '8080',
      wsPort: '8080',
      isSecure: window.location.protocol === 'https:'
    };
  }
  
  // Default to localhost for development
  return {
    host: '84.247.131.246',
    httpPort: '8080',
    wsPort: '8080',
    isSecure: false
  };
}

/**
 * Builds complete API URLs
 */
export function buildAPIUrls() {
  const config = getBackendConfig();
  const protocol = config.isSecure ? 'https' : 'http';
  const wsProtocol = config.isSecure ? 'wss' : 'ws';
  
  return {
    baseURL: `${protocol}://${config.host}:${config.httpPort}`,
    wsURL: `${wsProtocol}://${config.host}:${config.wsPort}/ws`,
    healthURL: `${protocol}://${config.host}:${config.httpPort}/health`
  };
}

/**
 * Tests backend connectivity
 */
export async function testBackendConnection(): Promise<{
  success: boolean;
  message: string;
  config: VPSConfig;
  responseTime?: number;
}> {
  const config = getBackendConfig();
  const urls = buildAPIUrls();
  const startTime = Date.now();
  
  try {
    console.log('🔄 Testing backend connection to:', urls.baseURL);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(urls.healthURL, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      await response.json(); // Consume response to avoid memory leaks
      return {
        success: true,
        message: `Connected successfully to ${config.host} (${responseTime}ms)`,
        config,
        responseTime
      };
    } else {
      return {
        success: false,
        message: `Server responded with ${response.status}: ${response.statusText}`,
        config
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Provide specific error guidance
    let message = 'Connection failed';
    if (error instanceof TypeError && error.message.includes('fetch')) {
      message = `Cannot reach ${config.host}:${config.httpPort}. Please check:\n` +
                `1. Server is running on VPS\n` +
                `2. Firewall allows port ${config.httpPort}\n` +
                `3. VPS IP is correct`;
    } else if (error instanceof Error) {
      message = error.message;
    }
    
    return {
      success: false,
      message,
      config,
      responseTime
    };
  }
}

/**
 * Shows current configuration in console
 */
export function logConfiguration() {
  const config = getBackendConfig();
  const urls = buildAPIUrls();
  const isVPS = isVPSEnvironment();
  
  console.group('🌐 Luna IoT Frontend Configuration');
  console.log('Environment:', isVPS ? 'VPS/Production' : 'Local Development');
  console.log('Backend Config:', config);
  console.log('API URLs:', urls);
  console.log('Current Location:', {
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    port: window.location.port
  });
  console.groupEnd();
  
  return { config, urls, isVPS };
}

/**
 * Creates environment configuration for copy-paste
 */
export function generateEnvConfig(vpsIP?: string): string {
  const host = vpsIP || window.location.hostname;
  
  return `# Luna IoT Frontend Configuration
# Add this to your .env.local file

VITE_API_HOST=${host}
VITE_API_PORT=8080
VITE_API_SECURE=false
VITE_API_BASE_URL=http://${host}:8080
VITE_WS_URL=ws://${host}:8080/ws
VITE_APP_NAME=Luna IoT Tracking System`;
}

// Auto-run configuration logging in development
if (import.meta.env.DEV) {
  logConfiguration();
} 