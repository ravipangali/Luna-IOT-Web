import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave } from '@fortawesome/free-solid-svg-icons';
import { deviceController } from '../../controllers';
import { deviceModelService } from '../../services/deviceModelService';
import type { DeviceFormData, SimOperator, Protocol, DeviceModel } from '../../types/models';
import { SimOperator as SimOperatorEnum, Protocol as ProtocolEnum } from '../../types/models';
import { toast } from 'react-toastify';

export const DeviceEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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
    const loadData = async () => {
      if (!id) return;
      
      try {
        setLoadingData(true);
        
        // Load device models and device data in parallel
        const [deviceResponse, modelsResponse] = await Promise.all([
          deviceController.getDevice(id),
          deviceModelService.getAll()
        ]);
        
        if (deviceResponse.success && deviceResponse.data) {
          const device = deviceResponse.data;
          setFormData({
            imei: device.imei,
            sim_no: device.sim_no,
            sim_operator: device.sim_operator,
            protocol: device.protocol,
            iccid: device.iccid || '',
            model_id: device.model_id
          });
        }
        
        if (modelsResponse.success && modelsResponse.data) {
          setDeviceModels(modelsResponse.data);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Error loading data. Please try again.');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<DeviceFormData> = {};
    if (!formData.sim_no.trim()) newErrors.sim_no = 'SIM number is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await deviceController.updateDevice(id!, formData);
      toast.success('Device updated successfully!');
      navigate('/admin/devices');
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error(error instanceof Error 
        ? error.message || 'Error updating device. Please try again.'
        : 'Error updating device. Please try again.');
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

  if (loadingData) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading device data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Edit Device</h1>
              <p className="text-sm text-gray-500 mt-1">Update device information</p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  placeholder="Enter IMEI number"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">IMEI cannot be changed as it's a unique device identifier</p>
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
                <span>{loading ? 'Updating...' : 'Update Device'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 