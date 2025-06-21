import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faTrash, 
  faCar, 
  faCalendarAlt,
  faSearch,
  faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';
import { VehiclePermissionsSelector } from './VehiclePermissionsSelector';
import { vehicleController, userVehicleController } from '../../controllers';
import type { Vehicle, VehicleAssignment, VehiclePermissions } from '../../types/models';
import { toast } from 'react-toastify';

interface VehicleAssignmentSelectorProps {
  assignments: VehicleAssignment[];
  onChange: (assignments: VehicleAssignment[]) => void;
  disabled?: boolean;
}

export const VehicleAssignmentSelector: React.FC<VehicleAssignmentSelectorProps> = ({
  assignments,
  onChange,
  disabled = false
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehicleController.getVehicles(1, 1000); // Get all vehicles
      setVehicles(response.data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableVehicles = () => {
    const assignedVehicleIds = assignments.map(a => a.vehicle_id);
    return vehicles.filter(v => !assignedVehicleIds.includes(v.imei));
  };

  const filteredAvailableVehicles = getAvailableVehicles().filter(vehicle =>
    searchQuery === '' ||
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.reg_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.imei.includes(searchQuery)
  );

  const addVehicleAssignment = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.imei === vehicleId);
    if (!vehicle) return;

    const newAssignment: VehicleAssignment = {
      vehicle_id: vehicleId,
      vehicle_name: vehicle.name,
      permissions: userVehicleController.createDefaultPermissions(),
    };

    onChange([...assignments, newAssignment]);
    setShowAddForm(false);
    setSearchQuery('');
  };

  const removeVehicleAssignment = (index: number) => {
    const newAssignments = assignments.filter((_, i) => i !== index);
    onChange(newAssignments);
  };

  const updateAssignmentPermissions = (index: number, permissions: VehiclePermissions) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], permissions };
    onChange(newAssignments);
  };

  const updateAssignmentField = (index: number, field: keyof VehicleAssignment, value: string) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    onChange(newAssignments);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading vehicles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Vehicle Assignments</h3>
        <div className="text-sm text-gray-500">
          {assignments.length} vehicle{assignments.length !== 1 ? 's' : ''} assigned
        </div>
      </div>

      {/* Existing Assignments */}
      {assignments.length > 0 && (
        <div className="space-y-4">
          {assignments.map((assignment, index) => {
            const vehicle = vehicles.find(v => v.imei === assignment.vehicle_id);
            
            return (
              <div key={assignment.vehicle_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faCar} className="text-blue-600 w-5 h-5" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {vehicle?.name || assignment.vehicle_name || 'Unknown Vehicle'}
                      </h4>
                      <div className="text-sm text-gray-500">
                        {vehicle?.reg_no && <span className="mr-3">Reg: {vehicle.reg_no}</span>}
                        <span>IMEI: {assignment.vehicle_id}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeVehicleAssignment(index)}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    title="Remove vehicle assignment"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                  </button>
                </div>

                {/* Permissions */}
                <VehiclePermissionsSelector
                  permissions={assignment.permissions}
                  onChange={(permissions) => updateAssignmentPermissions(index, permissions)}
                  disabled={disabled}
                  showDescriptions={false}
                />

                {/* Additional Fields */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 mr-1" />
                      Access Expires (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={assignment.expires_at || ''}
                      onChange={(e) => updateAssignmentField(index, 'expires_at', e.target.value)}
                      disabled={disabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={assignment.notes || ''}
                      onChange={(e) => updateAssignmentField(index, 'notes', e.target.value)}
                      disabled={disabled}
                      placeholder="Additional notes about this assignment"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Vehicle Button */}
      {!showAddForm && !disabled && getAvailableVehicles().length > 0 && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
          Add Vehicle Assignment
        </button>
      )}

      {/* Add Vehicle Form */}
      {showAddForm && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search and Select Vehicle
            </label>
            <div className="relative">
              <FontAwesomeIcon 
                icon={faSearch} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, registration, or IMEI..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredAvailableVehicles.length > 0 ? (
              <div className="space-y-2">
                {filteredAvailableVehicles.map((vehicle) => (
                  <button
                    key={vehicle.imei}
                    type="button"
                    onClick={() => addVehicleAssignment(vehicle.imei)}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <FontAwesomeIcon icon={faCar} className="text-gray-400 w-4 h-4" />
                      <div>
                        <div className="font-medium text-gray-900">{vehicle.name}</div>
                        <div className="text-sm text-gray-500">
                          {vehicle.reg_no} • {vehicle.imei}
                        </div>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faPlus} className="text-blue-600 w-4 h-4" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No vehicles match your search' : 'No vehicles available'}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setSearchQuery('');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* No Vehicles Available */}
      {getAvailableVehicles().length === 0 && assignments.length === 0 && (
        <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 w-8 h-8 mb-2" />
          <p className="text-yellow-800 font-medium">No vehicles available</p>
          <p className="text-yellow-600 text-sm mt-1">
            Add vehicles to the system first before assigning them to users.
          </p>
        </div>
      )}

      {/* All Vehicles Assigned */}
      {getAvailableVehicles().length === 0 && assignments.length > 0 && !showAddForm && (
        <div className="text-center py-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            All available vehicles have been assigned to this user.
          </p>
        </div>
      )}
    </div>
  );
}; 