import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSearch, faEye, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { Table } from '../../components/ui';
import { deviceModelService } from '../../services/deviceModelService';
import type { DeviceModel } from '../../types/models';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { apiService } from '../../services/apiService';

export const DeviceModelIndex: React.FC = () => {
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDeviceModels = async () => {
    try {
      setLoading(true);
      const response = await deviceModelService.getAll();
      
      if (response.success && response.data) {
        setDeviceModels(response.data);
        // For now, we'll set pagination to 1 page since the API doesn't return pagination
        setCurrentPage(1);
        setTotalPages(1);
      } else {
        console.error('Error loading device models:', response.message);
        toast.error('Error loading device models. Please try again.');
        setDeviceModels([]);
      }
    } catch (error) {
      console.error('Error loading device models:', error);
      toast.error('Error loading device models. Please try again.');
      setDeviceModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadDeviceModels();
      return;
    }

    try {
      setLoading(true);
      const response = await deviceModelService.getAll();
      
      if (response.success && response.data) {
        // Filter results based on search query
        const filteredData = response.data.filter(model =>
          model.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setDeviceModels(filteredData);
        setCurrentPage(1);
        setTotalPages(1);
      } else {
        console.error('Error searching device models:', response.message);
        toast.error('Error searching device models. Please try again.');
        setDeviceModels([]);
      }
    } catch (error) {
      console.error('Error searching device models:', error);
      toast.error('Error searching device models. Please try again.');
      setDeviceModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deviceModel: DeviceModel) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete device model "${deviceModel.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await deviceModelService.delete(deviceModel.id);
      
      if (response.success) {
        toast.success(`Device model "${deviceModel.name}" deleted successfully!`);
        loadDeviceModels();
        
        Swal.fire({
          title: 'Deleted!',
          text: `Device model "${deviceModel.name}" has been deleted.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        throw new Error(response.message || 'Failed to delete device model');
      }
    } catch (error) {
      console.error('Error deleting device model:', error);
      toast.error(error instanceof Error 
        ? error.message || 'Error deleting device model. Please try again.'
        : 'Error deleting device model. Please try again.');
      
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete the device model. Please try again.',
        icon: 'error'
      });
    }
  };

  const handleForceDeleteDeviceModels = async () => {
    try {
      const result = await Swal.fire({
        title: 'Force Delete Device Model Backup Data?',
        text: 'This will permanently delete all soft-deleted device models from the database. This action cannot be undone!',
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
        const response = await apiService.forceDeleteDeviceModelsBackupData();
        
        await Swal.fire({
          title: 'Success!',
          text: `${response.deleted_count} device model records have been permanently deleted.`,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error force deleting device model backup data:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete device model backup data. Please try again.',
        icon: 'error'
      });
    }
  };

  useEffect(() => {
    loadDeviceModels();
  }, []);

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { 
      key: 'created_at', 
      header: 'Created', 
      sortable: true,
      render: (deviceModel: DeviceModel) => (
        <span>{new Date(deviceModel.created_at).toLocaleDateString()}</span>
      )
    },
    { 
      key: 'updated_at', 
      header: 'Updated', 
      sortable: true,
      render: (deviceModel: DeviceModel) => (
        <span>{new Date(deviceModel.updated_at).toLocaleDateString()}</span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (deviceModel: DeviceModel) => (
        <div className="flex space-x-2">
          <Link
            to={`/admin/device-models/${deviceModel.id}`}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="View"
          >
            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/device-models/${deviceModel.id}/edit`}
            className="text-green-600 hover:text-green-800 p-1"
            title="Edit"
          >
            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleDelete(deviceModel)}
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
              <h1 className="text-2xl font-bold text-gray-900">Device Model Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your GPS device models</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleForceDeleteDeviceModels}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Force Delete Device Model Backup Data"
              >
                <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4" />
                <span>Force Delete Device Models</span>
              </button>
              <Link
                to="/admin/device-models/add"
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                <span>Add Device Model</span>
              </Link>
            </div>
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
                placeholder="Search device models by name..."
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
                  loadDeviceModels();
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
            data={deviceModels}
            columns={columns}
            loading={loading}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: (_page) => {
                if (searchQuery) {
                  return;
                }
                loadDeviceModels();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}; 