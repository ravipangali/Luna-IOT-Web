import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSearch, faEye } from '@fortawesome/free-solid-svg-icons';
import { Table } from '../../components/ui';
import { vehicleController } from '../../controllers';
import type { Vehicle } from '../../types/models';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

export const VehicleIndex: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const loadVehicles = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await vehicleController.getVehicles(page, 10);
      setVehicles(response.data);
      
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
      console.error('Error loading vehicles:', error);
      toast.error('Error loading vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadVehicles(1);
      return;
    }

    try {
      setLoading(true);
      const response = await vehicleController.searchVehicles(searchQuery);
      setVehicles(response.data || []);
      setCurrentPage(1);
      setTotalPages(1);
    } catch (error) {
      console.error('Error searching vehicles:', error);
      toast.error('Error searching vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicle: Vehicle) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete vehicle "${vehicle.name}" (${vehicle.reg_no})?`,
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
      await vehicleController.deleteVehicle(vehicle.imei);
      toast.success(`Vehicle "${vehicle.name}" deleted successfully!`);
      loadVehicles(currentPage);
      
      Swal.fire({
        title: 'Deleted!',
        text: `Vehicle "${vehicle.name}" has been deleted.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error(error instanceof Error 
        ? error.message || 'Error deleting vehicle. Please try again.'
        : 'Error deleting vehicle. Please try again.');
      
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete the vehicle. Please try again.',
        icon: 'error'
      });
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'reg_no', header: 'Registration', sortable: true },
    { key: 'imei', header: 'IMEI', sortable: true },
    { key: 'vehicle_type', header: 'Type', sortable: true },
    { 
      key: 'odometer', 
      header: 'Odometer (km)', 
      sortable: true,
      render: (vehicle: Vehicle) => vehicle.odometer.toFixed(1)
    },
    { 
      key: 'mileage', 
      header: 'Mileage (km/l)', 
      sortable: true,
      render: (vehicle: Vehicle) => vehicle.mileage.toFixed(1)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (vehicle: Vehicle) => (
        <div className="flex space-x-2">
          <Link
            to={`/admin/vehicles/${vehicle.imei}`}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="View"
          >
            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/vehicles/${vehicle.imei}/edit`}
            className="text-green-600 hover:text-green-800 p-1"
            title="Edit"
          >
            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleDelete(vehicle)}
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
              <h1 className="text-2xl font-bold text-gray-900">Vehicle Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your fleet vehicles</p>
            </div>
            <Link
              to="/admin/vehicles/add"
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
              <span>Add Vehicle</span>
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
                placeholder="Search by name or registration..."
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
                  loadVehicles(1);
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
            data={vehicles}
            columns={columns}
            loading={loading}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: (page) => {
                if (searchQuery) {
                  return;
                }
                loadVehicles(page);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}; 