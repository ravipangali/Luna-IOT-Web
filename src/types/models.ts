// Removed import { UserRole } from './auth' as it doesn't exist

// Enums
export const SimOperator = {
  NTC: 'Ntc',
  NCELL: 'Ncell'
} as const;

export const Protocol = {
  GT06: 'GT06'
} as const;

export const VehicleType = {
  BIKE: 'bike',
  CAR: 'car',
  TRUCK: 'truck',
  BUS: 'bus',
  SCHOOL_BUS: 'school_bus'
} as const;

export const Role = {
  ADMIN: 0,
  CLIENT: 1
} as const;

export const Permission = {
  ALL_ACCESS: 'all_access',
  LIVE_TRACKING: 'live_tracking',
  HISTORY: 'history',
  REPORT: 'report',
  VEHICLE_EDIT: 'vehicle_edit',
  NOTIFICATION: 'notification',
  SHARE_TRACKING: 'share_tracking'
} as const;

export type SimOperator = typeof SimOperator[keyof typeof SimOperator];
export type Protocol = typeof Protocol[keyof typeof Protocol];
export type VehicleType = typeof VehicleType[keyof typeof VehicleType];
export type Role = typeof Role[keyof typeof Role];
export type Permission = typeof Permission[keyof typeof Permission];

// Model Interfaces
export interface Device {
  id: number;
  imei: string;
  sim_no: string;
  sim_operator: 'Ncell' | 'Ntc';
  protocol: 'GT06';
  iccid?: string;
  model_id?: number;
  model?: DeviceModel;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id?: string;
  imei: string;
  reg_no: string;
  name: string;
  odometer: number;
  mileage: number;
  min_fuel: number;
  overspeed: number;
  vehicle_type: 'bike' | 'car' | 'truck' | 'bus' | 'school_bus';
  created_at?: string;
  updated_at?: string;
  device?: Device;
}

export interface UserVehicle {
  id: number;
  user_id: number;
  vehicle_id: string; // IMEI
  all_access: boolean;
  live_tracking: boolean;
  history: boolean;
  report: boolean;
  vehicle_edit: boolean;
  notification: boolean;
  share_tracking: boolean;
  is_main_user: boolean;
  granted_by: number;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  user?: User;
  vehicle?: Vehicle;
  granted_by_user?: User;
}

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: Role; // 0 = admin, 1 = client
  image?: string;
  created_at: string;
  updated_at: string;
}

// Device Model interface
export interface DeviceModel {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  devices?: Device[];
}

export interface GPSData {
  id: number;
  imei: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  course?: number;
  altitude?: number;
  gps_real_time?: boolean;
  gps_positioned?: boolean;
  satellites?: number;
  ignition: string;
  charger: string;
  gps_tracking: string;
  oil_electricity: string;
  device_status: string;
  voltage_level?: number;
  voltage_status: string;
  gsm_signal?: number;
  gsm_status: string;
  mcc?: number;
  mnc?: number;
  lac?: number;
  cell_id?: number;
  alarm_active: boolean;
  alarm_type: string;
  alarm_code: number;
  protocol_name: string;
  raw_packet: string;
  created_at: string;
  updated_at: string;
  device?: Device;
  vehicle?: Vehicle;
}

export interface VehicleDetailsResponse {
  data: Vehicle;
  users: {
    main_users: UserVehicle[];
    shared_users: UserVehicle[];
    total_users: number;
  };
  message: string;
}

// Form interfaces for creating/editing
export type DeviceFormData = Omit<Device, 'id' | 'created_at' | 'updated_at' | 'model'> & {
  iccid?: string;
  model_id?: number;
};

export type DeviceModelFormData = Omit<DeviceModel, 'id' | 'created_at' | 'updated_at' | 'devices'>;

export type VehicleFormData = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'> & {
  main_user_id?: number; // Required for vehicle creation
};

export interface UserFormData extends Omit<User, 'id' | 'created_at' | 'updated_at'> {
  password: string;
  confirm_password: string;
}

export interface VehicleAssignment {
  vehicle_id: string; // IMEI
  vehicle_name?: string;
  permissions: VehiclePermissions;
  expires_at?: string;
  notes?: string;
}

export interface VehiclePermissions {
  all_access: boolean;
  live_tracking: boolean;
  history: boolean;
  report: boolean;
  vehicle_edit: boolean;
  notification: boolean;
  share_tracking: boolean;
}

export interface AssignVehicleRequest {
  user_id: number;
  vehicle_id: string;
  permissions: VehiclePermissions;
  expires_at?: string;
  notes?: string;
}

export interface BulkAssignRequest {
  user_id: number;
  vehicle_ids: string[];
  permissions: VehiclePermissions;
  expires_at?: string;
  notes?: string;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
} 