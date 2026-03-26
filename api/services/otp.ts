import { apiClient } from "../client";
import { API_ENDPOINTS } from "../config";
import type { User } from "./users";

export type SendOtpRequest = {
  phone_number: string;
  country_code?: string;
};

export type SendOtpData = {
  phone_number: string;
  otp_code?: number;
  expires_at?: string;
  link?: string;
  [key: string]: unknown;
};

export type SendOtpResponse = {
  success: boolean;
  message: string;
  data?: SendOtpData;
};

export type VerifyOtpRequest = {
  phone_number: string;
  otp_code: string;
  country_code?: string;
};

export type VerifiedUser = User & {
  id: number;
  name: string;
  email: string;
  mobile: string;
  gender?: "male" | "female" | "other";
  height?: number;
  weight?: number;
  dob?: string;
  goal?: string;
  activity_level?: string;
  has_food_allergies?: boolean;
  allergies?: string[];
  has_affiliated_code?: boolean;
  affiliated_code?: string | null;
  otp?: string;
  token?: string; // Auth token from backend
  roles?: Array<{ id: number; title: string }>;
  created_at: string;
  updated_at: string;
};

export type Address = {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  area: string;
  block_number: string;
  street: string;
  house_building: string;
  floor_apartment: string;
  phone_number: string;
  remarks: string | null;
  category: string;
  is_primary: boolean;
  preferred_delivery_slot: string;
};

export type Subscription = {
  id: number;
  subscription_plan_id: number;
  subscription_plan_title: string;
  duration_id: number;
  duration_title: string;
  selected_days: string[];
  start_date: string;
  end_date: string;
  price: number;
  payment: string;
  status: string;
  is_personalized: boolean;
  protein: number | null;
  carbs: number | null;
  subscription_days: any[];
};

export type VerifyOtpDataComplete = {
  country_code: string;
  phone_number: string;
  user: VerifiedUser;
  addresses: Address[];
  subscription: Subscription;
  token?: string; // Added for authentication token
};

export type VerifyOtpDataIncomplete = {
  country_code: string;
  phone_number: string;
  token?: string; // Auth token from backend
};

export type VerifyOtpResponse = {
  success: boolean;
  message: string;
  user_exists?: boolean;
  data: VerifyOtpDataComplete | VerifyOtpDataIncomplete;
};

export const sendOtp = async (
  payload: SendOtpRequest,
): Promise<SendOtpResponse> => {
  return apiClient.post<SendOtpResponse>(API_ENDPOINTS.OTP_SEND, payload);
};

export const verifyOtp = async (
  payload: VerifyOtpRequest,
): Promise<VerifyOtpResponse> => {
  try {
    return await apiClient.post<VerifyOtpResponse>(
      API_ENDPOINTS.OTP_VERIFY,
      payload,
    );
  } catch (error: any) {
    // Handle HTTP 400 errors (user not found, invalid OTP)
    // The error object from apiClient has status and response properties
    const status = (error as any)?.status;
    const errorResponse = (error as any)?.response || {};

    if (status === 400) {
      const errorResponseData: VerifyOtpResponse = {
        success: false,
        message:
          errorResponse.message || error.message || "OTP verification failed",
        data: {
          country_code: payload.country_code || "",
          phone_number: payload.phone_number,
        },
      };
      return errorResponseData;
    }
    // Re-throw other errors (including 422 validation errors)
    throw error;
  }
};
