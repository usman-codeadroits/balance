import type { Subscription } from '@/types/subscription';

export const USE_DUMMY_SUBSCRIPTION = true;
export const DEMO_SUBSCRIPTION_FLAG = 'demoSubscriptionUnlocked';

export const DUMMY_SUBSCRIPTION: Subscription = {
  id: 'demo-sub-001',
  plan: {
    id: 'plan-demo',
    title: 'Balanced Lifestyle Plan',
    meal_count: 3,
    snack_count: 1,
    pricePerDay: 9.99,
  },
  duration: {
    id: 'duration-demo',
    title: '4 Weeks',
    no_of_weeks: 4,
  },
  days: [1, 2, 3, 4, 5],
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
  dayMeals: {
    monday: [
      { id: 'meal-1', name: 'Mediterranean Salad', type: 'Lunch' },
    ],
    tuesday: [
      { id: 'meal-2', name: 'Grilled Chicken Bowl', type: 'Dinner' },
    ],
  },
  address: {
    area: 'Downtown',
    block: '12',
    street: 'Main Ave',
    building: '22A',
  },
  planPrice: 279.72,
  vat: 14,
  totalPrice: 293.72,
  status: 'Active',
  createdAt: new Date().toISOString(),
  paymentStatus: 'paid',
};

export const DUMMY_MEAL_HISTORY: Subscription[] = [
  {
    id: 'history-001',
    plan: {
      id: 'plan-balanced',
      title: 'Balanced Lifestyle Plan',
      meal_count: 3,
      snack_count: 1,
      pricePerDay: 9.99,
    },
    duration: {
      id: 'duration-4w',
      title: '4 Weeks',
      no_of_weeks: 4,
    },
    days: [1, 2, 3, 4, 5],
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    dayMeals: DUMMY_SUBSCRIPTION.dayMeals,
    address: DUMMY_SUBSCRIPTION.address,
    planPrice: 279.72,
    vat: 14,
    totalPrice: 293.72,
    status: 'Active',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    paymentStatus: 'paid',
  },
  {
    id: 'history-002',
    plan: {
      id: 'plan-muscle',
      title: 'Lean Muscle Plan',
      meal_count: 4,
      snack_count: 2,
      pricePerDay: 12.5,
    },
    duration: {
      id: 'duration-8w',
      title: '8 Weeks',
      no_of_weeks: 8,
    },
    days: [0, 1, 2, 3, 4, 5],
    startDate: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    dayMeals: DUMMY_SUBSCRIPTION.dayMeals,
    address: DUMMY_SUBSCRIPTION.address,
    planPrice: 560,
    vat: 28,
    totalPrice: 588,
    status: 'Completed',
    createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
    paymentStatus: 'paid',
  },
  {
    id: 'history-003',
    plan: {
      id: 'plan-lowcarb',
      title: 'Low Carb Reset',
      meal_count: 2,
      snack_count: 1,
      pricePerDay: 8.5,
    },
    duration: {
      id: 'duration-2w',
      title: '2 Weeks',
      no_of_weeks: 2,
    },
    days: [1, 3, 5],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    dayMeals: DUMMY_SUBSCRIPTION.dayMeals,
    address: DUMMY_SUBSCRIPTION.address,
    planPrice: 85,
    vat: 4.25,
    totalPrice: 89.25,
    status: 'Cancelled',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentStatus: 'failed',
  },
];
