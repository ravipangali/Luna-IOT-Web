import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave, faUser, faUpload } from '@fortawesome/free-solid-svg-icons';
import { userController } from '../../controllers';
import type { UserFormData, Role, User } from '../../types/models';
import { Role as RoleEnum } from '../../types/models';
import { toast } from 'react-toastify';

export const UserEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: '',
    role: RoleEnum.CLIENT,
    image: ''
  });

  const [errors, setErrors] = useState<Partial<UserFormData>>({});

  useEffect(() => {
    const loadUser = async () => {
      if (!id) return;
      
      try {
        setLoadingData(true);
        const response = await userController.getUser(id);
        
        if (response.success && response.data) {
          const user = response.data;
          setUserData(user);
          
          setFormData({
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            image: user.image || '',
            password: '',
            confirm_password: ''
          });
        }
      } catch (error) {
        console.error('Error loading user:', error);
        toast.error('Error loading user data.');
      } finally {
        setLoadingData(false);
      }
    };

    loadUser();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Partial<UserFormData> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Password validation only if attempting to change password
    if (formData.password || formData.confirm_password) {
      if (!formData.password) newErrors.password = 'Password is required when providing confirm password';
      if (!formData.confirm_password) newErrors.confirm_password = 'Confirm password is required when changing password';
      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      // Only send password if it's provided
      const dataToUpdate: Partial<UserFormData> = { ...formData };
      if (!dataToUpdate.password) {
        // Only delete the properties if they exist
        if ('password' in dataToUpdate) {
          delete dataToUpdate.password;
        }
        if ('confirm_password' in dataToUpdate) {
          delete dataToUpdate.confirm_password;
        }
      }
      
      await userController.updateUser(id!, dataToUpdate);
      toast.success('User updated successfully!');
      navigate('/admin/users');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error updating user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UserFormData, value: string | Role) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' }));
        return;
      }
      
      // Validate file type
      if (!file.type.match('image/(jpeg|jpg|png|gif)')) {
        setErrors(prev => ({ ...prev, image: 'Only JPEG, PNG and GIF images are allowed' }));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        handleChange('image', result);
        // Clear any previous image error
        if (errors.image) {
          setErrors(prev => ({ ...prev, image: undefined }));
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = async () => {
    if (!userData?.id) return;
    
    try {
              // Only call API if user has an image stored in the database
      if (userData.image && formData.image === userData.image) {
        // Convert id to number if needed
        const userId = typeof userData.id === 'string' ? parseInt(userData.id) : userData.id;
        await apiService.deleteUserImage(userId);
      }
      
      // Update local state regardless
      handleChange('image', '');
      
      // Clear any previous image error
      if (errors.image) {
        setErrors(prev => ({ ...prev, image: undefined }));
      }
      
      toast.success('Profile image removed successfully');
    } catch (error) {
      console.error('Failed to remove image:', error);
      toast.error('Failed to remove profile image');
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit User</h1>
        <Link to="/admin/users" className="text-green-600 hover:text-green-800">
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back to Users
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              {formData.image ? (
                <div className="relative">
                  <img 
                    src={formData.image} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 focus:outline-none"
                    title="Remove image"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300">
                  <FontAwesomeIcon icon={faUser} className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Image
              </label>
              <div className="flex flex-col space-y-2">
                <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  <FontAwesomeIcon icon={faUpload} className="w-4 h-4 mr-2" />
                  Upload Image
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleImageUpload}
                  />
                </label>
                <p className="text-xs text-gray-500">JPG, PNG, GIF up to 5MB</p>
                {errors.image && <p className="text-red-500 text-xs">{errors.image}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter full name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter phone number"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', parseInt(e.target.value) as Role)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value={RoleEnum.CLIENT}>Client</option>
                <option value={RoleEnum.ADMIN}>Admin</option>
              </select>
            </div>
            
            {/* Password Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Leave blank to keep current password"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => handleChange('confirm_password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Leave blank to keep current password"
              />
              {errors.confirm_password && <p className="text-red-500 text-sm mt-1">{errors.confirm_password}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 mt-8">
            <Link
              to="/admin/users"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} className="mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 