import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPopup } from "@/services/popupService";
import type { PopupFormValues } from "@/types/models";
import { ApiError } from "@/services/apiService";
import { toast } from 'react-toastify';
import PopupForm from "./PopupForm";

const CreatePopup: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: createPopup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popups"] });
      toast.success('Popup created successfully!');
      navigate("/admin/popups");
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Failed to create popup. Please try again.');
    },
  });

  const handleSubmit = (values: PopupFormValues) => {
    mutation.mutate(values);
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Create New Popup</h1>
              <p className="text-sm text-gray-500 mt-1">Add a new popup to your application</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <PopupForm
            onSubmit={handleSubmit}
            isSubmitting={mutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default CreatePopup; 