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
  price: string;
  pricePerDay: number; // Store numeric price for calculations
  description: string;
  meal_count: number;
  snack_count: number;
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

    // Log response for debugging
    console.log('Subscription plans API response:', JSON.stringify(response, null, 2));
    console.log('Response type:', typeof response);
    console.log('Response.data:', response.data);
    console.log('Response.data type:', Array.isArray(response.data));

    // Handle different response structures
    let plansData: SubscriptionPlan[] = [];
    
    if (response && response.data && Array.isArray(response.data)) {
      plansData = response.data;
    } else if (Array.isArray(response)) {
      // If response is directly an array
      plansData = response as unknown as SubscriptionPlan[];
    } else {
      console.error('Unexpected response structure:', response);
      throw new Error('Invalid response: expected data array');
    }

    console.log('Total plans from API:', plansData.length);
    console.log('Plans data:', JSON.stringify(plansData, null, 2));

    // Filter and map API data to MealPlan format
    // Only filter by is_active, since deleted_at might not be in the response
    const filteredPlans = plansData.filter((plan: SubscriptionPlan) => {
      const isActive = plan.is_active === 1 || plan.is_active === true;
      // Only check deleted_at if it exists in the response
      const notDeleted = plan.deleted_at === undefined || plan.deleted_at === null || plan.deleted_at === '';
      const result = isActive && notDeleted;
      console.log(`Plan ${plan.id} (${plan.title}): is_active=${plan.is_active} (type: ${typeof plan.is_active}), deleted_at=${plan.deleted_at}, included=${result}`);
      return result;
    });

    console.log('Filtered active plans:', filteredPlans.length);

    const mappedPlans: MealPlan[] = filteredPlans
      .map((plan: SubscriptionPlan) => {
        // Validate required fields
        if (!plan.id || !plan.title || plan.price === undefined) {
          console.warn('Invalid plan data (missing required fields):', plan);
          return null;
        }

        const mapped = {
          id: plan.id.toString(),
          title: plan.title,
          price: `KWD ${plan.price.toFixed(2)}/day`,
          pricePerDay: plan.price,
          description: plan.description || `Meal count: ${plan.meal_count}`,
          meal_count: plan.meal_count ?? 0,
          snack_count: plan.snack_count ?? 0,
          isPersonalized: false,
        };
        
        console.log('Mapped plan:', mapped);
        return mapped;
      })
      .filter((plan): plan is MealPlan => plan !== null); // Remove null values

    console.log('Final mapped subscription plans count:', mappedPlans.length);
    return mappedPlans;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
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
    console.error(`Error fetching subscription plan with id ${id}:`, error);
    throw error;
  }
};

