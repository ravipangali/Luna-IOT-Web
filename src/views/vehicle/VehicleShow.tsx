import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { vehicleController } from '../../controllers';
import type { Vehicle } from '../../types/models';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/Button';
import { LiveMap } from '../../components/ui/LiveMap';
import { websocketService, type GPSUpdate } from '../../services/websocketService';
import { getStatusColor, getStatusDisplayText, type VehicleStatus } from '../../utils/vehicleIcons';

interface VehicleGPSData {
  imei: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  ignition: string;
  timestamp: string;
  isMoving: boolean;
  connectionStatus: 'connected' | 'stopped' | 'inactive';
  battery?: {
    level: number;
    voltage: number;
    status: string;
    charging: boolean;
  };
  signal?: {
    level: number;
    bars: number;
    status: string;
    percentage: number;
  };
}

// Extended Vehicle interface with GPS data
interface ExtendedVehicle extends Vehicle {
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  ignition?: boolean;
  lastUpdate?: Date;
  status?: string;
}

export const VehicleShow: React.FC = () => {
  const { imei } = useParams<{ imei: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<ExtendedVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimeData, setRealTimeData] = useState<VehicleGPSData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  useEffect(() => {
    const loadVehicle = async () => {
      if (!imei) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await vehicleController.getVehicle(imei);
        if (response.success && response.data) {
          setVehicle(response.data);
        }
      } catch (err) {
        console.error('Error loading vehicle:', err);
        setError('Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    };

    loadVehicle();
  }, [imei]);

  useEffect(() => {
    if (!vehicle?.imei) return;

    console.log('🔌 Setting up real-time tracking for vehicle:', vehicle.reg_no);

    const handleConnection = (data: unknown) => {
      const connectionData = data as { status: string };
      console.log('🔌 WebSocket connection:', connectionData.status);
      setConnectionStatus(connectionData.status === 'connected' ? 'connected' : 'disconnected');
    };

    const handleGPSUpdate = (data: unknown) => {
      const gpsData = data as GPSUpdate;
      
      if (gpsData.imei === vehicle.imei) {
        console.log('📍 Real-time GPS update for vehicle:', vehicle.reg_no, gpsData);
        
        if (gpsData.location_valid && gpsData.latitude && gpsData.longitude) {
          setRealTimeData({
            imei: gpsData.imei,
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            speed: gpsData.speed || 0,
            course: gpsData.course || 0,
            ignition: gpsData.ignition,
            timestamp: gpsData.timestamp,
            isMoving: gpsData.is_moving,
            connectionStatus: gpsData.connection_status,
            battery: gpsData.battery ? {
              level: gpsData.battery.level,
              voltage: gpsData.battery.voltage,
              status: gpsData.battery.status,
              charging: gpsData.battery.charging,
            } : undefined,
            signal: gpsData.signal ? {
              level: gpsData.signal.level,
              bars: gpsData.signal.bars,
              status: gpsData.signal.status,
              percentage: gpsData.signal.percentage,
            } : undefined,
          });

          setVehicle(prev => prev ? {
            ...prev,
            latitude: gpsData.latitude!,
            longitude: gpsData.longitude!,
            speed: gpsData.speed || 0,
            course: gpsData.course || 0,
            ignition: gpsData.ignition === 'ON',
            lastUpdate: new Date(gpsData.timestamp),
            status: gpsData.is_moving ? 'running' : (gpsData.ignition === 'ON' ? 'idle' : 'stop'),
          } : null);
        } else {
          console.warn('📍 Ignoring invalid GPS data for vehicle:', vehicle.reg_no);
        }
      }
    };

    const handleDeviceStatus = (data: unknown) => {
      const statusData = data as { imei?: string; status: string; last_seen?: string };
      
      if (statusData.imei === vehicle.imei) {
        console.log('📱 Device status update for vehicle:', vehicle.reg_no, statusData.status);
        
        setRealTimeData(prev => prev ? {
          ...prev,
          connectionStatus: statusData.status as 'connected' | 'stopped' | 'inactive',
          timestamp: statusData.last_seen || prev.timestamp,
        } : null);
      }
    };

    websocketService.on('connection', handleConnection);
    websocketService.on('gps_update', handleGPSUpdate);
    websocketService.on('device_status', handleDeviceStatus);

    websocketService.connect();

    return () => {
      websocketService.off('connection', handleConnection);
      websocketService.off('gps_update', handleGPSUpdate);
      websocketService.off('device_status', handleDeviceStatus);
    };
  }, [vehicle?.imei, vehicle?.reg_no]);

  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, []);

  const getVehicleStatus = useCallback((): VehicleStatus => {
    if (realTimeData) {
      if (realTimeData.connectionStatus === 'stopped' || realTimeData.connectionStatus === 'inactive') {
        return realTimeData.connectionStatus === 'inactive' ? 'inactive' : 'stop';
      }
      if (realTimeData.isMoving) {
        return 'running';
      }
      if (realTimeData.ignition === 'ON') {
        return 'idle';
      }
      return 'stop';
    }
    return 'nodata';
  }, [realTimeData]);

  // Check if vehicle has any GPS data at all (not just valid coordinates)
  const hasAnyGPSData = useMemo(() => {
    // Has real-time data or basic vehicle info
    return realTimeData || vehicle !== null;
  }, [realTimeData, vehicle]);

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading vehicle data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Vehicle Not Found</h2>
              <p className="text-gray-500 mt-2">The requested vehicle could not be found.</p>
              <Link
                to="/admin/vehicles"
                className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
                Back to Vehicles
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = getVehicleStatus();
  const displayData = realTimeData || {
    latitude: vehicle.latitude,
    longitude: vehicle.longitude,
    speed: vehicle.speed || 0,
    course: vehicle.course || 0,
    ignition: vehicle.ignition ? 'ON' : 'OFF',
    timestamp: vehicle.lastUpdate?.toISOString() || new Date().toISOString(),
    connectionStatus: 'disconnected' as const,
    isMoving: false,
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.reg_no}</h1>
          <p className="text-gray-600">{vehicle.name}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium">
              {connectionStatus === 'connected' ? 'Live' : 
               connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
            </span>
          </div>
          <Button onClick={() => navigate('/vehicles')} variant="outline">
            Back to Vehicles
          </Button>
        </div>
      </div>

      {/* Status and Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: getStatusColor(currentStatus) }}></div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold" style={{ color: getStatusColor(currentStatus) }}>
                  {getStatusDisplayText(currentStatus)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="text-blue-600">🚗</div>
              <div>
                <p className="text-sm text-gray-600">Speed</p>
                <p className="font-semibold">{displayData.speed} km/h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="text-green-600">🔋</div>
              <div>
                <p className="text-sm text-gray-600">Battery</p>
                <p className="font-semibold">
                  {realTimeData?.battery?.level || 'N/A'}
                  {realTimeData?.battery?.level ? '%' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="text-orange-600">📡</div>
              <div>
                <p className="text-sm text-gray-600">Signal</p>
                <p className="font-semibold">
                  {realTimeData?.signal?.percentage || 'N/A'}
                  {realTimeData?.signal?.percentage ? '%' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Live Location</span>
            <Badge variant={realTimeData?.connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {realTimeData?.connectionStatus === 'connected' ? 'Live Tracking' : 'Last Known Position'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full rounded-lg overflow-hidden">
            {/* ALWAYS show the map, but only show vehicle marker when coordinates are valid */}
            <LiveMap
              vehicles={displayData.latitude && displayData.longitude ? [{
                id: vehicle.id || '',
                imei: vehicle.imei,
                reg_no: vehicle.reg_no,
                name: vehicle.name,
                latitude: displayData.latitude,
                longitude: displayData.longitude,
                speed: displayData.speed,
                course: displayData.course,
                ignition: displayData.ignition,
                lastUpdate: new Date(displayData.timestamp),
                isOnline: displayData.connectionStatus === 'connected',
                vehicleType: vehicle.vehicle_type || 'car'
              }] : []}
              center={displayData.latitude && displayData.longitude 
                ? [displayData.latitude, displayData.longitude]
                : [27.7172, 85.3240] // Default to Kathmandu, Nepal when no coordinates
              }
              zoom={displayData.latitude && displayData.longitude ? 15 : 10}
            />

            {/* Optional status overlay when coordinates are not available */}
            {(!displayData.latitude || !displayData.longitude) && hasAnyGPSData && (
              <div className="absolute inset-4 flex items-start">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
                  <div className="flex items-center">
                    <div className="text-yellow-600 text-sm mr-2">📍</div>
                    <div className="text-sm">
                      <span className="font-medium text-yellow-800">GPS location unavailable</span>
                      <p className="text-yellow-700 text-xs mt-1">
                        Device has GPS data but coordinates are invalid
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Optional status overlay when no GPS data at all */}
            {!hasAnyGPSData && (
              <div className="absolute inset-4 flex items-start">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-lg">
                  <div className="flex items-center">
                    <div className="text-gray-500 text-sm mr-2">📍</div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">No GPS data available</span>
                      <p className="text-gray-600 text-xs mt-1">
                        This device has not sent any GPS data yet
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Registration</p>
                <p className="font-semibold">{vehicle.reg_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-semibold capitalize">{vehicle.vehicle_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">IMEI</p>
                <p className="font-mono text-sm">{vehicle.imei}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Update</p>
                <p className="font-semibold">{formatTimestamp(displayData.timestamp)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Ignition</p>
                <Badge variant={displayData.ignition === 'ON' ? 'default' : 'secondary'}>
                  {displayData.ignition}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Movement</p>
                <Badge variant={realTimeData?.isMoving ? 'default' : 'secondary'}>
                  {realTimeData?.isMoving ? 'Moving' : 'Stationary'}
                </Badge>
              </div>
              {realTimeData?.battery && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Battery Voltage</p>
                    <p className="font-semibold">{realTimeData.battery.voltage}V</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Charging</p>
                    <Badge variant={realTimeData.battery.charging ? 'default' : 'secondary'}>
                      {realTimeData.battery.charging ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 