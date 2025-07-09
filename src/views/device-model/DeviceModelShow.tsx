import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faTrash, faCog } from '@fortawesome/free-solid-svg-icons';
import { deviceModelService } from '../../services/deviceModelService';
import type { DeviceModel } from '../../types/models';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

export const DeviceModelShow: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [deviceModel, setDeviceModel] = useState<DeviceModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDeviceModel = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await deviceModelService.getById(parseInt(id), true); // Include devices
        if (response.success && response.data) {
          setDeviceModel(response.data);
        }
      } catch (error) {
        console.error('Error loading device model:', error);
        toast.error('Error loading device model data.');
      } finally {
        setLoading(false);
      }
    };

    loadDeviceModel();
  }, [id]);

  const handleDelete = async () => {
    if (!deviceModel) return;

    // Check if device model has associated devices
    if (deviceModel.devices && deviceModel.devices.length > 0) {
      await Swal.fire({
        title: 'Cannot Delete Device Model',
        text: `This device model is currently being used by ${deviceModel.devices.length} device(s). You cannot delete it until all devices are reassigned or removed.`,
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

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
        
        Swal.fire({
          title: 'Deleted!',
          text: `Device model "${deviceModel.name}" has been deleted.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        navigate('/admin/device-models');
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

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading device model data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!deviceModel) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Device Model Not Found</h2>
              <p className="text-gray-500 mt-2">The requested device model could not be found.</p>
              <Link
                to="/admin/device-models"
                className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
                Back to Device Models
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/device-models"
                className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Device Model Details</h1>
                <p className="text-sm text-gray-500 mt-1">View device model information</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to={`/admin/device-models/${deviceModel.id}/edit`}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                <span>Edit</span>
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Device Model Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <FontAwesomeIcon icon={faCog} className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{deviceModel.name}</h2>
                <p className="text-sm text-gray-600">Device Model Information</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Basic Information</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Model Name</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{deviceModel.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Model ID</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">#{deviceModel.id}</p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Timestamps</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {new Date(deviceModel.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">
                      {new Date(deviceModel.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Associated Devices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Associated Devices ({deviceModel.devices?.length || 0})
            </h2>
            <p className="text-sm text-gray-500 mt-1">Devices currently using this model</p>
          </div>
          
          <div className="p-6">
            {deviceModel.devices && deviceModel.devices.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IMEI
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SIM Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Operator
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Protocol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deviceModel.devices.map((device) => (
                      <tr key={device.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <Link
                            to={`/admin/devices/${device.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {device.imei}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {device.sim_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {device.sim_operator}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {device.protocol}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(device.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <FontAwesomeIcon icon={faCog} className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-lg font-medium">No Associated Devices</p>
                <p className="text-sm mt-1">No devices are currently using this device model.</p>
                <p className="text-sm mt-1">Devices can be assigned to this model when creating or editing them.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 