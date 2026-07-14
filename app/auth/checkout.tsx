import type { Duration, ValidateCouponResponseData } from "@/api";
import { validateCoupon } from "@/api";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
};

type DayMeals = {
  meals: (MealItem | null)[];
  snacks: (MealItem | null)[];
};

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [dayMeals, setDayMeals] = useState<{ [key: number]: DayMeals }>({});
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<ValidateCouponResponseData | null>(null);
  const [couponMessage, setCouponMessage] = useState<string>("");
  const [validating, setValidating] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [proteinGrams, setProteinGrams] = useState<number>(0);
  const [proteinExtraPerMeal, setProteinExtraPerMeal] = useState<number>(0);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const planData = await AsyncStorage.getItem("selectedPlan");
      if (planData) setSelectedPlan(JSON.parse(planData));

      const durationData = await AsyncStorage.getItem("selectedDuration");
      if (durationData) setSelectedDuration(JSON.parse(durationData));

      const daysData = await AsyncStorage.getItem("selectedDays");
      if (daysData) setSelectedDays(JSON.parse(daysData));

      const dateData = await AsyncStorage.getItem("startDate");
      if (dateData) setStartDate(dateData);

      const mealsData = await AsyncStorage.getItem("selectedDayMeals");
      if (mealsData) setDayMeals(JSON.parse(mealsData));

      const couponData = await AsyncStorage.getItem("appliedCoupon");
      if (couponData) {
        const parsed = JSON.parse(couponData);
        setAppliedCoupon(parsed?.data ?? null);
        setPromoCode(parsed?.code ?? "");
      }

      const personalizedFlag = await AsyncStorage.getItem("hasPersonalizedPlan");
      const personalizedProtein = await AsyncStorage.getItem("personalizedProtein");

      if (personalizedFlag === "true" && personalizedProtein) {
        setIsPersonalized(true);
        const grams = parseFloat(personalizedProtein);
        setProteinGrams(grams);

        // Match selected-meals.tsx: use proteinOptionsData lookup first, then fallback
        let extraPerMeal = 0;
        const proteinOptionsRaw = await AsyncStorage.getItem("proteinOptionsData");
        if (proteinOptionsRaw) {
          const options: { protein_grams: number; extra_price_per_meal: string | number }[] =
            JSON.parse(proteinOptionsRaw);
          const match = options.find((o) => o.protein_grams === grams);
          if (match) extraPerMeal = parseFloat(String(match.extra_price_per_meal)) || 0;
        }
        if (!extraPerMeal) {
          const directPrice = await AsyncStorage.getItem("personalizedProteinExtraPrice");
          if (directPrice) extraPerMeal = parseFloat(directPrice) || 0;
        }
        setProteinExtraPerMeal(extraPerMeal);
      }
    } catch (error) {}
  };

  // Same price extraction as selected-meals.tsx
  const getBasePlanPrice = (): number => {
    if (!selectedPlan) return 0;
    if (typeof selectedPlan.pricePerDay === "number") return selectedPlan.pricePerDay;
    if (typeof selectedPlan.price === "number") return selectedPlan.price;
    return parseFloat(String(selectedPlan.price || "").replace(/[^0-9.]/g, "")) || 0;
  };

  const planWeeks = Math.max(1, (selectedDuration as any)?.no_of_weeks ?? (selectedPlan as any)?.no_of_weeks ?? 1);
  const getProteinExtraCharge = (): number => {
    if (!isPersonalized || !proteinExtraPerMeal) return 0;
    return proteinExtraPerMeal * (selectedPlan?.meal_count || 1) * selectedDays.length * planWeeks;
  };

  const getDiscount = (base: number): number => {
    if (!appliedCoupon) return 0;
    const value = appliedCoupon.discount_value || 0;
    if (appliedCoupon.discount_type === "percentage") {
      return Math.max(0, base * (value / 100));
    }
    return Math.max(0, Math.min(base, value));
  };

  const getTotal = (): number => {
    const base = getBasePlanPrice();
    const protein = getProteinExtraCharge();
    const discount = getDiscount(base);
    return Math.max(base + protein - discount, 0);
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
        await AsyncStorage.setItem(
          "appliedCoupon",
          JSON.stringify({ code: promoCode.trim(), data: response.data }),
        );
        setCouponMessage(response.message || t("checkout.success_coupon"));
      } else {
        setAppliedCoupon(null);
        await AsyncStorage.removeItem("appliedCoupon");
        setCouponMessage(response.message || t("checkout.error_invalid_coupon"));
      }
    } catch (error: any) {
      setAppliedCoupon(null);
      await AsyncStorage.removeItem("appliedCoupon");
      setCouponMessage(error?.message || t("checkout.error_validate_failed"));
    } finally {
      setValidating(false);
    }
  };

  const handleContinue = () => {
    router.push("/auth/add-address");
  };

  const dayNames = t("calendar.weekdays", { returnObjects: true }) as string[];
  const getDayName = (dayIndex: number) => dayNames[dayIndex];

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    } catch {
      return "";
    }
  };

  const getDayDate = (dayIndex: number, weekOffset: number = 0): string => {
    if (!startDate) return "";
    try {
      // Parse as local midnight to avoid UTC timezone shift
      const parts = startDate.split("-").map(Number);
      const start = new Date(parts[0], parts[1] - 1, parts[2]);
      const startDayOfWeek = start.getDay();
      let daysToAdd = (dayIndex - startDayOfWeek + 7) % 7;
      if (dayIndex < startDayOfWeek) daysToAdd += 7;
      daysToAdd += weekOffset * 7;
      const target = new Date(start);
      target.setDate(start.getDate() + daysToAdd);
      return `${target.getDate()}/${target.getMonth() + 1}/${target.getFullYear()}`;
    } catch {
      return "";
    }
  };

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
        if (!dayData) return;
        const hasAnyMeal =
          dayData.meals.some((m) => m !== null) ||
          dayData.snacks.some((s) => s !== null);
        if (!hasAnyMeal) return;
        weekData.push({
          dayIndex,
          dayName: getDayName(dayIndex),
          date: getDayDate(dayIndex, week),
          meals: dayData,
        });
      });
      if (weekData.length > 0) weeks.push(weekData);
    }
    return weeks;
  };

  const getPlanSummaryText = () => {
    if (!selectedPlan) return "";
    return t("checkout.summary_desc", {
      plan: selectedPlan.title || "Plan",
      meals: selectedPlan.meal_count || 0,
      snacks: selectedPlan.snack_count || 0,
      days: selectedDays.length,
    });
  };

  const weeksData = getWeeksData();
  const basePlanPrice = getBasePlanPrice();
  const proteinExtra = getProteinExtraCharge();
  const discount = getDiscount(basePlanPrice);
  const total = getTotal();
  const multiWeek = (selectedDuration?.no_of_weeks ?? 1) > 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.headerSection, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t("checkout.title")}</Text>
            <Text style={styles.subtitle}>{getPlanSummaryText()}</Text>
          </View>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Summary Card — styled like selected-meals summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <View style={styles.summaryCardTextContainer}>
                <Text style={styles.summaryCardTitle}>{t("checkout.payment_summary")}</Text>
                <Text style={styles.summaryCardSubtitle}>{getPlanSummaryText()}</Text>
              </View>
              <Image
                source={require("@/assets/images/bag.png")}
                style={styles.summaryCardIcon}
                resizeMode="contain"
              />
            </View>

            <View style={styles.summaryDivider} />

            {/* Plan base price */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t("checkout.plan_price")}</Text>
              <Text style={styles.priceValue}>KWD {basePlanPrice.toFixed(3)}</Text>
            </View>

            {/* Protein upgrade — only if personalized */}
            {isPersonalized && proteinExtra > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Protein Upgrade ({proteinGrams}g)
                </Text>
                <Text style={[styles.priceValue, styles.extraPrice]}>
                  + KWD {proteinExtra.toFixed(3)}
                </Text>
              </View>
            )}

            {/* Discount — only if coupon applied */}
            {appliedCoupon && discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  {t("checkout.discount_label", {
                    coupon: appliedCoupon.readable_discount || appliedCoupon.coupon_code,
                  })}
                </Text>
                <Text style={[styles.priceValue, styles.discountPrice]}>
                  - KWD {discount.toFixed(3)}
                </Text>
              </View>
            )}

            {/* Delivery */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t("checkout.delivery_fee")}</Text>
              <Text style={styles.priceValue}>{t("checkout.free")}</Text>
            </View>

            <View style={styles.summaryDivider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("checkout.total")}</Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.totalValue}>KWD {total.toFixed(3)}</Text>
                {isPersonalized && proteinExtra > 0 && (
                  <Text style={styles.proteinNote}>
                    incl. +{proteinExtra.toFixed(3)} protein ({proteinGrams}g)
                  </Text>
                )}
              </View>
            </View>
          </View>

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

          {/* Meal Day Cards */}
          {weeksData.map((week, weekIndex) => (
            <View key={weekIndex}>
              {multiWeek && (
                <Text style={styles.weekLabel}>Week {weekIndex + 1}</Text>
              )}
              {week.map((dayData, dayIdx) => {
                const allMeals = [
                  ...dayData.meals.meals.map((m, i) => ({ ...m, type: "meal", index: i })),
                  ...dayData.meals.snacks.map((s, i) => ({ ...s, type: "snack", index: i })),
                ].filter(Boolean);

                if (allMeals.length === 0) return null;

                const uniqueMeals: typeof allMeals = [];
                const counts: { [key: string]: number } = {};
                allMeals.forEach((meal) => {
                  if (!meal) return;
                  const key = `${meal.id}-${meal.type}`;
                  if (counts[key] === undefined) {
                    uniqueMeals.push(meal);
                    counts[key] = 1;
                  } else {
                    counts[key]++;
                  }
                });

                const totalCal = uniqueMeals.reduce(
                  (sum, m) => sum + (m?.calories ?? 0) * (counts[`${m?.id}-${m?.type}`] ?? 1),
                  0,
                );
                const totalProtein = uniqueMeals.reduce(
                  (sum, m) => sum + (m?.protein ?? 0) * (counts[`${m?.id}-${m?.type}`] ?? 1),
                  0,
                );
                const totalCarbs = uniqueMeals.reduce(
                  (sum, m) => sum + (m?.carbs ?? 0) * (counts[`${m?.id}-${m?.type}`] ?? 1),
                  0,
                );
                const totalFat = uniqueMeals.reduce(
                  (sum, m) => sum + (m?.fat ?? 0) * (counts[`${m?.id}-${m?.type}`] ?? 1),
                  0,
                );

                return (
                  <View key={`${weekIndex}-${dayIdx}`} style={styles.dayCard}>
                    <Text style={styles.dayTitle}>{dayData.dayName}</Text>
                    <Text style={styles.dateText}>{dayData.date}</Text>

                    {uniqueMeals.map((meal, mealIdx) => {
                      if (!meal) return null;
                      const count = counts[`${meal.id}-${meal.type}`] ?? 1;
                      return (
                        <View key={`${meal.id}-${meal.type}-${mealIdx}`} style={styles.mealItem}>
                          <View style={styles.mealRow}>
                            <Text style={styles.mealName}>{meal.name}</Text>
                            {count > 1 && (
                              <Text style={styles.mealMultiplier}>{count}x</Text>
                            )}
                          </View>
                          <View style={styles.macroRow}>
                            <Text style={styles.macroText}>
                              {t("checkout.cal")}: {meal.calories ?? 0}
                            </Text>
                            <Text style={styles.macroDot}>·</Text>
                            <Text style={styles.macroText}>
                              {t("checkout.protein")}: {meal.protein ?? 0}g
                            </Text>
                            <Text style={styles.macroDot}>·</Text>
                            <Text style={styles.macroText}>
                              {t("checkout.carbs")}: {meal.carbs ?? 0}g
                            </Text>
                            <Text style={styles.macroDot}>·</Text>
                            <Text style={styles.macroText}>
                              {t("checkout.fat")}: {meal.fat ?? 0}g
                            </Text>
                          </View>
                        </View>
                      );
                    })}

                    <View style={styles.totalMacroContainer}>
                      <Text style={styles.totalMacroTitle}>{t("checkout.total_macros")}</Text>
                      <View style={styles.macroRow}>
                        <Text style={styles.totalMacroText}>{t("checkout.cal")}: {totalCal}</Text>
                        <Text style={styles.macroDotLight}>·</Text>
                        <Text style={styles.totalMacroText}>{t("checkout.protein")}: {totalProtein}g</Text>
                        <Text style={styles.macroDotLight}>·</Text>
                        <Text style={styles.totalMacroText}>{t("checkout.carbs")}: {totalCarbs}g</Text>
                        <Text style={styles.macroDotLight}>·</Text>
                        <Text style={styles.totalMacroText}>{t("checkout.fat")}: {totalFat}g</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Fixed Continue Button */}
        <View
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>{t("checkout.continue")}</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
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
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: "#5A7C65",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
    paddingBottom: 100,
  },
  // Summary card — mirrors selected-meals.tsx summaryCard
  summaryCard: {
    backgroundColor: "#344225",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  summaryCardTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  summaryCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  summaryCardSubtitle: {
    fontSize: 12,
    color: "#D4E8E0",
  },
  summaryCardIcon: {
    width: 80,
    height: 80,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#5A7C65",
    marginVertical: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: "#D4E8E0",
    fontWeight: "400",
    flex: 1,
    paddingRight: 8,
  },
  priceValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  extraPrice: {
    color: "#FAD979",
  },
  discountPrice: {
    color: "#7ED321",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FAD979",
  },
  proteinNote: {
    fontSize: 11,
    color: "#D4E8E0",
    marginTop: 2,
  },
  // Promo code
  promoSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
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
  couponMessage: {
    fontSize: 13,
    marginBottom: 16,
  },
  couponSuccess: {
    color: "#1A6F46",
  },
  couponError: {
    color: "#C0392B",
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
    marginTop: 4,
  },
  // Day cards
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#D4E8E0",
  },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  mealName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#344225",
    flex: 1,
    marginRight: 8,
  },
  mealMultiplier: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A6F46",
    backgroundColor: "#D4E8E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  macroText: {
    fontSize: 11,
    color: "#5A7A6A",
    fontWeight: "400",
  },
  macroDot: {
    fontSize: 11,
    color: "#9DB8AC",
  },
  totalMacroContainer: {
    marginTop: 12,
    backgroundColor: "#344225",
    borderRadius: 8,
    padding: 10,
  },
  totalMacroTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  totalMacroText: {
    fontSize: 11,
    color: "#B8D5C5",
    fontWeight: "500",
  },
  macroDotLight: {
    fontSize: 11,
    color: "#5A7C65",
  },
  // Footer
  footer: {
    paddingHorizontal: "5%",
    paddingTop: 16,
    backgroundColor: "#D4E8E0",
    borderTopWidth: 1,
    borderTopColor: "#B8D5C5",
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
