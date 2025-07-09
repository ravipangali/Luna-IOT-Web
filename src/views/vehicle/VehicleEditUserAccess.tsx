import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { vehicleController, userVehicleController } from '../../controllers';
import type { Vehicle, UserVehicle, VehiclePermissions } from '../../types/models';
import { VehiclePermissionsSelector } from '../../components/ui/VehiclePermissionsSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/Button';
import { toast } from 'react-toastify';
import { Loader } from '../../components/ui/Loader';
import { ApiError } from '../../services/apiService';

interface ExtendedVehicle extends Vehicle {
  user_access?: UserVehicle[];
}

export const VehicleEditUserAccess: React.FC = () => {
  const navigate = useNavigate();
  const { imei, accessId } = useParams<{ imei: string; accessId: string }>();
  
  const [vehicle, setVehicle] = useState<ExtendedVehicle | null>(null);
  const [userAccess, setUserAccess] = useState<UserVehicle | null>(null);
  const [permissions, setPermissions] = useState<VehiclePermissions | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!imei || !accessId) return;
    
    try {
      setLoading(true);
      const response = await vehicleController.getMyVehicle(imei);
      if (response && response.data) {
        const vehicleData = response.data as ExtendedVehicle;
        setVehicle(vehicleData);
        
        const accessRecord = vehicleData.user_access?.find(ua => ua.id === Number(accessId));
        
        if (accessRecord) {
          setUserAccess(accessRecord);
          setPermissions({
            all_access: accessRecord.all_access,
            live_tracking: accessRecord.live_tracking,
            history: accessRecord.history,
            report: accessRecord.report,
            vehicle_edit: accessRecord.vehicle_edit,
            notification: accessRecord.notification,
            share_tracking: accessRecord.share_tracking,
          });
          setNotes(accessRecord.notes || '');
        } else {
          toast.error('User access record not found for this vehicle.');
          navigate(`/admin/vehicles/${imei}`);
        }
      }
    } catch (error) {
      console.error('Error loading vehicle data:', error);
      if (error instanceof ApiError && error.status === 404) {
        toast.error('Vehicle not found.');
        navigate('/admin/vehicles');
      } else {
        toast.error('Error loading vehicle data.');
      }
    } finally {
      setLoading(false);
    }
  }, [imei, accessId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessId || !permissions) {
      toast.warn('Permissions data is missing.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await userVehicleController.updateVehiclePermissions(
        Number(accessId),
        { ...permissions, notes } // Sending notes along with permissions
      );

      if (response.success) {
        toast.success('Permissions updated successfully!');
        navigate(`/admin/vehicles/${imei}`);
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-64">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to={`/admin/vehicles/${imei}`}>
            <Button variant="outline">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back to Vehicle Details
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit User Permissions</CardTitle>
            <CardDescription>
              Editing permissions for <strong>{userAccess?.user?.name}</strong> on vehicle <strong>{vehicle?.name}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permissions && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Permissions</label>
                  <VehiclePermissionsSelector permissions={permissions} onChange={setPermissions} />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Update Permissions'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 