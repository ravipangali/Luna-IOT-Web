import React, { useState, useEffect } from 'react';
import type { Vehicle, Device } from '../../../types/models';
import { deviceController } from '../../../controllers/deviceController';
import { rechargeService } from '../../../services/rechargeService';
import { toast } from 'react-toastify';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

const NTC_AMOUNTS = [10, 20, 30, 40, 50, 100, 200, 300, 400, 500];
const NCELL_AMOUNTS = [50, 100, 200, 300, 400, 500];

const Spinner = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, vehicle }) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(NTC_AMOUNTS[0]);
  const [isRecharging, setIsRecharging] = useState(false);

  const isNcell = device?.sim_operator?.toLowerCase() === 'ncell';
  const rechargeAmounts = isNcell ? NCELL_AMOUNTS : NTC_AMOUNTS;

  useEffect(() => {
    if (isOpen && vehicle) {
      setLoadingDevice(true);
      deviceController.getDeviceByIMEI(vehicle.imei)
        .then((response) => {
          if (response.success) {
            const loadedDevice = response.data || null;
            setDevice(loadedDevice);
            
            // Set default amount based on operator
            const amounts = loadedDevice?.sim_operator?.toLowerCase() === 'ncell' ? NCELL_AMOUNTS : NTC_AMOUNTS;
            setSelectedAmount(amounts[0]);
          } else {
            toast.error(response.message || 'Failed to fetch device details.');
          }
        })
        .catch((error: unknown) => {
          console.error('Error fetching device details:', error);
          toast.error('Failed to fetch device details.');
        })
        .finally(() => {
          setLoadingDevice(false);
        });
    } else {
      setDevice(null);
      setSelectedAmount(NTC_AMOUNTS[0]); // Reset to default when modal is closed
    }
  }, [isOpen, vehicle]);

  const handleRecharge = async () => {
    if (!vehicle) return;
    setIsRecharging(true);
    try {
      await rechargeService.recharge({
        imei: vehicle.imei,
        amount: selectedAmount,
      });
      toast.success('Recharge successful!');
      onClose();
    } catch (error: unknown) {
      let errorMessage = 'An unknown error occurred';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const responseError = error as { response?: { data?: { error?: string } } };
        errorMessage = responseError.response?.data?.error || 'Recharge failed';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(`Recharge failed: ${errorMessage}`);
    } finally {
      setIsRecharging(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center pb-3 border-b">
          <h3 className="text-xl font-bold text-gray-900">Recharge SIM Card</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="text-2xl">&times;</span>
          </button>
        </div>
        <div className="mt-4">
          {loadingDevice ? (
            <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-2">Loading device details...</p>
            </div>
          ) : vehicle && device ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg text-gray-800">{vehicle.name} ({vehicle.reg_no})</h4>
                <p className="text-sm text-gray-500">IMEI: {vehicle.imei}</p>
              </div>
              <div>
                <label htmlFor="sim_no" className="block text-sm font-medium text-gray-700">SIM Number</label>
                <input id="sim_no" type="text" value={device.sim_no} readOnly disabled
                  className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="sim_operator" className="block text-sm font-medium text-gray-700">SIM Operator</label>
                <input id="sim_operator" type="text" value={device.sim_operator} readOnly disabled
                  className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Select Amount (NPR)</label>
                <select id="amount" value={selectedAmount} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedAmount(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                >
                  {rechargeAmounts.map(amount => (
                    <option key={amount} value={amount}>{amount}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No vehicle or device details available.</p>
          )}
        </div>
        <div className="flex justify-end items-center pt-4 border-t mt-4 space-x-2">
            <button
                onClick={onClose}
                disabled={isRecharging}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
                Cancel
            </button>
            <button
                onClick={handleRecharge}
                disabled={!device || isRecharging}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 flex items-center justify-center min-w-[120px]"
            >
                {isRecharging ? (
                    <>
                    <Spinner />
                    <span className="pl-2">Recharging...</span>
                    </>
                ) : 'Recharge Now'}
            </button>
        </div>
      </div>
    </div>
  );
}; 