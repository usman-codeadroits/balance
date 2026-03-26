import type { Duration, ValidateCouponResponseData } from "@/api";
import { validateCoupon } from "@/api";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type MealItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
};

type DayMeals = {
  meals: (MealItem | null)[];
  snacks: (MealItem | null)[];
};

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(
    null,
  );
  const [startDate, setStartDate] = useState<string | null>(null);
  const [dayMeals, setDayMeals] = useState<{ [key: number]: DayMeals }>({});
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] =
    useState<ValidateCouponResponseData | null>(null);
  const [couponMessage, setCouponMessage] = useState<string>("");
  const [validating, setValidating] = useState(false);
  useStaticScreen();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const planData = await AsyncStorage.getItem("selectedPlan");
      if (planData) {
        setSelectedPlan(JSON.parse(planData));
      }

      const durationData = await AsyncStorage.getItem("selectedDuration");
      if (durationData) {
        setSelectedDuration(JSON.parse(durationData));
      }

      const daysData = await AsyncStorage.getItem("selectedDays");
      if (daysData) {
        setSelectedDays(JSON.parse(daysData));
      }

      const dateData = await AsyncStorage.getItem("startDate");
      if (dateData) {
        setStartDate(dateData);
      }

      const mealsData = await AsyncStorage.getItem("selectedDayMeals");
      if (mealsData) {
        setDayMeals(JSON.parse(mealsData));
      }
      const couponData = await AsyncStorage.getItem("appliedCoupon");
      if (couponData) {
        const parsed = JSON.parse(couponData);
        setAppliedCoupon(parsed?.data ?? null);
        setPromoCode(parsed?.code ?? "");
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleContinue = () => {
    router.push("/auth/add-address");
  };

  const dayNames = t("calendar.weekdays", { returnObjects: true }) as string[];

  const getDayName = (dayIndex: number) => {
    return dayNames[dayIndex];
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return "";
    }
  };

  const calculatePlanPrice = (): number => {
    if (!selectedPlan || !selectedDuration) return 0;

    // Base plan price (per week); keep the same base, scale only by weeks
    const basePrice =
      typeof selectedPlan.pricePerDay === "number"
        ? selectedPlan.pricePerDay
        : typeof selectedPlan.price === "number"
          ? selectedPlan.price
          : parseFloat(
            String(selectedPlan.price || "").replace(/[^0-9.]/g, ""),
          ) || 0;

    const totalPrice = basePrice * selectedDuration.no_of_weeks;

    return totalPrice;
  };

  const calculateDiscount = (planPrice: number) => {
    if (!appliedCoupon) return 0;
    const value = appliedCoupon.discount_value || 0;
    if (appliedCoupon.discount_type === "percentage") {
      return Math.max(0, planPrice * (value / 100));
    }
    return Math.max(0, Math.min(planPrice, value));
  };

  const calculateVAT = (): number => 0;

  const calculateTotal = (): number => {
    const planPrice = calculatePlanPrice();
    const discount = calculateDiscount(planPrice);
    return Math.max(planPrice - discount, 0);
  };

  const handleValidateCoupon = async () => {
    if (!promoCode.trim()) {
      setCouponMessage(t("checkout.error_empty_coupon"));
      setAppliedCoupon(null);
      await AsyncStorage.removeItem("appliedCoupon");
      return;
    }

    try {
      setValidating(true);
      setCouponMessage("");
      const userId = await AsyncStorage.getItem("userId");
      const response = await validateCoupon({
        coupon_code: promoCode.trim(),
        ...(userId ? { user_id: Number(userId) } : {}),
      });

      if (response.success && response.data) {
        setAppliedCoupon(response.data);
        const stored = { code: promoCode.trim(), data: response.data };
        await AsyncStorage.setItem("appliedCoupon", JSON.stringify(stored));
        setCouponMessage(response.message || t("checkout.success_coupon"));
      } else {
        setAppliedCoupon(null);
        await AsyncStorage.removeItem("appliedCoupon");
        setCouponMessage(response.message || t("checkout.error_invalid_coupon"));
      }
    } catch (error: any) {
      console.error("Coupon validation error:", error);
      setAppliedCoupon(null);
      await AsyncStorage.removeItem("appliedCoupon");
      const message =
        error?.message || t("checkout.error_validate_failed");
      setCouponMessage(message);
    } finally {
      setValidating(false);
    }
  };

  const getPlanSummaryText = () => {
    if (!selectedPlan) return "";
    const mealCount = selectedPlan.meal_count || 0;
    const snackCount = selectedPlan.snack_count || 0;
    const daysCount = selectedDays.length;
    return t("checkout.summary_desc", {
      plan: selectedPlan.title || "Plan",
      meals: mealCount,
      snacks: snackCount,
      days: daysCount
    });
  };

  // Calculate dates for each day based on start date
  const getDayDate = (dayIndex: number, weekOffset: number = 0): string => {
    if (!startDate) return "";
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const startDayOfWeek = start.getDay();

      // Calculate days to add to reach the target day of week
      let daysToAdd = (dayIndex - startDayOfWeek + 7) % 7;

      // If the target day is before the start day in the week, go to next week
      if (dayIndex < startDayOfWeek) {
        daysToAdd += 7;
      }

      // Add week offset
      daysToAdd += weekOffset * 7;

      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + daysToAdd);
      return formatDate(targetDate.toISOString());
    } catch (error) {
      return "";
    }
  };

  // Group meals by week
  const getWeeksData = () => {
    if (!selectedDuration) return [];
    const weeks = [];
    for (let week = 0; week < selectedDuration.no_of_weeks; week++) {
      const weekData: {
        dayIndex: number;
        dayName: string;
        date: string;
        meals: DayMeals;
      }[] = [];
      selectedDays.forEach((dayIndex) => {
        const dayData = dayMeals[dayIndex];
        if (dayData) {
          weekData.push({
            dayIndex,
            dayName: getDayName(dayIndex),
            date: getDayDate(dayIndex, week),
            meals: dayData,
          });
        }
      });
      if (weekData.length > 0) {
        weeks.push(weekData);
      }
    }
    return weeks;
  };

  const weeksData = getWeeksData();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Fixed Header */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t("checkout.title")}</Text>
            <Text style={styles.subtitle}>{getPlanSummaryText()}</Text>
          </View>
        </View>

        {/* Scrollable Day Cards Section */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Days Cards */}
          {weeksData.map((week, weekIndex) => (
            <View key={weekIndex}>
              {week.map((dayData, dayIdx) => {
                const allMeals = [
                  ...dayData.meals.meals.map((m, i) => ({
                    ...m,
                    type: "meal",
                    index: i,
                  })),
                  ...dayData.meals.snacks.map((s, i) => ({
                    ...s,
                    type: "snack",
                    index: i,
                  })),
                ].filter((item) => item !== null);

                if (allMeals.length === 0) return null;

                return (
                  <View key={`${weekIndex}-${dayIdx}`} style={styles.dayCard}>
                    <Text style={styles.dayTitle}>{dayData.dayName}</Text>
                    <Text style={styles.dateText}>{dayData.date}</Text>

                    {allMeals.map((meal, mealIdx) => {
                      if (!meal) return null;
                      // Count occurrences of the same meal
                      const mealCount = allMeals.filter(
                        (m) => m && m.id === meal.id && m.type === meal.type,
                      ).length;

                      // Only show first occurrence
                      const isFirstOccurrence =
                        allMeals.findIndex(
                          (m) => m && m.id === meal.id && m.type === meal.type,
                        ) === mealIdx;

                      if (!isFirstOccurrence) return null;

                      return (
                        <View
                          key={`${meal.id}-${meal.type}-${mealIdx}`}
                          style={styles.mealItem}
                        >
                          <Text style={styles.mealName}>{meal.name}</Text>
                          <Text style={styles.mealMultiplier}>
                            x{mealCount}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Fixed Payment Summary Section */}
        <View style={styles.fixedSection}>
          {/* Promo Code Section */}
          <View style={styles.promoSection}>
            <TextInput
              style={styles.promoInput}
              placeholder={t("checkout.coupon_placeholder")}
              placeholderTextColor="#6B7F75"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[
                styles.applyButton,
                (!promoCode.trim() || validating) && styles.applyButtonDisabled,
              ]}
              onPress={validating ? undefined : handleValidateCoupon}
              disabled={!promoCode.trim() || validating}
            >
              <Text style={styles.applyButtonText}>
                {validating ? t("checkout.verifying") : t("checkout.verify")}
              </Text>
            </TouchableOpacity>
          </View>
          {!!couponMessage && (
            <Text
              style={[
                styles.couponMessage,
                appliedCoupon ? styles.couponSuccess : styles.couponError,
              ]}
            >
              {couponMessage}
            </Text>
          )}

          {/* Payment Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>{t("checkout.payment_summary")}</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("checkout.plan_price")}</Text>
              <Text style={styles.summaryValue}>
                KWD {calculatePlanPrice().toFixed(2)}
              </Text>
            </View>

            {appliedCoupon && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {t("checkout.discount_label", { coupon: appliedCoupon.readable_discount || appliedCoupon.coupon_code })}
                </Text>
                <Text style={styles.summaryValue}>
                  - KWD {calculateDiscount(calculatePlanPrice()).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("checkout.delivery_fee")}</Text>
              <Text style={styles.summaryValue}>{t("checkout.free")}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("checkout.total")}</Text>
              <Text style={styles.totalValue}>
                KWD {calculateTotal().toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Fixed Continue Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
            >
              <Text style={styles.continueButtonText}>{t("checkout.continue")}</Text>
            </TouchableOpacity>
          </View>
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
  headerSection: {
    paddingHorizontal: "5%",
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  headerContent: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
    paddingBottom: 400, // Space for fixed payment summary section
  },
  fixedSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#D4E8E0",
    paddingHorizontal: "5%",
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#344225",
  },
  dayCard: {
    backgroundColor: "#B8D5C5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#344225",
    marginBottom: 16,
  },
  mealItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  mealName: {
    fontSize: 14,
    fontWeight: "400",
    color: "#344225",
  },
  mealMultiplier: {
    fontSize: 14,
    fontWeight: "500",
    color: "#344225",
  },
  promoSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  promoInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#344225",
    borderWidth: 1,
    borderColor: "#B8D5C5",
  },
  applyButton: {
    backgroundColor: "#344225",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  summarySection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 16,
  },
  couponMessage: {
    fontSize: 13,
    marginTop: -12,
    marginBottom: 16,
  },
  couponSuccess: {
    color: "#1A6F46",
  },
  couponError: {
    color: "#C0392B",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#344225",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
  },
  divider: {
    height: 1,
    backgroundColor: "#D4E8E0",
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
  },
  footer: {
    marginTop: 16,
  },
  continueButton: {
    backgroundColor: "#344225",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
