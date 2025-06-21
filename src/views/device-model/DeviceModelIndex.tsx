import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';
import { deviceModelService } from '../../services/deviceModelService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Modal } from '../../components/ui/Modal';
import type { DeviceModel } from '../../types/models';

const DeviceModelIndex: React.FC = () => {
  const navigate = useNavigate();
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    deviceModel: DeviceModel | null;
  }>({ open: false, deviceModel: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDeviceModels();
  }, []);

  const fetchDeviceModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await deviceModelService.getAll();
      
      if (response.success && response.data) {
        setDeviceModels(response.data);
      } else {
        setError(response.message || 'Failed to fetch device models');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch device models');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.deviceModel) return;

    try {
      setDeleting(true);
      const response = await deviceModelService.delete(deleteDialog.deviceModel.id);
      
      if (response.success) {
        await fetchDeviceModels(); // Refresh the list
        setDeleteDialog({ open: false, deviceModel: null });
      } else {
        setError(response.message || 'Failed to delete device model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete device model');
    } finally {
      setDeleting(false);
    }
  };

  const filteredDeviceModels = deviceModels.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Device Models</h1>
            <p className="text-gray-600">Manage GPS device models</p>
          </div>
          <Button
            onClick={() => navigate('/admin/device-models/add')}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Device Model</span>
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search device models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Device Models Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeviceModels.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    {searchTerm ? 'No device models found matching your search.' : 'No device models found.'}
                  </td>
                </tr>
              ) : (
                filteredDeviceModels.map((model) => (
                  <tr key={model.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {model.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(model.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(model.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/device-models/${model.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/device-models/${model.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, deviceModel: model })}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Statistics */}
        <div className="text-sm text-gray-600">
          Showing {filteredDeviceModels.length} of {deviceModels.length} device models
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, deviceModel: null })}
        title="Delete Device Model"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the device model "{deleteDialog.deviceModel?.name}"? 
            This action cannot be undone.
          </p>
          <div className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, deviceModel: null })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeviceModelIndex; 