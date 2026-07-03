import { getMeals, type Meal } from "@/api/services/meals";
import {
  getSubscriptionDetails,
  updateSubscriptionMeal,
  type UserSubscriptionDetails,
} from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const normalizeCategoryName = (category: unknown): string => {
  if (typeof category === "string") return category;
  if (category && typeof category === "object") {
    const c = category as { name?: unknown; title?: unknown };
    if (typeof c.name === "string") return c.name;
    if (typeof c.title === "string") return c.title;
  }
  return "";
};

interface SlotState {
  day: string;
  mealId: number | null;
  type: "is meal" | "is snack";
  subscriptionMealId?: number;
}

export default function UpdateSubscriptionMealsScreen() {
  const { subscriptionId } = useLocalSearchParams();
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
  const insets = useSafeAreaInsets();

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
        setError("Failed to load subscription details");
      }
      setAllMeals(mealsData);
    } catch {
      setError("Failed to load data. Please try again.");
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
    setPickerVisible(true);
  };

  const handleSelectMeal = async (meal: Meal) => {
    if (!pickerContext || !details) return;
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

      setPickerVisible(false);
      setPickerContext(null);
    } catch {
      Alert.alert("Update failed", "Could not update meal. Please try again.");
    } finally {
      setSavingSlot(false);
    }
  };

  const typeFilteredMeals = pickerContext
    ? allMeals.filter((meal) => {
        if (meal.type !== pickerContext.type) return false;
        if (!details?.is_personalized) return true;
        const catName = normalizeCategoryName(meal.category).toLowerCase();
        return pickerContext.type === "is meal"
          ? catName.includes("main course")
          : catName.includes("snack");
      })
    : [];

  const pickerCategories = Array.from(
    new Map(
      typeFilteredMeals.map((meal) => [
        meal.category_id,
        { id: meal.category_id, name: normalizeCategoryName(meal.category) },
      ]),
    ).values(),
  ).filter((c) => c.name.length > 0);

  const filteredMeals = typeFilteredMeals.filter((meal) => {
    const matchesCategory = selectedCategory == null || meal.category_id === selectedCategory;
    const matchesSearch = meal.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Count how many times each meal_id appears across all slots, excluding the slot being replaced
  const weeklyUsageCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    slots.forEach((s, i) => {
      if (s.mealId != null && i !== pickerContext?.slotIndex) {
        counts[s.mealId] = (counts[s.mealId] ?? 0) + 1;
      }
    });
    return counts;
  }, [slots, pickerContext?.slotIndex]);

  const isMealAtLimit = (meal: Meal) =>
    meal.weekly_limit != null && (weeklyUsageCounts[meal.id] ?? 0) >= meal.weekly_limit;

  const planCounts = details ? getPlanCounts(details) : { meals: 1, snacks: 0 };
  const days = details?.subscription_days || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#344225" />
          <Text style={styles.loadingText}>Loading meals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Meals</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
          <Text style={styles.errorTitle}>Could not load</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { if (subscriptionId) loadData(Number(subscriptionId)); }}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Meals</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Plan capacity info */}
        <View style={styles.capacityBanner}>
          <View style={styles.capacityItem}>
            <View style={[styles.capDot, { backgroundColor: "#344225" }]} />
            <Text style={styles.capacityText}>{`${planCounts.meals} meal${planCounts.meals !== 1 ? "s" : ""} per day`}</Text>
          </View>
          {planCounts.snacks > 0 ? (
            <View style={styles.capacityItem}>
              <View style={[styles.capDot, { backgroundColor: "#FAD979" }]} />
              <Text style={styles.capacityText}>{`${planCounts.snacks} snack${planCounts.snacks !== 1 ? "s" : ""} per day`}</Text>
            </View>
          ) : null}
          <Text style={styles.capacityHint}>Tap any slot to change or add</Text>
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
                <View style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>
                    {day.day ? day.day.charAt(0).toUpperCase() + day.day.slice(1) : ""}
                  </Text>
                  <View style={styles.dayProgressRow}>
                    <Text style={styles.dayProgressText}>
                      {`${filledMeals}/${planCounts.meals}`}
                    </Text>
                    {planCounts.snacks > 0 ? (
                      <Text style={styles.dayProgressTextSnack}>
                        {` · ${filledSnacks}/${planCounts.snacks} snacks`}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.dayBody}>
                  {/* Meal slots */}
                  <View style={styles.slotSection}>
                    <View style={styles.slotSectionLabel}>
                      <View style={[styles.slotDot, { backgroundColor: "#344225" }]} />
                      <Text style={styles.slotSectionText}>
                        {`Meals  (${filledMeals} of ${planCounts.meals} set)`}
                      </Text>
                    </View>
                    {mealSlots.map((slot, i) => {
                      const globalIdx = slots.indexOf(slot);
                      const mealDetails = slot.mealId != null ? allMeals.find((m) => m.id === slot.mealId) : null;
                      return (
                        <SlotRow
                          key={`${day.day}-meal-${i}`}
                          label={`Meal ${i + 1}`}
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
                        <View style={styles.slotSectionLabel}>
                          <View style={[styles.slotDot, { backgroundColor: "#FAD979" }]} />
                          <Text style={styles.slotSectionText}>
                            {`Snacks  (${filledSnacks} of ${planCounts.snacks} set)`}
                          </Text>
                        </View>
                        {snackSlots.map((slot, i) => {
                          const globalIdx = slots.indexOf(slot);
                          const snackDetails = slot.mealId != null ? allMeals.find((m) => m.id === slot.mealId) : null;
                          return (
                            <SlotRow
                              key={`${day.day}-snack-${i}`}
                              label={`Snack ${i + 1}`}
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
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {pickerContext?.type === "is meal" ? "Choose a Meal" : "Choose a Snack"}
                </Text>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPickerVisible(false)}>
                  <Ionicons name="close" size={18} color="#344225" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color="#6B7F75" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search..."
                  placeholderTextColor="#9AA5A0"
                  style={styles.searchInput}
                />
              </View>

              {/* Category chips */}
              {pickerCategories.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                  style={styles.categoryRow}
                >
                  <TouchableOpacity
                    style={[styles.categoryChip, selectedCategory == null && styles.categoryChipActive]}
                    onPress={() => setSelectedCategory(null)}
                  >
                    <Text style={[styles.categoryChipText, selectedCategory == null && styles.categoryChipTextActive]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {pickerCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {savingSlot ? (
                <View style={styles.modalSaving}>
                  <ActivityIndicator size="small" color="#344225" />
                  <Text style={styles.modalSavingText}>Saving...</Text>
                </View>
              ) : (
                <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                  {filteredMeals.map((meal) => {
                    const atLimit = isMealAtLimit(meal);
                    return (
                    <TouchableOpacity
                      key={meal.id}
                      style={[styles.modalMealRow, atLimit && styles.modalMealRowDisabled]}
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
                        <Text style={[styles.modalMealName, atLimit && { color: "#B8D5C5" }]} numberOfLines={2}>{meal.title}</Text>
                        <Text style={styles.modalMealMeta}>
                          {`${meal.calories} kcal · P ${meal.protein_g}g · C ${meal.carbs_g}g`}
                        </Text>
                        {atLimit && (
                          <View style={styles.limitBadge}>
                            <Text style={styles.limitBadgeText}>Weekly limit reached ({meal.weekly_limit}/wk)</Text>
                          </View>
                        )}
                      </View>
                      {!atLimit && <Ionicons name="chevron-forward" size={16} color="#B8D5C5" />}
                    </TouchableOpacity>
                    );
                  })}
                  {filteredMeals.length === 0 ? (
                    <View style={styles.modalEmpty}>
                      <Ionicons name="search-outline" size={36} color="#B8D5C5" />
                      <Text style={styles.modalEmptyText}>No results found</Text>
                    </View>
                  ) : null}
                </ScrollView>
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
  if (isEmpty) {
    return (
      <TouchableOpacity style={styles.emptySlot} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.emptySlotIcon}>
          <Ionicons name="add" size={18} color="#344225" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.emptySlotLabel}>{label}</Text>
          <Text style={styles.emptySlotHint}>Tap to add</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#B8D5C5" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.mealSlotRow}>
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
        <Text style={styles.slotSlotLabel}>{label}</Text>
        <Text style={styles.mealSlotName} numberOfLines={1}>
          {mealDetails?.title ?? "Unknown"}
        </Text>
        <Text style={styles.mealSlotMeta}>
          {[
            mealDetails?.calories ? `${mealDetails.calories} kcal` : null,
            mealDetails?.protein_g ? `P ${mealDetails.protein_g}g` : null,
            mealDetails?.carbs_g ? `C ${mealDetails.carbs_g}g` : null,
          ].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <TouchableOpacity style={styles.changeBtn} onPress={onPress}>
        <Ionicons name="create-outline" size={14} color="#344225" />
        <Text style={styles.changeBtnText}>Change</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
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
});
