import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserShield, 
  faMapMarkedAlt, 
  faHistory, 
  faFileAlt, 
  faEdit, 
  faBell, 
  faShare 
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { VehiclePermissions } from '../../types/models';

interface VehiclePermissionsSelectorProps {
  permissions: VehiclePermissions;
  onChange: (permissions: VehiclePermissions) => void;
  disabled?: boolean;
  showDescriptions?: boolean;
}

interface PermissionConfig {
  key: keyof VehiclePermissions;
  label: string;
  description: string;
  icon: IconDefinition;
  color: string;
}

const permissionConfigs: PermissionConfig[] = [
  {
    key: 'all_access',
    label: 'All Access',
    description: 'Full access to all vehicle features and data (overrides other permissions)',
    icon: faUserShield,
    color: 'text-purple-600'
  },
  {
    key: 'live_tracking',
    label: 'Live Tracking',
    description: 'View real-time location and status of the vehicle',
    icon: faMapMarkedAlt,
    color: 'text-green-600'
  },
  {
    key: 'history',
    label: 'History',
    description: 'Access historical tracking data and route history',
    icon: faHistory,
    color: 'text-blue-600'
  },
  {
    key: 'report',
    label: 'Reports',
    description: 'Generate and view various vehicle reports and analytics',
    icon: faFileAlt,
    color: 'text-orange-600'
  },
  {
    key: 'vehicle_edit',
    label: 'Vehicle Edit',
    description: 'Edit vehicle settings, information, and configurations',
    icon: faEdit,
    color: 'text-red-600'
  },
  {
    key: 'notification',
    label: 'Notifications',
    description: 'Receive notifications about vehicle events and alerts',
    icon: faBell,
    color: 'text-yellow-600'
  },
  {
    key: 'share_tracking',
    label: 'Share Tracking',
    description: 'Share vehicle tracking data with other users',
    icon: faShare,
    color: 'text-indigo-600'
  }
];

export const VehiclePermissionsSelector: React.FC<VehiclePermissionsSelectorProps> = ({
  permissions,
  onChange,
  disabled = false,
  showDescriptions = true
}) => {
  const handlePermissionChange = (key: keyof VehiclePermissions, value: boolean) => {
    if (disabled) return;

    const newPermissions = { ...permissions };
    
    if (key === 'all_access' && value) {
      // If all_access is enabled, disable other permissions
      newPermissions.all_access = true;
      newPermissions.live_tracking = false;
      newPermissions.history = false;
      newPermissions.report = false;
      newPermissions.vehicle_edit = false;
      newPermissions.notification = false;
      newPermissions.share_tracking = false;
    } else if (key === 'all_access' && !value) {
      // If all_access is disabled, enable live_tracking by default
      newPermissions.all_access = false;
      newPermissions.live_tracking = true;
    } else if (key !== 'all_access') {
      // If any specific permission is enabled, disable all_access
      if (value) {
        newPermissions.all_access = false;
      }
      newPermissions[key] = value;
    }

    onChange(newPermissions);
  };

  const isPermissionDisabled = (key: keyof VehiclePermissions) => {
    if (disabled) return true;
    // Disable individual permissions when all_access is selected
    return permissions.all_access && key !== 'all_access';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Vehicle Permissions</h3>
        <div className="text-sm text-gray-500">
          {permissions.all_access 
            ? 'All permissions granted' 
            : `${Object.values(permissions).filter(Boolean).length} permissions selected`
          }
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {permissionConfigs.map((config) => {
          const isChecked = permissions[config.key];
          const isDisabled = isPermissionDisabled(config.key);
          
          return (
            <div
              key={config.key}
              className={`relative border rounded-lg p-4 transition-all duration-200 ${
                isChecked 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isDisabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 pt-1">
                  <input
                    type="checkbox"
                    id={`permission-${config.key}`}
                    checked={isChecked}
                    onChange={(e) => handlePermissionChange(config.key, e.target.checked)}
                    disabled={isDisabled}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </div>
                
                <div className="flex-grow">
                  <label
                    htmlFor={`permission-${config.key}`}
                    className={`block text-sm font-medium cursor-pointer ${
                      isDisabled ? 'text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FontAwesomeIcon 
                        icon={config.icon} 
                        className={`w-4 h-4 ${config.color} ${isDisabled ? 'opacity-50' : ''}`} 
                      />
                      <span>{config.label}</span>
                    </div>
                  </label>
                  
                  {showDescriptions && (
                    <p className={`mt-1 text-xs ${
                      isDisabled ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {config.description}
                    </p>
                  )}
                </div>
              </div>

              {config.key === 'all_access' && isChecked && (
                <div className="mt-2 text-xs text-purple-600 font-medium">
                  <FontAwesomeIcon icon={faUserShield} className="w-3 h-3 mr-1" />
                  This grants full access to all features
                </div>
              )}
            </div>
          );
        })}
      </div>

      {permissions.all_access && (
        <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-purple-800">
            <FontAwesomeIcon icon={faUserShield} className="w-4 h-4" />
            <span className="text-sm font-medium">All Access Enabled</span>
          </div>
          <p className="mt-1 text-xs text-purple-700">
            This user will have complete access to all vehicle features, including those added in the future.
          </p>
        </div>
      )}

      {!permissions.all_access && !Object.values(permissions).some(Boolean) && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-yellow-800">
            <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
            <span className="text-sm font-medium">No Permissions Selected</span>
          </div>
          <p className="mt-1 text-xs text-yellow-700">
            Please select at least one permission to grant access to this vehicle.
          </p>
        </div>
      )}
    </div>
  );
}; 