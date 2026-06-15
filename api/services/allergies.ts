import { apiClient } from "../client";
import { API_ENDPOINTS } from "../config";

export type AllergiesData = {
  has_food_allergies: boolean;
  allergies: string[];
};

export type AllergiesResponse = {
  success: boolean;
  data: AllergiesData;
};

export type UpdateAllergiesResponse = {
  success: boolean;
  message: string;
  data: AllergiesData;
};

export type UpdateAllergiesBody = {
  has_food_allergies: boolean;
  allergies?: string[];
};

export const getAllergies = (): Promise<AllergiesResponse> =>
  apiClient.get<AllergiesResponse>(API_ENDPOINTS.ALLERGIES);

export const updateAllergies = (
  body: UpdateAllergiesBody,
): Promise<UpdateAllergiesResponse> =>
  apiClient.put<UpdateAllergiesResponse>(API_ENDPOINTS.ALLERGIES, body);
