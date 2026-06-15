import { apiClient } from "../client";
import { API_ENDPOINTS } from "../config";

export type DislikesData = {
  dislikes: string[];
};

export type DislikesResponse = {
  success: boolean;
  data: DislikesData;
};

export type UpdateDislikesResponse = {
  success: boolean;
  message: string;
  data: DislikesData;
};

export type ClearDislikesResponse = {
  success: boolean;
  message: string;
  data: DislikesData;
};

export const getDislikes = (): Promise<DislikesResponse> =>
  apiClient.get<DislikesResponse>(API_ENDPOINTS.DISLIKES);

export const updateDislikes = (
  dislikes: string[],
): Promise<UpdateDislikesResponse> =>
  apiClient.put<UpdateDislikesResponse>(API_ENDPOINTS.DISLIKES, { dislikes });

export const clearDislikes = (): Promise<ClearDislikesResponse> =>
  apiClient.delete<ClearDislikesResponse>(API_ENDPOINTS.DISLIKES);
