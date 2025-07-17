import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faPaperPlane, faArrowLeft, faUsers, faCalendar, faUser, faBell } from '@fortawesome/free-solid-svg-icons';
import { notificationService, type Notification, type UserWithFCMToken } from '@/services/notificationService';
import { ApiError } from '@/services/apiService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const ShowNotification: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  const notificationId = id ? parseInt(id) : 0;

  // Fetch notification details
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['notification', notificationId],
    queryFn: () => notificationService.getNotification(notificationId),
    enabled: !!notificationId,
  });

  // Send notification to device mutation
  const sendToDeviceMutation = useMutation({
    mutationFn: async (notification: Notification) => {
      // Extract FCM tokens from notification users
      const tokens = (notification.users as UserWithFCMToken[])
        .map(u => u.fcm_token)
        .filter((token): token is string => Boolean(token));
      
      if (tokens.length === 0) {
        throw new Error('No FCM tokens found for selected users');
      }

      return notificationService.sendNotificationToDevice({
        title: notification.title,
        body: notification.body,
        tokens,
        image_url: notification.image_url,
        data: { // Add custom data if needed
          priority: notification.priority === 'urgent' ? 'high' : notification.priority,
        },
      });
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Notification sent to devices successfully!');
        queryClient.invalidateQueries({ queryKey: ['notification', notificationId] });
      } else {
        toast.error(response.error || 'Failed to send notification to devices');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send notification to devices');
    },
  });

  const handleSend = async () => {
    if (!response?.data) {
      toast.error('Notification data not available');
      return;
    }

    const isAlreadySent = response.data.is_sent;
    const actionText = isAlreadySent ? 'Resend' : 'Send';
    const confirmationText = isAlreadySent 
      ? 'This will resend the notification to all selected users\' devices immediately.'
      : 'This will send the notification to all selected users\' devices immediately.';

    const result = await Swal.fire({
      title: `${actionText} Notification?`,
      text: confirmationText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText.toLowerCase()} it!`
    });

    if (result.isConfirmed) {
      setIsSending(true);
      sendToDeviceMutation.mutate(response.data);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isSent: boolean) => {
    return isSent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !response?.success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">
              {error?.message || response?.message || 'Failed to load notification'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const notification: Notification = response.data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/admin/notifications')}
              className="flex items-center mr-4 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notification Details
              </h1>
              <p className="text-gray-600 mt-2">
                View notification information and recipients
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/admin/notifications/edit/${notificationId}`)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <FontAwesomeIcon icon={faEdit} className="mr-2" />
              Edit
            </button>
            
            {/* Send to Devices Button - Always visible */}
            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
              )}
              {notification.is_sent ? 'Resend' : 'Send'}
            </button>
          </div>
        </div>

        {/* Notification Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <p className="mt-1 text-gray-900">{notification.title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Body</label>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">{notification.body}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="mt-1 text-gray-900 capitalize">{notification.type.replace('_', ' ')}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <span className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(notification.priority)}`}>
                        {notification.priority}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(notification.is_sent)}`}>
                        {notification.is_sent ? 'Sent' : 'Draft'}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created</label>
                      <p className="mt-1 text-gray-900">{formatDate(notification.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Preview */}
            {notification.image_url && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Image Preview</h3>
                <div className="flex justify-center">
                  <div className="relative max-w-md">
                    <img
                      src={notification.image_url}
                      alt="Notification image"
                      className="w-full h-auto rounded-lg border border-gray-300 shadow-sm"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="text-center text-gray-500">Failed to load image</div>';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Creator</label>
                    <div className="mt-1 flex items-center">
                      <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2" />
                      <span className="text-gray-900">{notification.creator.name}</span>
                    </div>
                  </div>
                  
                  {notification.sound && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sound</label>
                      <p className="mt-1 text-gray-900">{notification.sound}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {notification.sent_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sent At</label>
                      <div className="mt-1 flex items-center">
                        <FontAwesomeIcon icon={faCalendar} className="text-gray-400 mr-2" />
                        <span className="text-gray-900">{formatDate(notification.sent_at)}</span>
                      </div>
                    </div>
                  )}
                  
                  {notification.image_url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Image URL</label>
                      <p className="mt-1 text-gray-900 break-all text-sm">{notification.image_url}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faUsers} className="mr-2" />
              Recipients ({notification.users.length})
            </h2>
          </div>
          
          {notification.users.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notification.users.map((user, index) => (
                <div
                  key={`${user.id}-${index}`}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-600">{user.phone}</div>
                  {/* Show FCM token status if available */}
                  {(user as UserWithFCMToken).fcm_token ? (
                    <div className="text-xs text-green-600 mt-1">✓ FCM Token Available</div>
                  ) : (
                    <div className="text-xs text-red-600 mt-1">✗ No FCM Token</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recipients selected for this notification.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowNotification; 