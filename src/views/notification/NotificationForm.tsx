import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSave, 
  faPaperPlane, 
  faSearch, 
  faTimes, 
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { notificationService, type UpdateNotificationRequest, type CreateNotificationRequest } from '../../services/notificationService';
import { userSearchService, type User } from '../../services/userSearchService';
import { uploadService } from '../../services/uploadService';
import { debugAuthState } from '../../utils/authDebug';
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
  const [sound, setSound] = useState('default');
  const [sendImmediately, setSendImmediately] = useState(true);
  
  // Image handling - NEW FLOW
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageData, setImageData] = useState(''); // For existing images when editing
  const [isUploading, setIsUploading] = useState(false);

  // User selection - NEW FLOW
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Load notification data if editing
  const { data: notification, isLoading: isLoadingNotification } = useQuery({
    queryKey: ['notification', actualNotificationId],
    queryFn: () => notificationService.getNotification(actualNotificationId!),
    enabled: isEdit && !!actualNotificationId,
  });

  // Load all users once when component mounts
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await userSearchService.getAllUsers();
        if (response.success && response.data) {
          setAllUsers(response.data);
        } else {
          toast.error('Failed to load users');
        }
      } catch (error) {
        toast.error('Failed to load users');
        console.error('Error loading users:', error);
      }
    };

    fetchAllUsers();
  }, []);

  // Filter users locally based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    return allUsers.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allUsers, searchQuery]);

  // Load notification data when editing
  useEffect(() => {
    if (isEdit && notification?.success && notification.data) {
      const data = notification.data;
      setTitle(data.title || '');
      setBody(data.body || '');
      setType(data.type || 'system_notification');
      setPriority(data.priority || 'normal');
      setImageData(data.image_data || ''); // Load existing image
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

  // Handle image selection (preview only, no upload)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, or GIF)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        setSelectedImage(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    setImageData('');
  };

  // Add user to selection
  const addUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
  };

  // Remove user from selection
  const removeUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  // Select all users
  const selectAllUsers = () => {
    setSelectedUsers([...allUsers]);
  };

  // Clear all selected users
  const clearAllUsers = () => {
    setSelectedUsers([]);
  };

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await uploadService.uploadNotificationImage(file);
      if (response.success) {
        return response.file_url || '';
      } else {
        throw new Error(response.message);
      }
    },
    onSuccess: (fileUrl: string) => {
      setImageData(fileUrl);
      toast.success('Image uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload image');
    },
  });

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

  // Handle form submission - NEW SEQUENCE: Image first, then notification
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

    try {
      let finalImageUrl = imageData; // Use existing image if editing

      // If there's a new image selected, upload it first
      if (selectedImage) {
        setIsUploading(true);
        const uploadedImageUrl = await uploadImageMutation.mutateAsync(selectedImage);
        finalImageUrl = uploadedImageUrl;
        setIsUploading(false);
      }

      // Prepare form data
      const formData: UpdateNotificationRequest = {
        title: title.trim(),
        body: body.trim(),
        type,
        priority,
        image_url: finalImageUrl,
        image_data: finalImageUrl,
        sound: sound.trim(),
        user_ids: selectedUsers.map(u => u.id),
        send_immediately: sendImmediately,
      };

      // Create or update notification
      if (isEdit && actualNotificationId) {
        await updateMutation.mutateAsync({ id: actualNotificationId, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }

    } catch (error) {
      setIsUploading(false);
      console.error('Error in form submission:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || uploadImageMutation.isPending;

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
                    <option value="notification">📱 Notification (Default Sound)</option>
                    <option value="alert">⚠️ Alert (Custom Sound)</option>
                    <option value="alarm">🚨 Alarm (Continuous Vibration/Sound)</option>
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
                
                {/* Debug Authentication Button */}
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <button
                    type="button"
                    onClick={() => {
                      debugAuthState();
                      toast.info('Check console for authentication debug info');
                    }}
                    className="text-sm text-yellow-800 hover:text-yellow-900"
                  >
                    🔍 Debug Authentication
                  </button>
                </div>
                
                {/* File Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Image
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={isUploading}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isUploading && (
                      <span className="text-blue-600 text-sm">Uploading...</span>
                    )}
                  </div>
                  {imagePreview && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                      <img src={imagePreview} alt="Preview" className="max-w-sm h-auto" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <FontAwesomeIcon icon={faTimes} className="mr-1" /> Remove Image
                      </button>
                    </div>
                  )}
                  {imageData && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-700">
                        ✓ Image uploaded successfully
                      </p>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="mt-1 text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
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
                  <option value="default">🔊 Default (System Sound)</option>
                  <option value="alert">⚠️ Alert Sound</option>
                  <option value="alarm">🚨 Alarm Sound</option>
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
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0"
                      placeholder="Search users by name or phone number..."
                    />
                  </div>

                  {/* Search Results */}
                  {filteredUsers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredUsers.map((user: User) => (
                        <div
                          key={user.id}
                          onClick={() => addUser(user)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{user.name}</div>
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