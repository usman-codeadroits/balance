/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

export const API_CONFIG = {
  
//  BASE_URL: 'http://157.175.188.152/api',
 BASE_URL: 'https://avelina-unstaunch-nonreflectively.ngrok-free.dev/api',
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Required for ngrok free tier
  },
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  SUBSCRIPTION_PLANS: '/v1/subcrption-plans',
  DURATIONS: '/v1/durations',
  MEALS: '/v1/meals',
  USERS: '/v1/users',
  LOGIN: '/login',
  REGISTER: '/register',
  CHECK_USER: '/check-user',
  OTP_SEND: '/otp/send',
  OTP_VERIFY: '/otp/verify',
  SUBSCRIPTION_CHECKOUT: '/v1/subscription/checkout',
  SUBSCRIPTION_MEALS_UPDATE: '/v1/subscription/meals/update',
  // Add more endpoints here as needed
} as const;

