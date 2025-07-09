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
import { vehicleController, userVehicleController } from '../../controllers';
import type { UserVehicle, Vehicle } from '../../types/models';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/Button';
import { toast } from 'react-toastify';
import { Table } from '../../components/ui/Table';
import { ApiError } from '../../services/apiService';
import { Loader } from '../../components/ui/Loader';
import { useAuth } from '../../context/AuthContext';

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
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { imei } = useParams<{ imei: string }>();
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [vehicle, setVehicle] = useState<ExtendedVehicle | null>(null);

  const loadVehicle = async () => {
    if (!imei) return;
    
    try {
      setLoadingData(true);
      setNotFound(false);
      const response = await vehicleController.getVehicle(imei);
      if (response && response.data) {
        const vehicleData: ExtendedVehicle = {
          ...response.data.data,
          users: response.data.users
        };
        setVehicle(vehicleData);
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
      if (error instanceof ApiError && error.status === 404) {
        setNotFound(true);
        toast.error('Vehicle not found. It might have been deleted.');
        navigate('/admin/vehicles');
      } else {
        toast.error('Error loading vehicle data.');
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (imei) {
      loadVehicle();
    }
  }, [imei]);

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

  if (notFound) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-64 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Not Found</CardTitle>
            <CardDescription>
              The vehicle you are looking for does not exist or may have been deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/admin/vehicles')}>
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Go back to Vehicles List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <Loader />
      </div>
    );
  }

  if (!vehicle) {
    return <div className="p-4">Vehicle not found.</div>;
  }
  
  const mainUser = vehicle.user_access?.find(ua => ua.is_main_user);

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
          {isAdmin && (
            <Link to={`edit-user/${ua.id}`}>
              <Button
                variant="outline"
                size="sm"
                aria-label="Edit Permissions"
              >
                <FontAwesomeIcon icon={faCog} />
              </Button>
            </Link>
          )}
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
            <Link to={`/admin/vehicles/${imei}/edit`}>
              <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white">
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
                {mainUser && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Main User</p>
                    <p className="font-semibold">{mainUser.user?.name} ({mainUser.user?.email})</p>
                  </div>
                )}
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
                    {vehicle.user_access?.length ?? 0} user(s) have access to this vehicle.
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Link to={`add-user`}>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-2" />
                      Add User
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table<UserVehicle>
                columns={userAccessColumns}
                data={vehicle.user_access || []}
                loading={loadingData}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};