// Environment configuration for Luna IoT Frontend
export const ENV_CONFIG = {
  // API Configuration
  API_HOST: import.meta.env.VITE_API_HOST || 'system.mylunago.com',
  API_PORT: import.meta.env.VITE_API_PORT || '8080',
  API_SECURE: false, // Use HTTP for now since server runs on port 8080
  
  // App Configuration
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Luna IoT Tracking System',
  
  // Development flags
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  
  // Build URLs
  get API_BASE_URL() {
    return `http://${this.API_HOST}:${this.API_PORT}`;
  },
  
  get WS_BASE_URL() {
    return `ws://${this.API_HOST}:${this.API_PORT}/ws`;
  },
  
  get HEALTH_URL() {
    return `${this.API_BASE_URL}/health`;
  }
};

// Debug environment variables
console.log('🔧 Environment Debug:', {
  VITE_API_HOST: import.meta.env.VITE_API_HOST,
  VITE_API_PORT: import.meta.env.VITE_API_PORT,
  VITE_API_SECURE: import.meta.env.VITE_API_SECURE,
  API_BASE_URL: ENV_CONFIG.API_BASE_URL,
  API_SECURE: ENV_CONFIG.API_SECURE,
  API_HOST: ENV_CONFIG.API_HOST,
  API_PORT: ENV_CONFIG.API_PORT
});

// Validate configuration
export function validateEnvironment() {
  const issues = [];
  
  if (!ENV_CONFIG.API_HOST) {
    issues.push('API_HOST is undefined');
  }
  
  if (!ENV_CONFIG.API_PORT) {
    issues.push('API_PORT is undefined');
  }
  
  if (ENV_CONFIG.API_BASE_URL.includes('undefined')) {
    issues.push('API_BASE_URL contains undefined');
  }
  
  if (issues.length > 0) {
    console.error('❌ Environment validation issues:', issues);
    console.log('🔧 Current environment config:', ENV_CONFIG);
    return false;
  }
  
  console.log('✅ Environment validation passed');
  return true;
}

// Auto-validate in development
if (import.meta.env.DEV) {
  validateEnvironment();
}