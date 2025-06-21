import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave, faUserCheck } from '@fortawesome/free-solid-svg-icons';
import { vehicleController } from '../../controllers';
import type { VehicleFormData, VehicleType, Device, UserVehicle } from '../../types/models';
import { VehicleType as VehicleTypeEnum } from '../../types/models';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/Button';
import { toast } from 'react-toastify';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';

export const VehicleEdit: React.FC = () => {
  const navigate = useNavigate();
  const { imei } = useParams<{ imei: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<Device | null>(null);
  const [userAccessList, setUserAccessList] = useState<UserVehicle[]>([]);
  const [currentMainUserAccessId, setCurrentMainUserAccessId] = useState<number | null>(null);
  const [selectedMainUserAccessId, setSelectedMainUserAccessId] = useState<number | null>(null);
  const [isUpdatingMainUser, setIsUpdatingMainUser] = useState(false);
  
  const [formData, setFormData] = useState<VehicleFormData>({
    imei: '',
    reg_no: '',
    name: '',
    odometer: 0,
    mileage: 0,
    min_fuel: 0,
    overspeed: 80,
    vehicle_type: VehicleTypeEnum.CAR
  });

  useEffect(() => {
    const loadVehicle = async () => {
      if (!imei) return;
      
      try {
        setLoadingData(true);
        const response = await vehicleController.getVehicle(imei);
        if (response && response.data) {
          const vehicleData = response.data;
          setFormData({
            imei: vehicleData.imei,
            reg_no: vehicleData.reg_no,
            name: vehicleData.name,
            odometer: vehicleData.odometer,
            mileage: vehicleData.mileage,
            min_fuel: vehicleData.min_fuel,
            overspeed: vehicleData.overspeed,
            vehicle_type: vehicleData.vehicle_type
          });
          if (vehicleData.device) {
            setDeviceInfo(vehicleData.device);
          }
          if (response.users) {
            const allUsers = [...response.users.main_users, ...response.users.shared_users];
            setUserAccessList(allUsers);
            const mainUser = allUsers.find(ua => ua.is_main_user);
            if (mainUser) {
              setCurrentMainUserAccessId(mainUser.id);
              setSelectedMainUserAccessId(mainUser.id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading vehicle:', error);
        toast.error('Error loading vehicle data.');
      } finally {
        setLoadingData(false);
      }
    };

    if (imei) {
        loadVehicle();
    }
  }, [imei]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imei) return;

    try {
      setLoading(true);
      await vehicleController.updateVehicle(imei, formData);
      toast.success('Vehicle updated successfully!');
      navigate(`/vehicles/show/${imei}`);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Failed to update vehicle.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMainUser = async () => {
    if (!imei || !selectedMainUserAccessId || selectedMainUserAccessId === currentMainUserAccessId) {
      return;
    }

    setIsUpdatingMainUser(true);
    try {
      await vehicleController.setMainUser(imei, selectedMainUserAccessId);
      toast.success('Main user updated successfully!');
      setCurrentMainUserAccessId(selectedMainUserAccessId);
    } catch (error) {
      console.error('Error updating main user:', error);
      toast.error('Failed to update main user.');
    } finally {
      setIsUpdatingMainUser(false);
    }
  };

  const handleChange = (field: keyof VehicleFormData, value: string | number | VehicleType) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loadingData) {
      return <div className="p-4">Loading...</div>
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Edit Vehicle</h1>
        <Link to={`/vehicles/show/${imei}`} className="text-gray-600 hover:text-gray-800">
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back to Vehicle Details
        </Link>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent>
            {deviceInfo && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-md mb-2 text-gray-700">Device Information</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><span className="font-semibold">SIM No:</span> {deviceInfo.sim_no}</div>
                        <div><span className="font-semibold">Operator:</span> <Badge variant={deviceInfo.sim_operator === 'Ncell' ? 'danger' : 'secondary'}>{deviceInfo.sim_operator}</Badge></div>
                        <div><span className="font-semibold">Device Model:</span> {deviceInfo.model?.name || 'N/A'}</div>
                        <div><span className="font-semibold">Protocol:</span> {deviceInfo.protocol}</div>
                    </div>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label>IMEI</label>
                        <Input type="text" value={formData.imei} disabled />
                    </div>
                    <div>
                        <label>Registration Number</label>
                        <Input type="text" value={formData.reg_no} onChange={e => handleChange('reg_no', e.target.value)} />
                    </div>
                    <div>
                        <label>Name</label>
                        <Input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
                    </div>
                    <div>
                        <label>Vehicle Type</label>
                        <select
                            value={formData.vehicle_type}
                            onChange={e => handleChange('vehicle_type', e.target.value as VehicleType)}
                            className="w-full p-2 border rounded"
                        >
                            {Object.values(VehicleTypeEnum).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Odometer (km)</label>
                        <Input type="number" value={formData.odometer} onChange={e => handleChange('odometer', parseInt(e.target.value))} />
                    </div>
                    <div>
                        <label>Mileage (km/l)</label>
                        <Input type="number" value={formData.mileage} onChange={e => handleChange('mileage', parseInt(e.target.value))} />
                    </div>
                    <div>
                        <label>Minimum Fuel</label>
                        <Input type="number" value={formData.min_fuel} onChange={e => handleChange('min_fuel', parseInt(e.target.value))} />
                    </div>
                    <div>
                        <label>Overspeed (km/h)</label>
                        <Input type="number" value={formData.overspeed} onChange={e => handleChange('overspeed', parseInt(e.target.value))} />
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button type="submit" disabled={loading}>
                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
          </CardContent>
      </Card>

      {/* Main User Assignment Card */}
      <Card className="border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="text-green-800">Main User Assignment</CardTitle>
          <CardDescription>Select which user is the primary owner of this vehicle.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {userAccessList.length > 0 ? (
            <div role="radiogroup" className="space-y-4">
              {userAccessList.map(ua => (
                <label
                  key={ua.id}
                  htmlFor={`user-${ua.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-green-50 has-[:checked]:border-green-300"
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id={`user-${ua.id}`}
                      name="mainUser"
                      value={ua.id}
                      checked={selectedMainUserAccessId === ua.id}
                      onChange={(e) => setSelectedMainUserAccessId(Number(e.target.value))}
                      className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    <div className="ml-3">
                      <span className="block font-medium">{ua.user?.name}</span>
                      <span className="block text-sm text-gray-500">{ua.user?.email}</span>
                    </div>
                  </div>
                  {ua.is_main_user && <Badge variant="success">Current Main User</Badge>}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No users have been assigned to this vehicle yet.</p>
          )}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleUpdateMainUser}
              disabled={isUpdatingMainUser || selectedMainUserAccessId === currentMainUserAccessId}
              className="bg-green-600 hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
              {isUpdatingMainUser ? 'Updating...' : 'Update Main User'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 