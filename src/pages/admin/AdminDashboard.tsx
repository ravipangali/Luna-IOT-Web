import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faCar,
  faMobile,
  faChartLine,
  faPlus,
  faCog,
  faBell
} from '@fortawesome/free-solid-svg-icons';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Luna IoT Management System</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Users</p>
                <p className="text-xl font-bold text-gray-900 mt-1">156</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faUsers} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vehicles</p>
                <p className="text-xl font-bold text-gray-900 mt-1">89</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faCar} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Devices</p>
                <p className="text-xl font-bold text-gray-900 mt-1">234</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faMobile} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
                <p className="text-xl font-bold text-gray-900 mt-1">24/7</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">New user registered</span>
                  </div>
                  <span className="text-xs text-gray-400">2h</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Vehicle added</span>
                  </div>
                  <span className="text-xs text-gray-400">4h</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Device updated</span>
                  </div>
                  <span className="text-xs text-gray-400">6h</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-sm text-gray-700">System backup</span>
                  </div>
                  <span className="text-xs text-gray-400">1d</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
            </div>
            <div className="p-4 space-y-3">
              <button className="w-full flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 text-green-600 mr-3" />
                <span className="text-sm font-medium text-green-700 group-hover:text-green-800">Add User</span>
              </button>
              <button className="w-full flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 text-green-600 mr-3" />
                <span className="text-sm font-medium text-green-700 group-hover:text-green-800">Add Vehicle</span>
              </button>
              <button className="w-full flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4 text-green-600 mr-3" />
                <span className="text-sm font-medium text-green-700 group-hover:text-green-800">Add Device</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 