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

export type SimOperator = typeof SimOperator[keyof typeof SimOperator];
export type Protocol = typeof Protocol[keyof typeof Protocol];
export type VehicleType = typeof VehicleType[keyof typeof VehicleType];
export type Role = typeof Role[keyof typeof Role];

// Model Interfaces
export interface Device {
  id?: string;
  imei: string;
  sim_no: string;
  sim_operator: SimOperator;
  protocol: Protocol;
  created_at?: string;
  updated_at?: string;
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
  vehicle_type: VehicleType;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id?: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  confirm_password?: string;
  role: Role;
  image?: string;
  created_at?: string;
  updated_at?: string;
}

// Form interfaces for creating/editing
export type DeviceFormData = Omit<Device, 'id' | 'created_at' | 'updated_at'>;

export type VehicleFormData = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>;

export interface UserFormData extends Omit<User, 'id' | 'created_at' | 'updated_at'> {
  password: string;
  confirm_password: string;
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