import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPopup, updatePopup, deletePopupImage } from "@/services/popupService";
import type { PopupFormValues } from "@/types/models";
import { ApiError } from "@/services/apiService";
import { toast } from 'react-toastify';
import PopupForm from "./PopupForm";

const EditPopup: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: popupResponse, isLoading } = useQuery({
    queryKey: ["popups", id],
    queryFn: () => getPopup(Number(id)),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (values: PopupFormValues) =>
      updatePopup(Number(id), values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popups"] });
      toast.success('Popup updated successfully!');
      navigate("/admin/popups");
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to update popup. Please try again.');
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: () => deletePopupImage(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popups", id] });
      toast.success('Popup image removed successfully!');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to remove popup image. Please try again.');
    },
  });

  const handleSubmit = (values: PopupFormValues) => {
    mutation.mutate(values);
  };

  const handleRemoveImage = async () => {
    if (!popupResponse?.data?.image) return;
    
    try {
      await deleteImageMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to remove image:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto">
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
        <div className="max-w-2xl mx-auto">
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/popups"
              className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Popup</h1>
              <p className="text-sm text-gray-500 mt-1">Update popup information</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <PopupForm
            onSubmit={handleSubmit}
            isSubmitting={mutation.isPending}
            initialData={popupResponse.data}
            onRemoveImage={handleRemoveImage}
            isRemovingImage={deleteImageMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default EditPopup; 