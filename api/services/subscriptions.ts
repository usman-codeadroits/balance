/**
 * Subscriptions API Service
 * Handles all subscription-related API calls
 */

import { apiClient } from "../client";
import { API_ENDPOINTS } from "../config";
import type { ApiResponse } from "../types";

export type Subscription = {
  id: number;
  user_id: number;
  plan_id: number;
  duration_id: number;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "cancelled";
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
  duration_id?: number; // kept for local draft compat, not sent to /v1/payment/checkout
  selected_days: string[] | string; // Array preferred: ["monday","tuesday"]; string for legacy drafts
  start_date: string; // YYYY-MM-DD format
  coupon_code?: string; // optional — applied discount coupon
  price?: number; // local display only
  payment?: "paid" | "pending"; // local tracking only
  status?: "active" | "pending"; // local tracking only
  is_personalized?: boolean;
  protein?: number;
  carbs?: number;
  meals?: {
    day: string; // lowercase day name like "monday"
    meal_id: number;
    type: "is meal" | "is snack";
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
    category: "home" | "office";
    is_primary: boolean;
    preferred_delivery_slot: "four_pm_to_eight_pm" | "eight_pm_to_midnight";
  };
  area_id?: number;
  amount?: number;
  currency?: string;
  card_holder_name?: string;
  card_number?: string;
  card_expiry_month?: string;
  card_expiry_year?: string;
  card_cvv?: string;
  save_card?: boolean;
  user_subscription_id?: number;
  payment_reference?: string;
  payment_transaction_id?: string;
};

export type CheckoutResponse = {
  data: Subscription;
  message?: string;
};

/**
 * Create subscription checkout
 */
