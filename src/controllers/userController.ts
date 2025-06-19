import type { User, UserFormData, PaginatedResponse, ApiResponse } from '../types/models';
import { apiService } from '../services/apiService';
import { API_CONFIG } from '../config/api';

class UserController {
  async getUsers(page: number = 1, limit: number = 10): Promise<PaginatedResponse<User>> {
    try {
      const response = await apiService.getPaginated<User>(
        API_CONFIG.ENDPOINTS.USERS,
        page,
        limit
      );
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await apiService.get<ApiResponse<User>>(
        API_CONFIG.ENDPOINTS.USER_BY_ID(id)
      );
      return response;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async createUser(data: UserFormData): Promise<ApiResponse<User>> {
    try {
      // Remove confirm_password before sending to backend as it's not part of the User model
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirm_password, ...userDataForBackend } = data;
      
      // Debug the data being sent
      console.log('User data being sent to server:', userDataForBackend);
      console.log('Password field:', userDataForBackend.password);
      console.log('Password type:', typeof userDataForBackend.password);
      console.log('Password length:', userDataForBackend.password?.length || 0);
      
      // Use the specialized createUser method in apiService
      const response = await apiService.createUser(userDataForBackend);
      return response as ApiResponse<User>;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, data: Partial<UserFormData>): Promise<ApiResponse<User>> {
    try {
      // Remove confirm_password before sending to backend
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirm_password, ...userDataForBackend } = data;
      
      // If password is empty string, remove it to avoid password reset
      if (userDataForBackend.password === '') {
        delete userDataForBackend.password;
      }

      // If password is provided, use specialized method, otherwise use regular put
      if (userDataForBackend.password) {
        console.log('Updating user with password change:', { ...userDataForBackend, id });
        const response = await apiService.updateUser(id, userDataForBackend);
        return response as ApiResponse<User>;
      } else {
        console.log('Updating user without password change:', userDataForBackend);
        const response = await apiService.put<ApiResponse<User>>(
          API_CONFIG.ENDPOINTS.USER_BY_ID(id),
          userDataForBackend
        );
        return response;
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<ApiResponse<null>> {
    try {
      const response = await apiService.delete<ApiResponse<null>>(
        API_CONFIG.ENDPOINTS.USER_BY_ID(id)
      );
      return response;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async searchUsers(query: string): Promise<ApiResponse<User[]>> {
    try {
      // For now, we'll implement a client-side search by getting all users
      // In the future, the backend can provide a search endpoint
      const response = await this.getUsers(1, 100); // Get more users for search
      const filteredUsers = response.data.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        user.phone.toLowerCase().includes(query.toLowerCase())
      );

      return {
        success: true,
        message: 'Search completed',
        data: filteredUsers
      };
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}

export const userController = new UserController();
export default userController; 