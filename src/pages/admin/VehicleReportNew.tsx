import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faCalendarAlt,
  faCar,
  faTachometerAlt,
  faFileDownload,
  faSearch,
  faRefresh,
  faClock,
  faRoute
} from '@fortawesome/free-solid-svg-icons';
import { vehicleController } from '../../controllers/vehicleController';
import { gpsController } from '../../controllers/gpsController';
import type { Vehicle } from '../../types/models';
import type { GPSData } from '../../controllers/gpsController';
import { showToast, handleApiError } from '../../utils/alerts';

interface DailyStats {
  date: string;
  totalKM: number;
  averageSpeed: number;
  maxSpeed: number;
}

interface ReportStats {
  totalKM: number;
  totalTime: number;
  averageSpeed: number;
  maxSpeed: number;
  totalIdleTime: number;
  totalRunningTime: number;
  totalOverspeedTime: number;
  totalStopTime: number;
  dailyStats: DailyStats[];
}

export const VehicleReportNew: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reportData, setReportData] = useState<GPSData[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [lastDataTimestamp, setLastDataTimestamp] = useState<string>('');

  useEffect(() => {
    loadVehicles();
    setDefaultDates();
  }, []);

  const setDefaultDates = () => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    setToDate(today.toISOString().split('T')[0]);
    setFromDate(lastWeek.toISOString().split('T')[0]);
  };

  const loadVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await vehicleController.getVehicles();
      if (response.success && response.data) {
        setVehicles(response.data);
        if (response.data.length > 0) {
          setSelectedVehicle(response.data[0].imei);
        }
      }
    } catch (error) {
      handleApiError(error, 'Failed to load vehicles');
    } finally {
      setLoadingVehicles(false);
    }
  };

  const generateReport = async () => {
    if (!selectedVehicle) {
      showToast('Please select a vehicle', 'error');
      return;
    }

    if (!fromDate || !toDate) {
      showToast('Please select both dates', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Generating report for:', {
        imei: selectedVehicle,
        fromDate,
        toDate
      });
      
      const response = await gpsController.getGPSDataByIMEI(selectedVehicle, 1, 10000);
      console.log('📡 API Response:', response);

      // Check if the response structure is correct
      if (response && (response.success === true || Array.isArray(response.data))) {
        // Handle both new format (response.data) and old format (response)
        let allData: GPSData[] = [];
        
        if (response.data && Array.isArray(response.data)) {
          allData = response.data;
        } else if (Array.isArray(response)) {
          allData = response as GPSData[];
        } else {
          console.error('❌ Unexpected response structure:', response);
          throw new Error('Invalid API response structure');
        }

        console.log('📊 Total GPS data points:', allData.length);
        
        const filteredData = filterDataByDateRange(allData, fromDate, toDate);
        console.log('📊 Filtered GPS data points:', filteredData.length);
        
        setReportData(filteredData);
        
        if (filteredData.length > 0) {
          calculateEnhancedStats(filteredData);
          setLastDataTimestamp(filteredData[0]?.timestamp || '');
          showToast(`Report generated successfully with ${filteredData.length} data points`, 'success');
        } else {
          setStats(null);
          showToast('No data found for the selected date range', 'warning');
        }
      } else {
        console.error('❌ API Error Response:', response);
        // Handle error responses that may have different structures
        const errorResponse = response as { error?: string; message?: string };
        const errorMsg = errorResponse?.error || errorResponse?.message || 'Unknown error occurred';
        showToast(`Failed to generate report: ${errorMsg}`, 'error');
      }
    } catch (error) {
      console.error('💥 Report generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Failed to generate report: ${errorMessage}`, 'error');
      handleApiError(error, 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const filterDataByDateRange = (data: GPSData[], from: string, to: string): GPSData[] => {
    const fromDateTime = new Date(from + 'T00:00:00.000Z');
    const toDateTime = new Date(to + 'T23:59:59.999Z');

    return data.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= fromDateTime && itemDate <= toDateTime;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const calculateEnhancedStats = (data: GPSData[]) => {
    if (!data.length) {
      setStats(null);
      return;
    }

    let totalKM = 0;
    let maxSpeed = 0;
    let totalSpeed = 0;
    let speedCount = 0;

    // Simple daily stats without complex time calculations
    const dailyDataMap = new Map<string, {
      totalKM: number;
      maxSpeed: number;
      totalSpeed: number;
      speedCount: number;
    }>();

    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const dateKey = new Date(current.timestamp).toISOString().split('T')[0];

      if (!dailyDataMap.has(dateKey)) {
        dailyDataMap.set(dateKey, {
          totalKM: 0,
          maxSpeed: 0,
          totalSpeed: 0,
          speedCount: 0
        });
      }

      const dailyData = dailyDataMap.get(dateKey)!;

      // Process speed data
      if (current.speed && current.speed >= 0) {
        totalSpeed += current.speed;
        speedCount++;
        maxSpeed = Math.max(maxSpeed, current.speed);

        dailyData.totalSpeed += current.speed;
        dailyData.speedCount++;
        dailyData.maxSpeed = Math.max(dailyData.maxSpeed, current.speed);
      }

      // Calculate basic distance (simplified)
      if (i > 0) {
        const previous = data[i - 1];
        if (previous.latitude && previous.longitude && current.latitude && current.longitude) {
          const distance = calculateDistance(
            previous.latitude, previous.longitude,
            current.latitude, current.longitude
          );
          totalKM += distance;
          dailyData.totalKM += distance;
        }
      }
    }

    const dailyStats: DailyStats[] = Array.from(dailyDataMap.entries()).map(([date, data]) => ({
      date,
      totalKM: Math.round(data.totalKM * 100) / 100,
      averageSpeed: data.speedCount > 0 ? Math.round((data.totalSpeed / data.speedCount) * 100) / 100 : 0,
      maxSpeed: Math.round(data.maxSpeed)
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate simple time range
    const firstTimestamp = new Date(data[data.length - 1].timestamp);
    const lastTimestamp = new Date(data[0].timestamp);
    const totalTimeHours = (lastTimestamp.getTime() - firstTimestamp.getTime()) / (1000 * 60 * 60);



    setStats({
      totalKM: Math.round(totalKM * 100) / 100,
      totalTime: Math.round(totalTimeHours * 100) / 100,
      averageSpeed: speedCount > 0 ? Math.round((totalSpeed / speedCount) * 100) / 100 : 0,
      maxSpeed: Math.round(maxSpeed),
      totalIdleTime: 0,        // Simplified - set to 0 for now
      totalRunningTime: Math.round(totalTimeHours * 100) / 100,
      totalOverspeedTime: 0,   // Simplified - set to 0 for now  
      totalStopTime: 0,        // Simplified - set to 0 for now
      dailyStats
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} Min`;
    } else if (hours < 24) {
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${h} Hrs ${m} Min`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      const minutes = Math.round(((hours % 24) - remainingHours) * 60);
      return `${days} Days, ${remainingHours} Hours, ${minutes} Minutes`;
    }
  };

  const downloadCSV = () => {
    if (!reportData.length || !stats) return;

    const headers = ['Date', 'Max KM', 'Average Speed', 'Max Speed'];
    const csvContent = [
      `Vehicle Report - ${selectedVehicleData?.reg_no}`,
      `Period: ${fromDate} to ${toDate}`,
      `Total Distance: ${stats.totalKM} KM`,
      `Total Time: ${formatTime(stats.totalTime)}`,
      '',
      headers.join(','),
      ...stats.dailyStats.map(day => [
        day.date,
        day.totalKM,
        day.averageSpeed,
        day.maxSpeed
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vehicle_report_${selectedVehicle}_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Report downloaded successfully', 'success');
  };

  const selectedVehicleData = vehicles.find(v => v.imei === selectedVehicle);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FontAwesomeIcon icon={faChartLine} className="mr-3 text-blue-600" />
                Vehicle Report
              </h1>
              <p className="text-gray-600 mt-1">Comprehensive vehicle tracking analytics</p>
            </div>
            {stats && (
              <button
                onClick={downloadCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faFileDownload} className="w-4 h-4" />
                <span>Download Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faCar} className="mr-2" />
                Vehicle
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingVehicles}
              >
                {loadingVehicles ? (
                  <option>Loading vehicles...</option>
                ) : (
                  <>
                    <option value="">Select Vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.imei}>
                        {vehicle.reg_no} - {vehicle.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                max={new Date().toISOString().split('T')[0]}
                min={fromDate}
              />
            </div>

            <div>
              <button
                onClick={generateReport}
                disabled={loading || !selectedVehicle}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <FontAwesomeIcon icon={faRefresh} className="w-4 h-4 animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
                )}
                <span>{loading ? 'Generating...' : 'Get Report'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Vehicle Info & Stats */}
        {selectedVehicleData && stats && (
          <>
            {/* Vehicle Info Card */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-red-500 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faCar} className="text-white text-2xl" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{selectedVehicleData.reg_no}</h3>
                  <p className="text-gray-600">{selectedVehicleData.name}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-500">
                      <strong>LAST DATA:</strong> {lastDataTimestamp ? formatDateTime(lastDataTimestamp) : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>SPEED:</strong> 0.00 KM/H
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>TODAY KM:</strong> {stats.totalKM} KM
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 text-2xl font-bold">{selectedVehicleData.imei}</div>
                  <p className="text-sm text-gray-500 mt-2">
                    Lalitpur, Mahalaxmi Municipality, Lalitpur, Bagmati Province, 44700, Nepal
                  </p>
                </div>
              </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                <FontAwesomeIcon icon={faRoute} className="text-red-500 text-2xl mb-3" />
                <div className="text-2xl font-bold text-gray-900">{stats.totalKM} KM</div>
                <div className="text-sm text-gray-600">Total KM</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                <FontAwesomeIcon icon={faClock} className="text-green-500 text-2xl mb-3" />
                <div className="text-2xl font-bold text-gray-900">{formatTime(stats.totalTime)}</div>
                <div className="text-sm text-gray-600">Total Time</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                <FontAwesomeIcon icon={faTachometerAlt} className="text-purple-500 text-2xl mb-3" />
                <div className="text-2xl font-bold text-gray-900">{stats.averageSpeed} KM/H</div>
                <div className="text-sm text-gray-600">Average Speed</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                <FontAwesomeIcon icon={faTachometerAlt} className="text-orange-500 text-2xl mb-3" />
                <div className="text-2xl font-bold text-gray-900">{stats.maxSpeed} KM/H</div>
                <div className="text-sm text-gray-600">Max Speed</div>
              </div>
            </div>

            {/* Time Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">Total Idle Time</div>
                  <div className="text-xl text-blue-600 mt-1">{formatTime(stats.totalIdleTime)}</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">Total Running Time</div>
                  <div className="text-xl text-green-600 mt-1">{formatTime(stats.totalRunningTime)}</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">Total Overspeed Time</div>
                  <div className="text-xl text-red-600 mt-1">{formatTime(stats.totalOverspeedTime)}</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">Total Stop Time</div>
                  <div className="text-xl text-gray-600 mt-1">{formatTime(stats.totalStopTime)}</div>
                </div>
              </div>
            </div>

            {/* Daily Report Table */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Report on Details</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-red-500 text-white text-xs rounded">PDF</button>
                  <button className="px-3 py-1 bg-green-500 text-white text-xs rounded">Excel</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">S.N.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max KM</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Average Speed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Speed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.dailyStats.map((day, index) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.totalKM} KM</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.averageSpeed} KM/H</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.maxSpeed} KM/H</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Speed on Chart</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500">Speed Chart - Coming Soon</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily KM Representation on Chart</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500">Distance Chart - Coming Soon</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* No Data Message */}
        {!loading && !stats && selectedVehicle && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <FontAwesomeIcon icon={faChartLine} className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
            <p className="text-gray-600">
              No GPS data found for the selected vehicle in the specified date range.
              Try selecting a different date range or vehicle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 