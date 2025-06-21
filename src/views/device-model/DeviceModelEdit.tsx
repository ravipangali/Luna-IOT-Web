import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { deviceModelService } from '../../services/deviceModelService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import type { DeviceModel, DeviceModelFormData } from '../../types/models';

const DeviceModelEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<DeviceModelFormData>({
    name: '',
  });

  const [errors, setErrors] = useState<Partial<DeviceModelFormData>>({});

  useEffect(() => {
    if (id) {
      fetchDeviceModel(parseInt(id));
    }
  }, [id]);

  const fetchDeviceModel = async (deviceModelId: number) => {
    try {
      setLoadingData(true);
      setError(null);
      const response = await deviceModelService.getById(deviceModelId);
      
      if (response.success && response.data) {
        setFormData({
          name: response.data.name,
        });
      } else {
        setError(response.message || 'Failed to fetch device model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch device model');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<DeviceModelFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Device model name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Device model name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Device model name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!id) {
      setError('Invalid device model ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await deviceModelService.update(parseInt(id), {
        name: formData.name.trim(),
      });
      
      if (response.success) {
        navigate('/admin/device-models');
      } else {
        setError(response.message || 'Failed to update device model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update device model');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DeviceModelFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (loadingData) {
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/device-models')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Device Models</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Device Model</h1>
            <p className="text-gray-600">Update device model information</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Device Model Name *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter device model name (e.g., GT06N, ST901, etc.)"
                error={errors.name}
                className="w-full"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Device Model Information</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Device models help categorize GPS tracking devices</li>
                <li>• Use clear, descriptive names (e.g., "GT06N", "ST901A", "Concox GT06")</li>
                <li>• This helps in device management and troubleshooting</li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/device-models')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Updating...' : 'Update Device Model'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeviceModelEdit; 