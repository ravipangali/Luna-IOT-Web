// Environment configuration for Luna IoT Frontend
export const ENV_CONFIG = {
  // API Configuration
  API_HOST: import.meta.env.VITE_API_HOST || '84.247.131.246',
  API_PORT: import.meta.env.VITE_API_PORT || '8080',
  API_SECURE: import.meta.env.VITE_API_SECURE === 'true' || false,
  
  // App Configuration
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Luna IoT Tracking System',
  
  // Development flags
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  
  // Build URLs
  get API_BASE_URL() {
    const protocol = this.API_SECURE ? 'https' : 'http';
    return `${protocol}://${this.API_HOST}:${this.API_PORT}`;
  },
  
  get WS_BASE_URL() {
    const protocol = this.API_SECURE ? 'wss' : 'ws';
    return `${protocol}://${this.API_HOST}:${this.API_PORT}/ws`;
  },
  
  get HEALTH_URL() {
    return `${this.API_BASE_URL}/health`;
  }
};

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