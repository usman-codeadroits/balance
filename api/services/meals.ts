/**
 * Meals API Service
 * Handles all meals and snacks related API calls
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../config';

export type Meal = {
  id: number;
  title: string;
  description: string;
  category_id: number;
  category: {
    id: number;
    name: string;
  };
  category_name: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  extras: string;
  is_active: number;
  type: string; // "is meal" or "is snack"
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

