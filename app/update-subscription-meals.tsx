import { getMeals, type Meal, type MealExtra } from "@/api/services/meals";
import {
    getSubscriptionDetails,
    updateSubscriptionMeal,
    type UserSubscriptionDetails,
} from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const normalizeCategoryName = (category: unknown): string => {
  if (typeof category === "string") return category;
  if (category && typeof category === "object") {
    const c = category as { name?: unknown; title?: unknown };
    if (typeof c.name === "string") return c.name;
    if (typeof c.title === "string") return c.title;
  }
  return "";
};

const getMealCategoryName = (meal: Meal): string => {
  return normalizeCategoryName(meal.category) || meal.category_name || "";
};

const getMealCategoryNameAr = (meal: Meal): string => {
  return (meal.category && typeof meal.category === "object" ? (meal.category as any).name_ar : null) || meal.category_name_ar || "";
};

interface SlotState {
  day: string;
  mealId: number | null;
  type: "is meal" | "is snack";
  subscriptionMealId?: number;
}

export default function UpdateSubscriptionMealsScreen() {
  const { subscriptionId } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const [details, setDetails] = useState<UserSubscriptionDetails | null>(null);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerContext, setPickerContext] = useState<{
    day: string;
    type: "is meal" | "is snack";
    subscriptionMealId?: number;
    slotIndex: number;
  } | null>(null);
  // Extras sub-step inside the picker modal
  const [extrasMeal, setExtrasMeal] = useState<Meal | null>(null);
  const [extrasSelected, setExtrasSelected] = useState<Record<number, number[]>>({});
  const insets = useSafeAreaInsets();

  const weekdayNames = t("calendar.weekdays", { returnObjects: true }) as string[];
  const getDayName = (day: string) => {
    const idx = DAY_NAME_TO_INDEX[(day || "").toLowerCase()];
    return idx !== undefined ? weekdayNames[idx] : (day.charAt(0).toUpperCase() + day.slice(1));
  };

  useFocusEffect(
    useCallback(() => {
      if (subscriptionId) loadData(Number(subscriptionId));
    }, [subscriptionId]),
  );

  const getPlanCounts = (det: UserSubscriptionDetails) => {
    const plan = (det as any)?.subcrption_plans;
    if (plan?.meal_count != null) {
      return { meals: plan.meal_count as number, snacks: (plan.snack_count as number) ?? 0 };
    }
    // Fall back to max observed across days
    const days = det.subscription_days || [];
    let maxMeals = 1;
    let maxSnacks = 0;
    days.forEach((d) => {
      const mc = (d.subscription_meals || []).filter((m) => m.type === "is meal").length;
      const sc = (d.subscription_meals || []).filter((m) => m.type === "is snack").length;
      if (mc > maxMeals) maxMeals = mc;
      if (sc > maxSnacks) maxSnacks = sc;
    });
    return { meals: maxMeals, snacks: maxSnacks };
  };

  const buildSlots = (det: UserSubscriptionDetails): SlotState[] => {
    const { meals: mealCount, snacks: snackCount } = getPlanCounts(det);
    const result: SlotState[] = [];
    (det.subscription_days || []).forEach((day) => {
      const existing = day.subscription_meals || [];
      const existingMeals = existing.filter((m) => m.type === "is meal");
      const existingSnacks = existing.filter((m) => m.type === "is snack");

      for (let i = 0; i < mealCount; i++) {
        const e = existingMeals[i];
        result.push({
          day: day.day,
          mealId: e ? e.meal_id : null,
          type: "is meal",
          subscriptionMealId: e ? e.id : undefined,
        });
      }
      for (let i = 0; i < snackCount; i++) {
        const e = existingSnacks[i];
        result.push({
          day: day.day,
          mealId: e ? e.meal_id : null,
          type: "is snack",
          subscriptionMealId: e ? e.id : undefined,
        });
      }
    });
    return result;
  };

  const loadData = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const [subResponse, mealsData] = await Promise.all([
        getSubscriptionDetails(id),
        getMeals(),
      ]);
      if (subResponse.success && subResponse.data) {
        setDetails(subResponse.data);
        setSlots(buildSlots(subResponse.data));
      } else {
        setError(t("update_meals.load_error_details"));
      }
      setAllMeals(mealsData);
    } catch {
      setError(t("update_meals.load_error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const openPicker = (
    day: string,
    type: "is meal" | "is snack",
    subscriptionMealId: number | undefined,
    slotIndex: number,
  ) => {
    setPickerContext({ day, type, subscriptionMealId, slotIndex });
    setSearchQuery("");
    setSelectedCategory(null);
    setExtrasMeal(null);
    setExtrasSelected({});
    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
    setPickerContext(null);
    setExtrasMeal(null);
    setExtrasSelected({});
  };

  // Prefill extras from the slot's currently-saved choices when re-picking the same meal
  const seedExtrasForSlot = (meal: Meal): Record<number, number[]> => {
    const seed: Record<number, number[]> = {};
    if (!meal.meal_extras?.length || !pickerContext) return seed;
    const day = details?.subscription_days?.find((d) => d.day === pickerContext.day);
    const sm = (day?.subscription_meals as any[] | undefined)?.find(
      (m: any) => m.id === pickerContext.subscriptionMealId && m.meal_id === meal.id,
    );
    const selExtras = (sm as any)?.selected_extras;
    const selectedIds: number[] = Array.isArray(selExtras)
      ? selExtras.flatMap((se: any) => (Array.isArray(se.options) ? se.options.map((o: any) => o.id) : []))
      : [];
    meal.meal_extras.forEach((ex) => {
      const ids = ex.ingredients.filter((ing) => selectedIds.includes(ing.id)).map((ing) => ing.id);
      if (ids.length) seed[ex.id] = ids;
    });
    return seed;
  };

  const toggleExtraOption = (extra: MealExtra, optionId: number) => {
    setExtrasSelected((prev) => {
      const current = prev[extra.id] ?? [];
      if (extra.selection_type === "single") {
        return { ...prev, [extra.id]: current[0] === optionId ? [] : [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [extra.id]: current.filter((id) => id !== optionId) };
      }
      const max = extra.max_select;
      if (max != null && current.length >= max) return prev;
      return { ...prev, [extra.id]: [...current, optionId] };
    });
  };

  const confirmExtras = () => {
    if (!extrasMeal?.meal_extras) return;
    const missing = extrasMeal.meal_extras.filter(
      (ex) => ex.is_required && (extrasSelected[ex.id]?.length ?? 0) === 0,
    );
    if (missing.length > 0) {
      const names = missing
        .map((ex) => (isArabic && ex.name_ar ? ex.name_ar : ex.name))
        .join(", ");
      Alert.alert(t("meal_extras.required_title"), t("meal_extras.required_msg", { names }));
      return;
    }
    const ids = extrasMeal.meal_extras.flatMap((ex) => extrasSelected[ex.id] ?? []);
    handleSelectMeal(extrasMeal, ids);
  };

  const handleSelectMeal = async (meal: Meal, extraIngredientIds?: number[]) => {
    if (!pickerContext || !details) return;

    // If the meal offers extras and we haven't collected them yet, switch to the extras step
    if ((meal.meal_extras?.length ?? 0) > 0 && extraIngredientIds === undefined) {
      setExtrasSelected(seedExtrasForSlot(meal));
      setExtrasMeal(meal);
      return;
    }

    try {
      setSavingSlot(true);
      const subscriptionDayId = details.subscription_days?.find(
        (d) => d.day === pickerContext.day,
      )?.id;

      const response = await updateSubscriptionMeal({
        user_id: details.user_id,
        subscription_day_id: subscriptionDayId,
        day: subscriptionDayId === undefined ? pickerContext.day : undefined,
        meal_id: meal.id,
        type: pickerContext.type,
        subscription_meal_id: pickerContext.subscriptionMealId,
        ...(extraIngredientIds !== undefined ? { extra_ingredient_ids: extraIngredientIds } : {}),
      });

      const newSubMealId =
        response.data?.subscription_meal?.id ?? pickerContext.subscriptionMealId;

      setSlots((prev) => {
        const updated = [...prev];
        updated[pickerContext.slotIndex] = {
          ...updated[pickerContext.slotIndex],
          mealId: meal.id,
          subscriptionMealId: newSubMealId,
        };
        return updated;
      });

      closePicker();
    } catch {
      Alert.alert(t("update_meals.update_failed_title"), t("update_meals.update_failed_msg"));
    } finally {
      setSavingSlot(false);
    }
  };

  const typeFilteredMeals = pickerContext
    ? allMeals.filter((meal) => {
        if (meal.type !== pickerContext.type) return false;
        if (!details?.is_personalized) return true;
        const catName = getMealCategoryName(meal).toLowerCase();
        return pickerContext.type === "is meal"
          ? catName.includes("main course")
          : catName.includes("snack");
      })
    : [];

  const pickerCategories = Array.from(
    new Map(
      typeFilteredMeals.map((meal) => [
        meal.category_id,
        { id: meal.category_id, name: getMealCategoryName(meal), name_ar: getMealCategoryNameAr(meal) },
      ]),
    ).values(),
  ).filter((c) => c.name.length > 0);

  const filteredMeals = typeFilteredMeals.filter((meal) => {
    const matchesCategory = selectedCategory == null || meal.category_id === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      meal.title.toLowerCase().includes(q) ||
      (meal.title_ar ?? "").toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // Count already-assigned meals by meal_group_id, excluding the slot being replaced
  const groupUsageCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    slots.forEach((s, i) => {
      if (s.mealId != null && i !== pickerContext?.slotIndex) {
        const meal = allMeals.find((m) => m.id === s.mealId);
        if (meal?.meal_group_id != null) {
          counts[meal.meal_group_id] = (counts[meal.meal_group_id] ?? 0) + 1;
        }
      }
    });
    return counts;
  }, [slots, pickerContext?.slotIndex, allMeals]);

  const isMealAtLimit = (meal: Meal): boolean => {
    if (meal.meal_group_id == null) return false;
    const limit = meal.meal_group?.weekly_limit ?? meal.weekly_limit;
    if (limit == null) return false;
    return (groupUsageCounts[meal.meal_group_id] ?? 0) >= limit;
  };

  const planCounts = details ? getPlanCounts(details) : { meals: 1, snacks: 0 };
  const days = details?.subscription_days || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#344225" />
          <Text style={styles.loadingText}>{t("update_meals.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("update_meals.header_title")}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
          <Text style={styles.errorTitle}>{t("update_meals.load_error_title")}</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { if (subscriptionId) loadData(Number(subscriptionId)); }}
          >
            <Text style={styles.retryBtnText}>{t("update_meals.try_again")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("update_meals.header_title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Plan capacity info */}
        <View style={[styles.capacityBanner, isArabic && styles.rtlRow]}>
          <View style={[styles.capacityItem, isArabic && styles.rtlRow]}>
            <View style={[styles.capDot, { backgroundColor: "#344225" }]} />
            <Text style={styles.capacityText}>{t("update_meals.meals_per_day", { count: planCounts.meals, s: planCounts.meals !== 1 ? "s" : "" })}</Text>
          </View>
          {planCounts.snacks > 0 ? (
            <View style={[styles.capacityItem, isArabic && styles.rtlRow]}>
              <View style={[styles.capDot, { backgroundColor: "#FAD979" }]} />
              <Text style={styles.capacityText}>{t("update_meals.snacks_per_day", { count: planCounts.snacks, s: planCounts.snacks !== 1 ? "s" : "" })}</Text>
            </View>
          ) : null}
          <Text style={[styles.capacityHint, isArabic && styles.capacityHintRTL]}>{t("update_meals.tap_to_change")}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {days.map((day, dayIndex) => {
            const daySlots = slots.filter((s) => s.day === day.day);
            const mealSlots = daySlots.filter((s) => s.type === "is meal");
            const snackSlots = daySlots.filter((s) => s.type === "is snack");
            const filledMeals = mealSlots.filter((s) => s.mealId != null).length;
            const filledSnacks = snackSlots.filter((s) => s.mealId != null).length;

            return (
              <View key={dayIndex} style={styles.dayCard}>
                <View style={[styles.dayHeader, isArabic && styles.rtlRow]}>
                  <Text style={styles.dayHeaderText}>
                    {day.day ? getDayName(day.day) : ""}
                  </Text>
                  <View style={[styles.dayProgressRow, isArabic && styles.rtlRow]}>
                    <Text style={styles.dayProgressText}>
                      {`${filledMeals}/${planCounts.meals}`}
                    </Text>
                    {planCounts.snacks > 0 ? (
                      <Text style={styles.dayProgressTextSnack}>
                        {` · ${filledSnacks}/${planCounts.snacks} ${t("update_meals.snacks_label").toLowerCase()}`}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.dayBody}>
                  {/* Meal slots */}
                  <View style={styles.slotSection}>
                    <View style={[styles.slotSectionLabel, isArabic && styles.rtlRow]}>
                      <View style={[styles.slotDot, { backgroundColor: "#344225" }]} />
                      <Text style={styles.slotSectionText}>
                        {t("update_meals.meals_label")}  {t("update_meals.set_count", { filled: filledMeals, total: planCounts.meals })}
                      </Text>
                    </View>
                    {mealSlots.map((slot, i) => {
                      const globalIdx = slots.indexOf(slot);
                      const mealDetails = slot.mealId != null ? allMeals.find((m) => m.id === slot.mealId) : null;
                      return (
                        <SlotRow
                          key={`${day.day}-meal-${i}`}
                          label={t("update_meals.meal_n", { n: i + 1 })}
                          mealDetails={mealDetails}
                          isEmpty={slot.mealId == null}
                          onPress={() => openPicker(day.day, "is meal", slot.subscriptionMealId, globalIdx)}
                        />
                      );
                    })}
                  </View>

                  {planCounts.snacks > 0 ? (
                    <>
                      <View style={styles.sectionSep} />
                      <View style={styles.slotSection}>
                        <View style={[styles.slotSectionLabel, isArabic && styles.rtlRow]}>
                          <View style={[styles.slotDot, { backgroundColor: "#FAD979" }]} />
                          <Text style={styles.slotSectionText}>
                            {t("update_meals.snacks_label")}  {t("update_meals.set_count", { filled: filledSnacks, total: planCounts.snacks })}
                          </Text>
                        </View>
                        {snackSlots.map((slot, i) => {
                          const globalIdx = slots.indexOf(slot);
                          const snackDetails = slot.mealId != null ? allMeals.find((m) => m.id === slot.mealId) : null;
                          return (
                            <SlotRow
                              key={`${day.day}-snack-${i}`}
                              label={t("update_meals.snack_n", { n: i + 1 })}
                              mealDetails={snackDetails}
                              isEmpty={slot.mealId == null}
                              onPress={() => openPicker(day.day, "is snack", slot.subscriptionMealId, globalIdx)}
                            />
                          );
                        })}
                      </View>
                    </>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Picker Modal */}
        <Modal
          visible={pickerVisible}
          animationType="slide"
          transparent
          onRequestClose={closePicker}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={[styles.modalHeader, isArabic && styles.rtlRow]}>
                {extrasMeal ? (
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setExtrasMeal(null)}>
                    <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={18} color="#344225" />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 30 }} />
                )}
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {extrasMeal
                    ? t("meal_extras.title")
                    : pickerContext?.type === "is meal" ? t("update_meals.choose_meal") : t("update_meals.choose_snack")}
                </Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={closePicker}>
                  <Ionicons name="close" size={18} color="#344225" />
                </TouchableOpacity>
              </View>

              {savingSlot ? (
                <View style={styles.modalSaving}>
                  <ActivityIndicator size="small" color="#344225" />
                  <Text style={styles.modalSavingText}>{t("update_meals.saving")}</Text>
                </View>
              ) : extrasMeal ? (
                <>
                  <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.extrasMealName, isArabic && styles.rtlText]} numberOfLines={2}>
                      {(isArabic && extrasMeal.title_ar) ? extrasMeal.title_ar : extrasMeal.title}
                    </Text>
                    {(extrasMeal.meal_extras ?? []).map((extra) => {
                      const sel = extrasSelected[extra.id] ?? [];
                      const single = extra.selection_type === "single";
                      const atCap = !single && extra.max_select != null && sel.length >= extra.max_select;
                      const hint = single
                        ? t("meal_extras.pick_one")
                        : extra.max_select != null
                          ? t("meal_extras.pick_up_to", { count: extra.max_select })
                          : t("meal_extras.pick_any");
                      return (
                        <View key={extra.id} style={styles.extraBlock}>
                          <View style={[styles.extraHeaderRow, isArabic && styles.rtlRow]}>
                            <Text style={[styles.extraName, isArabic && styles.rtlText]}>
                              {isArabic && extra.name_ar ? extra.name_ar : extra.name}
                            </Text>
                            {extra.is_required ? (
                              <View style={styles.reqBadge}>
                                <Text style={styles.reqBadgeText}>{t("meal_extras.required")}</Text>
                              </View>
                            ) : (
                              <Text style={styles.optHint}>{t("meal_extras.optional")}</Text>
                            )}
                          </View>
                          <Text style={[styles.pickHintText, isArabic && styles.rtlText]}>{hint}</Text>
                          {extra.ingredients.map((opt) => {
                            const checked = sel.includes(opt.id);
                            const disabled = atCap && !checked;
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                style={[styles.optRow, isArabic && styles.rtlRow, disabled && { opacity: 0.4 }]}
                                disabled={disabled}
                                activeOpacity={0.7}
                                onPress={() => toggleExtraOption(extra, opt.id)}
                              >
                                <View style={[single ? styles.radioOuter : styles.checkOuter, checked && styles.controlOn]}>
                                  {checked &&
                                    (single ? (
                                      <View style={styles.radioInner} />
                                    ) : (
                                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                                    ))}
                                </View>
                                <Text style={[styles.optLabel, isArabic && styles.rtlText]}>
                                  {isArabic && opt.name_ar ? opt.name_ar : opt.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })}
                  </ScrollView>
                  <TouchableOpacity style={styles.extrasConfirmBtn} onPress={confirmExtras} activeOpacity={0.85}>
                    <Text style={styles.extrasConfirmText}>{t("meal_extras.save")}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={[styles.searchWrap, isArabic && styles.rtlRow]}>
                    <Ionicons name="search" size={16} color="#6B7F75" />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder={t("update_meals.search_placeholder")}
                      placeholderTextColor="#9AA5A0"
                      style={[styles.searchInput, isArabic && styles.rtlText]}
                      textAlign={isArabic ? "right" : "left"}
                    />
                  </View>

                  {/* Category chips */}
                  {pickerCategories.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={[styles.categoryScroll, isArabic && { flexDirection: "row-reverse" }]}
                      style={styles.categoryRow}
                    >
                      <TouchableOpacity
                        style={[styles.categoryChip, selectedCategory == null && styles.categoryChipActive]}
                        onPress={() => setSelectedCategory(null)}
                      >
                        <Text style={[styles.categoryChipText, selectedCategory == null && styles.categoryChipTextActive]}>
                          {t("update_meals.all")}
                        </Text>
                      </TouchableOpacity>
                      {pickerCategories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                          onPress={() => setSelectedCategory(cat.id)}
                        >
                          <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                            {isArabic && cat.name_ar ? cat.name_ar : cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                    {filteredMeals.map((meal) => {
                      const atLimit = isMealAtLimit(meal);
                      return (
                        <TouchableOpacity
                          key={meal.id}
                          style={[styles.modalMealRow, isArabic && styles.rtlRow, atLimit && styles.modalMealRowDisabled]}
                          onPress={() => !atLimit && handleSelectMeal(meal)}
                          activeOpacity={atLimit ? 1 : 0.7}
                        >
                          {meal.image_url || meal.image_thumb_url ? (
                            <Image
                              source={{ uri: meal.image_url || meal.image_thumb_url }}
                              style={[styles.modalMealThumb, atLimit && { opacity: 0.4 }]}
                            />
                          ) : (
                            <View style={[styles.modalMealThumb, styles.thumbPlaceholder, atLimit && { opacity: 0.4 }]}>
                              <Ionicons name="restaurant-outline" size={20} color="#6B7F75" />
                            </View>
                          )}
                          <View style={styles.modalMealInfo}>
                            <Text style={[styles.modalMealName, isArabic && styles.rtlText, atLimit && { color: "#B8D5C5" }]} numberOfLines={2}>
                              {(isArabic && meal.title_ar) ? meal.title_ar : meal.title}
                            </Text>
                            <Text style={[styles.modalMealMeta, isArabic && styles.rtlText]}>
                              {`${meal.calories} kcal · P ${meal.protein_g}g · C ${meal.carbs_g}g`}
                            </Text>
                            {(meal.meal_extras?.length ?? 0) > 0 && (
                              <Text style={styles.modalMealExtrasHint}>{t("meal_extras.customizable")}</Text>
                            )}
                            {atLimit && (
                              <View style={styles.limitBadge}>
                                <Text style={styles.limitBadgeText}>{t("update_meals.limit_reached")}</Text>
                              </View>
                            )}
                          </View>
                          {!atLimit && <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={16} color="#B8D5C5" />}
                        </TouchableOpacity>
                      );
                    })}
                    {filteredMeals.length === 0 ? (
                      <View style={styles.modalEmpty}>
                        <Ionicons name="search-outline" size={36} color="#B8D5C5" />
                        <Text style={styles.modalEmptyText}>{t("update_meals.no_results")}</Text>
                      </View>
                    ) : null}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>

      <BottomTabNav activeTab="home" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

interface SlotRowProps {
  label: string;
  mealDetails: Meal | null | undefined;
  isEmpty: boolean;
  onPress: () => void;
}

function SlotRow({ label, mealDetails, isEmpty, onPress }: SlotRowProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");

  if (isEmpty) {
    return (
      <TouchableOpacity style={[styles.emptySlot, isArabic && styles.rtlRow]} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.emptySlotIcon}>
          <Ionicons name="add" size={18} color="#344225" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.emptySlotLabel, isArabic && styles.rtlText]}>{label}</Text>
          <Text style={[styles.emptySlotHint, isArabic && styles.rtlText]}>{t("update_meals.tap_to_add")}</Text>
        </View>
        <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={16} color="#B8D5C5" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.mealSlotRow, isArabic && styles.rtlRow]}>
      {mealDetails?.image_url || mealDetails?.image_thumb_url ? (
        <Image
          source={{ uri: mealDetails.image_url || mealDetails.image_thumb_url }}
          style={styles.mealThumb}
        />
      ) : (
        <View style={[styles.mealThumb, styles.thumbPlaceholder]}>
          <Ionicons name="restaurant-outline" size={18} color="#6B7F75" />
        </View>
      )}
      <View style={styles.mealSlotInfo}>
        <Text style={[styles.slotSlotLabel, isArabic && styles.rtlText]}>{label}</Text>
        <Text style={[styles.mealSlotName, isArabic && styles.rtlText]} numberOfLines={1}>
          {(isArabic && mealDetails?.title_ar) ? mealDetails.title_ar : (mealDetails?.title ?? t("update_meals.unknown_meal"))}
        </Text>
        <Text style={[styles.mealSlotMeta, isArabic && styles.rtlText]}>
          {[
            mealDetails?.calories ? `${mealDetails.calories} kcal` : null,
            mealDetails?.protein_g ? `P ${mealDetails.protein_g}g` : null,
            mealDetails?.carbs_g ? `C ${mealDetails.carbs_g}g` : null,
          ].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <TouchableOpacity style={styles.changeBtn} onPress={onPress}>
        <Ionicons name="create-outline" size={14} color="#344225" />
        <Text style={styles.changeBtnText}>{t("update_meals.change")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  rtlRow: { flexDirection: "row-reverse" },
  rtlText: { textAlign: "right" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#344225", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#344225", flex: 1, textAlign: "center" },
  loadingText: { fontSize: 14, color: "#6B7F75", marginTop: 12 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: "#344225", marginTop: 16 },
  errorDesc: { fontSize: 13, color: "#6B7F75", textAlign: "center", marginTop: 6, marginBottom: 20 },
  retryBtn: { backgroundColor: "#344225", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  capacityBanner: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#344225",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  capacityItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  capDot: { width: 8, height: 8, borderRadius: 4 },
  capacityText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  capacityHint: { fontSize: 11, color: "#B8D5C5", marginLeft: "auto" },
  capacityHintRTL: { marginLeft: 0, marginRight: "auto" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  dayCard: { backgroundColor: "#FFFFFF", borderRadius: 18, marginBottom: 14, overflow: "hidden" },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#344225",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayHeaderText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  dayProgressRow: { flexDirection: "row", alignItems: "center" },
  dayProgressText: { fontSize: 12, fontWeight: "700", color: "#FAD979" },
  dayProgressTextSnack: { fontSize: 11, color: "#B8D5C5" },
  dayBody: { padding: 14 },

  slotSection: { gap: 10 },
  slotSectionLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  slotDot: { width: 8, height: 8, borderRadius: 4 },
  slotSectionText: { fontSize: 11, fontWeight: "700", color: "#6B7F75", textTransform: "uppercase", letterSpacing: 0.4 },
  sectionSep: { height: 1, backgroundColor: "#EEF4F0", marginVertical: 10 },

  mealSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F7FAF8",
    borderRadius: 10,
    padding: 10,
  },
  mealThumb: { width: 52, height: 52, borderRadius: 10 },
  thumbPlaceholder: { backgroundColor: "#EEF4F0", alignItems: "center", justifyContent: "center" },
  mealSlotInfo: { flex: 1 },
  slotSlotLabel: { fontSize: 10, color: "#6B7F75", fontWeight: "600", marginBottom: 2 },
  mealSlotName: { fontSize: 13, fontWeight: "600", color: "#344225" },
  mealSlotMeta: { fontSize: 11, color: "#6B7F75", marginTop: 2 },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FAD979",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeBtnText: { fontSize: 12, fontWeight: "700", color: "#344225" },

  emptySlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0F7F3",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#B8D5C5",
    borderStyle: "dashed",
  },
  emptySlotIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#D4E8E0", alignItems: "center", justifyContent: "center",
  },
  emptySlotLabel: { fontSize: 13, fontWeight: "600", color: "#344225" },
  emptySlotHint: { fontSize: 11, color: "#6B7F75", marginTop: 1 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#D0D9D4", alignSelf: "center", marginBottom: 14,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#344225" },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#EEF4F0", alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F4F6F5",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: "#344225" },
  modalSaving: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 40 },
  modalSavingText: { fontSize: 14, color: "#6B7F75" },
  modalList: { maxHeight: 480 },
  modalMealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF4F0",
  },
  modalMealThumb: { width: 56, height: 56, borderRadius: 10 },
  modalMealInfo: { flex: 1 },
  modalMealName: { fontSize: 14, fontWeight: "600", color: "#344225", marginBottom: 3 },
  modalMealMeta: { fontSize: 12, color: "#6B7F75" },
  modalEmpty: { paddingVertical: 40, alignItems: "center", gap: 8 },
  modalEmptyText: { fontSize: 14, color: "#6B7F75" },
  modalMealRowDisabled: { backgroundColor: "#F7F9F8" },
  limitBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#FDE8E8",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  limitBadgeText: { fontSize: 10, fontWeight: "700", color: "#C0392B" },

  categoryRow: { marginBottom: 12 },
  categoryScroll: { gap: 8, paddingHorizontal: 2 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#EEF4F0",
    borderWidth: 1,
    borderColor: "#D0DDD5",
  },
  categoryChipActive: {
    backgroundColor: "#344225",
    borderColor: "#344225",
  },
  categoryChipText: { fontSize: 13, fontWeight: "500", color: "#4A6040" },
  categoryChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  // Extras step (inside picker modal)
  modalMealExtrasHint: { fontSize: 11, color: "#4A6040", fontWeight: "600", marginTop: 3 },
  extrasMealName: { fontSize: 16, fontWeight: "700", color: "#344225", marginBottom: 12 },
  extraBlock: {
    backgroundColor: "#F7FAF8",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E4EDE8",
  },
  extraHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  extraName: { fontSize: 15, fontWeight: "700", color: "#344225", flexShrink: 1 },
  reqBadge: { backgroundColor: "#344225", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  reqBadgeText: { fontSize: 10, fontWeight: "700", color: "#FAD979" },
  optHint: { fontSize: 11, color: "#8A8F8B", fontWeight: "500" },
  pickHintText: { fontSize: 12, color: "#8A8F8B", marginTop: 2, marginBottom: 8 },
  optRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#B8C6BD",
    alignItems: "center", justifyContent: "center",
  },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#344225" },
  checkOuter: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#B8C6BD",
    alignItems: "center", justifyContent: "center",
  },
  controlOn: { borderColor: "#344225", backgroundColor: "#344225" },
  optLabel: { flex: 1, fontSize: 14, color: "#344225" },
  extrasConfirmBtn: {
    backgroundColor: "#FAD979",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12,
  },
  extrasConfirmText: { fontSize: 16, fontWeight: "700", color: "#344225" },
});
