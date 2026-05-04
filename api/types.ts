/**
 * API Type Definitions
 * Centralized type definitions for API requests and responses
 */

// Subscription Plans Types
export type SubscriptionPlan = {
  id: number;
  title: string;
  description: string;
  price: number;
  meal_count: number;
  snack_count: number;
  min_days?: number;
  max_days?: number;
  no_of_weeks?: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

// Branch & Area Types
export type Branch = {
  id: number;
  name: string;
  status: string;
};

export type Area = {
  id: number;
  name: string;
  delivery_charges: string;
  status: string;
};

export type SubscriptionPlansResponse = {
  data: SubscriptionPlan[];
};

// Generic API Response Wrapper
export type ApiResponse<T> = {
  data: T;
  message?: string;
  status?: string;
};

// Durations Types
export type Duration = {
  id?: number;
  title: string;
  description: string;
  no_of_weeks: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type DurationsResponse = {
  data: Duration[];
};

// API Error Response
export type ApiError = {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
};

