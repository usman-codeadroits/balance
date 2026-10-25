/**
 * Meals API Service
 * Handles all meals and snacks related API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_TTL, cached } from '../cache';
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
  // No longer sent by GET /meals (list); still present on GET /meals/{id}
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type MealsResponse = {
  data: Meal[];
};

export type MealCategory = {
  id: number;
  name: string;
  name_ar?: string | null;
};

export type MealCategoriesResponse = {
  categories: MealCategory[];
};

/**
 * Fetch meal categories in the admin-configured display order (sort_order ascending)
 */
export const getMealCategories = async (
  options: { force?: boolean } = {},
): Promise<MealCategory[]> => {
  try {
    return await cached(
      'meal-categories',
      async () => {
        const response = await apiClient.get<MealCategoriesResponse>(API_ENDPOINTS.MEAL_CATEGORIES);
        return Array.isArray(response?.categories) ? response.categories : [];
      },
      { ttlMs: CACHE_TTL.MEAL_CATEGORIES, persist: true, force: options.force, shouldCache: (c) => c.length > 0 },
    );
  } catch (error) {
    return [];
  }
};

type CachedMenu = { meals: Meal[]; etag: string | null };

// The server now omits deleted_at/timestamps and only sends active meals; keep a tolerant
// filter so older responses (with inactive or deleted meals) are still handled
const isAvailableMeal = (meal: Meal) =>
  Number(meal.is_active ?? 1) === 1 && !meal.deleted_at;

// Menu cache from before ETag support stored a different shape — drop it
AsyncStorage.removeItem('apiCache:meals').catch(() => {});

/**
 * Fetch all meals and snacks (cached and shared across screens — see api/cache.ts).
 * When the cached copy expires it is revalidated with its ETag: an unchanged menu
 * returns 304 with no body and the saved copy is reused.
 */
export const getMeals = async (options: { force?: boolean } = {}): Promise<Meal[]> => {
  try {
    const menu = await cached<CachedMenu>(
      'menu',
      async (previous) => {
        const result = await apiClient.getWithETag<MealsResponse>(
          API_ENDPOINTS.MEALS,
          previous?.etag,
        );
        if (result.notModified && previous) return previous;
        if (result.notModified) throw new Error('Menu not modified but no saved copy');

        const list = Array.isArray(result.data?.data) ? result.data.data : [];
        return { meals: list.filter(isAvailableMeal), etag: result.etag };
      },
      { ttlMs: CACHE_TTL.MEALS, persist: true, force: options.force, shouldCache: (m) => m.meals.length > 0 },
    );
    return menu.meals;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch meals: ${error.message}`);
    }
    throw new Error('Failed to fetch meals: Unknown error');
  }
};