export const checkoutSubscription = async (
  checkoutData: CheckoutRequest,
): Promise<CheckoutResponse> => {
  try {
    const response = await apiClient.post<CheckoutResponse>(
      API_ENDPOINTS.SUBSCRIPTION_CHECKOUT,
      checkoutData,
    );

    // API returns the subscription data directly or wrapped
    return response;
  } catch (error) {
    // Extract error message from API response if available
    let errorMessage = "Failed to create subscription";
    if (error instanceof Error) {
      errorMessage = error.message;

      // Check if error has response data attached
      if ((error as any).response) {
        const errorResponse = (error as any).response;
        if (errorResponse.message) {
          errorMessage = errorResponse.message;
        }
        // Include validation errors if present
        if (errorResponse.errors && typeof errorResponse.errors === "object") {
          const validationErrors = Object.values(errorResponse.errors).flat();
          if (validationErrors.length > 0) {
            errorMessage = validationErrors.join(". ");
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
export const getUserSubscriptions = async (
  userId: number,
): Promise<Subscription[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Subscription[]>>(
      `${API_ENDPOINTS.USERS}/${userId}/subscriptions`,
    );

    if (!response || !response.data) {
      throw new Error(
        "Invalid response: expected data array for subscriptions",
      );
    }

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }
    throw new Error("Failed to fetch subscriptions: Unknown error");
  }
};

/**
 * Get active subscription for user
 */
export const getActiveSubscription = async (
  userId: number,
): Promise<Subscription | null> => {
  try {
    const subscriptions = await getUserSubscriptions(userId);
    const active = subscriptions.find(
      (sub) => sub.status === "active" && new Date(sub.end_date) >= new Date(),
    );
    return active || null;
  } catch (error) {
    return null;
  }
};

export type UpdateMealRequest = {
  user_id: number;
  subscription_day_id?: number; // Preferred: ID of the subscription_day record
  day?: string; // Fallback: lowercase day name like "monday" (used when subscription_day_id unavailable)
  meal_id: number;
  type: "is meal" | "is snack";
  subscription_meal_id?: number; // Optional: required for update, omitted for create
};

export type SubscriptionMealItem = {
  id: number;
  meal_id: number;
  type: "is meal" | "is snack";
  meal: {
    id: number;
    title: string;
    description?: string;
    calories?: number;
    protein_g?: number;
    fat_g?: number;
    carbs_g?: number;
    image_url?: string;
    image_thumb_url?: string;
  };
  subscription_days_id?: number;
  user_subscription_id?: number;
  created_at?: string;
  updated_at?: string;
};

export type WeeklyScheduleDay = {
  subscription_day_id: number;
  day: string;
  meals: SubscriptionMealItem[];
};

export type SubscriptionMealsResponse = {
  success: boolean;
  data: {
    user_subscription_id: number;
    plan_title?: string;
    no_of_weeks?: number;
    days_per_week?: number;
    start_date?: string;
    end_date?: string;
    note?: string;
    // New format
    weekly_schedule?: WeeklyScheduleDay[];
    // Legacy format (kept for backward compat)
    subscription_days?: {
      id: number;
      user_subcrptions_id?: number;
      day: string;
      subscription_meals: SubscriptionMealItem[];
    }[];
  };
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
      type: "is meal" | "is snack";
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
  updateData: UpdateMealRequest,
): Promise<UpdateMealResponse> => {
  try {
    // Build request payload - prefer subscription_day_id, fall back to day string
    const requestPayload: any = {
      user_id: updateData.user_id,
      meal_id: updateData.meal_id,
      type: updateData.type,
    };

    if (updateData.subscription_day_id !== undefined) {
      requestPayload.subscription_day_id = updateData.subscription_day_id;
    } else if (updateData.day) {
      requestPayload.day = updateData.day;
    }

    // Only include subscription_meal_id if provided (for updates)
    if (updateData.subscription_meal_id !== undefined) {
      requestPayload.subscription_meal_id = updateData.subscription_meal_id;
    }

    const response = await apiClient.post<UpdateMealResponse>(
      API_ENDPOINTS.SUBSCRIPTION_MEALS_UPDATE,
      requestPayload,
    );

    return response;
  } catch (error) {
    // Extract error message from API response if available
    let errorMessage =
      updateData.subscription_meal_id !== undefined
        ? "Failed to update meal"
        : "Failed to create meal";
    if (error instanceof Error) {
      errorMessage = error.message;

      // Check if error has response data attached
      if ((error as any).response) {
        const errorResponse = (error as any).response;
        if (errorResponse.message) {
          errorMessage = errorResponse.message;
        }
        // Include validation errors if present
        if (errorResponse.errors && typeof errorResponse.errors === "object") {
          const validationErrors = Object.values(errorResponse.errors).flat();
          if (validationErrors.length > 0) {
            errorMessage = validationErrors.join(". ");
          }
        }
      }
    }

    throw new Error(errorMessage);
  }
};

/**
 * Get current subscription meals for a user (by day and meal/snack)
 */
export const getSubscriptionMeals = async (
  userId: number,
): Promise<SubscriptionMealsResponse> => {
  try {
    // API expects user_id as a query parameter, not a path segment
    const response = await apiClient.get<SubscriptionMealsResponse>(
      `${API_ENDPOINTS.SUBSCRIPTION_MEALS}?user_id=${encodeURIComponent(
        String(userId),
      )}`,
    );

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch subscription meals: ${error.message}`);
    }
    throw new Error("Failed to fetch subscription meals: Unknown error");
  }
};

// ===== NEW USER SUBSCRIPTION API =====

export type SubscriptionPlan = {
  id: number;
  title: string;
};

export type Duration = {
  id: number;
  title: string;
};

export type UserSubscriptionSummary = {
  id: number;
  user_id: number;
  subcrption_plans_id: number;
  duration_id: number;
  start_date: string;
  end_date: string;
  status: string;
  price: string;
  subcrption_plans: SubscriptionPlan;
  duration: Duration;
  is_paused?: boolean;
  paused_at?: string | null;
  paused_until?: string | null;
  total_paused_days?: number;
};

export type PauseLog = {
  id: number;
  action: "pause" | "resume";
  action_timestamp: string;
  paused_at: string | null;
  resumed_at: string | null;
  paused_days: number;
  reason: string | null;
  performed_by_type: "user" | "admin";
  performed_by_name: string;
  notes: string | null;
  metadata: Record<string, unknown>;
};

export type PauseLogsResponse = {
  success: boolean;
  subscription_id: number;
  pause_logs: PauseLog[];
};

export type MySubscriptionsResponse = {
  success: boolean;
  data: {
    active: UserSubscriptionSummary[];
    queued: UserSubscriptionSummary[];
    recent: UserSubscriptionSummary[];
  };
};

export type RenewalDetail = {
  id: number;
  plan: { id: number; title: string; price: number };
  selected_days: string;
  start_date: string;
  end_date: string;
  price: number;
  currency: string;
  payment: string;
  status: string;
};

export type SubscriptionRenewalResponse = {
  data: {
    subscription_id: number;
    auto_renew: boolean;
    renewal_notified_at: string | null;
    renewal: RenewalDetail | null;
  };
};

export type UpdateRenewalPlanRequest = {
  subcrption_plans_id: number;
};

export type UpdateRenewalPlanResponse = {
  success: boolean;
  message: string;
  data: {
    renewal_id: number;
    plan: { id: number; title: string; price: number };
    start_date: string;
    end_date: string;
    price: number;
  };
};

export type CancelRenewalResponse = {
  success: boolean;
  message: string;
};

export type SubscriptionAddress = {
  id: number;
  first_name: string;
  area: string;
  street: string;
};

export type SubscriptionMeal = {
  id: number;
  meal_id: number;
  type: string;
  meal: {
    id: number;
    title: string;
    calories: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  };
};

export type SubscriptionDay = {
  id: number;
  day: string;
  subscription_meals: SubscriptionMeal[];
};

export type UserSubscriptionDetails = {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  price: string;
  currency: string;
  status: string;
  is_personalized: boolean;
  is_paused?: boolean;
  paused_at?: string | null;
  paused_until?: string | null;
  total_paused_days?: number;
  address: SubscriptionAddress;
  subscription_days: SubscriptionDay[];
};

export type SubscriptionDetailsResponse = {
  success: boolean;
  data: UserSubscriptionDetails;
};

/**
 * Get all user subscriptions (active & recent)
 * @returns Promise with active and recent subscriptions
 */
export const getMySubscriptions =
  async (): Promise<MySubscriptionsResponse> => {
    try {
      const response = await apiClient.get<MySubscriptionsResponse>(
        API_ENDPOINTS.MY_SUBSCRIPTIONS,
      );
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch subscriptions: ${error.message}`);
      }
      throw new Error("Failed to fetch subscriptions: Unknown error");
    }
  };

/**
 * Get subscription full details by ID
 * @param subscriptionId - The subscription ID
 * @returns Promise with subscription details
 */
export const getSubscriptionDetails = async (
  subscriptionId: number,
): Promise<SubscriptionDetailsResponse> => {
  try {
    const response = await apiClient.get<SubscriptionDetailsResponse>(
      `${API_ENDPOINTS.MY_SUBSCRIPTION_DETAILS}/${subscriptionId}`,
    );
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch subscription details: ${error.message}`);
    }
    throw new Error("Failed to fetch subscription details: Unknown error");
  }
};

/**
 * Get pause logs for a subscription
 * @param subscriptionId - The subscription ID
 * @returns Promise with pause logs
 */
export const getSubscriptionPauseLogs = async (
  subscriptionId: number,
): Promise<PauseLogsResponse> => {
  try {
    const response = await apiClient.get<PauseLogsResponse>(
      `${API_ENDPOINTS.SUBSCRIPTION_PAUSE_LOGS}/${subscriptionId}/pause-logs`,
    );
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch pause logs: ${error.message}`);
    }
    throw new Error("Failed to fetch pause logs: Unknown error");
  }
};

