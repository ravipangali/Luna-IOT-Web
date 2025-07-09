import { buildAPIUrls } from '../utils/vpsHelper';
import { authService } from './authService';

export interface WebSocketMessage {
  type: string;
  timestamp: string;
  data: unknown;
}

export interface BatteryInfo {
  level: number;       // 0-100 percentage
  voltage: number;     // Raw voltage level
  status: string;      // "Normal", "Low", "Critical"
  charging: boolean;   // Whether charger is connected
}

export interface SignalInfo {
  level: number;       // Raw signal level
  bars: number;        // 0-5 bars
  status: string;      // "Excellent", "Good", "Fair", "Poor", "No Signal"
  percentage: number;  // 0-100 percentage
}

export interface DeviceInfo {
  activated: boolean;
  gps_tracking: boolean;
  oil_connected: boolean;
  engine_running: boolean;
  satellites: number;
}

export interface AlarmInfo {
  active: boolean;
  type: string;
  code: number;
  emergency: boolean;
  overspeed: boolean;
  low_power: boolean;
  shock: boolean;
}

export interface GPSUpdate {
  imei: string;
  device_name?: string;
  vehicle_name?: string;
  reg_no?: string;
  vehicle_type?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  altitude?: number;
  ignition: string;
  timestamp: string;
  protocol_name: string;
  
  // Enhanced status information
  battery?: BatteryInfo;
  signal?: SignalInfo;
  device_status?: DeviceInfo;
  alarm_status?: AlarmInfo;
  
  // Additional fields for better tracking
  is_moving: boolean;
  last_seen: string;
  connection_status: 'connected' | 'stopped' | 'inactive';
  
  // Map rotation support
  bearing?: number; // Course converted to bearing (0-360)
  
  // Enhanced location validation
  location_valid: boolean;
  accuracy?: number;
}

// NEW: Location update interface for coordinate data
export interface LocationUpdate {
  imei: string;
  device_name?: string;
  vehicle_name?: string;
  reg_no?: string;
  vehicle_type?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  course?: number;
  altitude?: number;
  timestamp: string;
  protocol_name: string;
  
  // Map rotation support
  bearing?: number; // Course converted to bearing (0-360)
  
  // Enhanced location validation
  location_valid: boolean;
  accuracy?: number;
}

// NEW: Status update interface for device status data
export interface StatusUpdate {
  imei: string;
  device_name?: string;
  vehicle_name?: string;
  reg_no?: string;
  vehicle_type?: string;
  speed?: number;
  ignition: string;
  timestamp: string;
  protocol_name: string;
  
  // Enhanced status information
  battery?: BatteryInfo;
  signal?: SignalInfo;
  device_status?: DeviceInfo;
  alarm_status?: AlarmInfo;
  
  // Additional fields for better tracking
  is_moving: boolean;
  last_seen: string;
  connection_status: 'connected' | 'stopped' | 'inactive';
}

export interface DeviceStatus {
  imei: string;
  status: 'connected' | 'stopped' | 'inactive';
  last_seen: string;
  vehicle_reg?: string;
  vehicle_name?: string;
  vehicle_type?: string;
  battery?: BatteryInfo;
  signal?: SignalInfo;
}

export type WebSocketEventHandler = (data: unknown) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private isManualClose = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  constructor() {
    this.url = buildAPIUrls().wsURL;
    console.log('🔌 WebSocket service initialized with URL:', this.url);
  }

  // Connect to WebSocket
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    const token = authService.getToken();
    if (!token) {
      console.warn('🔌 WebSocket connection aborted: No authentication token found.');
      return;
    }

    this.connectionState = 'connecting';
    console.log('🔄 Attempting to connect to WebSocket...');

    try {
      // Append auth token to URL
      const urlWithToken = `${this.url}?token=${token}`;
      this.ws = new WebSocket(urlWithToken);
      this.setupEventListeners();
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.connectionState = 'disconnected';
      this.scheduleReconnect();
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    this.isManualClose = true;
    this.connectionState = 'disconnected';
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Add event listener for specific message types
  on(eventType: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  // Remove event listener
  off(eventType: string, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Send message to server (if needed)
  send(message: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  // Send ping to keep connection alive
  sendPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'ping', timestamp: new Date().toISOString() });
    }
  }

  // Setup WebSocket event listeners
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected to:', this.url);
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.emit('connection', { status: 'connected' });
      
      // Start sending pings to keep connection alive
      this.startPingInterval();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Enhanced logging for different update types
        if (message.type === 'gps_update') {
          const gpsData = message.data as GPSUpdate;
          console.log(`📍 GPS Update: ${gpsData.reg_no || gpsData.imei} - Valid: ${gpsData.location_valid}, Moving: ${gpsData.is_moving}, Status: ${gpsData.connection_status}`);
        } else if (message.type === 'location_update') {
          const locationData = message.data as LocationUpdate;
          console.log(`📍 Location Update: ${locationData.reg_no || locationData.imei} - Lat: ${locationData.latitude}, Lng: ${locationData.longitude}`);
        } else if (message.type === 'status_update') {
          const statusData = message.data as StatusUpdate;
          console.log(`📊 Status Update: ${statusData.reg_no || statusData.imei} - Speed: ${statusData.speed}, Ignition: ${statusData.ignition}, Status: ${statusData.connection_status}`);
        } else if (message.type === 'device_status') {
          console.log(`📱 Device Status: ${message.type}`);
        } else {
          console.log('📨 WebSocket message received:', message.type);
        }
        
        // Emit specific event type
        this.emit(message.type, message.data);
        
        // Also emit generic 'message' event
        this.emit('message', message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('🔌 WebSocket connection closed:', event.code, event.reason);
      this.connectionState = 'disconnected';
      this.stopPingInterval();
      this.emit('connection', { status: 'disconnected' });
      
      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.connectionState = 'disconnected';
      this.emit('error', error);
    };
  }

  private pingInterval: number | null = null;

  // Start ping interval to keep connection alive
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = window.setInterval(() => {
      this.sendPing();
    }, 30000); // Send ping every 30 seconds
  }

  // Stop ping interval
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Emit event to all registered handlers
  private emit(eventType: string, data: unknown): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${eventType} event handler:`, error);
        }
      });
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max WebSocket reconnection attempts reached');
      this.emit('connection', { status: 'failed' });
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Scheduling WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);

    setTimeout(() => {
      if (!this.isManualClose) {
        console.log(`🔄 Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }
    }, this.reconnectDelay);

    // Exponential backoff with max delay of 30 seconds
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  // Get current connection status
  getConnectionStatus(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnecting';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  // Check if WebSocket is connected
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get connection state
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionState;
  }
}

// Create and export a singleton instance
export const websocketService = new WebSocketService();
export const webSocketService = websocketService; // For backward compatibility
export default websocketService; 