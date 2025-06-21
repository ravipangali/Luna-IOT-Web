import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSearch, faEye } from '@fortawesome/free-solid-svg-icons';
import { Table } from '../../components/ui';
import { deviceController } from '../../controllers';
import type { Device } from '../../types/models';
import { toast } from 'react-toastify';

export const DeviceIndex: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDevices = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await deviceController.getDevices(page, 10);
      setDevices(response.data || []);
      
      // Handle case where pagination might be undefined (backend compatibility)
      if (response.pagination) {
        setCurrentPage(response.pagination.current_page);
        setTotalPages(response.pagination.total_pages);
      } else {
        // Fallback when pagination is not available
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('Error loading devices. Please try again.');
      // Set empty array on error to ensure UI doesn't break
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadDevices(1);
      return;
    }

    try {
      setLoading(true);
      const response = await deviceController.searchDevices(searchQuery);
      setDevices(response.data || []);
      setCurrentPage(1);
      setTotalPages(1);
    } catch (error) {
      console.error('Error searching devices:', error);
      toast.error('Error searching devices. Please try again.');
      // Set empty array on error to ensure UI doesn't break
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (device: Device) => {
    if (!window.confirm(`Are you sure you want to delete device with IMEI ${device.imei}?`)) {
      return;
    }

    try {
      await deviceController.deleteDevice(device.id!.toString());
      toast.success(`Device with IMEI ${device.imei} deleted successfully.`);
      loadDevices(currentPage);
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Error deleting device. Please try again.');
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const columns = [
    { key: 'imei', header: 'IMEI', sortable: true },
    { key: 'sim_no', header: 'SIM Number', sortable: true },
    { key: 'sim_operator', header: 'Operator', sortable: true },
    { key: 'protocol', header: 'Protocol', sortable: true },
    {
      key: 'actions',
      header: 'Actions',
      render: (device: Device) => (
        <div className="flex space-x-2">
          <Link
            to={`/admin/devices/${device.id}`}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="View"
          >
            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/devices/${device.id}/edit`}
            className="text-green-600 hover:text-green-800 p-1"
            title="Edit"
          >
            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleDelete(device)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete"
          >
            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Device Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your IoT devices</p>
            </div>
            <Link
              to="/admin/devices/add"
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              <span>Add Device</span>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by IMEI or SIM number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <FontAwesomeIcon 
                icon={faSearch} 
                className="w-4 h-4 absolute left-3 top-3 text-gray-400" 
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Search
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  loadDevices(1);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <Table
            data={devices}
            columns={columns}
            loading={loading}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: (page) => {
                if (searchQuery) {
                  return;
                }
                loadDevices(page);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}; 