/**
 * Users API Service
 * Handles all user-related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { ApiResponse } from '../types';

export type User = {
  id: number;
  name: string;
  email: string;
  mobile?: string | number;
  phone?: string | number;
  country_code?: string;
  dob?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  created_at: string;
  updated_at: string;
};

export type CreateUserRequest = {
  phone_number: string;
  country_code?: string;
  otp: number | string;
  email: string;
  name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  height: number;
  weight: number;
  goal?: string;
  activity_level?: string;
  has_food_allergies?: boolean;
  allergies?: string[];
  [key: string]: unknown;
};

export type CreateUserResponse = {
  data: User;
  token?: string;
  message?: string;
};

export type LoginRequest = {
  mobile: number;
  otp: number | string;
  country_code?: string;
};

export type LoginResponse = {
  data: User;
  token?: string;
  subscriptions?: any[];
  message?: string;
};

export type RegisterUserRequest = {
  phone_number: string;
  email: string;
  name: string;
  date_of_birth: string; // YYYY-MM-DD format
  gender: 'male' | 'female';
  height: number;
  weight: number;
};

export type RegisterUserResponse = {
  data?: User;
  token?: string;
  message?: string;
  success?: boolean;
};

export type CheckUserRequest = {
  phone_number: string;
  otp: number | string;
};

export type ActiveSubscription = {
  id: number;
  subscription_plan_id: number;
  subscription_plan_title: string;
  duration_id: number;
  duration_title: string;
  selected_days: string;
  start_date: string;
  end_date: string;
  price: number;
  payment: string;
  status: string;
};

export type CheckUserData = {
  user_id: number;
  name: string;
  email: string;
  mobile: number | string;
  active_subscription?: ActiveSubscription | null;
};

export type CheckUserResponse = {
  success: boolean;
  exists: boolean;
  data: CheckUserData;
  token?: string;
  message: string;
};

/**
 * Register a new user
 */
export const registerUser = async (userData: RegisterUserRequest): Promise<RegisterUserResponse> => {
  try {
    const response = await apiClient.post<RegisterUserResponse>(
      API_ENDPOINTS.REGISTER,
      userData
    );

    return response;
  } catch (error) {
    console.error('Error registering user:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to register user: ${error.message}`);
    }
    throw new Error('Failed to register user: Unknown error');
  }
};

/**
 * Check if user exists
 */
export const checkUserExists = async (checkData: CheckUserRequest): Promise<CheckUserResponse> => {
  try {
    const response = await apiClient.post<CheckUserResponse>(
      API_ENDPOINTS.CHECK_USER,
      checkData
    );

    return response;
  } catch (error) {
    console.error('Error checking user:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to check user: ${error.message}`);
    }
    throw new Error('Failed to check user: Unknown error');
  }
};

/**
 * Create a new user
 */
type RegisterApiResponse = {
  success?: boolean;
  message?: string;
  data?: User;
  token?: string;
};

export const createUser = async (userData: CreateUserRequest): Promise<CreateUserResponse> => {
  try {
    const response = await apiClient.post<RegisterApiResponse>(API_ENDPOINTS.REGISTER, userData);

    if (!response?.data) {
      console.error('Unexpected register response:', response);
      throw new Error('Invalid response: missing user data');
    }

    return {
      data: response.data,
      token: response.token,
      message: response.message,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
    throw new Error('Failed to create user: Unknown error');
  }
};

/**
 * Login user with phone and OTP
 */
export const loginUser = async (loginData: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.LOGIN,
      loginData
    );

    if (!response || !response.data) {
      console.error('Unexpected API response structure for user login:', response);
      throw new Error('Invalid response: expected data object for user login');
    }

    return response.data as LoginResponse;
  } catch (error) {
    console.error('Error logging in user:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to login: ${error.message}`);
    }
    throw new Error('Failed to login: Unknown error');
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: number): Promise<User> => {
  try {
    const response = await apiClient.get<ApiResponse<User>>(
      `${API_ENDPOINTS.USERS}/${userId}`
    );

    if (!response || !response.data) {
      console.error('Unexpected API response structure for user:', response);
      throw new Error('Invalid response: expected data object for user');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
    throw new Error('Failed to fetch user: Unknown error');
  }
};

/**
 * Update user
 */
export const updateUser = async (userId: number, userData: Partial<User>): Promise<User> => {
  try {
    const response = await apiClient.put<ApiResponse<User>>(
      `${API_ENDPOINTS.USERS}/${userId}`,
      userData
    );

    if (!response || !response.data) {
      console.error('Unexpected API response structure for user update:', response);
      throw new Error('Invalid response: expected data object for user update');
    }

    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
    throw new Error('Failed to update user: Unknown error');
  }
};

