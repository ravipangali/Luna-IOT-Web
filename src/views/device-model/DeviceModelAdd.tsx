import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { deviceModelService } from '../../services/deviceModelService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import type { DeviceModelFormData } from '../../types/models';

const DeviceModelAdd: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<DeviceModelFormData>({
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Device model name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await deviceModelService.create(formData);
      
      if (response.success) {
        navigate('/admin/device-models');
      } else {
        setError(response.message || 'Failed to create device model');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create device model');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate('/admin/device-models')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Device Model</h1>
            <p className="text-gray-600">Create a new GPS device model</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Device Model Name *
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter device model name (e.g., GT06N, TK103, etc.)"
                required
                className="w-full"
              />
              <p className="mt-1 text-sm text-gray-500">
                A descriptive name for the GPS device model
              </p>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/device-models')}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !formData.name.trim()}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Device Model'}
              </Button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Device Model Information</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Device models help categorize and organize GPS tracking devices</li>
            <li>• Use descriptive names like "GT06N Advanced" or "TK103 Basic"</li>
            <li>• Device models can be assigned to devices for better management</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DeviceModelAdd; 