/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

export const API_CONFIG = {
  // BASE_URL: 'http://157.175.188.152/api',
    BASE_URL: "https://avelina-unstaunch-nonreflectively.ngrok-free.dev/api",
  // BASE_URL: "https://backend.balancekw.app/api",
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  SUBSCRIPTION_PLANS: "/v1/subcrption-plans",
  DURATIONS: "/v1/durations",
  MEALS: "/v1/meals",
  USERS: "/v1/users",
  LOGIN: "/login",
  REGISTER: "/register",
  CHECK_USER: "/check-user",
  OTP_SEND: "/otp/send",
  OTP_VERIFY: "/otp/verify",
  SUBSCRIPTION_CHECKOUT: "/v1/subscription/checkout",
  SUBSCRIPTION_MEALS_UPDATE: "/v1/subscription/meals/update",
  SUBSCRIPTION_MEALS: "/v1/subscription/meals",
  COUPON_VALIDATE: "/v1/coupons/validate",
  PAYMENT_CHECKOUT: "/v1/payment/checkout",
  MY_SUBSCRIPTIONS: "/v1/my-subscriptions",
  MY_SUBSCRIPTION_DETAILS: "/v1/my-subscriptions",
  LOGOUT: "/v1/logout",
  BRANCHES: "/v1/branches",
  AREAS: "/v1/areas",
  PROFILE: "/v1/profile",
  ADDRESSES: "/v1/addresses",
  SUBSCRIPTION_PAUSE_LOGS: "/v1/subscription",
  SUBSCRIPTION_PAUSE_REQUEST: "/v1/subscription",
  PROTEIN_OPTIONS: "/v1/protein-options",
  SUBSCRIPTION_RENEWAL: "/v1/my-subscriptions",
  ALLERGIES: "/v1/allergies",
  DISLIKES: "/v1/dislikes",
  SETTINGS: "/v1/settings",
  PAYMENT_INITIATE: "/v1/payment/initiate",
  PAYMENT_STATUS: "/v1/payment/status",
  INQUIRIES: "/v1/inquiries",
  SUBSCRIPTION_CALENDAR: "/v1/my-subscriptions",
} as const;
