import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PlanPageScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [proteinGrams, setProteinGrams] = useState(0);
  const [proteinExtraPerMeal, setProteinExtraPerMeal] = useState(0);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  const dayLabels = t("plan_page.day_labels", { returnObjects: true }) as string[];

  useEffect(() => {
    loadSelectedPlan();
  }, []);

  // Reload protein info whenever screen comes back into focus (e.g. after editing in build-plan)
  useFocusEffect(
    useCallback(() => {
      loadProteinInfo();
    }, []),
  );

  const loadSelectedPlan = async () => {
    try {
      const planData = await AsyncStorage.getItem("selectedPlan");
      if (planData) {
        const plan = JSON.parse(planData);
        setSelectedPlan(plan);
        setSelectedDays([]);
      }
    } catch (error) {}
  };

  const loadProteinInfo = async () => {
    try {
      const personalizedFlag = await AsyncStorage.getItem("hasPersonalizedPlan");
      const personalizedProtein = await AsyncStorage.getItem("personalizedProtein");
      const personalizedProteinExtraPrice = await AsyncStorage.getItem("personalizedProteinExtraPrice");
      const proteinOptionsRaw = await AsyncStorage.getItem("proteinOptionsData");

      if (personalizedFlag === "true" && personalizedProtein) {
        setIsPersonalized(true);
        const grams = parseFloat(personalizedProtein);
        setProteinGrams(grams);

        // Try direct extra price first, then options lookup
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
        setProteinExtraPerMeal(0);
      }
    } catch (error) {}
  };

  const planMinDays = selectedPlan?.min_days ?? 5;
  const planMaxDays = selectedPlan?.max_days ?? 6;
  const planWeeks = Math.max(1, Number(selectedPlan?.no_of_weeks ?? 1));

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex);
      }
      if (prev.length >= planMaxDays) return prev;
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  const handleContinue = async () => {
    if (selectedDays.length < planMinDays) {
      Alert.alert(
        t("plan_page.validation_title"),
        t("plan_page.select_min_days_error", { min: planMinDays, week: 1 }),
      );
      return;
    }
    if (selectedDays.length > planMaxDays) {
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

    // Replicate the same day selection across all weeks
    const allWeeksDays = Array.from({ length: planWeeks }, () => [...selectedDays]);

    try {
      await AsyncStorage.setItem("selectedDays", JSON.stringify(selectedDays));
      await AsyncStorage.setItem("selectedDaysByWeek", JSON.stringify(allWeeksDays));
      await AsyncStorage.setItem("selectedDuration", JSON.stringify(durationFromPlan));
      router.push("/auth/start-date" as any);
    } catch (error) {
    }
  };

  const getBasePlanPrice = (): number => {
    if (typeof selectedPlan?.pricePerDay === "number") return selectedPlan.pricePerDay;
    if (typeof selectedPlan?.price === "number") return selectedPlan.price;
    if (typeof selectedPlan?.price === "string") {
      const numeric = parseFloat(selectedPlan.price.replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(numeric)) return numeric;
    }
    return 0;
  };

  const totalSelectedDays = selectedDays.length * planWeeks;
  const proteinExtraCharge =
    isPersonalized && proteinExtraPerMeal > 0
      ? proteinExtraPerMeal * (selectedPlan?.meal_count || 1) * totalSelectedDays
      : 0;

  const getPlanDisplayPrice = (): string => {
    return `KWD ${(getBasePlanPrice() + proteinExtraCharge).toFixed(3)}`;
  };

  const snackCount = selectedPlan?.snack_count || 0;

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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContainer}>
              {isPersonalized ? (
                <>
                  <Text style={styles.title}>You chose Personalized Plan</Text>
                  <Text style={styles.headerPlanLine}>
                    {selectedPlan?.title || ""}
                    {selectedPlan ? ` · ${selectedPlan.meal_count} meal${selectedPlan.meal_count > 1 ? "s" : ""} + ${selectedPlan.snack_count} snack${selectedPlan.snack_count > 1 ? "s" : ""}/day` : ""}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.title}>
                    {t("plan_page.title_selected", { title: selectedPlan?.title || "..." })}
                  </Text>
                  <Text style={styles.title}>
                    {t("plan_page.title_snacks", { count: snackCount, s: snackCount > 1 ? "s" : "" })}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Days Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("plan_page.days_question", { min: planMinDays, max: planMaxDays })}
            </Text>

            <Text style={styles.daysSubheading}>Choose your week days</Text>

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
                      isDisabled && !isSelected && styles.dayCircleDisabled,
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
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen
            title={t("plan_page.continue")}
            onPress={handleContinue}
            disabled={selectedDays.length < planMinDays || selectedDays.length > planMaxDays}
          />
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344225",
    lineHeight: 24,
  },
  headerPlanLine: {
    fontSize: 13,
    color: "#5A7C65",
    marginTop: 4,
    fontWeight: "500",
  },
  daysSubheading: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5A7C65",
    marginBottom: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7F75",
    marginBottom: 20,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 24,
    backgroundColor: "#D4E8E0",
    borderWidth: 2,
    borderColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: "#344225",
  },
  dayText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#344225",
  },
  dayTextSelected: {
    color: "#FFFFFF",
  },
  dayCircleDisabled: {
    opacity: 0.5,
  },
  dayTextDisabled: {
    opacity: 0.5,
  },
  billingCard: {
    backgroundColor: "#344225",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  billingContent: {
    gap: 4,
  },
  billingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  billingPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  billingDaily: {
    fontSize: 13,
    color: "#D4E8E0",
  },
  billingProteinNote: {
    fontSize: 11,
    color: "#FAD979",
    marginTop: 2,
  },
  billingPeriod: {
    fontSize: 12,
    color: "#FFFFFF",
    marginTop: 2,
    opacity: 0.9,
  },
  bottomSection: {
    paddingHorizontal: 24,
  },
});
