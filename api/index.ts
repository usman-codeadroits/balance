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
export { getAllergies, updateAllergies } from "./services/allergies";
export type {
  AllergiesData,
  AllergiesResponse,
  UpdateAllergiesBody,
  UpdateAllergiesResponse,
} from "./services/allergies";
export { clearDislikes, getDislikes, updateDislikes } from "./services/dislikes";
export type {
  ClearDislikesResponse,
  DislikesData,
  DislikesResponse,
  UpdateDislikesResponse,
} from "./services/dislikes";
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
    cancelRenewal,
    checkoutSubscription,
    getActiveSubscription, getMySubscriptions,
    getSubscriptionDetails, getSubscriptionMeals,
    getSubscriptionPauseLogs,
    getSubscriptionRenewal,
    getUserSubscriptions,
    updateRenewalPlan,
    updateSubscriptionMeal
} from "./services/subscriptions";
export type {
    CancelRenewalResponse,
    CheckoutRequest, CheckoutRequest, CheckoutResponse, MySubscriptionsResponse, PauseLog, PauseLogsResponse, RenewalDetail, Subscription, Subscription, SubscriptionDetailsResponse, SubscriptionMealsResponse, SubscriptionMealsResponse, SubscriptionRenewalResponse, UpdateMealRequest, UpdateMealRequest, UpdateMealResponse, UpdateMealResponse, UpdateRenewalPlanResponse, UserSubscriptionDetails, UserSubscriptionSummary
} from "./services/subscriptions";
export {
    createUser,
    getUserById,
    loginUser,
    logoutUser,
    registerUser,
    updateUser
} from "./services/users";
export type { ActiveSubscription, LoginRequest, QueuedRenewal, QueuedSubscription, RegisterUserRequest, User } from "./services/users";
export { getInquiries, submitInquiry } from "./services/inquiries";
export type { GetInquiriesResponse, Inquiry, SubmitInquiryRequest, SubmitInquiryResponse } from "./services/inquiries";

