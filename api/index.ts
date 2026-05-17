/**
 * API Module Index
 * Central export point for all API functionality
 */

// Export API client
export { ApiClient, apiClient } from "./client";

// Export configuration
export { API_CONFIG, API_ENDPOINTS } from "./config";

// Export types
export type {
    ApiError,
    ApiResponse,
    Area,
    Branch,
    Duration,
    DurationsResponse,
    SubscriptionPlan,
    SubscriptionPlansResponse
} from "./types";

// Export services
export { validateCoupon } from "./services/coupons";
export type {
    ValidateCouponRequest,
    ValidateCouponResponse,
    ValidateCouponResponseData
} from "./services/coupons";
export { getAllAreas, getBranchAreas, getBranches } from "./services/branches";
export { getDurationById, getDurations } from "./services/durations";
export { initiateHesabePayment } from "./services/hesabe";
export type {
    HesabePaymentRequest,
    HesabePaymentResponse
} from "./services/hesabe";
export { getMeals } from "./services/meals";
export type { Meal } from "./services/meals";
export { sendOtp, verifyOtp } from "./services/otp";
export type { VerifyOtpRequest, VerifyOtpResponse } from "./services/otp";
export {
    getSubscriptionPlanById,
    getSubscriptionPlans
} from "./services/subscriptionPlans";
export type { MealPlan } from "./services/subscriptionPlans";
export {
    checkoutSubscription,
    getActiveSubscription, getMySubscriptions,
    getSubscriptionDetails, getSubscriptionMeals,
    getSubscriptionPauseLogs,
    getUserSubscriptions,
    updateSubscriptionMeal
} from "./services/subscriptions";
export type {
    CheckoutRequest, CheckoutRequest, CheckoutResponse, MySubscriptionsResponse, PauseLog, PauseLogsResponse, Subscription, Subscription, SubscriptionDetailsResponse, SubscriptionMealsResponse, SubscriptionMealsResponse, UpdateMealRequest, UpdateMealRequest, UpdateMealResponse, UpdateMealResponse, UserSubscriptionDetails, UserSubscriptionSummary
} from "./services/subscriptions";
export {
    createUser,
    getUserById,
    loginUser,
    logoutUser,
    registerUser,
    updateUser
} from "./services/users";
export type { LoginRequest, RegisterUserRequest, User } from "./services/users";

