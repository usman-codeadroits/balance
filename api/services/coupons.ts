import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export type ValidateCouponRequest = {
  coupon_code: string;
  user_id?: number;
};

export type ValidateCouponResponseData = {
  coupon_id: number;
  coupon_code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  readable_discount?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  usage_limit_per_user?: number;
  user_usage_count?: number;
  remaining_uses?: number;
};

export type ValidateCouponResponse = {
  success: boolean;
  message: string;
  data: ValidateCouponResponseData;
};

export const validateCoupon = async (
  payload: ValidateCouponRequest
): Promise<ValidateCouponResponse> => {
  return apiClient.post<ValidateCouponResponse>(API_ENDPOINTS.COUPON_VALIDATE, payload);
};
