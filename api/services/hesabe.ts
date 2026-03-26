import { apiClient } from "../client";

export interface HesabePaymentRequest {
  amount: number;
  currency: string;
  merchantOrderId: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  responseUrl: string;
  failureUrl: string;
}

export interface HesabePaymentResponse {
  status: boolean;
  message: string;
  paymentUrl?: string;
  reference?: string;
  transactionId?: string;
}

/**
 * Initiate Hesabe payment checkout
 * The backend will encrypt the payload and communicate with Hesabe sandbox API
 */
export async function initiateHesabePayment(
  request: HesabePaymentRequest,
): Promise<HesabePaymentResponse> {
  const response = await apiClient.post<HesabePaymentResponse>(
    "/v1/hesabe/checkout",
    request,
  );
  return response.data;
}
