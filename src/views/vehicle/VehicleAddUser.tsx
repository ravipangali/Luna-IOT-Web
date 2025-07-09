import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { userController, userVehicleController, vehicleController } from '../../controllers';
import type { User, VehiclePermissions, Vehicle, UserVehicle } from '../../types/models';
import { VehiclePermissionsSelector } from '../../components/ui/VehiclePermissionsSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/Button';
import { toast } from 'react-toastify';
import { Loader } from '../../components/ui/Loader';
import { ApiError } from '../../services/apiService';

export const VehicleAddUser: React.FC = () => {
  const navigate = useNavigate();
  const { imei } = useParams<{ imei: string }>();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<VehiclePermissions>({
    all_access: false,
    live_tracking: true,
    history: false,
    report: false,
    vehicle_edit: false,
    notification: false,
    share_tracking: false,
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!imei) return;
      try {
        setLoading(true);
        const vehicleRes = await vehicleController.getMyVehicle(imei);
        setVehicle(vehicleRes.data || null);

        if (vehicleRes.data) {
            const usersRes = await userController.getUsers();
            if (usersRes.success && usersRes.data) {
              const assignedUserIds = new Set(vehicleRes.data.user_access?.map((ua: UserVehicle) => ua.user_id) || []);
              const available = usersRes.data.filter((user: User) => !assignedUserIds.has(user.id));
              setAvailableUsers(available);
            }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (error instanceof ApiError && error.status === 404) {
          toast.error('Vehicle not found.');
          navigate('/admin/vehicles');
        } else {
          toast.error('Failed to load data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [imei, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imei || !selectedUserId) {
      toast.warn('Please select a user.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await userVehicleController.assignVehicleToUser({
        vehicle_id: imei,
        user_id: selectedUserId,
        permissions,
        notes,
      });

      if (response.success) {
        toast.success('User assigned to vehicle successfully!');
        navigate(`/admin/vehicles/${imei}`);
      }
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error('Failed to assign user.');
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
          <Link to={`/vehicles/${imei}`}>
            <Button variant="outline">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back to Vehicle Details
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add User to Vehicle</CardTitle>
            <CardDescription>
              Grant access to "{vehicle?.name}" for a user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select User
                </label>
                <select
                  id="user-select"
                  className="w-full p-2 border rounded-md shadow-sm"
                  value={selectedUserId ?? ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  required
                >
                  <option value="" disabled>Select a user...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

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
                <Button type="submit" disabled={submitting || !selectedUserId}>
                  {submitting ? 'Adding User...' : 'Add User to Vehicle'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 