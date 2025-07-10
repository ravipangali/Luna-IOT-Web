import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from "@tanstack/react-query";
import { getPopup, deletePopup } from "@/services/popupService";

import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const ShowPopup: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: popupResponse, isLoading } = useQuery({
    queryKey: ["popups", id],
    queryFn: () => getPopup(Number(id)),
    enabled: !!id,
  });

  const handleDelete = async () => {
    if (!popupResponse?.data) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete popup "${popupResponse.data.title}"?`,
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
      await deletePopup(popupResponse.data.id);
      toast.success('Popup deleted successfully!');
      
      Swal.fire({
        title: 'Deleted!',
        text: `Popup "${popupResponse.data.title}" has been deleted.`,
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

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading popup...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!popupResponse?.data) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <p className="text-gray-500">Popup not found.</p>
              <Link
                to="/admin/popups"
                className="mt-4 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
                Back to Popups
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const popup = popupResponse.data;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/popups"
                className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Popup Details</h1>
                <p className="text-sm text-gray-500 mt-1">View popup information</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to={`/admin/popups/edit/${popup.id}`}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                <span>Edit</span>
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Image Section */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Popup Image</h2>
            <div className="flex justify-center">
              <img
                src={popup.image}
                alt={popup.title}
                className="max-w-md h-auto rounded-lg shadow-md"
              />
            </div>
          </div>

          {/* Details Section */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Popup Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                <p className="text-gray-900">{popup.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <p className="text-gray-900">{popup.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  popup.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {popup.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                <p className="text-gray-900">{new Date(popup.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Updated At</label>
                <p className="text-gray-900">{new Date(popup.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowPopup; 