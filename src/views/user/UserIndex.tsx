import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSearch, faEye, faUser, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { Table } from '../../components/ui';
import { userController } from '../../controllers';
import type { User } from '../../types/models';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { apiService } from '../../services/apiService';

export const UserIndex: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await userController.getUsers(page, 10);
      setUsers(response.data || []);
      
      // Handle case where pagination might be undefined (backend compatibility)
      if (response.pagination) {
        setCurrentPage(response.pagination.current_page);
        setTotalPages(response.pagination.total_pages);
      } else {
        // Fallback when pagination is not available
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error loading users. Please try again.');
      // Set empty array on error to ensure UI doesn't break
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadUsers(1);
      return;
    }

    try {
      setLoading(true);
      const response = await userController.searchUsers(searchQuery);
      setUsers(response.data || []);
      setCurrentPage(1);
      setTotalPages(1);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Error searching users. Please try again.');
      // Set empty array on error to ensure UI doesn't break
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.name}?`)) {
      return;
    }

    try {
      await userController.deleteUser(user.id!.toString());
      toast.success(`User ${user.name} deleted successfully.`);
      loadUsers(currentPage);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error deleting user. Please try again.');
    }
  };

  const handleForceDeleteUsers = async () => {
    try {
      const result = await Swal.fire({
        title: 'Force Delete User Backup Data?',
        text: 'This will permanently delete all soft-deleted users from the database. This action cannot be undone!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, delete permanently!',
        cancelButtonText: 'Cancel',
        input: 'text',
        inputPlaceholder: 'Type "DELETE" to confirm',
        inputValidator: (value) => {
          if (value !== 'DELETE') {
            return 'You must type "DELETE" to confirm!'
          }
        }
      });

      if (result.isConfirmed) {
        const response = await apiService.forceDeleteUsersBackupData();
        
        await Swal.fire({
          title: 'Success!',
          text: `${response.deleted_count} user records have been permanently deleted.`,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Error force deleting user backup data:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete user backup data. Please try again.',
        icon: 'error'
      });
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const columns = [
    { 
      key: 'name', 
      header: 'Name', 
      sortable: true,
      render: (user: User) => (
        <div className="flex items-center space-x-3">
          {user.image ? (
            <img 
              src={user.image} 
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-green-600" />
            </div>
          )}
          <span className="font-medium text-gray-900">{user.name}</span>
        </div>
      )
    },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'phone', header: 'Phone', sortable: true },
    { 
      key: 'role', 
      header: 'Role', 
      sortable: true,
      render: (user: User) => {
        const roleText = user.role === 0 ? 'Admin' : 'Client';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            user.role === 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {roleText}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <div className="flex space-x-2">
          <Link
            to={`/admin/users/${user.id}`}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="View"
          >
            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/users/${user.id}/edit`}
            className="text-green-600 hover:text-green-800 p-1"
            title="Edit"
          >
            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleDelete(user)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete"
          >
            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage system users and roles</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleForceDeleteUsers}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Force Delete User Backup Data"
              >
                <FontAwesomeIcon icon={faTrashCan} className="w-4 h-4" />
                <span>Force Delete Users</span>
              </button>
              <Link
                to="/admin/users/add"
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                <span>Add User</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <FontAwesomeIcon 
                icon={faSearch} 
                className="w-4 h-4 absolute left-3 top-3 text-gray-400" 
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Search
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  loadUsers(1);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <Table
            data={users}
            columns={columns}
            loading={loading}
            pagination={{
              currentPage,
              totalPages,
              onPageChange: (page) => {
                if (searchQuery) {
                  return;
                }
                loadUsers(page);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}; 