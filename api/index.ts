/**
 * API Module Index
 * Central export point for all API functionality
 */

// Export API client
export { apiClient, ApiClient } from './client';

// Export configuration
export { API_CONFIG, API_ENDPOINTS } from './config';

// Export types
export type {
  SubscriptionPlan,
  SubscriptionPlansResponse,
  Duration,
  DurationsResponse,
  ApiResponse,
  ApiError,
} from './types';

// Export services
export { getSubscriptionPlans, getSubscriptionPlanById } from './services/subscriptionPlans';
export type { MealPlan } from './services/subscriptionPlans';
export { getDurations, getDurationById } from './services/durations';
export { getMeals } from './services/meals';
export type { Meal } from './services/meals';
export { createUser, loginUser, getUserById, updateUser } from './services/users';
export type { User, CreateUserRequest, LoginRequest } from './services/users';
export { sendOtp, verifyOtp } from './services/otp';
export type {
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from './services/otp';
export { checkoutSubscription, getUserSubscriptions, getActiveSubscription, updateSubscriptionMeal } from './services/subscriptions';
export type { Subscription, CheckoutRequest, UpdateMealRequest, UpdateMealResponse } from './services/subscriptions';

