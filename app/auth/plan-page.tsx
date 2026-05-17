import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PlanPageScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDaysByWeek, setSelectedDaysByWeek] = useState<number[][]>([]);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  const dayLabels = t("plan_page.day_labels", { returnObjects: true }) as string[];

  useEffect(() => {
    loadSelectedPlan();
  }, []);

  const loadSelectedPlan = async () => {
    try {
      const planData = await AsyncStorage.getItem("selectedPlan");
      if (planData) {
        const plan = JSON.parse(planData);
        setSelectedPlan(plan);
        const noOfWeeks = Math.max(1, Number(plan.no_of_weeks ?? 1));
        // Start with no pre-selected days so users can freely choose their own combination.
        setSelectedDaysByWeek(Array.from({ length: noOfWeeks }, () => []));
      }
    } catch (error) {
    }
  };

  const planMinDays = selectedPlan?.min_days ?? 5;
  const planMaxDays = selectedPlan?.max_days ?? 6;
  const planWeeks = Math.max(
    1,
    Number(selectedPlan?.no_of_weeks ?? selectedDaysByWeek.length ?? 1),
  );

  const handleDayToggle = (weekIndex: number, dayIndex: number) => {
    setSelectedDaysByWeek((prev) => {
      const currentWeekDays = prev[weekIndex] ?? [];
      const isSelected = currentWeekDays.includes(dayIndex);
      if (isSelected) {
        const next = [...prev];
        next[weekIndex] = currentWeekDays.filter((d) => d !== dayIndex);
        return next;
      } else {
        if (currentWeekDays.length >= planMaxDays) return prev;
        const next = [...prev];
        next[weekIndex] = [...currentWeekDays, dayIndex].sort((a, b) => a - b);
        return next;
      }
    });
  };

  const handleContinue = async () => {
    const invalidWeekIndex = selectedDaysByWeek.findIndex(
      (weekDays) => weekDays.length < planMinDays || weekDays.length > planMaxDays,
    );
    if (invalidWeekIndex !== -1) {
      const selectedCount = selectedDaysByWeek[invalidWeekIndex]?.length ?? 0;
      Alert.alert(
        t("plan_page.validation_title"),
        selectedCount < planMinDays
          ? t("plan_page.select_min_days_error", {
              min: planMinDays,
              week: invalidWeekIndex + 1,
            })
          : t("plan_page.select_max_days_error", {
              max: planMaxDays,
              week: invalidWeekIndex + 1,
            }),
      );
      return;
    }

    const durationFromPlan = {
      id: Number(selectedPlan?.no_of_weeks ?? 1),
      title: `${selectedPlan?.no_of_weeks ?? 1} Week${Number(selectedPlan?.no_of_weeks ?? 1) > 1 ? "s" : ""}`,
      description: selectedPlan?.description ?? "",
      no_of_weeks: Number(selectedPlan?.no_of_weeks ?? 1),
    };

    try {
      // Keep legacy selectedDays for existing screens that still use one weekly pattern.
      await AsyncStorage.setItem("selectedDays", JSON.stringify(selectedDaysByWeek[0] ?? []));
      await AsyncStorage.setItem("selectedDaysByWeek", JSON.stringify(selectedDaysByWeek));
      await AsyncStorage.setItem(
        "selectedDuration",
        JSON.stringify(durationFromPlan),
      );
      router.push("/auth/start-date" as any);
    } catch (error) {
    }
  };

  const getPlanDisplayPrice = (): string => {
    if (typeof selectedPlan?.pricePerDay === "number") {
      return `KWD ${selectedPlan.pricePerDay.toFixed(2)}`;
    }
    if (typeof selectedPlan?.price === "number") {
      return `KWD ${selectedPlan.price.toFixed(2)}`;
    }
    if (typeof selectedPlan?.price === "string") {
      const numeric = parseFloat(selectedPlan.price.replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(numeric)) return `KWD ${numeric.toFixed(2)}`;
    }
    return "KWD 0.00";
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
          {/* Title with Back Button */}
          <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>
                {t("plan_page.title_selected", { title: selectedPlan?.title || "..." })}
              </Text>
              <Text style={styles.title}>
                {t("plan_page.title_snacks", { count: snackCount, s: snackCount > 1 ? "s" : "" })}
              </Text>
            </View>
          </View>

          {/* Days Selection by Week */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("plan_page.days_question")}</Text>
            <Text style={styles.sectionSubtitle}>
              {t("plan_page.days_limit_range", { min: planMinDays, max: planMaxDays })}
            </Text>

            <View style={styles.billingCard}>
              <View style={styles.billingHeaderRow}>
                <View style={{ flexDirection: "column" }}>
                  <Text style={styles.billingTitle}>
                    {selectedPlan?.title || ""}
                  </Text>
                  <Text style={styles.billingDaily}>
                    {`${planWeeks} Week${planWeeks > 1 ? "s" : ""}`}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", alignItems: "flex-end" }}>
                  <Text style={styles.billingPrice}>
                    {getPlanDisplayPrice()}
                  </Text>
                </View>
              </View>
            </View>

            {Array.from({ length: planWeeks }).map((_, weekIndex) => {
              const weekDays = selectedDaysByWeek[weekIndex] ?? [];
              return (
                <View key={weekIndex} style={styles.weekSection}>
                  <Text style={styles.weekLabel}>{`Week ${weekIndex + 1}`}</Text>
                  <View style={styles.daysContainer}>
                    {dayLabels.map((label, dayIndex) => {
                      const isSelected = weekDays.includes(dayIndex);
                      const isDisabled = !isSelected && weekDays.length >= planMaxDays;
                      return (
                        <TouchableOpacity
                          key={`${weekIndex}-${dayIndex}`}
                          style={[
                            styles.dayCircle,
                            isSelected && styles.dayCircleSelected,
                            isDisabled && !isSelected && styles.dayCircleDisabled,
                          ]}
                          onPress={() => handleDayToggle(weekIndex, dayIndex)}
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
              );
            })}
          </View>
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen title={t("plan_page.continue")} onPress={handleContinue} />
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
  weekSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#B8D5C5",
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 12,
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
