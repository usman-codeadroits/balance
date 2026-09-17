import {
  getMySubscriptions,
  getSubscriptionDetails,
  type UserSubscriptionSummary,
} from "@/api/services/subscriptions";
import { getSubscriptionPlans, type MealPlan } from "@/api/services/subscriptionPlans";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type MealSlot = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  extras: any[];
  selectedExtraIds: number[];
};
type DayMealsMap = Record<number, { meals: (MealSlot | null)[]; snacks: (MealSlot | null)[] }>;

const toSlot = (m: any): MealSlot => ({
  id: String(m.meal_id),
  name: m.meal?.title ?? "",
  calories: m.meal?.calories ?? 0,
  protein: m.meal?.protein_g ?? 0,
  carbs: m.meal?.carbs_g ?? 0,
  fat: m.meal?.fat_g ?? 0,
  extras: [],
  selectedExtraIds: Array.isArray(m.selected_extras)
    ? m.selected_extras.flatMap((se: any) => (Array.isArray(se.options) ? se.options.map((o: any) => o.id) : []))
    : [],
});

const padSlots = (slots: MealSlot[], count: number): (MealSlot | null)[] => {
  const arr: (MealSlot | null)[] = [...slots];
  while (arr.length < count) arr.push(null);
  return arr.slice(0, count);
};