/**
 * Get renewal details for an active subscription
 * @param subscriptionId - The active subscription ID
 */
export const getSubscriptionRenewal = async (
  subscriptionId: number,
): Promise<SubscriptionRenewalResponse> => {
  try {
    const response = await apiClient.get<SubscriptionRenewalResponse>(
      `${API_ENDPOINTS.SUBSCRIPTION_RENEWAL}/${subscriptionId}/renewal`,
    );
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch renewal details: ${error.message}`);
    }
    throw new Error("Failed to fetch renewal details: Unknown error");
  }
};

/**
 * Update the plan for a queued renewal
 * @param subscriptionId - The active subscription ID
 * @param planId - The new plan ID
 */
export const updateRenewalPlan = async (
  subscriptionId: number,
  planId: number,
): Promise<UpdateRenewalPlanResponse> => {
  try {
    const response = await apiClient.put<UpdateRenewalPlanResponse>(
      `${API_ENDPOINTS.SUBSCRIPTION_RENEWAL}/${subscriptionId}/renewal-plan`,
      { subcrption_plans_id: planId },
    );
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to update renewal plan: ${error.message}`);
    }
    throw new Error("Failed to update renewal plan: Unknown error");
  }
};

/**
 * Cancel auto-renewal for an active subscription
 * @param subscriptionId - The active subscription ID
 */
export const cancelRenewal = async (
  subscriptionId: number,
): Promise<CancelRenewalResponse> => {
  try {
    const response = await apiClient.post<CancelRenewalResponse>(
      `${API_ENDPOINTS.SUBSCRIPTION_RENEWAL}/${subscriptionId}/cancel-renewal`,
      {},
    );
    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to cancel renewal: ${error.message}`);
    }
    throw new Error("Failed to cancel renewal: Unknown error");
  }
};
