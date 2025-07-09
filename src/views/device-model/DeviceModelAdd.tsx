import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave } from '@fortawesome/free-solid-svg-icons';
import { deviceModelService } from '../../services/deviceModelService';
import type { DeviceModelFormData } from '../../types/models';
import { toast } from 'react-toastify';

export const DeviceModelAdd: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<DeviceModelFormData>({
    name: '',
  });

  const [errors, setErrors] = useState<Partial<DeviceModelFormData>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<DeviceModelFormData> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Device model name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      const response = await deviceModelService.create(formData);
      
      if (response.success) {
        toast.success('Device model created successfully!');
        navigate('/admin/device-models');
      } else {
        throw new Error(response.message || 'Failed to create device model');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error instanceof Error 
        ? error.message || 'Error creating device model. Please try again.'
        : 'Error creating device model. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof DeviceModelFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/device-models"
              className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Device Model</h1>
              <p className="text-sm text-gray-500 mt-1">Create a new GPS device model</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Device Model Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Model Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter device model name (e.g., GT06N, TK103, etc.)"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                <p className="text-gray-500 text-sm mt-1">
                  A descriptive name for the GPS device model
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Link
                to="/admin/device-models"
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                disabled={loading}
              >
                <FontAwesomeIcon icon={faSave} className="w-4 h-4" />
                <span>{loading ? 'Creating...' : 'Create Device Model'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
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