import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLoadScript } from '@react-google-maps/api';
import { websocketService } from '../../services/websocketService';
import { enhancedVehicleTrackingService, type EnhancedVehicleData } from '../../services/enhancedVehicleTrackingService';
import { controlService } from '../../services/controlService';
import { DeviceStatusVehicleCard, type DeviceStatusVehicleData } from '../../components/ui/DeviceStatusVehicleCard';
import { LiveMap } from '../../components/ui/LiveMap';
import { GOOGLE_MAPS_CONFIG } from '../../config/googleMaps';
import { gpsController } from '../../controllers/gpsController';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCar,
  faSync,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import { showToast, handleApiError } from '../../utils/alerts';
import type { VehicleStatus } from '../../utils/vehicleIcons';
import type { MapVehicle } from '../../utils/mapUtils';

interface ConnectionStatus {
  status: string;
  connectedDevices: number;
  lastMessage: Date | null;
}

export const EnhancedLiveTrackingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_CONFIG.apiKey,
    libraries: GOOGLE_MAPS_CONFIG.libraries,
  });

  const [vehicles, setVehicles] = useState<EnhancedVehicleData[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<EnhancedVehicleData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    connectedDevices: 0,
    lastMessage: null
  });
  const [controlLoadingStates, setControlLoadingStates] = useState<Record<string, boolean>>({});
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<VehicleStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [vehicleStats, setVehicleStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    running: 0,
    stop: 0,
    idle: 0,
    inactive: 0,
    overspeed: 0,
    nodata: 0,
  });

  // Load initial GPS data from database before WebSocket with fallback for null coordinates
  const loadInitialGPSData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading initial GPS data from database...');
      
      // Get latest GPS data for all devices
      const gpsResponse = await gpsController.getLatestGPSData();
      
      if (gpsResponse.success && gpsResponse.data) {
        console.log(`Loaded initial GPS data for ${gpsResponse.data.length} devices`);
        
        // GPS data will be handled by the enhancedVehicleTrackingService.getAllVehicles() method
        // which properly joins GPS data with vehicle data from the database
        
        setInitialDataLoaded(true);
        
        // After initial load, update any vehicles with null coordinates using database fallback
        setTimeout(async () => {
          await enhancedVehicleTrackingService.updateVehiclesWithFallback();
        }, 2000); // Give initial load time to complete
      }
    } catch (error) {
      console.error('Error loading initial GPS data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load vehicles from enhanced service
  const loadVehicles = useCallback(async () => {
    if (!user) return; // Don't load if no user is logged in

    try {
      if (!initialDataLoaded) {
        await loadInitialGPSData();
      }
      
      const options = {
        includeOffline: true, // Always include offline vehicles
        limit: 1000,
        userId: isAdmin ? undefined : String(user.id), // Only send userId if not admin
      };

      const enhancedVehicles = await enhancedVehicleTrackingService.getAllVehicles(options);

      // Set the real-time data for the list
      setVehicles(enhancedVehicles);
      
      setLastRefresh(new Date());
      
      // Update stats
      const stats = enhancedVehicleTrackingService.getVehicleCountByStatus();
      setVehicleStats(stats);
      
      console.log(`Loaded ${enhancedVehicles.length} enhanced vehicles`);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      handleApiError(error, 'Failed to load vehicles');
    }
  }, [initialDataLoaded, loadInitialGPSData, user, isAdmin]);

  // Apply filters to vehicles
  useEffect(() => {
    let filtered = vehicles;

    // Apply search filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(vehicle =>
        vehicle.reg_no.toLowerCase().includes(searchTerm) ||
        vehicle.name.toLowerCase().includes(searchTerm) ||
        vehicle.imei.includes(searchTerm) ||
        vehicle.vehicleType.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (activeStatusFilter !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.status === activeStatusFilter);
    }

    setFilteredVehicles(filtered);
  }, [vehicles, searchQuery, activeStatusFilter]);

  // Handle status filter clicks
  const handleStatusFilter = useCallback((status: VehicleStatus | 'all') => {
    setActiveStatusFilter(prev => prev === status ? 'all' : status);
  }, []);

  // Setup WebSocket and initial load
  useEffect(() => {
    if (!user) {
      return; // Wait for user to be authenticated
    }

    // Connect to WebSocket
    websocketService.connect();

    // Set up connection status tracking
    const updateConnectionStatus = () => {
      const stats = enhancedVehicleTrackingService.getVehicleCountByStatus();
      setConnectionStatus(prev => ({
        ...prev,
        status: websocketService.isConnected() ? 'connected' : 'disconnected',
        connectedDevices: stats.online
      }));
    };

    // Subscribe to vehicle updates from enhanced service
    const unsubscribe = enhancedVehicleTrackingService.subscribe((updatedVehicles) => {
      setVehicles(updatedVehicles);
      const stats = enhancedVehicleTrackingService.getVehicleCountByStatus();
      setVehicleStats(stats);
    });

    // Update connection status periodically
    const statusInterval = setInterval(updateConnectionStatus, 5000);
    updateConnectionStatus();

    // Load initial data
    loadVehicles();

    // Set up auto-refresh for database data (WebSocket handles real-time updates)
    const refreshInterval = setInterval(() => {
      loadVehicles();
    }, 60000); // Refresh every minute for database sync

    // Cleanup
    return () => {
      clearInterval(statusInterval);
      clearInterval(refreshInterval);
      unsubscribe();
      websocketService.disconnect();
    };
  }, [loadVehicles, user]);

  // Handle vehicle selection
  const handleVehicleSelect = useCallback((vehicleId: string) => {
    setSelectedVehicle(prev => prev === vehicleId ? null : vehicleId);
  }, []);

  // Handle live tracking navigation
  const handleLiveTrack = useCallback((vehicleId: string) => {
    navigate(`/admin/live-tracking/${vehicleId}`);
  }, [navigate]);

  // Handle vehicle control (cut/connect oil)
  const handleVehicleControl = async (vehicleId: string, action: 'cut' | 'connect') => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    // Set loading state for this vehicle
    setControlLoadingStates(prev => ({ ...prev, [vehicleId]: true }));

    try {
      let result;
      if (action === 'cut') {
        result = await controlService.cutOilElectricity(vehicle.imei);
      } else {
        result = await controlService.connectOilElectricity(vehicle.imei);
      }

      if (result.success) {
        showToast(`Oil ${action === 'cut' ? 'Cut' : 'Connected'} Successfully`, 'success');
        // Refresh vehicle data to get updated status
        await loadVehicles();
      } else {
        showToast(`Failed to ${action} oil: ${result.message || result.error}`, 'error');
      }
    } catch (error) {
      handleApiError(error, `Failed to ${action} oil`);
    } finally {
      // Clear loading state
      setControlLoadingStates(prev => ({ ...prev, [vehicleId]: false }));
    }
  };

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    loadVehicles();
  }, [loadVehicles]);

  // Create a separate data source for the map from the live vehicle data
  const liveMapVehicles: MapVehicle[] = vehicles.map(vehicle => ({
    id: vehicle.id,
    imei: vehicle.imei,
    reg_no: vehicle.reg_no,
    name: vehicle.name,
    latitude: vehicle.latitude,
    longitude: vehicle.longitude,
    speed: vehicle.speed,
    course: vehicle.course,
    ignition: vehicle.ignition,
    lastUpdate: vehicle.lastUpdate,
    isOnline: vehicle.isOnline,
    vehicleType: vehicle.vehicleType,
    overspeedLimit: vehicle.overspeedLimit,
    hasGPSData: vehicle.status !== 'nodata',
    isReceivingLiveData: vehicle.isOnline,
    vehicleStatus: vehicle.status,
  }));

  // Filter vehicles for map display - only those with valid coordinates
  const liveMapVehiclesWithValidCoords = liveMapVehicles.filter(
    (vehicle): vehicle is MapVehicle & { latitude: number; longitude: number } =>
      vehicle.latitude != null &&
      vehicle.longitude != null &&
      vehicle.latitude !== 0 &&
      vehicle.longitude !== 0
  );

  // Transform EnhancedVehicleData to DeviceStatusVehicleData format
  const transformToDeviceStatusData = (vehicle: EnhancedVehicleData): DeviceStatusVehicleData => {
    // Log the transformation to help debug status issues
    console.log(`Transform ${vehicle.imei}: Status=${vehicle.status}, LastUpdate=${vehicle.lastUpdate.toISOString()}, Speed=${vehicle.speed}, Ignition=${vehicle.ignition}`);
    
    return {
      id: vehicle.id,
      imei: vehicle.imei,
      reg_no: vehicle.reg_no,
      name: vehicle.name,
      vehicleType: vehicle.vehicleType,
      latitude: vehicle.latitude ?? 0,
      longitude: vehicle.longitude ?? 0,
      speed: vehicle.speed,
      course: vehicle.course,
      ignition: vehicle.ignition,
      status: vehicle.status, // CRITICAL: Use the already calculated GPS-based status
      isOnline: vehicle.isOnline, // This is for UI display only, doesn't affect status
      lastUpdate: vehicle.lastUpdate, // This is from GPS data timestamp
      address: vehicle.address,
      
      // Enhanced device status - based on GPS data
      battery: vehicle.voltage_level ? {
        level: Math.round((vehicle.voltage_level / 6) * 100), // Convert 0-6 to 0-100%
        voltage: vehicle.voltage_level,
        status: vehicle.voltage_level > 4 ? 'Normal' : vehicle.voltage_level > 2 ? 'Low' : 'Critical',
        charging: false, // Default - could be enhanced with charger status
      } : undefined,
      
      signal: vehicle.gsm_signal !== undefined ? {
        level: vehicle.gsm_signal,
        bars: Math.min(5, Math.max(0, Math.ceil((vehicle.gsm_signal / 4) * 5))), // Convert 0-4 to 0-5 bars
        status: vehicle.gsm_signal > 3 ? 'Excellent' : vehicle.gsm_signal > 2 ? 'Good' : vehicle.gsm_signal > 1 ? 'Fair' : vehicle.gsm_signal > 0 ? 'Poor' : 'No Signal',
        percentage: Math.min(100, Math.max(0, Math.round((vehicle.gsm_signal / 4) * 100))), // FIXED: Cap at 100%
      } : undefined,
      
      device_status: vehicle.device_status || {
        activated: true, // Default
        gps_tracking: true, // Default
        oil_connected: false, // Default to false - use actual data from backend
        engine_running: vehicle.ignition === 'ON',
        satellites: vehicle.satellites || 0,
      },
    };
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and search */}
          <div className="flex items-center space-x-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Vehicle Tracking</h1>
              <p className="text-sm text-gray-500">Real-time monitoring dashboard</p>
            </div>
            
            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <FontAwesomeIcon 
                icon={faSearch} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              />
            </div>
          </div>
          
          {/* Right side - Stats and controls */}
          <div className="flex items-center space-x-6">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm text-gray-600">
                {connectionStatus.status === 'connected' ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Total Count */}
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon icon={faCar} className="text-blue-500" />
              <span className="text-sm font-medium text-gray-700">{filteredVehicles.length} vehicles</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faSync} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clickable Status Filter Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* All Button */}
            <button
              onClick={() => handleStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStatusFilter === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({vehicleStats.total})
            </button>

            {/* Running */}
            <button
              onClick={() => handleStatusFilter('running')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStatusFilter === 'running'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Running ({vehicleStats.running})</span>
            </button>

            {/* Stopped */}
            <button
              onClick={() => handleStatusFilter('stop')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStatusFilter === 'stop'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Stopped ({vehicleStats.stop})</span>
            </button>

            {/* Idle */}
            <button
              onClick={() => handleStatusFilter('idle')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStatusFilter === 'idle'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Idle ({vehicleStats.idle})</span>
            </button>

            {/* Inactive */}
            <button
              onClick={() => handleStatusFilter('inactive')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStatusFilter === 'inactive'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Inactive ({vehicleStats.inactive})</span>
            </button>

            {/* Overspeed */}
            <button
              onClick={() => handleStatusFilter('overspeed')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStatusFilter === 'overspeed'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>Overspeed ({vehicleStats.overspeed})</span>
            </button>

            {/* No Data */}
            <button
              onClick={() => handleStatusFilter('nodata')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStatusFilter === 'nodata'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <span>No Data ({vehicleStats.nodata})</span>
            </button>
          </div>
          
          <div className="text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Main Content - Clean Layout */}
      <div className="flex-1 flex">
        {/* Left Panel - Vehicle List */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-hidden flex flex-col">
          {/* Vehicle Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading && !initialDataLoaded ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading vehicles...</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faCar} className="text-4xl text-gray-300 mb-4" />
                <p className="text-gray-500">No vehicles found</p>
                <p className="text-sm text-gray-400">
                  {searchQuery || activeStatusFilter !== 'all'
                    ? 'Try adjusting your search or filters' 
                    : 'Waiting for vehicle data...'}
                </p>
              </div>
            ) : (
              filteredVehicles.map((vehicle) => (
                <DeviceStatusVehicleCard
                  key={vehicle.id}
                  vehicle={transformToDeviceStatusData(vehicle)}
                  isSelected={selectedVehicle === vehicle.id}
                  onSelect={handleVehicleSelect}
                  onLiveTrack={handleLiveTrack}
                  onControlOil={(vehicleId: string, action: 'cut' | 'connect') => {
                    handleVehicleControl(vehicleId, action).catch(console.error);
                  }}
                  showLiveTrackButton={true}
                  isControlLoading={controlLoadingStates[vehicle.id] || false}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 relative">
          {loadError && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-700 p-4">
              <h3 className="text-xl font-bold mb-2">Map Error</h3>
              <p className="text-center">Could not load Google Maps. Please check your API key and Google Cloud Console configuration.</p>
              <p className="text-center text-sm mt-2 font-mono bg-red-100 p-2 rounded">{loadError.message}</p>
            </div>
          )}
          {!isLoaded && !loadError && (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Google Maps...</p>
              </div>
            </div>
          )}
          {isLoaded && !loadError && (
            <LiveMap 
              vehicles={liveMapVehiclesWithValidCoords}
              selectedVehicle={selectedVehicle || undefined}
              onVehicleSelect={handleVehicleSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}; 