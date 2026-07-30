import { getSubscriptionPlans, type MealPlan } from "@/api";
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

export default function PersonalizedPlanSelectScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    checkActiveSubscription();
    fetchPlans();
  }, []);

  const checkActiveSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const data = await AsyncStorage.getItem("activeSubscription");
      if (data) {
        const sub: ActiveSubscription = JSON.parse(data);
        const endDateStr = (sub.endDate || "").split("T")[0];
        const todayStr = new Date().toLocaleDateString("en-CA");
        const isActive = sub.status === "Active" && endDateStr >= todayStr;
        setActiveSubscription(isActive ? sub : null);
        if (!isActive) {
          await AsyncStorage.removeItem("activeSubscription");
        }
      }
    } catch {
      setActiveSubscription(null);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const plans = await getSubscriptionPlans();
      setMealPlans(plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subscription_screen.error"));
    } finally {
      setLoading(false);
    }
  };

  const formatPlanPrice = (plan: MealPlan) => {
    const base =
      typeof plan.pricePerDay === "number"
        ? plan.pricePerDay
        : parseFloat(String(plan.price || "").replace(/[^0-9.]/g, "")) || 0;
    return `KWD ${base.toFixed(3)}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return "";
    }
  };

  const handleContinue = async () => {
    if (!selectedPlan) {
      alert(t("subscription_screen.select_plan"));
      return;
    }
    try {
      const plan = mealPlans.find((p) => String(p.id) === String(selectedPlan));
      if (!plan) {
        alert(t("subscription_screen.error"));
        return;
      }
      const planToSave = {
        ...plan,
        id: typeof plan.id === "string" ? parseInt(plan.id, 10) : plan.id,
        title: t("subscription_screen.personalized_plan"),
      };
      if (!planToSave.id || isNaN(Number(planToSave.id)) || Number(planToSave.id) <= 0) {
        alert(t("subscription_screen.error"));
        return;
      }
      await AsyncStorage.setItem("selectedPlan", JSON.stringify(planToSave));
      router.push("/auth/plan-page" as any);
    } catch {
      alert(t("subscription_screen.error"));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Your Plan is Ready!</Text>
            <Text style={styles.headerSubtitle}>Personalized macros set, Now select a subscription to activate it.</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Personalized macro summary banner */}
          <PersonalizedBanner />

          {/* Disclaimer */}
          <View style={styles.disclaimerCard}>
            <Ionicons name="information-circle-outline" size={18} color="#5A7C65" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.disclaimerLabel}>Disclaimer</Text>
              <Text style={styles.disclaimerText}>
                2 Beef and 2 Salmon items available per week based on US dietary recommendations.
              </Text>
            </View>
          </View>

          {/* Active subscription warning */}
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
              <Text style={styles.loadingText}>{t("subscription_screen.loading")}</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchPlans}>
                <Text style={styles.retryButtonText}>{t("subscription_screen.retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {mealPlans.map((plan) => (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planContentColumn}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <Text style={styles.planPrice}>{formatPlanPrice(plan)}</Text>
                  </View>
                  <Text style={styles.planDescription}>
                    {t("subscription_screen.choose_prefix")} {plan.meal_count}{" "}
                    {plan.meal_count > 1
                      ? t("subscription_screen.meals_label_plural")
                      : t("subscription_screen.meals_label")}{" "}
                    + {plan.snack_count}{" "}
                    {plan.snack_count > 1
                      ? t("subscription_screen.snacks_label_plural")
                      : t("subscription_screen.snacks_label")}{" "}
                    {t("subscription_screen.per_day")}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.chooseButton,
                      String(selectedPlan) === String(plan.id) && styles.chooseButtonSelected,
                    ]}
                    onPress={() => setSelectedPlan(String(plan.id))}
                  >
                    <Text
                      style={[
                        styles.chooseButtonText,
                        String(selectedPlan) === String(plan.id) && styles.chooseButtonTextSelected,
                      ]}
                    >
                      {String(selectedPlan) === String(plan.id)
                        ? t("subscription_screen.selected")
                        : t("subscription_screen.select_plan")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              {mealPlans.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{t("subscription_screen.no_plans")}</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen title={t("subscription_screen.continue")} onPress={handleContinue} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function PersonalizedBanner() {
  const { t } = useTranslation();
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [extraPrice, setExtraPrice] = useState("0.000");

  useEffect(() => {
    AsyncStorage.multiGet(["personalizedProtein", "personalizedCarbs", "personalizedProteinExtraPrice"]).then(
      (pairs) => {
        const p = pairs[0][1];
        const c = pairs[1][1];
        const ep = pairs[2][1];
        if (p) setProtein(p);
        if (c) setCarbs(c);
        if (ep) setExtraPrice(ep);
      },
    );
  }, []);

  const isFree = parseFloat(extraPrice) === 0;

  return (
    <View style={styles.banner}>
      <Ionicons name="checkmark-circle" size={20} color="#344225" style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>{t("personalized_summary.your_choices")}</Text>
        <Text style={styles.bannerBody}>
          {protein}g Protein{isFree ? "" : ` (+${parseFloat(extraPrice).toFixed(3)} KWD/meal)`}{"  ·  "}{carbs}g Carbs
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  headerTextBlock: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#344225" },
  headerSubtitle: { fontSize: 12, color: "#5A7C65", marginTop: 3 },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FAD979",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  bannerTitle: { fontSize: 12, fontWeight: "700", color: "#344225", marginBottom: 3 },
  bannerBody: { fontSize: 13, color: "#344225", lineHeight: 18 },
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
  disclaimerLabel: { fontSize: 12, fontWeight: "700", color: "#344225", marginBottom: 2 },
  disclaimerText: { fontSize: 12, color: "#344225", lineHeight: 17 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 200 },
  planCard: {
    backgroundColor: "#FAD979",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  planContentColumn: { flexDirection: "column", alignItems: "flex-start", marginBottom: 8 },
  planTitle: { fontSize: 20, fontWeight: "600", color: "#344225" },
  planPrice: { fontSize: 15, fontWeight: "600", color: "#344225" },
  planDescription: { fontSize: 13, color: "#344225", marginBottom: 12 },
  chooseButton: {
    backgroundColor: "#344225",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  chooseButtonSelected: { backgroundColor: "#FAD979", borderWidth: 2, borderColor: "#344225" },
  chooseButtonText: { color: "#FAD979", fontSize: 14, fontWeight: "600" },
  chooseButtonTextSelected: { color: "#344225", fontWeight: "bold" },
  loadingContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 16, color: "#344225" },
  errorContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  errorText: { fontSize: 16, color: "#d32f2f", textAlign: "center", marginBottom: 16 },
  retryButton: { backgroundColor: "#344225", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retryButtonText: { color: "#FAD979", fontSize: 14, fontWeight: "600" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, color: "#344225", textAlign: "center" },
  activeSubscriptionCard: {
    backgroundColor: "#FFF3CD",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#FAD979",
  },
  activeSubscriptionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  activeSubscriptionTitle: { fontSize: 18, fontWeight: "700", color: "#344225" },
  activeSubscriptionText: {
    fontSize: 14, fontWeight: "500", color: "#344225", marginBottom: 8, lineHeight: 20,
  },
  activeSubscriptionSubtext: {
    fontSize: 13, fontWeight: "400", color: "#6B7F75", marginBottom: 16, lineHeight: 18,
  },
  viewSubscriptionButton: {
    backgroundColor: "#344225",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  viewSubscriptionButtonText: { color: "#FAD979", fontSize: 14, fontWeight: "600" },
  bottomSection: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: "#D4E8E0" },
});
