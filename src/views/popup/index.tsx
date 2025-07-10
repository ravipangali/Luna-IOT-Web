import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSearch, faEye } from '@fortawesome/free-solid-svg-icons';
import { Table } from '../../components/ui';
import { deletePopup, getPopups } from '@/services/popupService';
import { ApiError } from '@/services/apiService';
import type { Popup } from '@/types/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const PopupIndex: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: popupsResponse, isLoading } = useQuery({
    queryKey: ["popups"],
    queryFn: () => getPopups(true),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePopup,
    onSuccess: () => {
      toast.success('Popup deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ["popups"] });
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete popup. Please try again.');
    },
  });

  const handleDelete = async (popup: Popup) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete popup "${popup.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(popup.id);
      
      Swal.fire({
        title: 'Deleted!',
        text: `Popup "${popup.title}" has been deleted.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete the popup. Please try again.',
        icon: 'error'
      });
    }
  };

  const handleSearch = () => {
    // Implement search functionality if needed
    console.log('Search:', searchQuery);
  };

  const filteredPopups = popupsResponse?.data?.filter((popup: Popup) => 
    popup.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    { 
      key: 'image', 
      header: 'Image', 
      sortable: false,
      render: (popup: Popup) => (
        <img
          src={popup.image}
          alt={popup.title}
          className="h-16 w-16 object-cover rounded"
        />
      )
    },
    { key: 'title', header: 'Title', sortable: true },
    { 
      key: 'is_active', 
      header: 'Status', 
      sortable: true,
      render: (popup: Popup) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          popup.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {popup.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      key: 'created_at', 
      header: 'Created At', 
      sortable: true,
      render: (popup: Popup) => new Date(popup.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (popup: Popup) => (
        <div className="flex space-x-2">
          <Link
            to={`/admin/popups/${popup.id}`}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="View"
          >
            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/popups/edit/${popup.id}`}
            className="text-green-600 hover:text-green-800 p-1"
            title="Edit"
          >
            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleDelete(popup)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete"
            disabled={deleteMutation.isPending}
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
              <h1 className="text-2xl font-bold text-gray-900">Popup Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your application popups</p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/admin/popups/create"
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                <span>Add Popup</span>
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
                placeholder="Search by title..."
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
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading popups...</p>
            </div>
          ) : (
            <Table
              data={filteredPopups}
              columns={columns}
              loading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PopupIndex; 