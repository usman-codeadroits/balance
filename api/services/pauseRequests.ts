import { apiClient } from "../client";
import { API_ENDPOINTS } from "../config";

export type PauseRequestStatus = "pending" | "approved" | "rejected" | "cancelled" | "resumed";

export type PauseRequest = {
  id: number;
  subscription_id: number;
  pause_start_date: string;
  pause_end_date: string;
  pause_days: number;
  reason: string;
  status: PauseRequestStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type SubmitPauseRequestBody = {
  pause_start_date: string;
  pause_end_date: string;
  reason: string;
};

export type SubmitPauseRequestResponse = {
  success: boolean;
  message: string;
  data: PauseRequest;
};

export type GetPauseRequestsResponse = {
  success: boolean;
  data: PauseRequest[];
};

export const submitPauseRequest = async (
  subscriptionId: number,
  body: SubmitPauseRequestBody,
): Promise<SubmitPauseRequestResponse> => {
  return apiClient.post<SubmitPauseRequestResponse>(
    `${API_ENDPOINTS.SUBSCRIPTION_PAUSE_REQUEST}/${subscriptionId}/pause-request`,
    body,
  );
};

export const getPauseRequests = async (
  subscriptionId: number,
): Promise<GetPauseRequestsResponse> => {
  return apiClient.get<GetPauseRequestsResponse>(
    `${API_ENDPOINTS.SUBSCRIPTION_PAUSE_REQUEST}/${subscriptionId}/pause-requests`,
  );
};

export const cancelPauseRequest = async (
  subscriptionId: number,
  pauseRequestId: number,
): Promise<{ success: boolean; message: string }> => {
  return apiClient.delete(
    `${API_ENDPOINTS.SUBSCRIPTION_PAUSE_REQUEST}/${subscriptionId}/pause-request/${pauseRequestId}`,
  );
};

export const resumePauseRequest = async (
  subscriptionId: number,
  pauseRequestId: number,
): Promise<{ success: boolean; message: string }> => {
  return apiClient.post(
    `${API_ENDPOINTS.SUBSCRIPTION_PAUSE_REQUEST}/${subscriptionId}/pause-request/${pauseRequestId}/resume`,
    {},
  );
};
