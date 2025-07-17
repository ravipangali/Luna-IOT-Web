import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSave, 
  faPaperPlane, 
  faSearch, 
  faTimes, 
  faUsers,
  faUpload,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { notificationService, type UpdateNotificationRequest, type CreateNotificationRequest } from '../../services/notificationService';
import { userSearchService, type User } from '../../services/userSearchService';
import type { ApiError } from '../../services/apiService';


interface NotificationFormProps {
  isEdit?: boolean;
  notificationId?: number;
}

const NotificationForm: React.FC<NotificationFormProps> = ({ isEdit = false, notificationId }) => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  // Get notification ID from props or URL params
  const actualNotificationId = notificationId || (params.id ? parseInt(params.id) : undefined);
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('system_notification');
  const [priority, setPriority] = useState('normal');
  const [imageUrl, setImageUrl] = useState('');
  const [sound, setSound] = useState('default');
  const [sendImmediately, setSendImmediately] = useState(true); // Default to true

  // User selection
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);



  // Load notification data if editing
  const { data: notification, isLoading: isLoadingNotification } = useQuery({
    queryKey: ['notification', actualNotificationId],
    queryFn: () => notificationService.getNotification(actualNotificationId!),
    enabled: isEdit && !!actualNotificationId,
  });

  // Load all users for selection
  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => userSearchService.getAllUsers(),
    enabled: true,
  });

  // Load notification data when editing
  useEffect(() => {
    if (isEdit && notification?.success && notification.data) {
      const data = notification.data;
      setTitle(data.title || '');
      setBody(data.body || '');
      setType(data.type || 'system_notification');
      setPriority(data.priority || 'normal');
      setImageUrl(data.image_url || '');
      setSound(data.sound || 'default');
      // Convert notification users to User type
      if (data.users && Array.isArray(data.users)) {
        const users: User[] = data.users.map(user => ({
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: '', // Add missing fields
          role: 0,
          role_name: '',
          is_active: true,
          created_at: '',
          updated_at: ''
        }));
        setSelectedUsers(users);
      } else {
        setSelectedUsers([]);
      }
    }
  }, [isEdit, notification]);

  // Search users
  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await userSearchService.searchUsers(query);
      
      if (response.success) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
        toast.error('Failed to search users. Please try again.');
      }
    } catch {
      setSearchResults([]);
      toast.error('Failed to search users. Please try again.');
    }
  };

  // Handle search input change with debouncing
  const handleSearchInputChange = (query: string) => {
    setSearchQuery(query);
    
    // Clear results if query is empty
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Search after a short delay to avoid too many API calls
    const timeoutId = setTimeout(() => {
      searchUsers(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Add user to selection
  const addUser = (user: User) => {
    if (!selectedUsers) {
      setSelectedUsers([user]);
      return;
    }
    
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove user from selection
  const removeUser = (userId: number) => {
    if (!selectedUsers) {
      return;
    }
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  // Select all users
  const selectAllUsers = () => {
    if (allUsers?.success && allUsers.data && Array.isArray(allUsers.data)) {
      setSelectedUsers(allUsers.data);
    }
  };

  // Clear all selected users
  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.match('image/(jpeg|jpg|png|gif)')) {
        toast.error('Only JPEG, PNG and GIF images are allowed');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImageUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setImageUrl('');
  };

  // Create notification mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateNotificationRequest) => {
      const result = await notificationService.createNotification(data);
      return result;
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Notification created successfully!');
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        navigate('/admin/notifications');
      } else {
        toast.error(response.message || 'Failed to create notification');
      }
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create notification');
    },
  });

  // Update notification mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateNotificationRequest }) => 
      notificationService.updateNotification(id, data),
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Notification updated successfully!');
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        navigate('/admin/notifications');
      } else {
        toast.error(response.message || 'Failed to update notification');
      }
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update notification');
    },
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }

    if (!selectedUsers || selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    // Prepare form data
    const formData: UpdateNotificationRequest = {
      title: title.trim(),
      body: body.trim(),
      type,
      priority,
      image_url: imageUrl.trim(),
      sound: sound.trim(),
      user_ids: selectedUsers.map(u => u.id),
      send_immediately: sendImmediately,
    };

    // Create or update notification in database
    // The backend will handle sending notifications if send_immediately is true
    if (isEdit && actualNotificationId) {
      updateMutation.mutate({ id: actualNotificationId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  if (isLoadingNotification) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEdit ? 'Edit Notification' : 'Create Notification'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isEdit ? 'Update notification details' : 'Create a new notification to send to users'}
              </p>
            </div>

          </div>

          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter notification title"
                  required
                />
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="system_notification">System Notification</option>
                    <option value="alert">Alert</option>
                    <option value="announcement">Announcement</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body *
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter notification message"
                  required
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image
                </label>
                
                {/* Image Preview */}
                {imageUrl && (
                  <div className="mb-4">
                    <div className="relative inline-block">
                      <img
                        src={imageUrl}
                        alt="Notification preview"
                        className="max-w-xs h-auto rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 focus:outline-none"
                        title="Remove image"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex flex-col space-y-2">
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                    <FontAwesomeIcon icon={faUpload} className="w-4 h-4 mr-2" />
                    {imageUrl ? 'Change Image' : 'Upload Image'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleImageUpload}
                    />
                  </label>
                  <p className="text-xs text-gray-500">JPG, PNG, GIF up to 5MB</p>
                </div>
              </div>

              {/* Sound Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sound
                </label>
                <select
                  value={sound}
                  onChange={(e) => setSound(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="default">Default</option>
                  <option value="alert">Alert</option>
                  <option value="notification">Notification</option>
                  <option value="ringtone">Ringtone</option>
                  <option value="chime">Chime</option>
                  <option value="bell">Bell</option>
                  <option value="none">None (Silent)</option>
                </select>
              </div>

              {/* User Search Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Recipients *
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={selectAllUsers}
                      className="flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      <FontAwesomeIcon icon={faUsers} className="mr-1" />
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearAllUsers}
                      className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Selected Users */}
                {selectedUsers && selectedUsers.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                        >
                          <span>{user.name}</span>
                          <button
                            type="button"
                            onClick={() => removeUser(user.id)}
                            className="ml-2 text-green-600 hover:text-green-800"
                          >
                            <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Input */}
                <div className="relative">
                  <div className="flex items-center border border-gray-300 rounded-md">
                    <FontAwesomeIcon icon={faSearch} className="w-4 h-4 text-gray-400 ml-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      className="flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0"
                      placeholder="Search users by name or phone number..."
                    />
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => addUser(user)}
                        >
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Send Immediately Option */}
              <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Send notification immediately after saving
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    If enabled, the notification will be sent to all selected users immediately
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={sendImmediately}
                  onChange={(e) => setSendImmediately(e.target.checked)}
                  className="w-5 h-5 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/notifications')}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <FontAwesomeIcon icon={isEdit ? faSave : faPaperPlane} className="mr-2" />
                  )}
                  {isEdit ? 'Update Notification' : 'Create Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>


    </>
  );
};

export default NotificationForm; 