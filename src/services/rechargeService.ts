import { apiService } from './apiService';

interface RechargeRequest {
  imei: string;
  amount: number;
}

interface MyPayResponseData {
  CreditsConsumed: number;
  CreditsAvailable: number;
  Id: number;
}

interface MyPayResponse {
  Status: boolean;
  Message: string;
  Data: MyPayResponseData;
  StatusCode: number;
  State: string;
  Description: unknown | null;
}

// This can be typed more strictly based on backend MyPayResponse
interface RechargeResponse {
  success: boolean;
  message: string;
  response: MyPayResponse;
}

export const rechargeService = {
  recharge: async (data: RechargeRequest): Promise<RechargeResponse> => {
    return apiService.post('/api/v1/recharge', data);
  },
}; 