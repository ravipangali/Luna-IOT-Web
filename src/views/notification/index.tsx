import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faSearch, faEye, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { Table } from '../../components/ui';
import { notificationService } from '@/services/notificationService';
import { ApiError } from '@/services/apiService';
import type { Notification } from '@/services/notificationService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const NotificationList: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: notificationsResponse, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getNotifications(1, 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationService.deleteNotification(id),
    onSuccess: () => {
      toast.success('Notification deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to delete notification. Please try again.');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => notificationService.sendNotification(id),
    onSuccess: () => {
      toast.success('Notification sent successfully!');
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to send notification. Please try again.');
    },
  });

  const handleDelete = async (notification: Notification) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete notification "${notification.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteMutation.mutateAsync(notification.id);
      Swal.fire({
        title: 'Deleted!',
        text: `Notification "${notification.title}" has been deleted.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete the notification. Please try again.',
        icon: 'error'
      });
    }
  };

  const handleSend = async (notification: Notification) => {
    const isAlreadySent = notification.is_sent;
    const actionText = isAlreadySent ? 'Resend' : 'Send';
    const confirmationText = isAlreadySent
      ? `Do you want to resend notification "${notification.title}" to users?`
      : `Do you want to send notification "${notification.title}" to users?`;

    const result = await Swal.fire({
      title: `${actionText} Notification?`,
      text: confirmationText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText.toLowerCase()} it!`,
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;
    try {
      await sendMutation.mutateAsync(notification.id);
      Swal.fire({
        title: `${actionText}!`,
        text: `Notification "${notification.title}" has been ${actionText.toLowerCase()}n.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch {
      Swal.fire({
        title: 'Error!',
        text: `Failed to ${actionText.toLowerCase()} the notification. Please try again.`,
        icon: 'error'
      });
    }
  };

  const handleSearch = () => {
    // Implement search functionality if needed
    // For now, just filter client-side
  };

  const filteredNotifications = notificationsResponse?.data?.filter((n: Notification) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'title', header: 'Title', sortable: true },
    { key: 'type', header: 'Type', sortable: true },
    { key: 'priority', header: 'Priority', sortable: true },
    { key: 'is_sent', header: 'Status', sortable: true, render: (n: Notification) => (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        n.is_sent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      }`}>
        {n.is_sent ? 'Sent' : 'Draft'}
      </span>
    ) },
    { key: 'created_at', header: 'Created At', sortable: true, render: (n: Notification) => new Date(n.created_at).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (n: Notification) => (
        <div className="flex space-x-2">
          <Link
            to={`/admin/notifications/${n.id}`}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="View"
          >
            <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
          </Link>
          <Link
            to={`/admin/notifications/edit/${n.id}`}
            className="text-green-600 hover:text-green-800 p-1"
            title="Edit"
          >
            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleSend(n)}
            className="text-indigo-600 hover:text-indigo-800 p-1"
            title={n.is_sent ? "Resend" : "Send"}
            disabled={sendMutation.isPending}
          >
            <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(n)}
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
              <h1 className="text-2xl font-bold text-gray-900">Notification Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your application notifications</p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/admin/notifications/create"
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                <span>Add Notification</span>
              </Link>
            </div>
          </div>
        </div>
        {/* Search */}
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
        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading notifications...</p>
            </div>
          ) : (
            <Table
              data={filteredNotifications}
              columns={columns}
              loading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationList; 