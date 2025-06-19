// Google Maps configuration
export const GOOGLE_MAPS_CONFIG = {
  // You'll need to get your API key from Google Cloud Console
  // Enable the following APIs: Maps JavaScript API, Geocoding API, Directions API
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC4oO2oBMNzhEhLCmD2i9Ts9ljplYpsCVg',
  
  // Default map settings
  defaultCenter: {
    lat: 27.7172, // Kathmandu, Nepal
    lng: 85.3240
  },
  
  defaultZoom: 13,
  
  // Libraries to load - reduced for better performance
  libraries: ['places'] as ('places')[],
  
  // Map styles (optional)
  mapOptions: {
    zoomControl: true,
    mapTypeControl: false, // Disabled for cleaner UI
    scaleControl: false, // Disabled for cleaner UI
    streetViewControl: false, // Disabled for cleaner UI
    rotateControl: false, // Disabled for cleaner UI
    fullscreenControl: true,
    disableDefaultUI: false,
    clickableIcons: false,
    gestureHandling: 'greedy' as const,
    // Performance optimizations
    mapTypeId: 'roadmap',
    restriction: {
      latLngBounds: {
        north: 30.5,
        south: 26.0,
        west: 80.0,
        east: 88.5,
      },
      strictBounds: false,
    },
  }
};

// Vehicle marker icons for different states
export const VEHICLE_ICONS = {
  car: {
    online: '/assets/markers/car-online.png',
    offline: '/assets/markers/car-offline.png',
    idle: '/assets/markers/car-idle.png',
    moving: '/assets/markers/car-moving.png',
  },
  truck: {
    online: '/assets/markers/truck-online.png',
    offline: '/assets/markers/truck-offline.png',
    idle: '/assets/markers/truck-idle.png',
    moving: '/assets/markers/truck-moving.png',
  },
  bus: {
    online: '/assets/markers/bus-online.png',
    offline: '/assets/markers/bus-offline.png',
    idle: '/assets/markers/bus-idle.png',
    moving: '/assets/markers/bus-moving.png',
  },
  bike: {
    online: '/assets/markers/bike-online.png',
    offline: '/assets/markers/bike-offline.png',
    idle: '/assets/markers/bike-idle.png',
    moving: '/assets/markers/bike-moving.png',
  },
  default: {
    online: '/assets/markers/default-online.png',
    offline: '/assets/markers/default-offline.png',
    idle: '/assets/markers/default-idle.png',
    moving: '/assets/markers/default-moving.png',
  }
};

// Map theme styles (optional dark/light themes)
export const MAP_STYLES = {
  default: [],
  dark: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    // ... more dark theme styles
  ],
  silver: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    // ... more silver theme styles
  ]
}; 