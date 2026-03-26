import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_CACHE_KEYS = [
  'userId',
  'userData',
  'authToken',
  'activeSubscription',
  'subscriptions',
  'subscriptionMealsData',
  'subscriptionDaysData',
  'userSubscriptionId',
  'tempPhoneNumber',
  'tempCountryCode',
  'tempEmail',
  'tempName',
  'tempBirthday',
  'tempGender',
  'tempWeight',
  'tempHeight',
  'tempGoal',
  'tempActivityLevel',
  'tempHasAllergies',
  'tempAllergiesSelection',
  'tempOtpCode',
  'tempAuthType',
  'tempAffiliatedCode',
  'tempHasAffiliatedCode',
  'tempNeedsAffiliatedCode',
  'otpVerifiedPhone',
  'otpVerified',
  'showWelcome',
  'welcomeUserName',
  'selectedPlan',
  'selectedDuration',
  'selectedDays',
  'startDate',
  'selectedDayMeals',
  'appliedCoupon',
  'userAddress',
  'pendingCheckoutData',
  'hasPersonalizedPlan',
  'personalizedProtein',
  'personalizedCarbs',
  'personalizedMealsPerDay',
  'personalizedSnacksPerDay',
  'hidePersonalizedPlanCard',
  'personalizedPlanOwner',
  'demoSubscriptionUnlocked',
];

export const resetAppCache = async () => {
  try {
    const uniqueKeys = Array.from(new Set(APP_CACHE_KEYS));
    await AsyncStorage.multiRemove(uniqueKeys);
  } catch (error) {
    console.error('Failed to reset app cache', error);
    throw error;
  }
};
