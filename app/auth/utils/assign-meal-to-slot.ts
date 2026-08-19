import { updateSubscriptionMeal, type Meal } from "@/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const normalizeCategoryName = (category: unknown): string => {
  if (typeof category === "string") return category;
  if (category && typeof category === "object") {
    const c = category as { name?: unknown; title?: unknown };
    if (typeof c.name === "string") return c.name;
    if (typeof c.title === "string") return c.title;
  }
  return "";
};

type DayMeals = { meals: any[]; snacks: any[] };

export type AssignMealParams = {
  meal: Meal;
  dayIndex: number;
  mealIndex: number;
  type: "meal" | "snack";
  subscriptionMealId?: number;
  // undefined = don't touch existing extra choices; [] = clear; [ids] = set
  extraIngredientIds?: number[];
};

/**
 * Assigns (or updates) a meal into a day slot, carrying the customer's extra
 * choices. Handles both flows:
 *  - Update mode (an active subscription exists): calls the API and updates the
 *    local caches.
 *  - Onboarding (no subscription yet): saves the selection to AsyncStorage; the
 *    checkout call later ships the extras.
 *
 * UI concerns (alerts, navigation) are left to the caller.
 */
export async function assignMealToSlot(
  params: AssignMealParams,
): Promise<{ updateMode: boolean }> {
  const { meal, dayIndex, mealIndex, type, subscriptionMealId, extraIngredientIds } = params;

  const item = {
    id: meal.id.toString(),
    name: meal.title,
    name_ar: meal.title_ar,
    calories: meal.calories,
    protein: meal.protein_g,
    carbs: meal.carbs_g,
    fat: meal.fat_g,
    imageUrl: meal.image_url || meal.image_thumb_url,
    category: normalizeCategoryName(meal.category),
    meal_group_id: meal.meal_group_id,
    weekly_limit: meal.weekly_limit,
    // Store available extras + current picks so the day-list and picker can
    // render/prefill without a re-fetch. (`meal_extras` is the API field; we
    // keep it under `extras` in the stored slot item.)
    extras: meal.meal_extras ?? [],
    selectedExtraIds: extraIngredientIds ?? [],
  };

  const [
    activeSubscriptionData,
    subscriptionMealsDataStr,
    subscriptionDaysDataStr,
    userSubscriptionIdStr,
  ] = await Promise.all([
    AsyncStorage.getItem("activeSubscription"),
    AsyncStorage.getItem("subscriptionMealsData"),
    AsyncStorage.getItem("subscriptionDaysData"),
    AsyncStorage.getItem("userSubscriptionId"),
  ]);

  const updateMode = !!(
    activeSubscriptionData &&
    subscriptionMealsDataStr &&
    subscriptionDaysDataStr &&
    userSubscriptionIdStr
  );

  if (updateMode) {
    const subscriptionMeals = JSON.parse(subscriptionMealsDataStr as string);
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) throw new Error("user_not_found");

    const dayName = DAY_NAMES[dayIndex];
    const mealType = type === "meal" ? "is meal" : "is snack";

    let resolvedSubscriptionDayId: number | undefined;
    try {
      const parsedDays = JSON.parse(subscriptionDaysDataStr as string) as {
        id: number;
        day: string;
      }[];
      const match = parsedDays.find((d) => d.day === dayName);
      if (match) resolvedSubscriptionDayId = match.id;
    } catch {
      // fall back to sending day string
    }

    const updateRequest: any = {
      user_id: parseInt(userId),
      meal_id: meal.id,
      type: mealType,
    };
    if (resolvedSubscriptionDayId !== undefined) {
      updateRequest.subscription_day_id = resolvedSubscriptionDayId;
    } else {
      updateRequest.day = dayName;
    }

    // Resolve the subscription_meal_id (param first, then cached slot)
    let resolvedSubscriptionMealId = subscriptionMealId;
    if (resolvedSubscriptionMealId === undefined || resolvedSubscriptionMealId <= 0) {
      try {
        const dayMealsCache = await AsyncStorage.getItem("selectedDayMeals");
        if (dayMealsCache) {
          const parsed = JSON.parse(dayMealsCache) as { [key: number]: DayMeals };
          const targetDay = parsed[dayIndex];
          if (targetDay) {
            const slotItem =
              type === "meal" ? targetDay.meals[mealIndex] : targetDay.snacks[mealIndex];
            if (slotItem && slotItem.subscriptionMealId) {
              resolvedSubscriptionMealId = slotItem.subscriptionMealId;
            }
          }
        }
      } catch {
        // ignore
      }
    }
    if (resolvedSubscriptionMealId !== undefined && resolvedSubscriptionMealId > 0) {
      updateRequest.subscription_meal_id = resolvedSubscriptionMealId;
    }
    if (extraIngredientIds !== undefined) {
      updateRequest.extra_ingredient_ids = extraIngredientIds;
    }

    const response = await updateSubscriptionMeal(updateRequest);

    // Update cached subscription meals with the response
    if (response.data?.subscription_meal) {
      const updatedMeal = response.data.subscription_meal;
      const updatedMeals = [...subscriptionMeals];
      const targetId = updateRequest.subscription_meal_id;
      if (targetId) {
        const index = updatedMeals.findIndex((m: any) => m.id === targetId);
        if (index !== -1) updatedMeals[index] = updatedMeal;
        else updatedMeals.push(updatedMeal);
      } else {
        updatedMeals.push(updatedMeal);
      }
      await AsyncStorage.setItem("subscriptionMealsData", JSON.stringify(updatedMeals));
    }

    // Update local day slots
    const savedMeals = await AsyncStorage.getItem("selectedDayMeals");
    const dayMeals: { [key: number]: DayMeals } = savedMeals ? JSON.parse(savedMeals) : {};
    if (!dayMeals[dayIndex]) {
      const activeSub = JSON.parse(activeSubscriptionData as string);
      const plan = activeSub.plan || { meal_count: 0, snack_count: 0 };
      dayMeals[dayIndex] = {
        meals: new Array(plan.meal_count || 0).fill(null),
        snacks: new Array(plan.snack_count || 0).fill(null),
      };
    }
    const mealItem = {
      ...item,
      subscriptionMealId:
        response.data?.subscription_meal?.id || updateRequest.subscription_meal_id,
    };
    if (type === "meal") dayMeals[dayIndex].meals[mealIndex] = mealItem;
    else dayMeals[dayIndex].snacks[mealIndex] = mealItem;
    await AsyncStorage.setItem("selectedDayMeals", JSON.stringify(dayMeals));

    return { updateMode: true };
  }

  // Onboarding flow: persist to AsyncStorage; checkout ships the extras later
  const savedMeals = await AsyncStorage.getItem("selectedDayMeals");
  const dayMeals: { [key: number]: DayMeals } = savedMeals ? JSON.parse(savedMeals) : {};
  if (!dayMeals[dayIndex]) {
    const planData = await AsyncStorage.getItem("selectedPlan");
    const plan = planData ? JSON.parse(planData) : { meal_count: 0, snack_count: 0 };
    dayMeals[dayIndex] = {
      meals: new Array(plan.meal_count || 0).fill(null),
      snacks: new Array(plan.snack_count || 0).fill(null),
    };
  }
  if (type === "meal") dayMeals[dayIndex].meals[mealIndex] = item;
  else dayMeals[dayIndex].snacks[mealIndex] = item;
  await AsyncStorage.setItem("selectedDayMeals", JSON.stringify(dayMeals));

  return { updateMode: false };
}
