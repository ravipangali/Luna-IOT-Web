import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave } from '@fortawesome/free-solid-svg-icons';
import { vehicleController } from '../../controllers';
import type { VehicleFormData, VehicleType } from '../../types/models';
import { VehicleType as VehicleTypeEnum } from '../../types/models';
import { toast } from 'react-toastify';

export const VehicleAdd: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<VehicleFormData>({
    imei: '',
    reg_no: '',
    name: '',
    odometer: 0,
    mileage: 0,
    min_fuel: 0,
    overspeed: 60,
    vehicle_type: VehicleTypeEnum.CAR
  });

  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<Record<keyof VehicleFormData, string>> = {};
    
    // IMEI validation
    if (!formData.imei.trim()) {
      newErrors.imei = 'IMEI is required';
    } else if (formData.imei.length !== 16) {
      newErrors.imei = 'IMEI must be exactly 16 digits';
    } else if (!/^\d{16}$/.test(formData.imei)) {
      newErrors.imei = 'IMEI must contain only digits';
    }
    
    if (!formData.reg_no.trim()) newErrors.reg_no = 'Registration number is required';
    if (!formData.name.trim()) newErrors.name = 'Vehicle name is required';
    if (formData.odometer < 0) newErrors.odometer = 'Odometer cannot be negative';
    if (formData.mileage <= 0) newErrors.mileage = 'Mileage must be greater than 0';
    if (formData.min_fuel < 0) newErrors.min_fuel = 'Minimum fuel cannot be negative';
    if (formData.overspeed <= 0) newErrors.overspeed = 'Overspeed limit must be greater than 0';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      await vehicleController.createVehicle(formData);
      
      // Show success message and navigate
      toast.success('Vehicle created successfully!');
      navigate('/admin/vehicles');
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      
      // Parse backend error messages
      let errorMessage = 'Error creating vehicle. Please try again.';
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check for specific errors
      if (errorMessage.includes('Device with this IMEI does not exist')) {
        setErrors({ imei: 'Device with this IMEI does not exist. Please register the device first.' });
        toast.error('Device with this IMEI does not exist. Please register the device first.');
      } else if (errorMessage.includes('registration number already exists')) {
        setErrors({ reg_no: 'A vehicle with this registration number already exists.' });
        toast.error('A vehicle with this registration number already exists.');
      } else if (errorMessage.includes('already assigned to another vehicle')) {
        setErrors({ imei: 'This device is already assigned to another vehicle.' });
        toast.error('This device is already assigned to another vehicle.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof VehicleFormData, value: string | number | VehicleType) => {
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
              to="/admin/vehicles"
              className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Vehicle</h1>
              <p className="text-sm text-gray-500 mt-1">Create a new vehicle record</p>
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
                  placeholder="Enter 16-digit IMEI number"
                  maxLength={16}
                />
                {errors.imei && <p className="text-red-500 text-sm mt-1">{errors.imei}</p>}
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.reg_no}
                  onChange={(e) => handleChange('reg_no', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter registration number"
                />
                {errors.reg_no && <p className="text-red-500 text-sm mt-1">{errors.reg_no}</p>}
              </div>

              {/* Vehicle Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter vehicle name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => handleChange('vehicle_type', e.target.value as VehicleType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value={VehicleTypeEnum.BIKE}>Bike</option>
                  <option value={VehicleTypeEnum.CAR}>Car</option>
                  <option value={VehicleTypeEnum.TRUCK}>Truck</option>
                  <option value={VehicleTypeEnum.BUS}>Bus</option>
                  <option value={VehicleTypeEnum.SCHOOL_BUS}>School Bus</option>
                </select>
              </div>

              {/* Numeric Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Odometer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Odometer (km) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.odometer}
                    onChange={(e) => handleChange('odometer', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0.0"
                  />
                  {errors.odometer && <p className="text-red-500 text-sm mt-1">{errors.odometer}</p>}
                </div>

                {/* Mileage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mileage (km/l) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.mileage}
                    onChange={(e) => handleChange('mileage', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0.0"
                  />
                  {errors.mileage && <p className="text-red-500 text-sm mt-1">{errors.mileage}</p>}
                </div>

                {/* Minimum Fuel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Fuel (L) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.min_fuel}
                    onChange={(e) => handleChange('min_fuel', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="0.0"
                  />
                  {errors.min_fuel && <p className="text-red-500 text-sm mt-1">{errors.min_fuel}</p>}
                </div>

                {/* Overspeed Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overspeed Limit (km/h) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.overspeed}
                    onChange={(e) => handleChange('overspeed', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="80"
                  />
                  {errors.overspeed && <p className="text-red-500 text-sm mt-1">{errors.overspeed}</p>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Link
                to="/admin/vehicles"
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
                <span>{loading ? 'Creating...' : 'Create Vehicle'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 