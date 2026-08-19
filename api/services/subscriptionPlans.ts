/**
 * Subscription Plans API Service
 * Handles all subscription plans related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';
import type { SubscriptionPlan, SubscriptionPlansResponse } from '../types';

export type MealPlan = {
  id: string;
  title: string;
  title_ar?: string | null;
  price: string;
  pricePerDay: number;
  description: string;
  description_ar?: string | null;
  meal_count: number;
  snack_count: number;
  min_days?: number;
  max_days?: number;
  no_of_weeks?: number;
  isPersonalized?: boolean;
};

/**
 * Fetch all active subscription plans
 */
export const getSubscriptionPlans = async (): Promise<MealPlan[]> => {
  try {
    const response = await apiClient.get<SubscriptionPlansResponse>(
      API_ENDPOINTS.SUBSCRIPTION_PLANS
    );

    // Handle different response structures
    let plansData: SubscriptionPlan[] = [];
    
    if (response && response.data && Array.isArray(response.data)) {
      plansData = response.data;
    } else if (Array.isArray(response)) {
      // If response is directly an array
      plansData = response as unknown as SubscriptionPlan[];
    } else {
      throw new Error('Invalid response: expected data array');
    }

    // Filter and map API data to MealPlan format
    // Only filter by is_active, since deleted_at might not be in the response
    const filteredPlans = plansData.filter((plan: SubscriptionPlan) => {
      const isActive = plan.is_active === 1 || plan.is_active === true;
      // Only check deleted_at if it exists in the response
      const notDeleted = plan.deleted_at === undefined || plan.deleted_at === null || plan.deleted_at === '';
      const result = isActive && notDeleted;
      return result;
    });

    const mappedPlans: MealPlan[] = filteredPlans
      .map((plan: SubscriptionPlan) => {
        // Validate required fields
        if (!plan.id || !plan.title || plan.price === undefined) {
          return null;
        }

        const mapped: MealPlan = {
          id: plan.id.toString(),
          title: plan.title,
          title_ar: plan.title_ar ?? null,
          price: `KWD ${plan.price.toFixed(3)}/day`,
          pricePerDay: plan.price,
          description: plan.description || `Meal count: ${plan.meal_count}`,
          description_ar: plan.description_ar ?? null,
          meal_count: plan.meal_count ?? 0,
          snack_count: plan.snack_count ?? 0,
          min_days: plan.min_days,
          max_days: plan.max_days,
          no_of_weeks: plan.no_of_weeks,
          isPersonalized: false,
        };
        
        return mapped;
      })
      .filter((plan): plan is MealPlan => plan !== null); // Remove null values
    return mappedPlans;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch subscription plans: ${error.message}`);
    }
    throw new Error('Failed to fetch subscription plans: Unknown error');
  }
};

/**
 * Get a single subscription plan by ID
 */
export const getSubscriptionPlanById = async (id: number): Promise<SubscriptionPlan | null> => {
  try {
    const response = await apiClient.get<SubscriptionPlansResponse>(
      API_ENDPOINTS.SUBSCRIPTION_PLANS
    );

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format');
    }

    const plan = response.data.find((p: SubscriptionPlan) => p.id === id);
    return plan || null;
  } catch (error) {
    throw error;
  }
};

