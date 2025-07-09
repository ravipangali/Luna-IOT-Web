import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave } from '@fortawesome/free-solid-svg-icons';
import { vehicleController } from '../../controllers';
import type { VehicleFormData, Device } from '../../types/models';
import { toast } from 'react-toastify';
import { Loader } from '../../components/ui/Loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/select';
import { ApiError } from '../../services/apiService';

export const VehicleEdit: React.FC = () => {
  const { imei } = useParams<{ imei: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<VehicleFormData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    const loadVehicle = async () => {
      if (!imei) return;

      try {
        setLoading(true);
        const response = await vehicleController.getVehicle(imei);
        if (response && response.data) {
          setVehicle(response.data.data);
        } else {
          throw new ApiError(404, 'Failed to load vehicle data');
        }
      } catch (err) {
        console.error('Error loading vehicle:', err);
        const errorMessage = err instanceof ApiError ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast.error(`Error loading vehicle: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    const loadDevices = async () => {
      try {
        const deviceResponse = await vehicleController.getAvailableDevices();
        if (deviceResponse.success && deviceResponse.data) {
          setDevices(deviceResponse.data);
        }
      } catch (err) {
        console.error('Error loading devices:', err);
        toast.error('Failed to load available devices.');
      }
    };

    loadVehicle();
    loadDevices();
  }, [imei]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVehicle(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vehicle || !imei) return;

    const { ...updateData } = vehicle;

    try {
      await vehicleController.updateVehicle(imei, updateData);
      toast.success('Vehicle updated successfully!');
      navigate(`/admin/vehicles/${imei}`);
    } catch (err) {
      console.error('Error updating vehicle:', err);
      const errorMessage = err instanceof ApiError ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast.error(`Failed to update vehicle: ${errorMessage}`);
    }
  };

  if (loading) return <div className="p-4"><Loader /></div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!vehicle) return <div className="p-4">Vehicle not found.</div>;

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={`/admin/vehicles/${imei}`}>
            <Button variant="outline">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back to Vehicle
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Vehicle</CardTitle>
            <CardDescription>Update the details for vehicle with registration {vehicle.reg_no}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="name">Vehicle Name</Label>
                <Input id="name" name="name" value={vehicle.name} onChange={handleChange} required />
              </div>
              
              <div>
                <Label htmlFor="reg_no">Registration Number</Label>
                <Input id="reg_no" name="reg_no" value={vehicle.reg_no} onChange={handleChange} required />
              </div>
              
              <div>
                <Label htmlFor="imei">Device IMEI</Label>
                <Select id="imei" name="imei" value={vehicle.imei} onChange={handleChange} required>
                  <option value={vehicle.imei}>{vehicle.imei} (current)</option>
                  {devices.map(d => (
                    <option key={d.imei} value={d.imei}>{d.imei}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Select id="vehicle_type" name="vehicle_type" value={vehicle.vehicle_type} onChange={handleChange} required>
                  <option value="car">Car</option>
                  <option value="bus">Bus</option>
                  <option value="truck">Truck</option>
                  <option value="bike">Bike</option>
                  <option value="school_bus">School Bus</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="odometer">Odometer (km)</Label>
                <Input id="odometer" name="odometer" type="number" value={vehicle.odometer} onChange={handleChange} required />
              </div>

              <div>
                <Label htmlFor="mileage">Mileage (km/l)</Label>
                <Input id="mileage" name="mileage" type="number" step="0.1" value={vehicle.mileage} onChange={handleChange} required />
              </div>

              <div>
                <Label htmlFor="overspeed">Overspeed Limit (km/h)</Label>
                <Input id="overspeed" name="overspeed" type="number" value={vehicle.overspeed} onChange={handleChange} required />
              </div>
              
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 