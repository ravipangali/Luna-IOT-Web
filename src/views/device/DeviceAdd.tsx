import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave } from '@fortawesome/free-solid-svg-icons';
import { deviceController } from '../../controllers';
import { deviceModelService } from '../../services/deviceModelService';
import type { DeviceFormData, SimOperator, Protocol, DeviceModel } from '../../types/models';
import { SimOperator as SimOperatorEnum, Protocol as ProtocolEnum } from '../../types/models';
import { toast } from 'react-toastify';

export const DeviceAdd: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  
  const [formData, setFormData] = useState<DeviceFormData>({
    imei: '',
    sim_no: '',
    sim_operator: SimOperatorEnum.NTC,
    protocol: ProtocolEnum.GT06,
    iccid: '',
    model_id: undefined
  });

  const [errors, setErrors] = useState<Partial<DeviceFormData>>({});

  useEffect(() => {
    fetchDeviceModels();
  }, []);

  const fetchDeviceModels = async () => {
    try {
      const response = await deviceModelService.getAll();
      if (response.success && response.data) {
        setDeviceModels(response.data);
      }
    } catch (error) {
      console.error('Error fetching device models:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<DeviceFormData> = {};
    if (!formData.imei.trim()) {
      newErrors.imei = 'IMEI is required';
    } else if (formData.imei.trim().length !== 16) {
      newErrors.imei = 'IMEI must be exactly 16 digits';
    } else if (!/^\d+$/.test(formData.imei.trim())) {
      newErrors.imei = 'IMEI must contain only digits';
    }
    
    if (!formData.sim_no.trim()) newErrors.sim_no = 'SIM number is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await deviceController.createDevice(formData);
      toast.success('Device created successfully!');
      navigate('/admin/devices');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error instanceof Error 
        ? error.message || 'Error creating device. Please try again.'
        : 'Error creating device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof DeviceFormData, value: string | number | SimOperator | Protocol | undefined) => {
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
              to="/admin/devices"
              className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Device</h1>
              <p className="text-sm text-gray-500 mt-1">Create a new IoT device</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* IMEI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IMEI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.imei}
                  onChange={(e) => handleChange('imei', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter IMEI number"
                />
                {errors.imei && <p className="text-red-500 text-sm mt-1">{errors.imei}</p>}
              </div>

              {/* SIM Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SIM Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.sim_no}
                  onChange={(e) => handleChange('sim_no', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter SIM number"
                />
                {errors.sim_no && <p className="text-red-500 text-sm mt-1">{errors.sim_no}</p>}
              </div>

              {/* SIM Operator */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SIM Operator
                </label>
                <select
                  value={formData.sim_operator}
                  onChange={(e) => handleChange('sim_operator', e.target.value as SimOperator)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={SimOperatorEnum.NTC}>NTC</option>
                  <option value={SimOperatorEnum.NCELL}>Ncell</option>
                </select>
              </div>

              {/* Protocol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Protocol
                </label>
                <select
                  value={formData.protocol}
                  onChange={(e) => handleChange('protocol', e.target.value as Protocol)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={ProtocolEnum.GT06}>GT06</option>
                </select>
              </div>

              {/* ICCID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ICCID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.iccid || ''}
                  onChange={(e) => handleChange('iccid', e.target.value)}
                  placeholder="Enter ICCID number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Device Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Model (Optional)
                </label>
                <select
                  value={formData.model_id || ''}
                  onChange={(e) => handleChange('model_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select device model (optional)</option>
                  {deviceModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Link
                to="/admin/devices"
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
                <span>{loading ? 'Creating...' : 'Create Device'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 