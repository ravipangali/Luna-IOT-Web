import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, AlertCircle } from 'lucide-react';
import { deviceModelService } from '../../services/deviceModelService';
import { Button } from '../../components/ui/Button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Modal } from '../../components/ui/Modal';
import type { DeviceModel } from '../../types/models';

const DeviceModelShow: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [deviceModel, setDeviceModel] = useState<DeviceModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDeviceModel(parseInt(id));
    }
  }, [id]);

  const fetchDeviceModel = async (deviceModelId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await deviceModelService.getById(deviceModelId, true); // Include devices
      
      if (response.success && response.data) {
        setDeviceModel(response.data);
      } else {
        setError(response.message || 'Failed to fetch device model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch device model');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deviceModel) return;

    try {
      setDeleting(true);
      const response = await deviceModelService.delete(deviceModel.id);
      
      if (response.success) {
        navigate('/admin/device-models');
      } else {
        setError(response.message || 'Failed to delete device model');
        setDeleteDialog(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete device model');
      setDeleteDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error && !deviceModel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/device-models')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Device Models</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!deviceModel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Device Model Not Found</h2>
          <p className="text-gray-600 mb-6">The requested device model could not be found.</p>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/device-models')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Device Models</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/device-models')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Device Models</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Device Model Details</h1>
              <p className="text-gray-600">View device model information</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/device-models/${deviceModel.id}/edit`)}
              className="flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(true)}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Device Model Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Model Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{deviceModel.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Model ID</dt>
              <dd className="mt-1 text-sm text-gray-900">#{deviceModel.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(deviceModel.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(deviceModel.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Associated Devices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Associated Devices ({deviceModel.devices?.length || 0})
          </h2>
          
          {deviceModel.devices && deviceModel.devices.length > 0 ? (
            <div className="overflow-hidden">
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
                        <button
                          onClick={() => navigate(`/admin/devices/${device.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {device.imei}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {device.sim_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {device.sim_operator}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {device.protocol}
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
            <div className="text-center py-8 text-gray-500">
              <p>No devices are currently using this device model.</p>
              <p className="text-sm mt-1">Devices can be assigned to this model when creating or editing them.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        title="Delete Device Model"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the device model "{deviceModel.name}"?
            {deviceModel.devices && deviceModel.devices.length > 0 && (
              <span className="block mt-2 text-red-600 font-medium">
                Warning: This device model is currently being used by {deviceModel.devices.length} device(s). 
                You cannot delete it until all devices are reassigned or removed.
              </span>
            )}
          </p>
          <div className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              disabled={deleting || (deviceModel.devices && deviceModel.devices.length > 0)}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Device Model'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeviceModelShow; 