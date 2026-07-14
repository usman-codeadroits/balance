import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PlanPageScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [proteinGrams, setProteinGrams] = useState(0);
  const [carbsGrams, setCarbsGrams] = useState(0);
  const [proteinExtraPerMeal, setProteinExtraPerMeal] = useState(0);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  const dayLabels = t("plan_page.day_labels", { returnObjects: true }) as string[];

  useEffect(() => {
    loadSelectedPlan();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProteinInfo();
    }, []),
  );

  const loadSelectedPlan = async () => {
    try {
      const planData = await AsyncStorage.getItem("selectedPlan");
      if (planData) {
        setSelectedPlan(JSON.parse(planData));
        setSelectedDays([]);
      }
    } catch {}
  };

  const loadProteinInfo = async () => {
    try {
      const pairs = await AsyncStorage.multiGet([
        "hasPersonalizedPlan",
        "personalizedProtein",
        "personalizedCarbs",
        "personalizedProteinExtraPrice",
        "proteinOptionsData",
      ]);
      const [personalizedFlag, personalizedProtein, personalizedCarbs, personalizedProteinExtraPrice, proteinOptionsRaw] =
        pairs.map(([, v]) => v);

      if (personalizedFlag === "true" && personalizedProtein) {
        setIsPersonalized(true);
        const grams = parseFloat(personalizedProtein);
        setProteinGrams(grams);
        setCarbsGrams(parseFloat(personalizedCarbs ?? "") || 0);

        let extraPerMeal = parseFloat(personalizedProteinExtraPrice ?? "") || 0;
        if (!extraPerMeal && proteinOptionsRaw) {
          const options: { protein_grams: number; extra_price_per_meal: string }[] =
            JSON.parse(proteinOptionsRaw);
          const match = options.find((o) => o.protein_grams === grams);
          extraPerMeal = parseFloat(match?.extra_price_per_meal ?? "") || 0;
        }
        setProteinExtraPerMeal(extraPerMeal);
      } else {
        setIsPersonalized(false);
        setProteinGrams(0);
        setCarbsGrams(0);
        setProteinExtraPerMeal(0);
      }
    } catch {}
  };

  const planMinDays = selectedPlan?.min_days ?? 5;
  const planMaxDays = selectedPlan?.max_days ?? 6;
  const planWeeks = Math.max(1, Number(selectedPlan?.no_of_weeks ?? 1));

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayIndex)) return prev.filter((d) => d !== dayIndex);
      if (prev.length >= planMaxDays) return prev;
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  const handleContinue = async () => {
    if (selectedDays.length !== planMaxDays) {
      Alert.alert(
        t("plan_page.validation_title"),
        t("plan_page.select_max_days_error", { max: planMaxDays, week: 1 }),
      );
      return;
    }

    const durationFromPlan = {
      id: Number(selectedPlan?.no_of_weeks ?? 1),
      title: `${selectedPlan?.no_of_weeks ?? 1} Week${Number(selectedPlan?.no_of_weeks ?? 1) > 1 ? "s" : ""}`,
      description: selectedPlan?.description ?? "",
      no_of_weeks: Number(selectedPlan?.no_of_weeks ?? 1),
    };

    const allWeeksDays = Array.from({ length: planWeeks }, () => [...selectedDays]);

    try {
      await AsyncStorage.setItem("selectedDays", JSON.stringify(selectedDays));
      await AsyncStorage.setItem("selectedDaysByWeek", JSON.stringify(allWeeksDays));
      await AsyncStorage.setItem("selectedDuration", JSON.stringify(durationFromPlan));
      router.push("/auth/start-date" as any);
    } catch {}
  };

  const getBasePlanPrice = (): number => {
    if (typeof selectedPlan?.pricePerDay === "number") return selectedPlan.pricePerDay;
    if (typeof selectedPlan?.price === "number") return selectedPlan.price;
    if (typeof selectedPlan?.price === "string") {
      const n = parseFloat(selectedPlan.price.replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(n)) return n;
    }
    return 0;
  };

  const totalSelectedDays = selectedDays.length * planWeeks;
  const proteinExtraCharge =
    isPersonalized && proteinExtraPerMeal > 0
      ? proteinExtraPerMeal * (selectedPlan?.meal_count || 1) * totalSelectedDays
      : 0;
  const totalPrice = getBasePlanPrice() + proteinExtraCharge;

  const isValid = selectedDays.length === planMaxDays;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContainer}>
              <Text style={styles.pageTitle}>Choose your days</Text>
              <Text style={styles.pageSubtitle}>Select the days desired for your plan</Text>
            </View>
          </View>

          {/* Plan Card */}
          {selectedPlan && (
            <View style={styles.planCard}>
              <View style={styles.planCardTop}>
                <View style={styles.planCardLeft}>
                  <Text style={styles.planCardTitle}>{selectedPlan.title}</Text>
                  <Text style={styles.planCardMeta}>
                    {selectedPlan.meal_count} meal{selectedPlan.meal_count > 1 ? "s" : ""}
                    {selectedPlan.snack_count > 0
                      ? ` + ${selectedPlan.snack_count} snack${selectedPlan.snack_count > 1 ? "s" : ""}`
                      : ""}
                    {" "}/day
                  </Text>
                </View>
                <View style={styles.planCardRight}>
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekBadgeText}>
                      {planWeeks} Week{planWeeks > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Text style={styles.planCardPrice}>KWD {totalPrice.toFixed(3)}</Text>
                </View>
              </View>

              {/* Protein + Carbs per day (personalized only) */}
              {isPersonalized && (proteinGrams > 0 || carbsGrams > 0) && (
                <>
                  <View style={styles.nutritionRow}>
                    {proteinGrams > 0 && (
                      <View style={styles.nutritionChip}>
                        <Ionicons name="barbell-outline" size={12} color="#FAD979" />
                        <Text style={styles.nutritionChipText}>{proteinGrams}g protein/day</Text>
                      </View>
                    )}
                    {carbsGrams > 0 && (
                      <View style={styles.nutritionChip}>
                        <Ionicons name="leaf-outline" size={12} color="#FAD979" />
                        <Text style={styles.nutritionChipText}>{carbsGrams}g carbs/day</Text>
                      </View>
                    )}
                  </View>
                  {proteinExtraPerMeal > 0 && (
                    <View style={styles.extraProteinRow}>
                      <Text style={styles.extraProteinLabel}>Extra Protein Price</Text>
                      <Text style={styles.extraProteinValue}>
                        +KWD {proteinExtraPerMeal.toFixed(3)}/meal
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Days Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("plan_page.days_question", { max: planMaxDays })}
            </Text>
            <Text style={styles.daysSubheading}>
              {selectedDays.length > 0
                ? `${selectedDays.length} of ${planMaxDays} days · repeats ${planWeeks} week${planWeeks > 1 ? "s" : ""}`
                : "Choose your week days"}
            </Text>

            <View style={styles.daysContainer}>
              {dayLabels.map((label, dayIndex) => {
                const isSelected = selectedDays.includes(dayIndex);
                const isDisabled = !isSelected && selectedDays.length >= planMaxDays;
                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                      isDisabled && styles.dayCircleDisabled,
                    ]}
                    onPress={() => handleDayToggle(dayIndex)}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isDisabled && styles.dayTextDisabled,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Schedule preview — appears after valid selection */}
          {isValid && (
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>Your Schedule</Text>
              <View style={styles.scheduleWeeks}>
                {Array.from({ length: planWeeks }, (_, wi) => (
                  <View key={wi} style={styles.scheduleWeekRow}>
                    <Text style={styles.scheduleWeekLabel}>Week {wi + 1}</Text>
                    <View style={styles.scheduleDotsRow}>
                      {selectedDays.map((d) => (
                        <View key={d} style={styles.scheduleDot}>
                          <Text style={styles.scheduleDotText}>{dayLabels[d]}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {isValid && (
            <View style={styles.priceSummary}>
              <Text style={styles.priceSummaryLabel}>
                {selectedDays.length} days × {planWeeks} week{planWeeks > 1 ? "s" : ""} = {totalSelectedDays} delivery days
              </Text>
              <Text style={styles.priceSummaryTotal}>KWD {totalPrice.toFixed(3)}</Text>
            </View>
          )}
          <AuthButtonGreen
            title={t("plan_page.continue")}
            onPress={handleContinue}
            disabled={!isValid}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  headerContainer: { flex: 1 },
  pageTitle: { fontSize: 22, fontWeight: "700", color: "#344225" },
  pageSubtitle: { fontSize: 13, color: "#5A7C65", marginTop: 2 },

  planCard: {
    backgroundColor: "#344225",
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  planCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  planCardLeft: { flex: 1 },
  planCardTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  planCardMeta: { fontSize: 12, color: "#B8D5C5", marginTop: 3 },
  planCardRight: { alignItems: "flex-end", gap: 6 },
  weekBadge: {
    backgroundColor: "#FAD979",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  weekBadgeText: { fontSize: 12, fontWeight: "700", color: "#344225" },
  planCardPrice: { fontSize: 16, fontWeight: "700", color: "#FAD979" },

  weeksRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  weekChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weekChipText: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: "500" },

  nutritionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  nutritionChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  nutritionChipText: { fontSize: 11, color: "#FAD979", fontWeight: "500" },
  nutritionChipExtra: { backgroundColor: "rgba(250,217,121,0.15)" },
  nutritionChipTextExtra: { fontSize: 11, color: "#FAD979", fontWeight: "600" },
  extraProteinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  extraProteinLabel: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: "500" },
  extraProteinValue: { fontSize: 13, color: "#FAD979", fontWeight: "700" },

  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 28, fontWeight: "700", color: "#344225", marginBottom: 6 },
  daysSubheading: { fontSize: 13, color: "#5A7C65", fontWeight: "500", marginBottom: 14 },
  daysContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  dayCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#D4E8E0",
    borderWidth: 2, borderColor: "#344225",
    alignItems: "center", justifyContent: "center",
  },
  dayCircleSelected: { backgroundColor: "#344225" },
  dayCircleDisabled: { opacity: 0.4 },
  dayText: { fontSize: 15, fontWeight: "600", color: "#344225" },
  dayTextSelected: { color: "#FFFFFF" },
  dayTextDisabled: {},

  scheduleCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 24,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D4E8E0",
  },
  scheduleTitle: { fontSize: 13, fontWeight: "700", color: "#344225", marginBottom: 10 },
  scheduleWeeks: { gap: 8 },
  scheduleWeekRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scheduleWeekLabel: { fontSize: 11, color: "#6B7F75", width: 46, fontWeight: "600" },
  scheduleDotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scheduleDot: {
    backgroundColor: "#344225", borderRadius: 5,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  scheduleDotText: { fontSize: 11, color: "#FAD979", fontWeight: "600" },

  bottomSection: { paddingHorizontal: 24, paddingTop: 8 },
  priceSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  priceSummaryLabel: { fontSize: 12, color: "#5A7C65" },
  priceSummaryTotal: { fontSize: 16, fontWeight: "700", color: "#344225" },
});
