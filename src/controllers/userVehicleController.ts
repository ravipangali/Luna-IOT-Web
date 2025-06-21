import { apiService } from '../services/apiService';
import type { 
  AssignVehicleRequest, 
  BulkAssignRequest, 
  VehiclePermissions, 
  UserVehicle,
  ApiResponse 
} from '../types/models';

export class UserVehicleController {
  private apiService = apiService;

  // Assign a single vehicle to a user
  async assignVehicleToUser(request: AssignVehicleRequest): Promise<ApiResponse<UserVehicle>> {
    return this.apiService.post('/user-vehicles/assign', request);
  }

  // Assign multiple vehicles to a user
  async bulkAssignVehiclesToUser(request: BulkAssignRequest): Promise<ApiResponse<UserVehicle[]>> {
    return this.apiService.post('/user-vehicles/bulk-assign', request);
  }

  // Update permissions for a user-vehicle relationship
  async updateVehiclePermissions(accessId: number, permissions: VehiclePermissions): Promise<ApiResponse<UserVehicle>> {
    return this.apiService.put(`/user-vehicles/${accessId}/permissions`, permissions);
  }

  // Revoke user's access to a vehicle
  async revokeVehicleAccess(accessId: number): Promise<ApiResponse<{ message: string }>> {
    return this.apiService.delete(`/user-vehicles/${accessId}`);
  }

  // Get all vehicle access for a specific user
  async getUserVehicleAccess(userId: number): Promise<ApiResponse<UserVehicle[]>> {
    return this.apiService.get(`/user-vehicles/user/${userId}`);
  }

  // Get all user access for a specific vehicle
  async getVehicleUserAccess(vehicleId: string): Promise<ApiResponse<UserVehicle[]>> {
    return this.apiService.get(`/user-vehicles/vehicle/${vehicleId}`);
  }

  // Set a user as the main user for a vehicle
  async setMainUser(vehicleId: string, userAccessId: number): Promise<ApiResponse<UserVehicle>> {
    return this.apiService.put(`/user-vehicles/vehicle/${vehicleId}/set-main-user`, { user_access_id: userAccessId });
  }

  // Helper method to check if user has specific permission for a vehicle
  hasVehiclePermission(userVehicle: UserVehicle, permission: string): boolean {
    if (!userVehicle.is_active) {
      return false;
    }

    // Check if access has expired
    if (userVehicle.expires_at) {
      const expiryDate = new Date(userVehicle.expires_at);
      if (new Date() > expiryDate) {
        return false;
      }
    }

    // All access grants everything
    if (userVehicle.all_access) {
      return true;
    }

    switch (permission) {
      case 'live_tracking':
        return userVehicle.live_tracking;
      case 'history':
        return userVehicle.history;
      case 'report':
        return userVehicle.report;
      case 'vehicle_edit':
        return userVehicle.vehicle_edit;
      case 'notification':
        return userVehicle.notification;
      case 'share_tracking':
        return userVehicle.share_tracking;
      default:
        return false;
    }
  }

  // Helper method to get all permissions for a user-vehicle relationship
  getUserVehiclePermissions(userVehicle: UserVehicle): string[] {
    const permissions: string[] = [];

    if (!userVehicle.is_active) {
      return permissions;
    }

    if (userVehicle.expires_at) {
      const expiryDate = new Date(userVehicle.expires_at);
      if (new Date() > expiryDate) {
        return permissions;
      }
    }

    if (userVehicle.all_access) {
      permissions.push('all_access');
      return permissions;
    }

    if (userVehicle.live_tracking) permissions.push('live_tracking');
    if (userVehicle.history) permissions.push('history');
    if (userVehicle.report) permissions.push('report');
    if (userVehicle.vehicle_edit) permissions.push('vehicle_edit');
    if (userVehicle.notification) permissions.push('notification');
    if (userVehicle.share_tracking) permissions.push('share_tracking');

    return permissions;
  }

  // Helper method to create a default permissions object
  createDefaultPermissions(): VehiclePermissions {
    return {
      all_access: false,
      live_tracking: true,
      history: false,
      report: false,
      vehicle_edit: false,
      notification: false,
      share_tracking: false
    };
  }

  // Helper method to create an all-access permissions object
  createAllAccessPermissions(): VehiclePermissions {
    return {
      all_access: true,
      live_tracking: false,
      history: false,
      report: false,
      vehicle_edit: false,
      notification: false,
      share_tracking: false
    };
  }

  // Helper method to get permission display names
  getPermissionDisplayName(permission: string): string {
    const displayNames: Record<string, string> = {
      'all_access': 'All Access',
      'live_tracking': 'Live Tracking',
      'history': 'History',
      'report': 'Reports',
      'vehicle_edit': 'Vehicle Edit',
      'notification': 'Notifications',
      'share_tracking': 'Share Tracking'
    };

    return displayNames[permission] || permission;
  }

  // Helper method to get permission descriptions
  getPermissionDescription(permission: string): string {
    const descriptions: Record<string, string> = {
      'all_access': 'Full access to all vehicle features and data',
      'live_tracking': 'View real-time location and status of the vehicle',
      'history': 'Access historical tracking data and reports',
      'report': 'Generate and view various vehicle reports',
      'vehicle_edit': 'Edit vehicle settings and information',
      'notification': 'Receive notifications about vehicle events',
      'share_tracking': 'Share vehicle tracking with others'
    };

    return descriptions[permission] || 'Permission description not available';
  }
}

export const userVehicleController = new UserVehicleController(); 