const parseYMD = (s?: string | null): Date | null => {
  if (!s) return null;
  const datePart = s.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const formatYMD = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatDisplay = (d: Date | null): string => {
  if (!d) return "-";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export default function ReorderScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [activeSub, setActiveSub] = useState<UserSubscriptionSummary | null>(null);
  const [addressLine, setAddressLine] = useState<string>("");

  const [allPlans, setAllPlans] = useState<MealPlan[]>([]);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayMeals, setDayMeals] = useState<DayMealsMap>({});
  const [startDate, setStartDate] = useState<string>("");

  const [minStartDate, setMinStartDate] = useState<Date | null>(null);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [draftDays, setDraftDays] = useState<number[]>([]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [calMonth, setCalMonth] = useState(0);
  const [calYear, setCalYear] = useState(2000);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const subsRes = await getMySubscriptions();
      const active = subsRes.data?.active?.[0];
      if (!subsRes.success || !active) {
        setError(t("reorder.no_active"));
        return;
      }
      setActiveSub(active);

      const [detailsRes, plans] = await Promise.all([
        getSubscriptionDetails(active.id),
        getSubscriptionPlans(),
      ]);

      if (!detailsRes.success || !detailsRes.data) {
        setError(t("reorder.load_error"));
        return;
      }
      const details = detailsRes.data;
      setAllPlans(plans);

      const planId = (active as any).subcrption_plans_id ?? active.subcrption_plans?.id;
      const matchedPlan = plans.find((p) => Number(p.id) === Number(planId)) ?? null;
      if (!matchedPlan) {
        setError(t("reorder.plan_missing"));
        return;
      }
      setPlan(matchedPlan);

      const days = Array.from(
        new Set(
          (details.subscription_days || [])
            .map((d) => DAY_NAME_TO_INDEX[(d.day || "").toLowerCase()])
            .filter((i): i is number => i !== undefined),
        ),
      ).sort((a, b) => a - b);
      setSelectedDays(days);

      const meals: DayMealsMap = {};
      (details.subscription_days || []).forEach((day) => {
        const idx = DAY_NAME_TO_INDEX[(day.day || "").toLowerCase()];
        if (idx === undefined) return;
        const existing = day.subscription_meals || [];
        const mealSlots = existing.filter((m: any) => m.type === "is meal").map(toSlot);
        const snackSlots = existing.filter((m: any) => m.type === "is snack").map(toSlot);
        meals[idx] = {
          meals: padSlots(mealSlots, matchedPlan.meal_count),
          snacks: padSlots(snackSlots, matchedPlan.snack_count),
        };
      });
      setDayMeals(meals);

      const end = parseYMD(active.end_date);
      if (end) {
        const start = new Date(end);
        start.setDate(start.getDate() + 1);
        setStartDate(formatYMD(start));
        setMinStartDate(start);
      }

      const addr: any = details.address;
      if (addr) {
        setAddressLine(
          [addr.area, addr.block_number ? `Block ${addr.block_number}` : null, addr.street]
            .filter(Boolean)
            .join(", "),
        );
      }
    } catch {
      setError(t("reorder.load_error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const requiredDayCount = plan?.max_days ?? plan?.min_days ?? selectedDays.length;
  const startDateObj = parseYMD(startDate);
  const endDateObj = startDateObj && plan?.no_of_weeks
    ? new Date(startDateObj.getTime() + plan.no_of_weeks * 7 * 24 * 60 * 60 * 1000)
    : null;

  const handlePickPlan = (newPlan: MealPlan) => {
    setPlan(newPlan);
    setShowPlanModal(false);
    const needed = newPlan.max_days ?? newPlan.min_days ?? selectedDays.length;
    // Keep existing days if the count still fits; otherwise default to the first N weekdays.
    const nextDays =
      selectedDays.length === needed
        ? selectedDays
        : Array.from({ length: needed }, (_, i) => i);
    setSelectedDays(nextDays);
    // Meal counts may differ under the new plan — reset meals so the customer re-picks them.
    setDayMeals({});
  };

  const openDaysModal = () => {
    setDraftDays(selectedDays);
    setShowDaysModal(true);
  };

  const toggleDraftDay = (idx: number) => {
    setDraftDays((prev) => {
      if (prev.includes(idx)) return prev.filter((d) => d !== idx);
      if (prev.length >= requiredDayCount) return prev;
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const saveDaysModal = () => {
    if (draftDays.length !== requiredDayCount) {
      Alert.alert(t("common.error"), t("reorder.days_count_error", { count: requiredDayCount }));
      return;
    }
    setSelectedDays(draftDays);
    setDayMeals({});
    setShowDaysModal(false);
  };

  const openDateModal = () => {
    const base = startDateObj ?? minStartDate ?? new Date();
    setCalMonth(base.getMonth());
    setCalYear(base.getFullYear());
    setShowDateModal(true);
  };

  const isCalDateDisabled = (day: number): boolean => {
    if (!minStartDate) return false;
    const checkDate = new Date(calYear, calMonth, day);
    checkDate.setHours(0, 0, 0, 0);
    const min = new Date(minStartDate); min.setHours(0, 0, 0, 0);
    return checkDate < min;
  };

  const handleSelectCalDate = (day: number) => {
    if (isCalDateDisabled(day)) return;
    setStartDate(formatYMD(new Date(calYear, calMonth, day)));
    setShowDateModal(false);
  };

  const handleCalPrevMonth = () => {
    const prevMonth = calMonth === 0 ? 11 : calMonth - 1;
    const prevYear = calMonth === 0 ? calYear - 1 : calYear;
    if (minStartDate && (prevYear < minStartDate.getFullYear() ||
      (prevYear === minStartDate.getFullYear() && prevMonth < minStartDate.getMonth()))) return;
    setCalMonth(prevMonth);
    setCalYear(prevYear);
  };

  const handleCalNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const handleContinue = async () => {
    if (!plan || !startDate) return;
    if (selectedDays.length !== requiredDayCount) {
      Alert.alert(t("common.error"), t("reorder.days_count_error", { count: requiredDayCount }));
      return;
    }

    try {
      setSubmitting(true);

      // Make sure downstream screens treat this as a brand-new order, not an
      // edit of the still-active subscription.
      await AsyncStorage.multiRemove([
        "activeSubscription",
        "subscriptionMealsData",
        "subscriptionDaysData",
        "userSubscriptionId",
        "appliedCoupon",
        "hasPersonalizedPlan",
        "personalizedProtein",
        "personalizedCarbs",
        "personalizedProteinExtraPrice",
      ]);

      const planToSave = { ...plan, id: Number(plan.id) };
      const durationToSave = {
        id: Number(plan.no_of_weeks ?? 1),
        title: `${plan.no_of_weeks ?? 1} Week${Number(plan.no_of_weeks ?? 1) > 1 ? "s" : ""}`,
        description: plan.description ?? "",
        no_of_weeks: Number(plan.no_of_weeks ?? 1),
      };

      await AsyncStorage.setItem("selectedPlan", JSON.stringify(planToSave));
      await AsyncStorage.setItem("selectedDuration", JSON.stringify(durationToSave));
      await AsyncStorage.setItem("selectedDays", JSON.stringify(selectedDays));
      await AsyncStorage.setItem("startDate", startDate);
      await AsyncStorage.setItem("selectedDayMeals", JSON.stringify(dayMeals));

      router.push("/auth/selected-meals" as any);
    } catch {
      Alert.alert(t("common.error"), t("reorder.start_error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.headerTitle, isArabic && styles.rtlText]}>{t("reorder.header_title")}</Text>
            <Text style={[styles.headerSubtitle, isArabic && styles.rtlText]}>{t("reorder.header_subtitle")}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.loadingText}>{t("reorder.loading")}</Text>
          </View>
        ) : error || !plan || !activeSub ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
            <Text style={styles.errorText}>{error || t("reorder.load_error")}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>{t("update_days.try_again")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Plan card */}
              <View style={styles.card}>
                <View style={[styles.cardHeaderRow, isArabic && styles.rtlRow]}>
                  <Text style={[styles.cardLabel, isArabic && styles.rtlText]}>{t("reorder.plan_label")}</Text>
                  <TouchableOpacity onPress={() => setShowPlanModal(true)}>
                    <Text style={styles.changeLink}>{t("reorder.change")}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.planTitle, isArabic && styles.rtlText]}>
                  {isArabic && plan.title_ar ? plan.title_ar : plan.title}
                </Text>
                <Text style={[styles.planPrice, isArabic && styles.rtlText]}>{plan.price}</Text>
              </View>

              {/* Dates card */}
              <View style={styles.card}>
                <View style={[styles.cardHeaderRow, isArabic && styles.rtlRow]}>
                  <Text style={[styles.cardLabel, isArabic && styles.rtlText]}>{t("reorder.dates_label")}</Text>
                  <TouchableOpacity onPress={openDateModal}>
                    <Text style={styles.changeLink}>{t("reorder.change")}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.dateRow, isArabic && styles.rtlRow]}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateSmallLabel}>{t("subscription_details.start_date")}</Text>
                    <Text style={styles.dateValue}>{formatDisplay(startDateObj)}</Text>
                  </View>
                  <Ionicons name={isArabic ? "arrow-back" : "arrow-forward"} size={16} color="#B8D5C5" />
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateSmallLabel}>{t("subscription_details.end_date")}</Text>
                    <Text style={styles.dateValue}>{formatDisplay(endDateObj)}</Text>
                  </View>
                </View>
              </View>

              {/* Days card */}
              <View style={styles.card}>
                <View style={[styles.cardHeaderRow, isArabic && styles.rtlRow]}>
                  <Text style={[styles.cardLabel, isArabic && styles.rtlText]}>{t("reorder.days_label")}</Text>
                  <TouchableOpacity onPress={openDaysModal}>
                    <Text style={styles.changeLink}>{t("reorder.change")}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.dayChipsRow, isArabic && styles.rtlRow]}>
                  {selectedDays.map((idx) => (
                    <View key={idx} style={styles.dayChip}>
                      <Text style={styles.dayChipText}>{DAY_SHORT[idx]}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Meals card */}
              <View style={styles.card}>
                <Text style={[styles.cardLabel, isArabic && styles.rtlText]}>{t("reorder.meals_label")}</Text>
                <Text style={[styles.mealsNote, isArabic && styles.rtlText]}>{t("reorder.meals_note")}</Text>
              </View>

              {/* Address card */}
              <View style={styles.card}>
                <Text style={[styles.cardLabel, isArabic && styles.rtlText]}>{t("reorder.address_label")}</Text>
                <Text style={[styles.addressLine, isArabic && styles.rtlText]}>{addressLine || t("reorder.address_note")}</Text>
                <Text style={[styles.mealsNote, isArabic && styles.rtlText]}>{t("reorder.address_note")}</Text>
              </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <TouchableOpacity
                style={[styles.continueBtn, submitting && styles.btnDisabled]}
                onPress={handleContinue}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#344225" />
                ) : (
                  <Text style={styles.continueBtnText}>{t("reorder.continue")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Plan picker modal */}
      <Modal visible={showPlanModal} transparent animationType="slide" onRequestClose={() => setShowPlanModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("reorder.choose_plan")}</Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {allPlans.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.planOption, plan?.id === p.id && styles.planOptionSelected]}
                  onPress={() => handlePickPlan(p)}
                >
                  <Text style={styles.planOptionTitle}>{isArabic && p.title_ar ? p.title_ar : p.title}</Text>
                  <Text style={styles.planOptionPrice}>{p.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Days picker modal */}
      <Modal visible={showDaysModal} transparent animationType="slide" onRequestClose={() => setShowDaysModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("reorder.choose_days", { count: requiredDayCount })}</Text>
              <TouchableOpacity onPress={() => setShowDaysModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.daysGridModal}>
              {DAY_SHORT.map((label, idx) => {
                const active = draftDays.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dayChipModal, active && styles.dayChipModalActive]}
                    onPress={() => toggleDraftDay(idx)}
                  >
                    <Text style={[styles.dayChipModalText, active && styles.dayChipModalTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={saveDaysModal}>
              <Text style={styles.modalSaveBtnText}>{t("update_days.save_button")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Start date picker modal */}
      <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("reorder.choose_start_date")}</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calCard}>
              <View style={styles.monthNav}>
                <TouchableOpacity style={styles.navArrow} onPress={handleCalPrevMonth} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={22} color="#344225" />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                  {((t("calendar.months", { returnObjects: true }) as string[])[calMonth] ?? "").toUpperCase()}{"  "}{calYear}
                </Text>
                <TouchableOpacity style={styles.navArrow} onPress={handleCalNextMonth} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward" size={22} color="#344225" />
                </TouchableOpacity>
              </View>
              <View style={styles.weekRow}>
                {DAY_SHORT.map((wd) => (
                  <Text key={wd} style={styles.weekdayLabel}>{wd.slice(0, 1)}</Text>
                ))}
              </View>
              <View style={styles.daysGridCal}>
                {(() => {
                  const cells = [];
                  const firstWeekday = new Date(calYear, calMonth, 1).getDay();
                  const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
                  for (let i = 0; i < firstWeekday; i++) cells.push(<View key={`ph-${i}`} style={styles.calCellWrap} />);
                  for (let day = 1; day <= totalDays; day++) {
                    const disabled = isCalDateDisabled(day);
                    const isSelected = !!startDateObj &&
                      startDateObj.getDate() === day &&
                      startDateObj.getMonth() === calMonth &&
                      startDateObj.getFullYear() === calYear;
                    cells.push(
                      <TouchableOpacity
                        key={day}
                        style={styles.calCellWrap}
                        onPress={() => handleSelectCalDate(day)}
                        disabled={disabled}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.calCircle, isSelected ? styles.calCircleSelected : disabled ? styles.calCircleDisabled : styles.calCircleDefault]}>
                          <Text style={[styles.calDayText, isSelected ? styles.calDayTextSelected : disabled ? styles.calDayTextDisabled : styles.calDayTextDefault]}>
                            {day}
                          </Text>
                        </View>
                      </TouchableOpacity>,
                    );
                  }
                  return cells;
                })()}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  rtlRow: { flexDirection: "row-reverse" },
  rtlText: { textAlign: "right" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#344225", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#344225" },
  headerSubtitle: { fontSize: 13, fontWeight: "400", color: "#6B7F75", marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loadingText: { fontSize: 14, color: "#6B7F75", marginTop: 12 },
  errorText: { fontSize: 14, color: "#D64545", textAlign: "center", marginTop: 12, marginBottom: 20 },
  retryBtn: { backgroundColor: "#344225", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DDE9E4",
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7F75",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  changeLink: { fontSize: 13, fontWeight: "700", color: "#344225" },
  planTitle: { fontSize: 17, fontWeight: "700", color: "#344225", marginTop: 4 },
  planPrice: { fontSize: 14, color: "#5C6B45", marginTop: 2 },

  dateRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  dateBlock: { flex: 1 },
  dateSmallLabel: { fontSize: 11, color: "#6B7F75", marginBottom: 4 },
  dateValue: { fontSize: 14, fontWeight: "700", color: "#344225" },

  dayChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  dayChip: {
    backgroundColor: "#344225",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayChipText: { fontSize: 12, fontWeight: "700", color: "#FAD979" },

  mealsNote: { fontSize: 12, color: "#6B7F75", marginTop: 4, lineHeight: 17 },
  addressLine: { fontSize: 14, fontWeight: "600", color: "#344225", marginTop: 4 },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#D4E8E0",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  continueBtn: {
    backgroundColor: "#FAD979",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueBtnText: { fontSize: 15, fontWeight: "700", color: "#344225" },
  btnDisabled: { opacity: 0.6 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0EDE6",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#344225" },
  modalClose: { fontSize: 18, color: "#6B7F75", fontWeight: "600" },

  planOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F7F3",
  },
  planOptionSelected: { backgroundColor: "#E8F4EC" },
  planOptionTitle: { fontSize: 14, fontWeight: "700", color: "#344225" },
  planOptionPrice: { fontSize: 12, color: "#6B7F75", marginTop: 2 },

  daysGridModal: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  dayChipModal: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DDE9E4",
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipModalActive: { backgroundColor: "#344225", borderColor: "#344225" },
  dayChipModalText: { fontSize: 13, fontWeight: "700", color: "#344225" },
  dayChipModalTextActive: { color: "#FAD979" },

  modalSaveBtn: {
    backgroundColor: "#FAD979",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 20,
  },
  modalSaveBtnText: { fontSize: 15, fontWeight: "700", color: "#344225" },

  calCard: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navArrow: { padding: 8 },
  monthLabel: { fontSize: 15, fontWeight: "800", color: "#1A1A1A", letterSpacing: 1 },
  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekdayLabel: { width: "14.28%", textAlign: "center", fontSize: 12, fontWeight: "600", color: "#AAAAAA" },
  daysGridCal: { flexDirection: "row", flexWrap: "wrap" },
  calCellWrap: { width: "14.28%", alignItems: "center", marginBottom: 8, minHeight: 40 },
  calCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  calCircleDefault: { backgroundColor: "#E8E8E8" },
  calCircleSelected: { backgroundColor: "#344225" },
  calCircleDisabled: { backgroundColor: "#E8E8E8", opacity: 0.35 },
  calDayText: { fontSize: 13, fontWeight: "500" },
  calDayTextDefault: { color: "#344225" },
  calDayTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  calDayTextDisabled: { color: "#999999" },
});
