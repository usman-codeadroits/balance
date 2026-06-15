import { getSubscriptionPlans, type MealPlan } from "@/api";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ActiveSubscription {
  id: string;
  plan: any;
  duration: any;
  days: number[];
  startDate: string;
  endDate: string;
  status: "Active" | "Completed" | "Cancelled";
}

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [activeSubscription, setActiveSubscription] =
    useState<ActiveSubscription | null>(null);
  const [checkingSubscription, setCheckingSubscription] =
    useState<boolean>(true);
  const [hasPersonalizedPlan, setHasPersonalizedPlan] =
    useState<boolean>(false);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
  }, [selectedPlan]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkActiveSubscription();
    fetchSubscriptionPlans();
    checkPersonalizedPlan();
  }, []);

  const formatPlanPrice = (plan: MealPlan) => {
    const basePrice =
      typeof plan.pricePerDay === "number"
        ? plan.pricePerDay
        : parseFloat(String(plan.price || "").replace(/[^0-9.]/g, "")) || 0;
    return `KWD ${basePrice.toFixed(2)}`;
  };

  useFocusEffect(
    useCallback(() => {
      checkPersonalizedPlan();
    }, []),
  );

  const clearPersonalizedPlanCache = async () => {
    try {
      await AsyncStorage.multiRemove([
        "hasPersonalizedPlan",
        "personalizedProtein",
        "personalizedCarbs",
        "personalizedMealsPerDay",
        "personalizedSnacksPerDay",
        "personalizedPlanOwner",
      ]);
    } catch (error) {
    }
  };

  const checkPersonalizedPlan = async () => {
    try {
      const [personalizedPlan, userId, planOwner] = await Promise.all([
        AsyncStorage.getItem("hasPersonalizedPlan"),
        AsyncStorage.getItem("userId"),
        AsyncStorage.getItem("personalizedPlanOwner"),
      ]);

      if (userId && planOwner && planOwner !== userId) {
        await clearPersonalizedPlanCache();
        setHasPersonalizedPlan(false);
        return;
      }

      setHasPersonalizedPlan(personalizedPlan === "true");
    } catch (error) {
      setHasPersonalizedPlan(false);
    }
  };

  const checkActiveSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const activeSubData = await AsyncStorage.getItem("activeSubscription");
      if (activeSubData) {
        const subscription: ActiveSubscription = JSON.parse(activeSubData);
        // Check if subscription is still active
        const endDate = new Date(subscription.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (subscription.status === "Active" && endDate >= today) {
          setActiveSubscription(subscription);
        } else {
          // Subscription expired, remove from active
          await AsyncStorage.removeItem("activeSubscription");
          setActiveSubscription(null);
        }
      } else {
        setActiveSubscription(null);
      }
    } catch (error) {
      setActiveSubscription(null);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const plans = await getSubscriptionPlans();
      setMealPlans(plans);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : t("subscription_screen.error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async () => {
    if (!selectedPlan) {
      alert(t("subscription_screen.select_plan"));
      return;
    }

    try {
      // Find the selected plan object
      const plan = mealPlans.find((p) => String(p.id) === String(selectedPlan));
      if (!plan) {
        alert(t("subscription_screen.error"));
        return;
      }

      // Always use the actual API plan ID, even for personalized plans
      // The personalized status is tracked separately via hasPersonalizedPlan
      const planToSave = {
        ...plan,
        // Ensure ID is always a valid number (not a string like 'personalized')
        id: typeof plan.id === "string" ? parseInt(plan.id, 10) : plan.id,
        // If user has personalized plan, update the title but keep the real ID
        title: hasPersonalizedPlan ? t("subscription_screen.personalized_plan") : plan.title,
      };

      // Validate the plan ID before saving
      if (
        !planToSave.id ||
        isNaN(Number(planToSave.id)) ||
        Number(planToSave.id) <= 0
      ) {
        alert(t("subscription_screen.error"));
        return;
      }
      await AsyncStorage.setItem("selectedPlan", JSON.stringify(planToSave));
      router.push("/auth/plan-page" as any);
    } catch (error) {
      alert(t("subscription_screen.error"));
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Fixed Title Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>{t("subscription_screen.title")}</Text>
            <Text style={styles.headerSubtitle}>Explore our healthy subscription plans</Text>
          </View>
        </View>

        {/* Scrollable Plans */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Disclaimer */}
          <View style={styles.disclaimerCard}>
            <Ionicons name="information-circle-outline" size={18} color="#5A7C65" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.disclaimerLabel}>Disclaimer</Text>
              <Text style={styles.disclaimerText}>
                2 Beef and 2 Salmon items available per week based on US dietary preference.
              </Text>
            </View>
          </View>

          {/* Active Subscription Warning */}
          {!checkingSubscription && activeSubscription && (
            <View style={styles.activeSubscriptionCard}>
              <View style={styles.activeSubscriptionHeader}>
                <Ionicons name="information-circle" size={24} color="#344225" />
                <Text style={styles.activeSubscriptionTitle}>
                  {t("subscription_screen.active_sub_title")}
                </Text>
              </View>
              <Text style={styles.activeSubscriptionText}>
                {t("subscription_screen.active_sub_msg", { date: formatDate(activeSubscription.endDate) })}
              </Text>
              <Text style={styles.activeSubscriptionSubtext}>
                {t("subscription_screen.active_sub_overlap")}
              </Text>
              <TouchableOpacity
                style={styles.viewSubscriptionButton}
                onPress={() => router.push("/(tabs)/" as any)}
              >
                <Text style={styles.viewSubscriptionButtonText}>
                  {t("subscription_screen.view_active_sub")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {loading || checkingSubscription ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>
                {t("subscription_screen.loading")}
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchSubscriptionPlans}
              >
                <Text style={styles.retryButtonText}>{t("subscription_screen.retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* API Plans */}
              {mealPlans.map((plan) => (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planContentColumn}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <Text style={styles.planPrice}>{formatPlanPrice(plan)}</Text>
                  </View>
                  <Text style={styles.planDescription}>
                    {t("subscription_screen.choose_prefix")} {plan.meal_count} {plan.meal_count > 1 ? t("subscription_screen.meals_label_plural") : t("subscription_screen.meals_label")} + {plan.snack_count} {plan.snack_count > 1 ? t("subscription_screen.snacks_label_plural") : t("subscription_screen.snacks_label")} {t("subscription_screen.per_day")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.chooseButton,
                      String(selectedPlan) === String(plan.id) &&
                      styles.chooseButtonSelected,
                    ]}
                    onPress={() => setSelectedPlan(String(plan.id))}
                  >
                    <Text
                      style={[
                        styles.chooseButtonText,
                        String(selectedPlan) === String(plan.id) &&
                        styles.chooseButtonTextSelected,
                      ]}
                    >
                      {String(selectedPlan) === String(plan.id)
                        ? t("subscription_screen.selected")
                        : t("subscription_screen.select_plan")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              {/* Personalized Plan Card — always visible */}
              <View style={styles.personalizedPlanCard}>
                <View style={styles.personalizedPlanContentRow}>
                  <View style={styles.personalizedPlanTextContainer}>
                    <Text style={styles.personalizedPlanTitle}>
                      {t("subscription_screen.personalized_plan")}
                    </Text>
                    <Text style={styles.personalizedPlanDescription}>
                      {hasPersonalizedPlan
                        ? t("subscription_screen.personalized_plan_active_desc")
                        : t("subscription_screen.personalized_plan_desc")}
                    </Text>
                  </View>
                  <Image
                    source={require("@/assets/images/plan.png")}
                    style={styles.personalizedPlanIcon}
                    resizeMode="contain"
                  />
                </View>
                <TouchableOpacity
                  style={styles.chooseButton}
                  onPress={() => {
                    router.push("/auth/build-plan" as any);
                  }}
                >
                  <Text style={styles.chooseButtonText}>
                    {hasPersonalizedPlan
                      ? t("subscription_screen.edit_fit_plan")
                      : t("subscription_screen.build_fit_plan")}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Empty state */}
              {mealPlans.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {t("subscription_screen.no_plans")}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 12) + 96 }]}>
          <AuthButtonGreen title={t("subscription_screen.continue")} onPress={handleSelectPlan} />
        </View>
      </View>

      <BottomTabNav
        activeTab="home"
        onHomePress={() => router.replace("/main-screen")}
      />
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
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    textAlign: "left",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#5A7C65",
    marginTop: 4,
    textAlign: "left",
  },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#C8DFCF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#344225",
  },
  disclaimerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 2,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#344225",
    lineHeight: 17,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 200,
  },
  planCard: {
    backgroundColor: "#FAD979",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  planContentColumn: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#344225",
  },
  planPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#344225",
  },
  planDescription: {
    fontSize: 13,
    color: "#344225",
    marginBottom: 12,
  },
  chooseButton: {
    backgroundColor: "#344225",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  chooseButtonSelected: {
    backgroundColor: "#FAD979",
    borderWidth: 2,
    borderColor: "#344225",
  },
  chooseButtonText: {
    color: "#FAD979",
    fontSize: 14,
    fontWeight: "600",
  },
  chooseButtonTextSelected: {
    color: "#344225",
    fontWeight: "bold",
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: "#D4E8E0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#344225",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#344225",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FAD979",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#344225",
    textAlign: "center",
  },
  activeSubscriptionCard: {
    backgroundColor: "#FFF3CD",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#FAD979",
  },
  activeSubscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  activeSubscriptionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
  },
  activeSubscriptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#344225",
    marginBottom: 8,
    lineHeight: 20,
  },
  activeSubscriptionSubtext: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7F75",
    marginBottom: 16,
    lineHeight: 18,
  },
  viewSubscriptionButton: {
    backgroundColor: "#344225",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  viewSubscriptionButtonText: {
    color: "#FAD979",
    fontSize: 14,
    fontWeight: "600",
  },
  personalizedPlanCard: {
    backgroundColor: "#FAD979",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  personalizedPlanContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  personalizedPlanTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  personalizedPlanTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 4,
  },
  personalizedPlanDescription: {
    fontSize: 13,
    color: "#344225",
  },
  personalizedPlanIcon: {
    width: 60,
    height: 60,
  },
});
