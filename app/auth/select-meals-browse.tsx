import {
  type Duration,
  getMeals,
  getSubscriptionMeals,
  type Meal,
  updateSubscriptionMeal,
} from "@/api";
import { assignMealToSlot } from "@/app/auth/utils/assign-meal-to-slot";
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
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MealItem = {
  id: string;
  name: string;
  name_ar?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  category?: string;
  meal_group_id?: number | null;
  weekly_limit?: number | null;
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
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
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
  const { width: windowWidth } = useWindowDimensions();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // grid content is padded 16 on each side with a 12 gutter (matches main screen)
  const cardWidth = (windowWidth - 44) / 2;

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
        // Map the meal's available extras (subscription responses use `available_extras`;
        // fall back to `meal_extras` if a full meal object is embedded).
        const availableExtras = Array.isArray(mealData.available_extras)
          ? mealData.available_extras
          : Array.isArray(mealData.meal_extras)
            ? mealData.meal_extras
            : [];
        const extras = availableExtras.map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          name_ar: ex.name_ar,
          selection_type: ex.selection_type,
          is_required: ex.is_required,
          max_select: ex.max_select ?? null,
          ingredients: Array.isArray(ex.ingredients)
            ? ex.ingredients
            : Array.isArray(ex.options)
              ? ex.options
              : [],
        }));
        // Flatten the customer's already-picked option ids
        const selectedExtras = Array.isArray(subMeal.selected_extras) ? subMeal.selected_extras : [];
        const selectedExtraIds = selectedExtras.flatMap((se: any) =>
          Array.isArray(se.options) ? se.options.map((o: any) => o.id) : [],
        );
        const mealItem = {
          id: (mealData.id ?? subMeal.meal_id)?.toString() || "",
          name: mealData.title || mealData.name || "",
          name_ar: mealData.title_ar || mealData.name_ar,
          calories: mealData.calories || 0,
          protein: mealData.protein_g || 0,
          carbs: mealData.carbs_g || 0,
          fat: mealData.fat_g || 0,
          imageUrl: mealData.image_url || mealData.image_thumb_url,
          subscriptionMealId: subMeal.id,
          extras,
          selectedExtraIds,
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
  const filteredItems = filteredByCategory.filter((meal) => {
    const q = searchQuery.toLowerCase();
    return (
      meal.title.toLowerCase().includes(q) ||
      (meal.title_ar ?? "").toLowerCase().includes(q)
    );
  });

  // Convert API meal to MealItem format
  const convertMealToItem = (meal: Meal): MealItem => ({
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
  });

  const handleAddItem = async (meal: Meal) => {
    if (dayIndex === null || mealIndex === null) {
      Alert.alert(t("common.error"), t("select_meals.error_params"));
      return;
    }

    // If the meal offers extras, let the customer pick them on the extras screen first
    if (meal.meal_extras && meal.meal_extras.length > 0) {
      router.push({
        pathname: "/auth/meal-extras",
        params: {
          mealId: String(meal.id),
          dayIndex: String(dayIndex),
          mealIndex: String(mealIndex),
          type,
          from: "browse",
          ...(subscriptionMealId ? { subscriptionMealId: String(subscriptionMealId) } : {}),
        },
      } as any);
      return;
    }

    // No extras: save directly (handles both update mode and onboarding)
    try {
      const { updateMode } = await assignMealToSlot({
        meal,
        dayIndex,
        mealIndex,
        type: type as "meal" | "snack",
        subscriptionMealId,
      });
      const saved = await AsyncStorage.getItem("selectedDayMeals");
      if (saved) setCurrentDayMeals(JSON.parse(saved));
      if (updateMode) Alert.alert(t("common.ok"), t("select_meals.success_updated"));
      router.back();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : t("select_meals.error_save_failed");
      Alert.alert(t("common.error"), msg);
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

  const planWeeks = Math.max(1, (selectedDuration as any)?.no_of_weeks ?? (selectedPlan as any)?.no_of_weeks ?? 1);

  const proteinExtraCharge =
    hasPersonalizedPlan && proteinExtraPerMeal > 0
      ? proteinExtraPerMeal * (selectedPlan?.meal_count || 1) * selectedDays.length * planWeeks
      : 0;

  const getPlanDisplayPrice = (): string => {
    return `KWD ${(getBasePlanPrice() + proteinExtraCharge).toFixed(3)}`;
  };

  // Count already-selected meals by meal_group_id, excluding the slot currently being filled
  const groupCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    Object.entries(currentDayMeals).forEach(([dIdxStr, dm]) => {
      const di = parseInt(dIdxStr, 10);
      dm.meals.forEach((m, mi) => {
        if (m && m.meal_group_id != null && !(di === dayIndex && mi === mealIndex && type === "meal")) {
          counts[m.meal_group_id] = (counts[m.meal_group_id] ?? 0) + 1;
        }
      });
      dm.snacks.forEach((s, si) => {
        if (s && s.meal_group_id != null && !(di === dayIndex && si === mealIndex && type === "snack")) {
          counts[s.meal_group_id] = (counts[s.meal_group_id] ?? 0) + 1;
        }
      });
    });
    return counts;
  }, [currentDayMeals, dayIndex, mealIndex, type]);

  const isMealAtLimit = (meal: Meal): boolean => {
    if (meal.meal_group_id == null) return false;
    const limit = meal.meal_group?.weekly_limit ?? meal.weekly_limit;
    if (limit == null) return false;
    return (groupCounts[meal.meal_group_id] ?? 0) >= limit;
  };

  const isLoadingState = loading || loadingExisting;

  // Group filtered items by category so we can render section headers like the main screen
  const groupedCategories = (() => {
    const map = new Map<number, { id: number; name: string; name_ar: string; meals: Meal[] }>();
    filteredItems.forEach((meal) => {
      const catId = (meal as any).category_id ?? 0;
      const catName = normalizeCategoryName(meal.category) || (meal as any).category_name || "";
      const catNameAr =
        (meal.category && typeof meal.category === "object" ? (meal.category as any).name_ar : null) ||
        (meal as any).category_name_ar ||
        "";
      if (!catName) return;
      if (!map.has(catId)) map.set(catId, { id: catId, name: catName, name_ar: catNameAr, meals: [] });
      map.get(catId)!.meals.push(meal);
    });
    return Array.from(map.values()).filter((g) => g.meals.length > 0);
  })();

  // Grid card — same visual language as the main screen, with an Add button
  const renderGridCard = (meal: Meal) => {
    const item = convertMealToItem(meal);
    const atLimit = isMealAtLimit(meal);
    const desc = (isArabic && (meal as any).description_ar) ? (meal as any).description_ar : (meal as any).description;
    return (
      <View
        key={meal.id}
        style={[styles.card, { width: cardWidth }, atLimit && styles.cardDisabled]}
      >
        {!hasPersonalizedPlan && !atLimit && (
          <View style={styles.calorieBadge}>
            <Text style={styles.calorieText}>{item.calories} {t("select_meals.kcal")}</Text>
          </View>
        )}
        {atLimit && (
          <View style={styles.limitBadge}>
            <Text style={styles.limitBadgeText}>{t("select_meals.limit_reached")}</Text>
          </View>
        )}
        <Image
          source={item.imageUrl ? { uri: item.imageUrl } : require("@/assets/images/meal.jpg")}
          style={[styles.cardImage, atLimit && { opacity: 0.4 }]}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, isArabic && styles.rtlText, atLimit && { color: "#B8D5C5" }]} numberOfLines={2}>
            {(isArabic && item.name_ar) ? item.name_ar : item.name}
          </Text>
          {hasPersonalizedPlan ? (
            desc ? <Text style={[styles.cardDesc, isArabic && styles.rtlText]} numberOfLines={3}>{desc}</Text> : null
          ) : (
            <>
              <View style={[styles.macroRow, isArabic && styles.rtlRow]}>
                <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
                  <View style={[styles.macroDot, { backgroundColor: "#4A90E2" }]} />
                  <Text style={styles.macroText}>{t("select_meals.cal_label")} {item.calories}</Text>
                </View>
                <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
                  <View style={[styles.macroDot, { backgroundColor: "#D0021B" }]} />
                  <Text style={styles.macroText}>{t("select_meals.protein_label")} {item.protein}g</Text>
                </View>
              </View>
              <View style={[styles.macroRow, isArabic && styles.rtlRow]}>
                <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
                  <View style={[styles.macroDot, { backgroundColor: "#7ED321" }]} />
                  <Text style={styles.macroText}>{t("select_meals.carbs_label")} {item.carbs}g</Text>
                </View>
                <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
                  <View style={[styles.macroDot, { backgroundColor: "#F5A623" }]} />
                  <Text style={styles.macroText}>{t("select_meals.fat_label")} {item.fat}g</Text>
                </View>
              </View>
            </>
          )}
          <TouchableOpacity
            style={[styles.addButton, styles.addButtonGrid, atLimit && styles.addButtonDisabled]}
            onPress={() => !atLimit && handleAddItem(meal)}
            disabled={atLimit}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>
              {atLimit ? t("select_meals.limit_reached") : t("select_meals.add_button")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // List row — same visual language as the main screen list view, tap to add
  const renderListRow = (meal: Meal) => {
    const item = convertMealToItem(meal);
    const atLimit = isMealAtLimit(meal);
    const desc = (isArabic && (meal as any).description_ar) ? (meal as any).description_ar : (meal as any).description;
    return (
      <View style={[styles.listRow, isArabic && styles.rtlRow, atLimit && styles.cardDisabled]}>
        <View style={styles.listInfo}>
          <Text style={[styles.listTitle, isArabic && styles.rtlText, atLimit && { color: "#B8D5C5" }]} numberOfLines={2}>
            {(isArabic && item.name_ar) ? item.name_ar : item.name}
          </Text>
          {!!desc && <Text style={[styles.listDesc, isArabic && styles.rtlText]} numberOfLines={3}>{desc}</Text>}
          {!hasPersonalizedPlan && (
            <View style={[styles.listMacroRow, isArabic && styles.rtlRow]}>
              <View style={styles.listMacroCol}>
                <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                  <View style={[styles.listMacroDot, { backgroundColor: "#4A90E2" }]} />
                  <Text style={styles.listMacroText}>{t("select_meals.cal_label")} {item.calories}</Text>
                </View>
                <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                  <View style={[styles.listMacroDot, { backgroundColor: "#7ED321" }]} />
                  <Text style={styles.listMacroText}>{t("select_meals.carbs_label")} {item.carbs}g</Text>
                </View>
              </View>
              <View style={styles.listMacroCol}>
                <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                  <View style={[styles.listMacroDot, { backgroundColor: "#D0021B" }]} />
                  <Text style={styles.listMacroText}>{t("select_meals.protein_label")} {item.protein}g</Text>
                </View>
                <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                  <View style={[styles.listMacroDot, { backgroundColor: "#F5A623" }]} />
                  <Text style={styles.listMacroText}>{t("select_meals.fat_label")} {item.fat}g</Text>
                </View>
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.addButton, styles.addButtonListInline, atLimit && styles.addButtonDisabled]}
            onPress={() => !atLimit && handleAddItem(meal)}
            disabled={atLimit}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>
              {atLimit ? t("select_meals.limit_reached") : t("select_meals.add_button")}
            </Text>
          </TouchableOpacity>
        </View>
        <Image
          source={item.imageUrl ? { uri: item.imageUrl } : require("@/assets/images/meal.jpg")}
          style={[styles.listImage, atLimit && { opacity: 0.4 }]}
          resizeMode="cover"
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <View style={[styles.headerLeft, isArabic && styles.rtlRow]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, isArabic && styles.rtlText]} numberOfLines={1}>
              {type === "snack" ? t("select_meals.title_snacks") : t("select_meals.title_meals")}
            </Text>
          </View>
          {/* Grid/List toggle */}
          <View style={styles.viewToggleRow}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === "grid" && styles.viewToggleBtnActive]}
              onPress={() => setViewMode("grid")}
              activeOpacity={1}
            >
              <Ionicons name="grid-outline" size={16} color={viewMode === "grid" ? "#FFFFFF" : "#344225"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
              onPress={() => setViewMode("list")}
              activeOpacity={1}
            >
              <Ionicons name="list-outline" size={18} color={viewMode === "list" ? "#FFFFFF" : "#344225"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, isArabic && styles.searchInputRTL]}
            placeholder={t("select_meals.search_placeholder")}
            placeholderTextColor="#6B7F75"
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign={isArabic ? "right" : "left"}
          />
          <Ionicons
            name="search"
            size={20}
            color="#6B7F75"
            style={[styles.searchIcon, isArabic && styles.searchIconRTL]}
          />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Loading State */}
          {isLoadingState ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>
                {type === "snack" ? t("select_meals.loading_snacks") : t("select_meals.loading_meals")}
              </Text>
            </View>
          ) : groupedCategories.length > 0 ? (
            groupedCategories.map((group) => {
              const rows: Meal[][] = [];
              for (let i = 0; i < group.meals.length; i += 2) {
                rows.push(group.meals.slice(i, i + 2));
              }
              return (
                <View key={group.id} style={styles.categorySection}>
                  {/* Category header bar */}
                  <View style={[styles.sectionHeader, isArabic && styles.rtlRow]}>
                    <Text style={[styles.sectionTitle, isArabic && styles.rtlText]}>
                      {isArabic && group.name_ar ? group.name_ar : group.name}
                    </Text>
                    <Text style={styles.sectionCount}>{group.meals.length}</Text>
                  </View>

                  {viewMode === "grid" ? (
                    <View style={styles.grid}>
                      {rows.map((row, rowIdx) => (
                        <View key={rowIdx}>
                          <View style={styles.gridRow}>
                            {row.map((meal) => renderGridCard(meal))}
                            {row.length === 1 && <View style={{ width: cardWidth }} />}
                            {row.length === 2 && <View style={styles.colDivider} pointerEvents="none" />}
                          </View>
                          {rowIdx < rows.length - 1 && <View style={styles.rowDivider} />}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.listWrap}>
                      {group.meals.map((meal, idx) => (
                        <View key={meal.id}>
                          {renderListRow(meal)}
                          {idx < group.meals.length - 1 && <View style={styles.listDivider} />}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {type === "snack" ? t("select_meals.no_snacks_found") : t("select_meals.no_meals_found")}
              </Text>
            </View>
          )}
        </ScrollView>
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
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: "5%",
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
    flexShrink: 1,
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
    paddingRight: 44,
    fontSize: 14,
    color: "#344225",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    position: "absolute",
    right: 30,
    top: 13,
  },
  searchInputRTL: {
    paddingRight: 16,
    paddingLeft: 44,
  },
  searchIconRTL: {
    right: undefined,
    left: 30,
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
    paddingBottom: 32,
  },
  categorySection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#344225",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FAD979",
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    color: "#FAD979",
    fontWeight: "600",
  },
  // View toggle (header, right side)
  viewToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C9D7CE",
  },
  viewToggleBtnActive: {
    backgroundColor: "#344225",
    borderColor: "#344225",
  },
  // Grid layout (matches main screen)
  grid: {
    paddingHorizontal: 16,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    position: "relative",
    paddingVertical: 10,
  },
  colDivider: {
    position: "absolute",
    left: "50%",
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: "#C9D7CE",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#C9D7CE",
  },
  card: {},
  cardDisabled: {
    opacity: 0.6,
  },
  calorieBadge: {
    position: "absolute",
    zIndex: 1,
    top: 8,
    left: 8,
    backgroundColor: "#E52C49",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  calorieText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  cardImage: {
    width: "100%",
    height: 130,
    borderRadius: 10,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 11,
    color: "#6B7F75",
    lineHeight: 15,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroText: {
    fontSize: 10,
    color: "#344225",
  },
  // List layout (matches main screen)
  listWrap: {
    paddingHorizontal: 16,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
  },
  listInfo: {
    flex: 1,
    justifyContent: "center",
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  listDesc: {
    fontSize: 14,
    color: "#8A8F8B",
    lineHeight: 20,
    marginBottom: 14,
  },
  listMacroRow: {
    flexDirection: "row",
  },
  listMacroCol: {
    flex: 1,
    gap: 10,
  },
  listMacroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listMacroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listMacroText: {
    fontSize: 14,
    color: "#344225",
  },
  listImage: {
    width: 128,
    height: 118,
    borderRadius: 12,
    alignSelf: "center",
  },
  listDivider: {
    height: 1,
    backgroundColor: "#93A79B",
  },
  limitInlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C0392B",
    marginTop: 4,
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
  // Grid: small, consistent gap between the description/macros and the Add button
  addButtonGrid: {
    marginTop: 4,
  },
  addButtonDisabled: {
    backgroundColor: "#B8D5C5",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  // List-view Add button: compact, left-aligned under the macros
  addButtonListInline: {
    alignSelf: "flex-start",
    paddingHorizontal: 28,
    marginTop: 12,
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
