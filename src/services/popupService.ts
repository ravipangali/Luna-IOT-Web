import type {
  PopupFormValues,
  PopupResponse,
  PopupsResponse,
  ApiResponse,
} from "@/types/models";
import { apiService as api } from "@/services/apiService";
import { ENDPOINTS } from "@/config/api";

export const getPopups = async (
  all: boolean = false
): Promise<PopupsResponse> => {
  const response = await api.get<PopupsResponse>(
    `${ENDPOINTS.POPUPS}${all ? "?all=true" : ""}`
  );
  return response;
};

export const getPopup = async (id: number): Promise<PopupResponse> => {
  const response = await api.get<PopupResponse>(ENDPOINTS.POPUP_BY_ID(id.toString()));
  return response;
};

export const createPopup = async (
  data: PopupFormValues
): Promise<PopupResponse> => {
  const response = await api.post<PopupResponse>(ENDPOINTS.POPUPS, data);
  return response;
};

export const updatePopup = async (
  id: number,
  data: PopupFormValues
): Promise<PopupResponse> => {
  const response = await api.put<PopupResponse>(ENDPOINTS.POPUP_BY_ID(id.toString()), data);
  return response;
};

export const deletePopup = async (id: number): Promise<ApiResponse<null>> => {
  const response = await api.delete<ApiResponse<null>>(ENDPOINTS.POPUP_BY_ID(id.toString()));
  return response;
};

// Image handling methods
export const getPopupImage = async (id: number): Promise<{ success: boolean; image: string }> => {
  const response = await api.get<{ success: boolean; image: string }>(ENDPOINTS.POPUP_IMAGE(id.toString()));
  return response;
};

export const deletePopupImage = async (id: number): Promise<ApiResponse<null>> => {
  const response = await api.delete<ApiResponse<null>>(ENDPOINTS.POPUP_IMAGE(id.toString()));
  return response;
}; 