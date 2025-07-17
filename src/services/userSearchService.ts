import { apiService } from './apiService';

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: number;
  role_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchUsersRequest {
  query: string;
}

export interface SearchUsersResponse {
  success: boolean;
  message: string;
  data: User[];
  count: number;
}

export interface GetAllUsersResponse {
  success: boolean;
  message: string;
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class UserSearchService {
  async searchUsers(query: string): Promise<SearchUsersResponse> {
    const response = await apiService.post<SearchUsersResponse>('/api/v1/admin/user-search/search', { query });
    return response;
  }

  async getAllUsers(page: number = 1, limit: number = 50): Promise<GetAllUsersResponse> {
    const response = await apiService.get<GetAllUsersResponse>(`/api/v1/admin/user-search/all?page=${page}&limit=${limit}`);
    return response;
  }
}

export const userSearchService = new UserSearchService(); 