/**
 * Meals API Service
 * Handles all meals and snacks related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export type MealGroup = {
  id: number;
  name: string;
  weekly_limit: number;
};

/** A single option inside an extra category (e.g. "Brown Bread"). */
export type MealExtraIngredient = {
  id: number;
  name: string;
  name_ar?: string | null;
};

/** An add-on category a meal offers (e.g. "Bread", "Sauce"). */
export type MealExtra = {
  id: number;
  name: string;
  name_ar?: string | null;
  selection_type: "single" | "multiple"; // single = pick one, multiple = pick many
  is_required: boolean;
  // Max options the customer may pick for this extra on this meal.
  // 1 (always for single), N (cap for multiple), or null (no limit).
  max_select?: number | null;
  ingredients: MealExtraIngredient[];
};

export type Meal = {
  id: number;
  title: string;
  title_ar?: string | null;
  description: string;
  description_ar?: string | null;
  category_id: number;
  category: {
    id: number;
    name: string;
    name_ar?: string | null;
  };
  category_name: string;
  category_name_ar?: string | null;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  // Existing field: free-text allergens/extras description (not the add-on picker).
  extras?: string | null;
  // Add-on categories this meal offers, each with its available options.
  // (Renamed from `extras` on the API; older responses may omit it.)
  meal_extras?: MealExtra[];
  is_active: number;
  type: string; // "is meal" or "is snack"
  meal_group_id: number | null;
  meal_group: MealGroup | null;
  weekly_limit: number | null;
  image: {
    id: number;
    url: string;
    thumb_url: string;
    preview_url: string;
    file_name: string;
    mime_type: string;
    size: number;
  };
  image_url: string;
  image_thumb_url: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MealsResponse = {
  data: Meal[];
};

/**
 * Fetch all meals and snacks
 */
export const getMeals = async (): Promise<Meal[]> => {
  try {
    const response = await apiClient.get<MealsResponse>(API_ENDPOINTS.MEALS);

    if (response && response.data && Array.isArray(response.data)) {
      // Filter only active meals
      return response.data.filter((meal: Meal) =>
        meal.is_active === 1 && meal.deleted_at === null
      );
    }

    return [];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch meals: ${error.message}`);
    }
    throw new Error('Failed to fetch meals: Unknown error');
  }
};

