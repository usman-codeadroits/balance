import { apiClient } from "../client";
import { API_ENDPOINTS } from "../config";

export type Inquiry = {
  id: number;
  subject: string;
  description: string;
  status: "open" | "answered" | "closed" | string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export type SubmitInquiryRequest = {
  subject: string;
  description: string;
};

export type SubmitInquiryResponse = {
  success: boolean;
  message: string;
  data: {
    id: number;
    subject: string;
    status: string;
    created_at: string;
  };
};

export type GetInquiriesResponse = {
  success: boolean;
  data: Inquiry[];
};

export const getInquiries = async (): Promise<GetInquiriesResponse> => {
  try {
    const response = await apiClient.get<GetInquiriesResponse>(
      API_ENDPOINTS.INQUIRIES,
    );
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load inquiries: ${error.message}`);
    }
    throw new Error("Failed to load inquiries.");
  }
};

export const submitInquiry = async (
  data: SubmitInquiryRequest,
): Promise<SubmitInquiryResponse> => {
  try {
    const response = await apiClient.post<SubmitInquiryResponse>(
      API_ENDPOINTS.INQUIRIES,
      data,
    );
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to submit inquiry: ${error.message}`);
    }
    throw new Error("Failed to submit inquiry.");
  }
};
