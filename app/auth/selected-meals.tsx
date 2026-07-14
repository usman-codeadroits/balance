import type { Duration } from "@/api";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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
  subscriptionMealId?: number; // Store subscription meal ID for updates
};

type DayMeals = {
  meals: (MealItem | null)[];
  snacks: (MealItem | null)[];
};

export default function SelectedMealsScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(
    null,
  );
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [dayMeals, setDayMeals] = useState<{ [key: number]: DayMeals }>({});
  const [hasPersonalizedPlan, setHasPersonalizedPlan] =
    useState<boolean>(false);
  const [proteinGrams, setProteinGrams] = useState(0);
  const [proteinExtraPerMeal, setProteinExtraPerMeal] = useState(0);
  const [isUpdateMode, setIsUpdateMode] = useState<boolean>(false);
  const [subscriptionMealsData, setSubscriptionMealsData] = useState<any[]>([]);
  const [subscriptionDaysData, setSubscriptionDaysData] = useState<any[]>([]);
  const [userSubscriptionId, setUserSubscriptionId] = useState<string | null>(
    null,
  );
  const [subscriptionMealIds, setSubscriptionMealIds] = useState<{
    [key: string]: number;
  }>({}); // Key: "dayIndex-mealIndex-type"
  const [updatingMeal, setUpdatingMeal] = useState<string | null>(null); // Track which meal is being updated
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
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

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const sanitizeCount = (value: unknown): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return Math.floor(numeric);
  };

  const sanitizeDays = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((day) => Number(day))
      .filter(
        (day, idx, arr) =>
          Number.isInteger(day) && day >= 0 && day <= 6 && arr.indexOf(day) === idx,
      )
      .sort((a, b) => a - b);
  };

  const loadData = async () => {
    try {
      // Check if we're in update mode (active subscription exists)
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
        // We're in update mode
        setIsUpdateMode(true);
        const activeSubscription = JSON.parse(activeSubscriptionData);
        const mealsData = JSON.parse(subscriptionMealsDataStr);
        const daysData = JSON.parse(subscriptionDaysDataStr);

        setSubscriptionMealsData(mealsData);
        setSubscriptionDaysData(daysData);
        setUserSubscriptionId(userSubscriptionIdStr);

        // Load plan from active subscription
        setSelectedPlan(activeSubscription.plan);
        setSelectedDuration(activeSubscription.duration);
        const normalizedActiveDays = sanitizeDays(activeSubscription.days);
        setSelectedDays(normalizedActiveDays);

        // Build meal IDs map and load existing meals
        const mealIdsMap: { [key: string]: number } = {};
        const dayNamesLookup = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const initialDayMeals: { [key: number]: DayMeals } = {};
        const mealCount = sanitizeCount(
          activeSubscription.plan?.meal_count ?? activeSubscription.plan?.mealCount,
        );
        const snackCount = sanitizeCount(
          activeSubscription.plan?.snack_count ?? activeSubscription.plan?.snackCount,
        );

        // Initialize all days with empty arrays
        normalizedActiveDays.forEach((dayIndex: number) => {
          initialDayMeals[dayIndex] = {
            meals: new Array(mealCount).fill(null),
            snacks: new Array(snackCount).fill(null),
          };
        });

        // Map subscription meals to day meals
        mealsData.forEach((meal: any) => {
          const dayName = meal.day?.toLowerCase();
          const dayIndex = dayNamesLookup.indexOf(dayName);

          if (dayIndex !== -1 && normalizedActiveDays.includes(dayIndex)) {
            const mealType = meal.type === "is meal" ? "meals" : "snacks";
            const mealIndex =
              mealType === "meals"
                ? initialDayMeals[dayIndex].meals.findIndex((m) => m === null)
                : initialDayMeals[dayIndex].snacks.findIndex((s) => s === null);

            if (mealIndex !== -1) {
              initialDayMeals[dayIndex][mealType][mealIndex] = {
                id: meal.meal?.id?.toString() || meal.meal_id?.toString() || "",
                name: meal.meal?.title || "",
                calories: meal.meal?.calories || 0,
                protein: meal.meal?.protein_g || 0,
                carbs: meal.meal?.carbs_g || 0,
                fat: meal.meal?.fat_g || 0,
                imageUrl: meal.meal?.image_url || meal.meal?.image_thumb_url,
                subscriptionMealId: meal.id, // Store subscription meal ID with the meal
              };

              // Store subscription meal ID for updates
              const key = `${dayIndex}-${mealIndex}-${mealType}`;
              mealIdsMap[key] = meal.id;
            }
          }
        });

        setSubscriptionMealIds(mealIdsMap);
        setDayMeals(initialDayMeals);
        return;
      }

      // Normal flow (new subscription)
      setIsUpdateMode(false);
      const planData = await AsyncStorage.getItem("selectedPlan");
      if (planData) {
        let plan = JSON.parse(planData);

        // If plan doesn't have meal_count/snack_count, try to fetch from API
        if (
          (!plan.meal_count && !plan.mealCount) ||
          (!plan.snack_count && !plan.snackCount)
        ) {
          try {
            const { getSubscriptionPlans } = await import("@/api");
            const plans = await getSubscriptionPlans();
            const matchingPlan = plans.find(
              (p) =>
                p.id.toString() === plan.id?.toString() ||
                p.title === plan.title,
            );
            if (matchingPlan) {
              plan = {
                ...plan,
                meal_count: matchingPlan.meal_count,
                snack_count: matchingPlan.snack_count,
              };
            }
          } catch (e) {
          }
        }

        setSelectedPlan(plan);

        // Load selected duration
        const durationData = await AsyncStorage.getItem("selectedDuration");
        if (durationData) {
          setSelectedDuration(JSON.parse(durationData));
        }

        // Initialize day meals structure
        const daysData = await AsyncStorage.getItem("selectedDays");
        if (daysData) {
          const days = sanitizeDays(JSON.parse(daysData));
          setSelectedDays(days);

          // Load existing meal selections if available (from current session)
          const savedMeals = await AsyncStorage.getItem("selectedDayMeals");
          let existingMeals: { [key: number]: DayMeals } = {};

          if (savedMeals) {
            try {
              existingMeals = JSON.parse(savedMeals);
            } catch (e) {
              // Clear corrupted data
              await AsyncStorage.removeItem("selectedDayMeals");
            }
          }

          // Initialize structure - use existing data if valid, otherwise start fresh
          const initialDayMeals: { [key: number]: DayMeals } = {};
          const mealCount = sanitizeCount(plan.meal_count ?? plan.mealCount);
          const snackCount = sanitizeCount(plan.snack_count ?? plan.snackCount);

          days.forEach((dayIndex: number) => {
            // Check if existing data matches current plan structure
            if (
              existingMeals[dayIndex] &&
              existingMeals[dayIndex].meals?.length === mealCount &&
              existingMeals[dayIndex].snacks?.length === snackCount
            ) {
              // Use existing valid data
              initialDayMeals[dayIndex] = existingMeals[dayIndex];
            } else {
              // Start fresh with empty meals/snacks, but preserve any existing meals
              const existingDayData = existingMeals[dayIndex];
              initialDayMeals[dayIndex] = {
                meals:
                  existingDayData?.meals?.slice(0, mealCount) ||
                  new Array(mealCount).fill(null),
                snacks:
                  existingDayData?.snacks?.slice(0, snackCount) ||
                  new Array(snackCount).fill(null),
              };
              // Pad arrays if needed
              while (initialDayMeals[dayIndex].meals.length < mealCount) {
                initialDayMeals[dayIndex].meals.push(null);
              }
              while (initialDayMeals[dayIndex].snacks.length < snackCount) {
                initialDayMeals[dayIndex].snacks.push(null);
              }
            }
          });
          setDayMeals(initialDayMeals);
        }
      }
    } catch (error) {
    }
  };

  const dayNames = t("calendar.weekdays", { returnObjects: true }) as string[];

  const getDayName = (dayIndex: number) => {
    return dayNames[dayIndex];
  };

  const toggleDay = (dayIndex: number) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };

  const handleMealBoxClick = (dayIndex: number, mealIndex: number) => {
    const meal = dayMeals[dayIndex]?.meals[mealIndex];
    router.push({
      pathname: "/auth/select-meals-browse",
      params: {
        dayIndex: dayIndex.toString(),
        mealIndex: mealIndex.toString(),
        type: "meal",
        subscriptionMealId: meal?.subscriptionMealId?.toString() || "",
      },
    } as any);
  };

  const handleSnackBoxClick = (dayIndex: number, snackIndex: number) => {
    const snack = dayMeals[dayIndex]?.snacks[snackIndex];
    router.push({
      pathname: "/auth/select-meals-browse",
      params: {
        dayIndex: dayIndex.toString(),
        mealIndex: snackIndex.toString(),
        type: "snack",
        subscriptionMealId: snack?.subscriptionMealId?.toString() || "",
      },
    } as any);
  };

  const handleContinue = async () => {
    // If in update mode, just go back (meals are updated via API when selected)
    if (isUpdateMode) {
      Alert.alert(t("common.ok"), t("selected_meals.success_update"));
      router.back();
      return;
    }

    // For new subscription checkout: Only require Day 1 meal
    // Day 1 is the first day in selectedDays array (sorted)
    const mealCount = selectedPlan?.meal_count || 0;
    const snackCount = selectedPlan?.snack_count || 0;

    // Get the first selected day (Day 1)
    const firstDayIndex = selectedDays.length > 0 ? selectedDays[0] : null;

    if (firstDayIndex === null) {
      Alert.alert(t("common.error"), t("selected_meals.error_select_day"));
      return;
    }

    const firstDayData = dayMeals[firstDayIndex];
    if (!firstDayData) {
      Alert.alert(
        t("selected_meals.error_select_meal_day1", { day: getDayName(firstDayIndex) }),
      );
      return;
    }

    // Check if at least one meal or snack is selected for Day 1
    const hasMeal = firstDayData.meals.some((meal) => meal !== null);
    const hasSnack = firstDayData.snacks.some((snack) => snack !== null);

    if (!hasMeal && !hasSnack) {
      Alert.alert(
        t("selected_meals.error_select_meal_day1", { day: getDayName(firstDayIndex) }),
      );
      return;
    }

    // Save selected meals to AsyncStorage (can have empty days for remaining days)
    AsyncStorage.setItem("selectedDayMeals", JSON.stringify(dayMeals))
      .then(() => {
        router.push("/auth/checkout" as any);
      })
      .catch((error) => {
        Alert.alert(t("common.error"), t("select_meals.error_save_failed"));
      });
  };

  const getPlanSummaryText = () => {
    if (!selectedPlan) return "";
    const mealCount = selectedPlan.meal_count ?? selectedPlan.mealCount ?? 0;
    const snackCount = selectedPlan.snack_count ?? selectedPlan.snackCount ?? 0;
    const daysCount = selectedDays.length || 0;

    return t("selected_meals.summary_desc", {
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

  const planWeeks = Math.max(1, (selectedDuration as any)?.no_of_weeks ?? selectedPlan?.no_of_weeks ?? 1);
  const proteinExtraCharge =
    hasPersonalizedPlan && proteinExtraPerMeal > 0
      ? proteinExtraPerMeal * (selectedPlan?.meal_count || 1) * selectedDays.length * planWeeks
      : 0;

  const getPlanDisplayPrice = (): string => {
    return `KWD ${(getBasePlanPrice() + proteinExtraCharge).toFixed(3)}`;
  };

  const calculateTotalCalories = (dayIndex: number) => {
    const dayData = dayMeals[dayIndex];
    if (!dayData) return 0;
    let total = 0;
    dayData.meals.forEach((meal) => { if (meal) total += meal.calories; });
    dayData.snacks.forEach((snack) => { if (snack) total += snack.calories; });
    return total;
  };

  const calculateTotalCarbs = (dayIndex: number) => {
    const dayData = dayMeals[dayIndex];
    if (!dayData) return 0;
    let total = 0;
    dayData.meals.forEach((meal) => { if (meal) total += meal.carbs; });
    dayData.snacks.forEach((snack) => { if (snack) total += snack.carbs; });
    return Math.round(total);
  };

  const calculateTotalProtein = (dayIndex: number) => {
    const dayData = dayMeals[dayIndex];
    if (!dayData) return 0;
    let total = 0;
    dayData.meals.forEach((meal) => { if (meal) total += meal.protein; });
    dayData.snacks.forEach((snack) => { if (snack) total += snack.protein; });
    return Math.round(total);
  };

  const calculateTotalFat = (dayIndex: number) => {
    const dayData = dayMeals[dayIndex];
    if (!dayData) return 0;
    let total = 0;
    dayData.meals.forEach((meal) => { if (meal) total += meal.fat; });
    dayData.snacks.forEach((snack) => { if (snack) total += snack.fat; });
    return Math.round(total);
  };

  const mealCount = sanitizeCount(
    selectedPlan?.meal_count ?? selectedPlan?.mealCount,
  );
  const snackCount = sanitizeCount(
    selectedPlan?.snack_count ?? selectedPlan?.snackCount,
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isUpdateMode ? t("selected_meals.title_update") : t("selected_meals.title_select")}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Plan Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryTitle}>{t("selected_meals.summary_title")}</Text>
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
            <View style={styles.summaryDivider} />
            <View style={styles.summaryDetails}>
              <Text style={styles.summaryLabel}>{t("selected_meals.total")}</Text>
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
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>
                {isUpdateMode ? t("selected_meals.done") : t("selected_meals.continue")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Day Selection List */}
          <View style={styles.mealsContainer}>
            {selectedDays.map((dayIndex) => {
              const dayName = getDayName(dayIndex);
              const isExpanded = expandedDay === dayIndex;
              const dayData = dayMeals[dayIndex] || {
                meals: new Array(mealCount).fill(null),
                snacks: new Array(snackCount).fill(null),
              };

              return (
                <View key={dayIndex}>
                  <TouchableOpacity
                    style={[styles.mealCard, isExpanded && styles.mealCardExpanded]}
                    activeOpacity={0.7}
                    onPress={() => toggleDay(dayIndex)}
                  >
                    <Text style={styles.mealLabel}>
                      {t("selected_meals.select_day_meal", { day: dayName })}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#FAD979"
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.dropdownContent}>
                      {/* Nutrition summary — yellow card, 2×2 grid */}
                      {!hasPersonalizedPlan && (
                        <View style={styles.nutritionBar}>
                          <View style={styles.nutritionItem}>
                            <View style={[styles.nutritionDot, { backgroundColor: "#4A90E2" }]} />
                            <Text style={styles.nutritionText}>{t("selected_meals.cal_label")} {calculateTotalCalories(dayIndex)}</Text>
                          </View>
                          <View style={styles.nutritionItem}>
                            <View style={[styles.nutritionDot, { backgroundColor: "#D0021B" }]} />
                            <Text style={styles.nutritionText}>{t("selected_meals.protein_label")} {calculateTotalProtein(dayIndex)}g</Text>
                          </View>
                          <View style={styles.nutritionItem}>
                            <View style={[styles.nutritionDot, { backgroundColor: "#7ED321" }]} />
                            <Text style={styles.nutritionText}>{t("selected_meals.carbs_label")} {calculateTotalCarbs(dayIndex)}g</Text>
                          </View>
                          <View style={styles.nutritionItem}>
                            <View style={[styles.nutritionDot, { backgroundColor: "#F5A623" }]} />
                            <Text style={styles.nutritionText}>{t("selected_meals.fat_label")} {calculateTotalFat(dayIndex)}g</Text>
                          </View>
                        </View>
                      )}

                      {/* Meal Slots */}
                      {Array.from({ length: mealCount }).map((_, mealIndex) => {
                        const meal = dayData?.meals?.[mealIndex] || null;
                        const ordinalKeys = ["first", "second", "third", "fourth", "fifth", "sixth"];
                        const mealNumber = t(`selected_meals.ordinals.${ordinalKeys[mealIndex] || "first"}`);

                        return (
                          <TouchableOpacity
                            key={`meal-${mealIndex}`}
                            style={meal ? styles.slotFilled : styles.slotEmpty}
                            onPress={() => handleMealBoxClick(dayIndex, mealIndex)}
                            activeOpacity={0.8}
                          >
                            {meal ? (
                              <View style={styles.slotRow}>
                                <Image
                                  source={meal.imageUrl ? { uri: meal.imageUrl } : require("@/assets/images/meal.jpg")}
                                  style={styles.slotThumb}
                                  resizeMode="cover"
                                />
                                <View style={styles.slotInfo}>
                                  <Text style={styles.slotName}>{meal.name}</Text>
                                  {!hasPersonalizedPlan && (
                                    <View style={styles.slotMacros}>
                                      <View style={styles.macroItem}>
                                        <View style={[styles.macroDot, { backgroundColor: "#4A90E2" }]} />
                                        <Text style={styles.macroText}>{t("selected_meals.cal_label")} {meal.calories}</Text>
                                      </View>
                                      <View style={styles.macroItem}>
                                        <View style={[styles.macroDot, { backgroundColor: "#D0021B" }]} />
                                        <Text style={styles.macroText}>{t("selected_meals.protein_label")} {meal.protein}g</Text>
                                      </View>
                                      <View style={styles.macroItem}>
                                        <View style={[styles.macroDot, { backgroundColor: "#7ED321" }]} />
                                        <Text style={styles.macroText}>{t("selected_meals.carbs_label")} {meal.carbs}g</Text>
                                      </View>
                                      <View style={styles.macroItem}>
                                        <View style={[styles.macroDot, { backgroundColor: "#F5A623" }]} />
                                        <Text style={styles.macroText}>{t("selected_meals.fat_label")} {meal.fat}g</Text>
                                      </View>
                                    </View>
                                  )}
                                </View>
                              </View>
                            ) : (
                              <>
                                <Text style={styles.slotEmptyTitle}>{t("selected_meals.select_meal_prompt", { number: mealNumber })}</Text>
                                <Text style={styles.slotEmptyHint}>{t("selected_meals.tap_select_meal")}</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        );
                      })}

                      {/* Snack Slots */}
                      {Array.from({ length: snackCount }).map((_, snackIndex) => {
                          const snack = dayData?.snacks[snackIndex];
                          const ordinalKeys = ["first", "second", "third", "fourth", "fifth", "sixth"];
                          const snackNumber = t(`selected_meals.ordinals.${ordinalKeys[snackIndex] || "first"}`);

                          return (
                            <TouchableOpacity
                              key={`snack-${snackIndex}`}
                              style={snack ? styles.slotFilled : styles.slotEmpty}
                              onPress={() => handleSnackBoxClick(dayIndex, snackIndex)}
                              activeOpacity={0.8}
                            >
                              {snack ? (
                                <View style={styles.slotRow}>
                                  <Image
                                    source={snack.imageUrl ? { uri: snack.imageUrl } : require("@/assets/images/meal.jpg")}
                                    style={styles.slotThumb}
                                    resizeMode="cover"
                                  />
                                  <View style={styles.slotInfo}>
                                    <Text style={styles.slotName}>{snack.name}</Text>
                                    {!hasPersonalizedPlan && (
                                      <View style={styles.slotMacros}>
                                        <View style={styles.macroItem}>
                                          <View style={[styles.macroDot, { backgroundColor: "#4A90E2" }]} />
                                          <Text style={styles.macroText}>{t("selected_meals.cal_label")} {snack.calories}</Text>
                                        </View>
                                        <View style={styles.macroItem}>
                                          <View style={[styles.macroDot, { backgroundColor: "#D0021B" }]} />
                                          <Text style={styles.macroText}>{t("selected_meals.protein_label")} {snack.protein}g</Text>
                                        </View>
                                        <View style={styles.macroItem}>
                                          <View style={[styles.macroDot, { backgroundColor: "#7ED321" }]} />
                                          <Text style={styles.macroText}>{t("selected_meals.carbs_label")} {snack.carbs}g</Text>
                                        </View>
                                        <View style={styles.macroItem}>
                                          <View style={[styles.macroDot, { backgroundColor: "#F5A623" }]} />
                                          <Text style={styles.macroText}>{t("selected_meals.fat_label")} {snack.fat}g</Text>
                                        </View>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              ) : (
                                <>
                                  <Text style={styles.slotEmptyTitle}>{t("selected_meals.select_snack_prompt", { number: snackNumber })}</Text>
                                  <Text style={styles.slotEmptyHint}>{t("selected_meals.tap_select_snack")}</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <BottomTabNav
        activeTab="home"
        onHomePress={() => router.replace("/main-screen")}
      />
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
    paddingBottom: 20,
  },
  placeholder: {
    width: 40,
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: "#344225",
    borderRadius: 16,
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
    paddingRight: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 12,
    color: "#D4E8E0",
  },
  summaryIcon: {
    width: 80,
    height: 80,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#5A7C65",
    marginBottom: 16,
  },
  summaryDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FAD979",
  },
  summaryProteinNote: {
    fontSize: 11,
    color: "#D4E8E0",
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: "#FAD979",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
  },
  mealsContainer: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: "#344225",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealCardExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  mealLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  dropdownContent: {
    backgroundColor: "#344225",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 10,
    gap: 8,
  },

  /* Nutrition summary bar — yellow card, 2-column wrap */
  nutritionBar: {
    backgroundColor: "#FAD979",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 6,
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    width: "50%",
  },
  nutritionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  nutritionText: {
    fontSize: 11,
    color: "#344225",
    fontWeight: "600",
  },

  /* Empty slot — text only on dark bg */
  slotEmpty: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  slotEmptyTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  slotEmptyHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
  },

  /* Filled slot — white card with circular thumb */
  slotFilled: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 12,
  },
  slotThumb: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  slotInfo: {
    flex: 1,
  },
  slotName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 6,
  },
  slotMacros: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "50%",
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroText: {
    fontSize: 11,
    color: "#5A7C65",
    fontWeight: "500",
  },
});
