import {
  type Duration,
  getMeals,
  getSubscriptionMeals,
  type Meal,
  updateSubscriptionMeal,
} from "@/api";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MealItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  category?: string;
};

type DayMeals = {
  meals: (MealItem | null)[];
  snacks: (MealItem | null)[];
};

const normalizeCategoryName = (category: unknown) => {
  if (typeof category === "string") return category;
  if (category && typeof category === "object") {
    const categoryObj = category as { name?: unknown; title?: unknown };
    if (typeof categoryObj.name === "string") return categoryObj.name;
    if (typeof categoryObj.title === "string") return categoryObj.title;
  }
  return "";
};

export default function SelectMealsScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [hasPersonalizedPlan, setHasPersonalizedPlan] =
    useState<boolean>(false);
  const [currentDayMeals, setCurrentDayMeals] = useState<{ [key: number]: DayMeals }>({});
  const [proteinGrams, setProteinGrams] = useState(0);
  const [proteinExtraPerMeal, setProteinExtraPerMeal] = useState(0);
  const [loadingExisting, setLoadingExisting] = useState<boolean>(false);
  const params = useLocalSearchParams();
  const type = (params.type as string) || "meal"; // 'meal' or 'snack'
  const dayIndex = params.dayIndex ? parseInt(params.dayIndex as string) : null;
  const mealIndex = params.mealIndex
    ? parseInt(params.mealIndex as string)
    : null;
  const subscriptionMealId = params.subscriptionMealId
    ? parseInt(params.subscriptionMealId as string)
    : undefined;
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadPlanData();
    fetchMeals();
    checkPersonalizedPlan();
  }, []);

  const checkPersonalizedPlan = async () => {
    try {
      const personalizedFlag = await AsyncStorage.getItem("hasPersonalizedPlan");
      const isPersonalized = personalizedFlag === "true";
      setHasPersonalizedPlan(isPersonalized);
      if (isPersonalized) {
        const personalizedProtein = await AsyncStorage.getItem("personalizedProtein");
        const proteinOptionsRaw = await AsyncStorage.getItem("proteinOptionsData");
        if (personalizedProtein && proteinOptionsRaw) {
          const grams = parseFloat(personalizedProtein);
          setProteinGrams(grams);
          const options: { protein_grams: number; extra_price_per_meal: string }[] =
            JSON.parse(proteinOptionsRaw);
          const match = options.find((o) => o.protein_grams === grams);
          if (match) setProteinExtraPerMeal(parseFloat(match.extra_price_per_meal) || 0);
        }
      }
    } catch (error) {
    }
  };

  const loadPlanData = async () => {
    try {
      const planData = await AsyncStorage.getItem("selectedPlan");
      if (planData) {
        setSelectedPlan(JSON.parse(planData));
      }

      // Load selected duration and days
      const durationData = await AsyncStorage.getItem("selectedDuration");
      if (durationData) {
        setSelectedDuration(JSON.parse(durationData));
      }

      const daysData = await AsyncStorage.getItem("selectedDays");
      if (daysData) {
        setSelectedDays(JSON.parse(daysData));
      }

      // Load already-selected meals to compute weekly usage counts
      const savedDayMeals = await AsyncStorage.getItem("selectedDayMeals");
      if (savedDayMeals) {
        setCurrentDayMeals(JSON.parse(savedDayMeals));
      }

      // Only fetch existing subscription meals in update mode:
      // when we have a known user subscription id or an explicit subscriptionMealId param
      const userSubscriptionId =
        await AsyncStorage.getItem("userSubscriptionId");
      if (
        (userSubscriptionId && userSubscriptionId.trim() !== "") ||
        subscriptionMealId
      ) {
        await fetchExistingSubscriptionMeals();
      }
    } catch (error) {
    }
  };

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const mealsData = await getMeals();
      setMeals(mealsData);
    } catch (error) {
      Alert.alert(t("common.error"), t("plan_page.error"));
    } finally {
      setLoading(false);
    }
  };

  const dayNameToIndex: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const normalizeExistingMeals = async (response: any) => {
    if (!response?.success || !response?.data) return;

    const subscriptionDays = response.data.subscription_days || [];
    await AsyncStorage.setItem(
      "subscriptionDaysData",
      JSON.stringify(subscriptionDays),
    );
    await AsyncStorage.setItem(
      "userSubscriptionId",
      JSON.stringify(response.data.user_subscription_id),
    );

    const planData = await AsyncStorage.getItem("selectedPlan");
    const activeSubStr = await AsyncStorage.getItem("activeSubscription");
    const plan = planData
      ? JSON.parse(planData)
      : activeSubStr
        ? JSON.parse(activeSubStr)?.plan
        : null;
    const mealCount = plan?.meal_count ?? 0;
    const snackCount = plan?.snack_count ?? 0;

    const dayMeals: { [key: number]: DayMeals } = {};
    const allMealsFlat: any[] = [];

    subscriptionDays.forEach((day: any) => {
      const dayIndex = dayNameToIndex[(day.day || "").toLowerCase()];
      if (dayIndex === undefined) return;

      if (!dayMeals[dayIndex]) {
        dayMeals[dayIndex] = {
          meals: new Array(mealCount).fill(null),
          snacks: new Array(snackCount).fill(null),
        };
      }

      (day.subscription_meals || []).forEach((subMeal: any) => {
        const mealData = subMeal.meal || {};
        const mealItem = {
          id: (mealData.id ?? subMeal.meal_id)?.toString() || "",
          name: mealData.title || mealData.name || "",
          calories: mealData.calories || 0,
          protein: mealData.protein_g || 0,
          carbs: mealData.carbs_g || 0,
          fat: mealData.fat_g || 0,
          imageUrl: mealData.image_url || mealData.image_thumb_url,
          subscriptionMealId: subMeal.id,
        } as any;

        if (subMeal.type === "is meal") {
          const slot = dayMeals[dayIndex].meals.findIndex((m) => m === null);
          const targetIndex =
            slot === -1 ? dayMeals[dayIndex].meals.length : slot;
          dayMeals[dayIndex].meals[targetIndex] = mealItem;
        } else {
          const slot = dayMeals[dayIndex].snacks.findIndex((m) => m === null);
          const targetIndex =
            slot === -1 ? dayMeals[dayIndex].snacks.length : slot;
          dayMeals[dayIndex].snacks[targetIndex] = mealItem;
        }

        allMealsFlat.push(subMeal);
      });
    });

    await AsyncStorage.setItem("selectedDayMeals", JSON.stringify(dayMeals));
    await AsyncStorage.setItem(
      "subscriptionMealsData",
      JSON.stringify(allMealsFlat),
    );
  };

  const fetchExistingSubscriptionMeals = async () => {
    try {
      setLoadingExisting(true);
      const userId = await AsyncStorage.getItem("userId");

      // Only fetch if we have a valid userId (not empty, not null)
      if (!userId || userId.trim() === "") {
        setLoadingExisting(false);
        return;
      }

      // Ensure userId is a valid positive integer before calling API
      const parsedUserId = parseInt(userId, 10);
      if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
        setLoadingExisting(false);
        return;
      }

      const existing = await AsyncStorage.getItem("subscriptionDaysData");
      if (existing) {
        // Use cached data but still refresh in background
        const parsed = JSON.parse(existing);
        normalizeExistingMeals({
          success: true,
          data: { subscription_days: parsed },
        });
      }

      const response = await getSubscriptionMeals(parsedUserId);
      await normalizeExistingMeals(response);
    } catch (error) {
    } finally {
      setLoadingExisting(false);
    }
  };

  // Filter meals/snacks based on type FIRST
  const filteredByType = meals.filter((meal) => {
    if (type === "meal") {
      return meal.type === "is meal";
    } else {
      return meal.type === "is snack";
    }
  });

  // For personalized plans, restrict to the tailorable categories only:
  // main meals → "main course", snacks → "snack"
  const filteredByPersonalized = hasPersonalizedPlan && type === "meal"
    ? filteredByType.filter((meal) => {
        const catName = normalizeCategoryName(meal.category).toLowerCase();
        return catName.includes("main course");
      })
    : filteredByType;

  // Get unique categories from filtered items only
  const categories = Array.from(
    new Map(
      filteredByPersonalized.map((meal) => [
        meal.category_id,
        { id: meal.category_id, name: normalizeCategoryName(meal.category) },
      ]),
    ).values(),
  ).filter((category) => category.name.length > 0);

  // Filter by category
  const filteredByCategory = selectedCategory
    ? filteredByPersonalized.filter((meal) => meal.category_id === selectedCategory)
    : filteredByPersonalized;

  // Filter by search query
  const filteredItems = filteredByCategory.filter((meal) =>
    meal.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Convert API meal to MealItem format
  const convertMealToItem = (meal: Meal): MealItem => ({
    id: meal.id.toString(),
    name: meal.title,
    calories: meal.calories,
    protein: meal.protein_g,
    carbs: meal.carbs_g,
    fat: meal.fat_g,
    imageUrl: meal.image_url || meal.image_thumb_url,
    category: normalizeCategoryName(meal.category),
  });

  const handleAddItem = async (meal: Meal) => {
    if (dayIndex === null || mealIndex === null) {
      Alert.alert(t("common.error"), t("select_meals.error_params"));
      return;
    }

    const item = convertMealToItem(meal);

    // Check if we're in update mode
    const activeSubscriptionData =
      await AsyncStorage.getItem("activeSubscription");
    const subscriptionMealsDataStr = await AsyncStorage.getItem(
      "subscriptionMealsData",
    );
    const subscriptionDaysDataStr = await AsyncStorage.getItem(
      "subscriptionDaysData",
    );
    const userSubscriptionIdStr =
      await AsyncStorage.getItem("userSubscriptionId");

    if (
      activeSubscriptionData &&
      subscriptionMealsDataStr &&
      subscriptionDaysDataStr &&
      userSubscriptionIdStr
    ) {
      // Update mode: Call API to update/create meal
      try {
        const subscriptionMeals = JSON.parse(subscriptionMealsDataStr);
        const userId = await AsyncStorage.getItem("userId");

        if (!userId) {
          Alert.alert(t("common.error"), t("select_meals.error_user_not_found"));
          return;
        }

        const dayNames = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const dayName = dayNames[dayIndex];

        const mealType = type === "meal" ? "is meal" : "is snack";

        // Look up subscription_day_id from cached subscription days
        let resolvedSubscriptionDayId: number | undefined;
        try {
          const daysCache = await AsyncStorage.getItem("subscriptionDaysData");
          if (daysCache) {
            const parsedDays: { id: number; day: string }[] = JSON.parse(daysCache);
            const match = parsedDays.find((d) => d.day === dayName);
            if (match) resolvedSubscriptionDayId = match.id;
          }
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

        // If subscription_meal_id is provided (from params), use it for update
        // Otherwise, omit it to create new meal
        // Try provided id first, otherwise lookup from cached dayMeals
        let resolvedSubscriptionMealId = subscriptionMealId;
        if (
          resolvedSubscriptionMealId === undefined ||
          resolvedSubscriptionMealId <= 0
        ) {
          try {
            const dayMealsCache =
              await AsyncStorage.getItem("selectedDayMeals");
            if (dayMealsCache) {
              const parsed = JSON.parse(dayMealsCache) as {
                [key: number]: DayMeals;
              };
              const targetDay = parsed[dayIndex];
              if (targetDay) {
                const slotItem =
                  type === "meal"
                    ? targetDay.meals[mealIndex]
                    : targetDay.snacks[mealIndex];
                if (slotItem && (slotItem as any).subscriptionMealId) {
                  resolvedSubscriptionMealId = (slotItem as any)
                    .subscriptionMealId;
                }
              }
            }
          } catch (err) {
          }
        }

        if (
          resolvedSubscriptionMealId !== undefined &&
          resolvedSubscriptionMealId > 0
        ) {
          updateRequest.subscription_meal_id = resolvedSubscriptionMealId;
        }

        const response = await updateSubscriptionMeal(updateRequest);

        // Update subscription meals data in AsyncStorage with the response
        if (response.data?.subscription_meal) {
          const updatedMeal = response.data.subscription_meal;
          const updatedMeals = [...subscriptionMeals];

          const targetId = updateRequest.subscription_meal_id;
          if (targetId) {
            const index = updatedMeals.findIndex((m: any) => m.id === targetId);
            if (index !== -1) {
              updatedMeals[index] = updatedMeal;
            } else {
              updatedMeals.push(updatedMeal);
            }
          } else {
            updatedMeals.push(updatedMeal);
          }

          await AsyncStorage.setItem(
            "subscriptionMealsData",
            JSON.stringify(updatedMeals),
          );
        }

        // Update local storage
        const savedMeals = await AsyncStorage.getItem("selectedDayMeals");
        let dayMeals: { [key: number]: DayMeals } = {};

        if (savedMeals) {
          dayMeals = JSON.parse(savedMeals);
        }

        if (!dayMeals[dayIndex]) {
          const planData = await AsyncStorage.getItem("selectedPlan");
          const activeSub = JSON.parse(activeSubscriptionData);
          const plan = activeSub.plan || { meal_count: 0, snack_count: 0 };
          dayMeals[dayIndex] = {
            meals: new Array(plan.meal_count || 0).fill(null),
            snacks: new Array(plan.snack_count || 0).fill(null),
          };
        }

        // Store subscription meal ID with the meal item
        const mealItem = {
          ...item,
          subscriptionMealId:
            response.data?.subscription_meal?.id ||
            updateRequest.subscription_meal_id,
        };

        if (type === "meal") {
          dayMeals[dayIndex].meals[mealIndex] = mealItem;
        } else {
          dayMeals[dayIndex].snacks[mealIndex] = mealItem;
        }

        await AsyncStorage.setItem(
          "selectedDayMeals",
          JSON.stringify(dayMeals),
        );

        Alert.alert(t("common.ok"), t("select_meals.success_updated"));
        router.back();
      } catch (error) {
        Alert.alert(
          t("common.error"),
          error instanceof Error ? error.message : t("select_meals.error_update_failed"),
        );
      }
      return;
    }

    // New subscription flow: Save to AsyncStorage
    try {
      const savedMeals = await AsyncStorage.getItem("selectedDayMeals");
      let dayMeals: { [key: number]: DayMeals } = {};

      if (savedMeals) {
        dayMeals = JSON.parse(savedMeals);
      }

      if (!dayMeals[dayIndex]) {
        const planData = await AsyncStorage.getItem("selectedPlan");
        const plan = planData
          ? JSON.parse(planData)
          : { meal_count: 0, snack_count: 0 };
        dayMeals[dayIndex] = {
          meals: new Array(plan.meal_count || 0).fill(null),
          snacks: new Array(plan.snack_count || 0).fill(null),
        };
      }

      if (type === "meal") {
        dayMeals[dayIndex].meals[mealIndex] = item;
      } else {
        dayMeals[dayIndex].snacks[mealIndex] = item;
      }

      await AsyncStorage.setItem("selectedDayMeals", JSON.stringify(dayMeals));
      setCurrentDayMeals(dayMeals);

      // Navigate back
      router.back();
    } catch (error) {
      Alert.alert(t("common.error"), t("select_meals.error_save_failed"));
    }
  };

  const getPlanSummaryText = () => {
    if (!selectedPlan) return "";
    const mealCount = selectedPlan.meal_count || 0;
    const snackCount = selectedPlan.snack_count || 0;
    const daysCount = selectedDays.length || 6;
    return t("select_meals.summary_desc", {
      days: daysCount,
      meals: mealCount,
      snacks: snackCount
    });
  };

  const getBasePlanPrice = (): number => {
    if (!selectedPlan) return 0;
    if (typeof selectedPlan.pricePerDay === "number") return selectedPlan.pricePerDay;
    if (typeof selectedPlan.price === "number") return selectedPlan.price;
    if (typeof selectedPlan.price === "string") {
      const numeric = parseFloat(selectedPlan.price.replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(numeric)) return numeric;
    }
    return 0;
  };

  const proteinExtraCharge =
    hasPersonalizedPlan && proteinExtraPerMeal > 0
      ? proteinExtraPerMeal * (selectedPlan?.meal_count || 1) * selectedDays.length
      : 0;

  const getPlanDisplayPrice = (): string => {
    return `KWD ${(getBasePlanPrice() + proteinExtraCharge).toFixed(3)}`;
  };

  // Count selections across all days, excluding the slot currently being filled
  const selectedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(currentDayMeals).forEach(([dIdxStr, dm]) => {
      const di = parseInt(dIdxStr, 10);
      dm.meals.forEach((m, mi) => {
        if (m && !(di === dayIndex && mi === mealIndex && type === "meal")) {
          counts[m.id] = (counts[m.id] ?? 0) + 1;
        }
      });
      dm.snacks.forEach((s, si) => {
        if (s && !(di === dayIndex && si === mealIndex && type === "snack")) {
          counts[s.id] = (counts[s.id] ?? 0) + 1;
        }
      });
    });
    return counts;
  }, [currentDayMeals, dayIndex, mealIndex, type]);

  const isMealAtLimit = (meal: Meal): boolean =>
    meal.weekly_limit != null && (selectedCounts[meal.id.toString()] ?? 0) >= meal.weekly_limit;

  const isLoadingState = loading || loadingExisting;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {type === "snack" ? t("select_meals.title_snacks") : t("select_meals.title_meals")}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t("select_meals.search_placeholder")}
            placeholderTextColor="#6B7F75"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons
            name="search"
            size={20}
            color="#6B7F75"
            style={styles.searchIcon}
          />
        </View>

        {/* Category Filter — hidden for personalized plan users */}
        {!hasPersonalizedPlan && categories.length > 0 && (
          <View style={styles.categoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  !selectedCategory && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    !selectedCategory && styles.categoryChipTextActive,
                  ]}
                >
                  {t("select_meals.category_all")}
                </Text>
              </TouchableOpacity>
              {categories.map((category: any) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id &&
                    styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category.id &&
                      styles.categoryChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryTitle}>{t("select_meals.summary_title")}</Text>
                <Text style={styles.summarySubtitle}>
                  {getPlanSummaryText()}
                </Text>
              </View>
              <Image
                source={require("@/assets/images/bag.png")}
                style={styles.summaryIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.summaryFooter}>
              <Text style={styles.summaryTotal}>{t("select_meals.total")}</Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.summaryPrice}>{getPlanDisplayPrice()}</Text>
                {hasPersonalizedPlan && proteinExtraCharge > 0 && (
                  <Text style={styles.summaryProteinNote}>
                    incl. +{proteinExtraCharge.toFixed(3)} protein ({proteinGrams}g)
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.back()}
            >
              <Text style={styles.continueButtonText}>{t("select_meals.continue")}</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {isLoadingState ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>
                {type === "snack" ? t("select_meals.loading_snacks") : t("select_meals.loading_meals")}
              </Text>
            </View>
          ) : (
            <>
              {/* Items Grid */}
              {filteredItems.length > 0 ? (
                <View style={styles.itemsGrid}>
                  {filteredItems.map((meal) => {
                    const item = convertMealToItem(meal);
                    const atLimit = isMealAtLimit(meal);
                    return (
                      <View key={meal.id} style={[styles.itemCard, atLimit && styles.itemCardDisabled]}>
                        {!hasPersonalizedPlan && !atLimit && (
                          <View style={styles.caloriesBadge}>
                            <Text style={styles.caloriesText}>
                              {item.calories} {t("select_meals.kcal")}
                            </Text>
                          </View>
                        )}
                        {atLimit && (
                          <View style={styles.limitBadge}>
                            <Text style={styles.limitBadgeText}>Limit {meal.weekly_limit}/wk</Text>
                          </View>
                        )}
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={[styles.itemImage, atLimit && { opacity: 0.4 }]}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={require("@/assets/images/meal.jpg")}
                            style={[styles.itemImage, atLimit && { opacity: 0.4 }]}
                            resizeMode="cover"
                          />
                        )}
                        <View style={styles.itemInfo}>
                          <Text style={[styles.itemName, atLimit && { color: "#B8D5C5" }]}>{item.name}</Text>
                          {hasPersonalizedPlan ? (
                            (meal as any).description ? (
                              <Text style={styles.itemDescription} numberOfLines={3}>
                                {(meal as any).description}
                              </Text>
                            ) : null
                          ) : (
                            <>
                              <View style={styles.nutritionRow}>
                                <View style={styles.nutritionItem}>
                                  <View style={[styles.nutritionDot, { backgroundColor: "#4A90E2" }]} />
                                  <Text style={styles.nutritionText}>{t("select_meals.cal_label")} {item.calories}</Text>
                                </View>
                                <View style={styles.nutritionItem}>
                                  <View style={[styles.nutritionDot, { backgroundColor: "#D0021B" }]} />
                                  <Text style={styles.nutritionText}>{t("select_meals.protein_label")} {item.protein}g</Text>
                                </View>
                              </View>
                              <View style={styles.nutritionRow}>
                                <View style={styles.nutritionItem}>
                                  <View style={[styles.nutritionDot, { backgroundColor: "#7ED321" }]} />
                                  <Text style={styles.nutritionText}>{t("select_meals.carbs_label")} {item.carbs}g</Text>
                                </View>
                                <View style={styles.nutritionItem}>
                                  <View style={[styles.nutritionDot, { backgroundColor: "#F5A623" }]} />
                                  <Text style={styles.nutritionText}>{t("select_meals.fat_label")} {item.fat}g</Text>
                                </View>
                              </View>
                            </>
                          )}
                          <TouchableOpacity
                            style={[styles.addButton, atLimit && styles.addButtonDisabled]}
                            onPress={() => !atLimit && handleAddItem(meal)}
                            disabled={atLimit}
                          >
                            <Text style={styles.addButtonText}>
                              {atLimit ? "Limit Reached" : t("select_meals.add_button")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {type === "snack" ? t("select_meals.no_snacks_found") : t("select_meals.no_meals_found")}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { bottom: Math.max(insets.bottom + 8, 20) }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)/" as any)}
        >
          <Ionicons name="home" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>{t("nav.home")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)/order-history" as any)}
        >
          <Ionicons name="time" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>{t("nav.history")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)/calendar" as any)}
        >
          <Ionicons name="calendar" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>{t("nav.calendar")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)/profile" as any)}
        >
          <Ionicons name="person" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>{t("nav.profile")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4E8E0",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: "5%",
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#344225",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: "5%",
    marginBottom: 12,
    position: "relative",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 44,
    fontSize: 14,
    color: "#344225",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    position: "absolute",
    left: 30,
    top: 13,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryScroll: {
    paddingHorizontal: "5%",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryChipActive: {
    backgroundColor: "#344225",
    borderColor: "#344225",
  },
  categoryChipText: {
    fontSize: 13,
    color: "#6B7F75",
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
    paddingBottom: 120,
  },
  summaryCard: {
    backgroundColor: "#344225",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  summarySubtitle: {
    color: "#C5D4CC",
    fontSize: 12,
    lineHeight: 18,
  },
  summaryIcon: {
    width: 40,
    height: 40,
  },
  summaryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
  },
  summaryTotal: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  summaryPrice: {
    color: "#FAD979",
    fontSize: 18,
    fontWeight: "700",
  },
  summaryProteinNote: {
    fontSize: 11,
    color: "#D4E8E0",
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: "#FAD979",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#344225",
    fontSize: 16,
    fontWeight: "700",
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  itemCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemImage: {
    width: "100%",
    height: 120,
  },
  caloriesBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(52, 66, 37, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  caloriesText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 6,
  },
  itemDescription: {
    fontSize: 11,
    color: "#6B7F75",
    lineHeight: 15,
    marginBottom: 6,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nutritionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nutritionText: {
    fontSize: 9,
    color: "#6B7F75",
  },
  addButton: {
    backgroundColor: "#344225",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: "#B8D5C5",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  itemCardDisabled: {
    opacity: 0.85,
    borderWidth: 1,
    borderColor: "#E0EAE5",
  },
  limitBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(192,57,43,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  limitBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7F75",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7F75",
  },
  bottomNav: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#344225",
    borderRadius: 24,
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#FFFFFF",
    marginTop: 4,
  },
});
