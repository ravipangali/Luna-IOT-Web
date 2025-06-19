import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';

interface ApiStatus {
  isConnected: boolean;
  lastChecked: string;
  responseTime: number;
  error?: string;
}

export const ApiStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<ApiStatus>({
    isConnected: false,
    lastChecked: 'Never',
    responseTime: 0
  });

  const checkApiStatus = async () => {
    const startTime = Date.now();
    try {
      await apiService.healthCheck();
      const responseTime = Date.now() - startTime;
      
      setStatus({
        isConnected: true,
        lastChecked: new Date().toLocaleTimeString(),
        responseTime,
        error: undefined
      });
    } catch (error) {
      setStatus({
        isConnected: false,
        lastChecked: new Date().toLocaleTimeString(),
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  useEffect(() => {
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-3 border z-50">
      <div className="flex items-center space-x-2 text-sm">
        <div className={`w-3 h-3 rounded-full ${status.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="font-medium">
          API: {status.isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        <div>Last checked: {status.lastChecked}</div>
        {status.isConnected && <div>Response: {status.responseTime}ms</div>}
        {status.error && <div className="text-red-500">Error: {status.error}</div>}
      </div>
      <button 
        onClick={checkApiStatus}
        className="text-xs text-blue-500 hover:text-blue-700 mt-1"
      >
        Refresh
      </button>
    </div>
  );
}; 