import { getDurations, type Duration } from "@/api";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PlanPageScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([
    0, 1, 2, 3, 4, 5,
  ]); // Default: S, M, T, W, T, F (6 days)
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(
    null,
  );
  const [durations, setDurations] = useState<Duration[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  useStaticScreen();

  const dayLabels = t("plan_page.day_labels", { returnObjects: true }) as string[];

  useEffect(() => {
    loadSelectedPlan();
    fetchDurations();
  }, []);

  const loadSelectedPlan = async () => {
    try {
      const planData = await AsyncStorage.getItem("selectedPlan");
      if (planData) {
        setSelectedPlan(JSON.parse(planData));
      }
    } catch (error) {
      console.error("Error loading plan:", error);
    }
  };

  const fetchDurations = async () => {
    try {
      setLoading(true);
      setError(null);
      const durationsData = await getDurations();
      setDurations(durationsData);
      // Auto-select first duration if available
      if (durationsData.length > 0) {
        setSelectedDuration(durationsData[0]);
      }
    } catch (err) {
      console.error("Error fetching durations:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : t("plan_page.error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays((prev) => {
      const isSelected = prev.includes(dayIndex);

      if (isSelected) {
        // If unselecting, ensure at least 5 days remain
        const newSelection = prev.filter((d) => d !== dayIndex);
        return newSelection.length >= 5 ? newSelection : prev;
      } else {
        // If selecting, ensure max 6 days
        if (prev.length >= 6) {
          return prev;
        }
        return [...prev, dayIndex].sort((a, b) => a - b);
      }
    });
  };

  const handleContinue = async () => {
    if (!selectedDuration) {
      alert(t("plan_page.select_duration_error"));
      return;
    }
    try {
      await AsyncStorage.setItem("selectedDays", JSON.stringify(selectedDays));
      await AsyncStorage.setItem(
        "selectedDuration",
        JSON.stringify(selectedDuration),
      );
      router.push("/auth/start-date" as any);
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  // Price calculations: base price stays as plan price; duration scales by weeks only
  const getBasePlanPrice = () => {
    if (typeof selectedPlan?.pricePerDay === "number")
      return selectedPlan.pricePerDay;
    if (typeof selectedPlan?.price === "number") return selectedPlan.price;
    if (typeof selectedPlan?.price === "string") {
      const numeric = parseFloat(
        String(selectedPlan.price).replace(/[^0-9.]/g, ""),
      );
      if (!Number.isNaN(numeric)) return numeric;
    }
    return 0;
  };

  const calculateDurationPrice = (duration: Duration | null) => {
    if (!duration || !duration.no_of_weeks)
      return { total: 0, perWeek: 0, base: 0 };

    const basePrice = getBasePlanPrice(); // Base plan price (for one week)
    const totalPrice = basePrice * duration.no_of_weeks; // Scale only by weeks

    return { total: totalPrice, perWeek: basePrice, base: basePrice };
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
          <View style={styles.headerRow}>
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

          {/* Days Selection - Show for all users */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("plan_page.days_question")}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {t("plan_page.days_limit")}
            </Text>

            <View style={styles.daysContainer}>
              {dayLabels.map((label, index) => {
                const isSelected = selectedDays.includes(index);
                // Disable if: trying to select when already at max (6), or trying to deselect when at min (5)
                const isDisabled =
                  (!isSelected && selectedDays.length >= 6) ||
                  (isSelected && selectedDays.length <= 5);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                      isDisabled && !isSelected && styles.dayCircleDisabled,
                    ]}
                    onPress={() => handleDayToggle(index)}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isDisabled && !isSelected && styles.dayTextDisabled,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Durations Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("plan_page.billing_cycle")}</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#344225" />
                <Text style={styles.loadingText}>{t("plan_page.loading")}</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  onPress={fetchDurations}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>{t("plan_page.retry")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              durations.map((duration) => {
                const durationPrice = calculateDurationPrice(duration);
                const isSelected = selectedDuration?.id === duration.id;

                return (
                  <TouchableOpacity
                    key={duration.id}
                    style={[
                      styles.billingCard,
                      isSelected && styles.billingCardSelected,
                    ]}
                    onPress={() => setSelectedDuration(duration)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.billingContent}>
                      <View style={styles.billingHeaderRow}>
                        <View style={{ flexDirection: "column" }}>
                          <Text style={styles.billingTitle}>
                            {duration.title}
                          </Text>
                          <Text style={styles.billingDaily}>
                            KWD {durationPrice.perWeek.toFixed(2)}{t("plan_page.per_week")}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "column",
                              alignItems: "flex-end",
                            }}
                          >
                            <Text style={styles.billingPrice}>
                              KWD {durationPrice.total.toFixed(2)}
                            </Text>
                            <Text style={styles.billingPeriod}>
                              {t("plan_page.per_period", { period: duration.title.toLowerCase() })}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.radioOuter,
                              isSelected && styles.radioOuterSelected,
                            ]}
                          >
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={styles.bottomSection}>
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
    paddingTop: 10,
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
  billingCardSelected: {
    borderColor: "#FAD979",
    backgroundColor: "#344225",
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
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  radioOuterSelected: {
    borderColor: "#FFFFFF",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
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
    paddingBottom: 30,
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
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: "#D32F2F",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#344225",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
