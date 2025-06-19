import type { User as BaseUser } from './models';

// Auth-specific User interface extending the base User
export interface User extends Pick<BaseUser, 'id' | 'name' | 'email' | 'role'> {
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
} 