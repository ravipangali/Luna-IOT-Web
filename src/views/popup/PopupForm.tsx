import React from 'react';
import type { Popup, PopupFormValues } from "@/types/models";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faTrash } from '@fortawesome/free-solid-svg-icons';

const popupFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  is_active: z.boolean(),
  image: z.string().min(1, "Image is required"),
});

interface PopupFormProps {
  onSubmit: (values: PopupFormValues) => void;
  initialData?: Popup;
  isSubmitting: boolean;
  onRemoveImage?: () => void;
  isRemovingImage?: boolean;
}

const PopupForm = ({
  onSubmit,
  initialData,
  isSubmitting,
  onRemoveImage,
  isRemovingImage = false,
}: PopupFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PopupFormValues>({
    resolver: zodResolver(popupFormSchema),
    defaultValues: initialData || {
      title: "",
      is_active: true,
      image: "",
    },
  });

  const isActive = watch("is_active");
  const imageValue = watch("image");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.match('image/(jpeg|jpg|png|gif)')) {
        alert('Only JPEG, PNG and GIF images are allowed');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setValue("image", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    if (onRemoveImage && initialData?.image && imageValue === initialData.image) {
      // If we have an onRemoveImage callback and the image hasn't changed, call the API
      onRemoveImage();
    } else {
      // Otherwise just clear the form value
      setValue("image", "");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Enter popup title"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Image Upload Section */}
      <div>
        <Label htmlFor="image">Popup Image</Label>
        
        {/* Image Preview */}
        {imageValue && (
          <div className="mb-4">
            <div className="relative inline-block">
              <img
                src={imageValue}
                alt="Popup preview"
                className="max-w-xs h-auto rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isRemovingImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 focus:outline-none disabled:opacity-50"
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
            {imageValue ? 'Change Image' : 'Upload Image'}
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleImageUpload}
            />
          </label>
          <p className="text-xs text-gray-500">JPG, PNG, GIF up to 5MB</p>
          {errors.image && (
            <p className="text-red-500 text-xs">{errors.image.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="is_active" className="text-base">
            Active
          </Label>
        </div>
        <input
          type="checkbox"
          id="is_active"
          checked={isActive}
          onChange={(e) => setValue("is_active", e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default PopupForm; 