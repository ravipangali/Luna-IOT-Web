import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faEdit, 
  faPlus, 
  faTrash, 
  faCog,
  faCrown
} from '@fortawesome/free-solid-svg-icons';
import { vehicleController, userController, userVehicleController } from '../../controllers';
import type { User, UserVehicle, VehiclePermissions, Vehicle } from '../../types/models';
import { VehiclePermissionsSelector } from '../../components/ui/VehiclePermissionsSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/Button';
import { toast } from 'react-toastify';
import { Table } from '../../components/ui/Table';

// Local definition for the Column type used by the Table component
interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

// This interface is based on the backend response for a single vehicle
interface ExtendedVehicle extends Vehicle {
  users?: {
    main_users: UserVehicle[];
    shared_users: UserVehicle[];
    total_users: number;
  };
  user_access?: UserVehicle[];
}

export const VehicleShow: React.FC = () => {
  const navigate = useNavigate();
  const { imei } = useParams<{ imei: string }>();
  const [loadingData, setLoadingData] = useState(true);
  
  const [vehicle, setVehicle] = useState<ExtendedVehicle | null>(null);
  
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserAccess, setSelectedUserAccess] = useState<UserVehicle | null>(null);
  const [userPermissions, setUserPermissions] = useState<VehiclePermissions>({
    all_access: false,
    live_tracking: true,
    history: false,
    report: false,
    vehicle_edit: false,
    notification: false,
    share_tracking: false
  });
  const [userNotes, setUserNotes] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  const allUsersWithAccess = [
    ...(vehicle?.users?.main_users || []),
    ...(vehicle?.users?.shared_users || [])
  ];

  const loadVehicle = async () => {
    if (!imei) return;
    
    try {
      setLoadingData(true);
      const response = await vehicleController.getVehicle(imei);
      if (response && response.data) {
        const vehicleData: ExtendedVehicle = {
            ...response.data, // This is the Vehicle object
            users: response.users // This is the users object
        };
        setVehicle(vehicleData);
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
      toast.error('Error loading vehicle data.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (imei) {
      loadVehicle();
    }
  }, [imei]);

  useEffect(() => {
    if (showAddUserModal) {
      loadAvailableUsers();
    }
  }, [showAddUserModal]);

  const loadAvailableUsers = async () => {
    try {
      const response = await userController.getUsers();
      if (response.success && response.data) {
        const assignedUserIds = new Set(vehicle?.user_access?.map(ua => ua.user_id) || []);
        const available = response.data.filter((user: User) => !assignedUserIds.has(user.id));
        setAvailableUsers(available);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleAddUser = async () => {
    if (!selectedUser || !vehicle) return;
    
    try {
      setUserLoading(true);
      const request = {
        user_id: selectedUser.id,
        vehicle_id: vehicle.imei,
        permissions: userPermissions,
        notes: userNotes,
      };
      
      const response = await userVehicleController.assignVehicleToUser(request);
      if (response.success) {
        toast.success(`User ${selectedUser.name} added to vehicle successfully`);
        setShowAddUserModal(false);
        setSelectedUser(null);
        setUserNotes('');
        loadVehicle();
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user to vehicle');
    } finally {
      setUserLoading(false);
    }
  };

  const handleEditPermissions = (userAccess: UserVehicle) => {
    setSelectedUserAccess(userAccess);
    setUserPermissions({
      all_access: userAccess.all_access,
      live_tracking: userAccess.live_tracking,
      history: userAccess.history,
      report: userAccess.report,
      vehicle_edit: userAccess.vehicle_edit,
      notification: userAccess.notification,
      share_tracking: userAccess.share_tracking
    });
    setUserNotes(userAccess.notes || '');
    setShowEditPermissionsModal(true);
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUserAccess) return;
    
    try {
      setUserLoading(true);
      const response = await userVehicleController.updateVehiclePermissions(
        selectedUserAccess.id, 
        userPermissions
      );
      
      if (response.success) {
        toast.success('Permissions updated successfully');
        setShowEditPermissionsModal(false);
        loadVehicle();
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setUserLoading(false);
    }
  };

  const handleRemoveUser = async (userAccessId: number) => {
    if (window.confirm('Are you sure you want to remove this user from the vehicle?')) {
      try {
        await userVehicleController.revokeVehicleAccess(userAccessId);
        toast.success('User removed from vehicle');
        loadVehicle();
      } catch (error) {
        console.error('Error removing user:', error);
        toast.error('Failed to remove user');
      }
    }
  };

  const handleSetMainUser = async (userAccessId: number) => {
    if (!vehicle) return;
    if (window.confirm('Are you sure you want to set this user as the main user? This will remove main user status from any other user.')) {
        try {
            await userVehicleController.setMainUser(vehicle.imei, userAccessId);
            toast.success('Main user updated successfully');
            loadVehicle();
        } catch (error) {
            console.error('Error setting main user:', error);
            toast.error('Failed to set main user');
        }
    }
  };

  if (loadingData) {
    return <div className="p-4">Loading vehicle data...</div>;
  }

  if (!vehicle) {
    return <div className="p-4">Vehicle not found.</div>;
  }
  
  const userAccessColumns: Column<UserVehicle>[] = [
    {
      key: 'user',
      header: 'User',
      render: (ua) => (
        <div>
          <div className="font-medium">{ua.user?.name}</div>
          <div className="text-sm text-gray-500">{ua.user?.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (ua) => (
        ua.is_main_user ? (
          <Badge variant="success">
            <FontAwesomeIcon icon={faCrown} className="mr-2" />
            Main User
          </Badge>
        ) : (
          <Badge variant="secondary">Shared</Badge>
        )
      ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (ua: UserVehicle) => {
        const permissions = [];
        if (ua.all_access) return <Badge variant="success">All Access</Badge>;
        if (ua.live_tracking) permissions.push('Live');
        if (ua.history) permissions.push('History');
        if (ua.report) permissions.push('Reports');
        if (ua.vehicle_edit) permissions.push('Edit');
        if (ua.notification) permissions.push('Notifications');
        if (ua.share_tracking) permissions.push('Share');
        
        return (
          <div className="flex flex-wrap gap-1">
            {permissions.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (ua: UserVehicle) => (
        <div className="flex justify-end items-center gap-1">
          {!ua.is_main_user && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Set as Main User"
              onClick={() => handleSetMainUser(ua.id)}
            >
              <FontAwesomeIcon icon={faCrown} />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            aria-label="Edit Permissions"
            onClick={() => handleEditPermissions(ua)}
          >
            <FontAwesomeIcon icon={faCog} />
          </Button>
          <Button
            variant="danger"
            size="sm"
            aria-label="Remove User"
            onClick={() => handleRemoveUser(ua.id)}
          >
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back to Vehicles
          </Button>
          <div className="flex items-center gap-2">
            <Link to={`/vehicles/${imei}/edit`}>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                <FontAwesomeIcon icon={faEdit} className="mr-2" />
                Edit Vehicle
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  {vehicle.name}
                  <Badge variant="secondary" className="ml-3">{vehicle.vehicle_type}</Badge>
                </CardTitle>
                <CardDescription>Registration No: {vehicle.reg_no}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Odometer</p>
                  <p className="font-semibold">{vehicle.odometer} km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mileage</p>
                  <p className="font-semibold">{vehicle.mileage} km/l</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overspeed</p>
                  <p className="font-semibold">{vehicle.overspeed} km/h</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IMEI</p>
                  <p className="font-mono text-sm">{vehicle.imei}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Device Information</CardTitle>
                <CardDescription>Details of the associated GPS device.</CardDescription>
              </CardHeader>
              <CardContent>
                {vehicle.device ? (
                  <div className="space-y-2">
                    <p><strong>IMEI:</strong> {vehicle.device.imei}</p>
                    <p><strong>SIM No:</strong> {vehicle.device.sim_no}</p>
                    <p><strong>Operator:</strong> {vehicle.device.sim_operator}</p>
                    <p><strong>Protocol:</strong> {vehicle.device.protocol}</p>
                    <p><strong>Model:</strong> {vehicle.device.model?.name || 'N/A'}</p>
                  </div>
                ) : (
                  <p>No device information available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* User Access Management Card */}
        <div className="mt-6">
          <Card className="border-green-200">
            <CardHeader className="bg-green-50 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-green-800">User Access Management</CardTitle>
                  <CardDescription>
                    {vehicle.users?.total_users ?? 0} user(s) have access to this vehicle.
                  </CardDescription>
                </div>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setShowAddUserModal(true)}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table<UserVehicle>
                columns={userAccessColumns}
                data={allUsersWithAccess}
                loading={loadingData}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-2xl mb-4">Add User to Vehicle</h2>
            <select
                className="w-full p-2 border rounded"
                onChange={(e) => {
                    const user = availableUsers.find(u => u.id === parseInt(e.target.value));
                    setSelectedUser(user || null);
                }}
            >
                <option value="">Select a user</option>
                {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                ))}
            </select>
            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Permissions</label>
                <VehiclePermissionsSelector permissions={userPermissions} onChange={setUserPermissions} />
            </div>
            <div className="mt-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea id="notes" value={userNotes} onChange={(e) => setUserNotes(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setShowAddUserModal(false)}>Cancel</Button>
              <Button onClick={handleAddUser} disabled={userLoading || !selectedUser} className="ml-4">
                {userLoading ? 'Adding...' : 'Add User'}
            </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {showEditPermissionsModal && selectedUserAccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-2xl mb-4">Edit Permissions for {selectedUserAccess?.user?.name}</h2>
            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Permissions</label>
                <VehiclePermissionsSelector permissions={userPermissions} onChange={setUserPermissions} />
            </div>
            <div className="mt-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea id="notes" value={userNotes} onChange={(e) => setUserNotes(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setShowEditPermissionsModal(false)}>Cancel</Button>
              <Button onClick={handleUpdatePermissions} disabled={userLoading} className="ml-4">
                {userLoading ? 'Updating...' : 'Update Permissions'}
            </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};