import { apiClient } from "../client";
import { API_ENDPOINTS } from "../config";

// ─── Profile ────────────────────────────────────────────────────────────────

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  mobile: string;
  gender: "male" | "female" | "other" | null;
  height: number | null;
  weight: number | null;
  dob: string | null;
  goal: "eat_healthy" | "lose_weight" | "gain_weight" | "build_muscle" | "maintain_weight" | null;
  activity_level: "sedentary" | "lightly_active" | "very_active" | "highly_active" | null;
  has_food_allergies: boolean;
  allergies: string[];
  dislikes: string[];
  has_affiliated_code: boolean;
  affiliated_code: string | null;
};

export type UpdateProfileBody = Partial<{
  name: string;
  email: string;
  gender: "male" | "female" | "other";
  dob: string;
  height: number;
  weight: number;
  goal: UserProfile["goal"];
  activity_level: UserProfile["activity_level"];
  has_food_allergies: boolean;
  allergies: string[];
}>;

export type ProfileResponse = { success: boolean; data: UserProfile };

export const getProfile = (): Promise<ProfileResponse> =>
  apiClient.get<ProfileResponse>(API_ENDPOINTS.PROFILE);

export const updateProfile = (body: UpdateProfileBody): Promise<ProfileResponse> =>
  apiClient.put<ProfileResponse>(API_ENDPOINTS.PROFILE, body);

// ─── Addresses ──────────────────────────────────────────────────────────────

export type Address = {
  id: number;
  first_name: string;
  last_name: string | null;
  area: string | null;
  block_number: string | null;
  street: string | null;
  house_building: string | null;
  floor_apartment: string | null;
  phone_number: string;
  remarks: string | null;
  delivery_notes: string | null;
  category: "home" | "office";
  is_primary: boolean;
  preferred_delivery_slot: "four_pm_to_eight_pm" | "eight_pm_to_midnight";
  created_at: string;
  updated_at: string;
};

export type AddressBody = {
  first_name: string;
  last_name?: string;
  area?: string;
  block_number?: string;
  street?: string;
  house_building?: string;
  floor_apartment?: string;
  phone_number: string;
  remarks?: string;
  delivery_notes?: string;
  category: "home" | "office";
  is_primary?: boolean;
  preferred_delivery_slot: "four_pm_to_eight_pm" | "eight_pm_to_midnight";
};

export type AddressListResponse  = { success: boolean; data: Address[] };
export type AddressSingleResponse = { success: boolean; data: Address };
export type AddressDeleteResponse = { success: boolean; message: string };

export const getAddresses = (): Promise<AddressListResponse> =>
  apiClient.get<AddressListResponse>(API_ENDPOINTS.ADDRESSES);

export const createAddress = (body: AddressBody): Promise<AddressSingleResponse> =>
  apiClient.post<AddressSingleResponse>(API_ENDPOINTS.ADDRESSES, body);

export const updateAddress = (id: number, body: Partial<AddressBody>): Promise<AddressSingleResponse> =>
  apiClient.put<AddressSingleResponse>(`${API_ENDPOINTS.ADDRESSES}/${id}`, body);

export const deleteAddress = (id: number): Promise<AddressDeleteResponse> =>
  apiClient.delete<AddressDeleteResponse>(`${API_ENDPOINTS.ADDRESSES}/${id}`);
