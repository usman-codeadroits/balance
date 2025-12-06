/**
 * Subscriptions API Service
 * Handles all subscription-related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { ApiResponse } from '../types';

export type Subscription = {
  id: number;
  user_id: number;
  plan_id: number;
  duration_id: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  plan_price: number;
  vat: number;
  total_price: number;
  selected_days: number[];
  day_meals: { [key: number]: any };
  address: any;
  created_at: string;
  updated_at: string;
};

export type CheckoutRequest = {
  user_id: number;
  subcrption_plans_id: number; // Note: API uses "subcrption" (typo in API)
  duration_id: number;
  selected_days: string; // Comma-separated string like "monday,tuesday,wednesday"
  start_date: string; // YYYY-MM-DD format
  price: number;
  payment: 'paid' | 'pending';
  status: 'active' | 'pending';
  is_personalized: boolean;
  protein: number;
  carbs: number;
  meals: {
    day: string; // lowercase day name like "monday"
    meal_id: number;
    type: 'is meal' | 'is snack';
  }[];
  address?: {
    first_name: string;
    last_name: string;
    area: string;
    block_number: string;
    street: string;
    house_building: string;
    floor_apartment: string;
    phone_number: string;
    remarks?: string;
    category: 'home' | 'office';
    is_primary: boolean;
    preferred_delivery_slot: string;
  };
  amount?: number;
  currency?: string;
  card_holder_name?: string;
  card_number?: string;
  card_expiry_month?: string;
  card_expiry_year?: string;
  card_cvv?: string;
  save_card?: boolean;
  user_subscription_id?: number;
};

export type CheckoutResponse = {
  data: Subscription;
  message?: string;
};

/**
 * Create subscription checkout
 */
export const checkoutSubscription = async (
  checkoutData: CheckoutRequest
): Promise<CheckoutResponse> => {
  try {
    console.log('Checkout request data:', JSON.stringify(checkoutData, null, 2));
    
    const response = await apiClient.post<CheckoutResponse>(
      API_ENDPOINTS.SUBSCRIPTION_CHECKOUT,
      checkoutData
    );

    console.log('Checkout response:', JSON.stringify(response, null, 2));

    // API returns the subscription data directly or wrapped
    return response;
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    
    // Extract error message from API response if available
    let errorMessage = 'Failed to create subscription';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check if error has response data attached
      if ((error as any).response) {
        const errorResponse = (error as any).response;
        if (errorResponse.message) {
          errorMessage = errorResponse.message;
        }
        // Include validation errors if present
        if (errorResponse.errors && typeof errorResponse.errors === 'object') {
          const validationErrors = Object.values(errorResponse.errors).flat();
          if (validationErrors.length > 0) {
            errorMessage = validationErrors.join('. ');
          }
        }
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Get user subscriptions
 */
export const getUserSubscriptions = async (userId: number): Promise<Subscription[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Subscription[]>>(
      `${API_ENDPOINTS.USERS}/${userId}/subscriptions`
    );

    if (!response || !response.data) {
      console.error('Unexpected API response structure for subscriptions:', response);
      throw new Error('Invalid response: expected data array for subscriptions');
    }

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }
    throw new Error('Failed to fetch subscriptions: Unknown error');
  }
};

/**
 * Get active subscription for user
 */
export const getActiveSubscription = async (userId: number): Promise<Subscription | null> => {
  try {
    const subscriptions = await getUserSubscriptions(userId);
    const active = subscriptions.find(
      (sub) => sub.status === 'active' && new Date(sub.end_date) >= new Date()
    );
    return active || null;
  } catch (error) {
    console.error('Error fetching active subscription:', error);
    return null;
  }
};

export type UpdateMealRequest = {
  user_id: number;
  day: string; // lowercase day name like "monday"
  meal_id: number;
  type: 'is meal' | 'is snack';
  subscription_meal_id?: number; // Optional: required for update, omitted for create
};

export type UpdateMealResponse = {
  success: boolean;
  message: string;
  data: {
    subscription_meal: {
      id: number;
      subscription_days_id: number;
      day: string;
      meal_id: number;
      meal: {
        id: number;
        title: string;
        description: string;
        calories: number;
        protein_g: number;
        fat_g: number;
        carbs_g: number;
      };
      type: 'is meal' | 'is snack';
      user_subscription_id: number;
      created_at: string;
      updated_at: string;
    };
  };
};

/**
 * Update or create subscription meal
 * - If subscription_meal_id is provided, updates existing meal
 * - If subscription_meal_id is omitted, creates new meal for the day
 */
export const updateSubscriptionMeal = async (
  updateData: UpdateMealRequest
): Promise<UpdateMealResponse> => {
  try {
    console.log('Update/Create meal request data:', JSON.stringify(updateData, null, 2));
    
    // Build request payload - only include subscription_meal_id if provided
    const requestPayload: any = {
      user_id: updateData.user_id,
      day: updateData.day,
      meal_id: updateData.meal_id,
      type: updateData.type,
    };
    
    // Only include subscription_meal_id if provided (for updates)
    if (updateData.subscription_meal_id !== undefined) {
      requestPayload.subscription_meal_id = updateData.subscription_meal_id;
    }
    
    const response = await apiClient.post<UpdateMealResponse>(
      API_ENDPOINTS.SUBSCRIPTION_MEALS_UPDATE,
      requestPayload
    );

    console.log('Update/Create meal response:', JSON.stringify(response, null, 2));

    return response;
  } catch (error) {
    console.error('Error updating/creating subscription meal:', error);
    
    // Extract error message from API response if available
    let errorMessage = updateData.subscription_meal_id !== undefined 
      ? 'Failed to update meal' 
      : 'Failed to create meal';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check if error has response data attached
      if ((error as any).response) {
        const errorResponse = (error as any).response;
        if (errorResponse.message) {
          errorMessage = errorResponse.message;
        }
        // Include validation errors if present
        if (errorResponse.errors && typeof errorResponse.errors === 'object') {
          const validationErrors = Object.values(errorResponse.errors).flat();
          if (validationErrors.length > 0) {
            errorMessage = validationErrors.join('. ');
          }
        }
      }
    }
    
    throw new Error(errorMessage);
  }
};

