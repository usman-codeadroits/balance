import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { ActiveSubscription, User } from './users';

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
  otp_code: string | number;
  country_code?: string;
};

export type VerifiedUser = User & {
  otp?: number;
  roles?: Array<{ id: number; title: string }>;
};

export type VerifyOtpData = {
  country_code?: string;
  phone_number: string;
  verified: boolean;
  link?: string;
  token?: string;
  user?: VerifiedUser | null;
  active_subscription?: ActiveSubscription | null;
  user_data_exists?: boolean;
  [key: string]: unknown;
};

export type VerifyOtpResponse = {
  success: boolean;
  message: string;
  data: VerifyOtpData;
};

export const sendOtp = async (payload: SendOtpRequest): Promise<SendOtpResponse> => {
  return apiClient.post<SendOtpResponse>(API_ENDPOINTS.OTP_SEND, payload);
};

export const verifyOtp = async (payload: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
  return apiClient.post<VerifyOtpResponse>(API_ENDPOINTS.OTP_VERIFY, payload);
};

