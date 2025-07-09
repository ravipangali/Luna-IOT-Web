import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faCar,
  faWifi,
  faRoad,
  faPlus,
  faCog,
  faBell,
  faFileInvoice,
  faFileInvoiceDollar,
  faWallet,
  faCommentSms,
  faTrashCan,
  faDatabase
} from '@fortawesome/free-solid-svg-icons';
import { apiService } from '../../services/apiService';
import { type DashboardStats, type Setting } from '../../types/models';
import Swal from 'sweetalert2';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        setLoadingSettings(true);
        const data = await apiService.getSettings();
        setSettings(data);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchStats();
    fetchSettings();
  }, []);

  const handleForceDeleteAll = async () => {
    try {
      const result = await Swal.fire({
        title: 'Force Delete All Backup Data?',
        text: 'This will permanently delete all soft-deleted records from the database. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete permanently!',
        cancelButtonText: 'Cancel',
        input: 'text',
        inputPlaceholder: 'Type "DELETE" to confirm',
        inputValidator: (value) => {
          if (value !== 'DELETE') {
            return 'You must type "DELETE" to confirm!'
          }
        }
      });

      if (result.isConfirmed) {
        const response = await apiService.forceDeleteAllBackupData();
        
        // Refresh stats after deletion
        const data = await apiService.getDashboardStats();
        setStats(data);
        
        await Swal.fire({
          title: 'Success!',
          text: `${response.deleted_count} records have been permanently deleted.`,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error force deleting backup data:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete backup data. Please try again.',
        icon: 'error'
      });
    }
  };

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
              <button 
                onClick={handleForceDeleteAll}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Force Delete All Backup Data"
              >
                <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4" />
                <span>Force Delete</span>
              </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Users</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{loading ? '...' : stats?.total_users}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faUsers} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Vehicles</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{loading ? '...' : stats?.total_vehicles}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faCar} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Hits Today</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{loading ? '...' : stats?.total_hits_today}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faWifi} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total KM Today</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{loading ? '...' : stats?.total_km_today.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faRoad} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Deleted Backup Data</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{loading ? '...' : stats?.deleted_backup_data}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <FontAwesomeIcon icon={faDatabase} className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due Generated Today</p>
                <p className="text-xl font-bold text-gray-900 mt-1">89</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faFileInvoice} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due Paid Today</p>
                <p className="text-xl font-bold text-gray-900 mt-1">89</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faFileInvoiceDollar} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Balance</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{loadingSettings ? '...' : settings?.my_pay_balance.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faWallet} className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Sms Available</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{loading ? '...' : stats?.total_sms_available}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FontAwesomeIcon icon={faCommentSms} className="w-5 h-5 text-green-600" />
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