import { getActiveSubscription } from "@/api";
import BottomTabNav from "@/components/bottom-tab-nav";
import {
  DEMO_SUBSCRIPTION_FLAG,
  DUMMY_SUBSCRIPTION,
  USE_DUMMY_SUBSCRIPTION,
} from "@/constants/dummy-subscription";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Redirect, router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Subscription } from "@/types/subscription";

export default function TabsHomeRedirect() {
  return <Redirect href="/main-screen" />;
}

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DAY_INDEX_TO_NAME: Record<number, string> = Object.entries(
  DAY_NAME_TO_INDEX,
).reduce(
  (acc, [name, index]) => {
    acc[index] = name;
    return acc;
  },
  {} as Record<number, string>,
);

const mapDayValueToIndex = (value: unknown): number | null => {
  if (typeof value === "number" && value >= 0 && value <= 6) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const lower = trimmed.toLowerCase();
    if (DAY_NAME_TO_INDEX[lower] !== undefined) {
      return DAY_NAME_TO_INDEX[lower];
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 6) {
      return parsed;
    }
  }

  return null;
};

const extractSelectedDays = (subscriptionData: any): number[] => {
  if (!subscriptionData) {
    return [];
  }

  if (Array.isArray(subscriptionData.selected_days)) {
    return subscriptionData.selected_days
      .map(mapDayValueToIndex)
      .filter((day: number | null): day is number => day !== null);
  }

  if (typeof subscriptionData.selected_days === "string") {
    return subscriptionData.selected_days
      .split(",")
      .map(mapDayValueToIndex)
      .filter((day: number | null): day is number => day !== null);
  }

  if (Array.isArray(subscriptionData.subscription_days)) {
    return subscriptionData.subscription_days
      .map((day: any) =>
        mapDayValueToIndex(day?.day_index ?? day?.day ?? day?.day_name),
      )
      .filter((day: number | null): day is number => day !== null);
  }

  if (Array.isArray(subscriptionData.days)) {
    return subscriptionData.days
      .map(mapDayValueToIndex)
      .filter((day: number | null): day is number => day !== null);
  }

  return [];
};

const normalizeStatusValue = (status?: string): Subscription["status"] => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "completed") {
    return "Completed";
  }
  if (normalized === "cancelled") {
    return "Cancelled";
  }
  return "Active";
};

const buildPlanFromSubscription = (subscriptionData: any) => {
  const planFromApi =
    subscriptionData?.plan || subscriptionData?.subscription_plan || {};
  const fallbackTitle =
    subscriptionData?.subscription_plan_title || subscriptionData?.plan_title;
  return {
    ...planFromApi,
    id:
      planFromApi.id ??
      subscriptionData?.subscription_plan_id ??
      subscriptionData?.plan_id ??
      "",
    title: planFromApi.title ?? fallbackTitle ?? planFromApi?.name ?? "Plan",
    meal_count:
      planFromApi.meal_count ??
      planFromApi.mealCount ??
      subscriptionData?.meal_count ??
      0,
    snack_count:
      planFromApi.snack_count ??
      planFromApi.snackCount ??
      subscriptionData?.snack_count ??
      0,
    pricePerDay:
      planFromApi.price_per_day ??
      subscriptionData?.price_per_day ??
      planFromApi?.pricePerDay,
  };
};

const buildDurationFromSubscription = (subscriptionData: any) => {
  const durationFromApi =
    subscriptionData?.duration || subscriptionData?.subscription_duration || {};
  return {
    ...durationFromApi,
    id: durationFromApi.id ?? subscriptionData?.duration_id ?? "",
    title:
      durationFromApi.title ??
      subscriptionData?.duration_title ??
      durationFromApi?.name ??
      "Duration",
    no_of_weeks:
      durationFromApi.no_of_weeks ??
      subscriptionData?.duration_weeks ??
      durationFromApi?.weeks,
  };
};

const normalizePaymentStatus = (value: any): Subscription["paymentStatus"] => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.toLowerCase();
  if (
    normalized === "pending" ||
    normalized === "paid" ||
    normalized === "failed"
  ) {
    return normalized as Subscription["paymentStatus"];
  }
  return undefined;
};

const createFallbackSubscriptionDays = (days: number[]) =>
  days.map((dayIndex) => ({
    day_index: dayIndex,
    day: DAY_INDEX_TO_NAME[dayIndex] ?? dayIndex,
    day_name: DAY_INDEX_TO_NAME[dayIndex] ?? dayIndex,
  }));

const flattenDayMeals = (dayMeals: any): any[] => {
  if (!dayMeals || typeof dayMeals !== "object") {
    return [];
  }

  const flattened: any[] = [];
  Object.values(dayMeals).forEach((value: any) => {
    if (Array.isArray(value)) {
      value.forEach((meal) => flattened.push(meal));
      return;
    }

    if (value && typeof value === "object") {
      Object.values(value).forEach((maybeMeals: any) => {
        if (Array.isArray(maybeMeals)) {
          maybeMeals.forEach((meal) => flattened.push(meal));
        }
      });
    }
  });
  return flattened;
};

const normalizeApiSubscription = (subscriptionData: any): Subscription => {
  const plan = buildPlanFromSubscription(subscriptionData);
  const duration = buildDurationFromSubscription(subscriptionData);
  const days = extractSelectedDays(subscriptionData);
  return {
    id: subscriptionData?.id?.toString() ?? "",
    plan,
    duration,
    days,
    startDate:
      subscriptionData?.start_date ??
      subscriptionData?.startDate ??
      new Date().toISOString(),
    endDate:
      subscriptionData?.end_date ??
      subscriptionData?.endDate ??
      new Date().toISOString(),
    dayMeals: subscriptionData?.day_meals ?? {},
    address: subscriptionData?.address ?? {},
    planPrice: Number(
      subscriptionData?.plan_price ?? subscriptionData?.price ?? 0,
    ),
    vat: Number(subscriptionData?.vat ?? 0),
    totalPrice: Number(
      subscriptionData?.total_price ?? subscriptionData?.price ?? 0,
    ),
    status: normalizeStatusValue(subscriptionData?.status),
    createdAt: subscriptionData?.created_at ?? new Date().toISOString(),
    paymentStatus: normalizePaymentStatus(subscriptionData?.payment),
  };
};

const persistApiSubscriptionLocally = async (
  subscriptionData: any,
): Promise<Subscription> => {
  const normalized = normalizeApiSubscription(subscriptionData);
  await AsyncStorage.setItem("activeSubscription", JSON.stringify(normalized));
  await AsyncStorage.setItem(DEMO_SUBSCRIPTION_FLAG, "true");

  if (Array.isArray(subscriptionData?.subscription_meals)) {
    await AsyncStorage.setItem(
      "subscriptionMealsData",
      JSON.stringify(subscriptionData.subscription_meals),
    );
  } else {
    const flattenedMeals = flattenDayMeals(subscriptionData?.day_meals);
    if (flattenedMeals.length) {
      await AsyncStorage.setItem(
        "subscriptionMealsData",
        JSON.stringify(flattenedMeals),
      );
    }
  }

  if (Array.isArray(subscriptionData?.subscription_days)) {
    await AsyncStorage.setItem(
      "subscriptionDaysData",
      JSON.stringify(subscriptionData.subscription_days),
    );
  } else if (normalized.days.length) {
    await AsyncStorage.setItem(
      "subscriptionDaysData",
      JSON.stringify(createFallbackSubscriptionDays(normalized.days)),
    );
  }

  if (subscriptionData?.id) {
    await AsyncStorage.setItem(
      "userSubscriptionId",
      subscriptionData.id.toString(),
    );
  }

  return normalized;
};

const clearSubscriptionCache = async () => {
  await AsyncStorage.multiRemove([
    "activeSubscription",
    "subscriptionMealsData",
    "subscriptionDaysData",
    "userSubscriptionId",
  ]);
};

const persistDummySubscriptionLocally = async () => {
  await AsyncStorage.setItem(DEMO_SUBSCRIPTION_FLAG, "true");
  const subscriptionsData = await AsyncStorage.getItem("subscriptions");
  const subscriptions = subscriptionsData ? JSON.parse(subscriptionsData) : [];
  const existingIndex = subscriptions.findIndex(
    (sub: Subscription) => sub?.id === DUMMY_SUBSCRIPTION.id,
  );

  if (existingIndex >= 0) {
    subscriptions[existingIndex] = DUMMY_SUBSCRIPTION;
  } else {
    subscriptions.push(DUMMY_SUBSCRIPTION);
  }

  await AsyncStorage.setItem("subscriptions", JSON.stringify(subscriptions));
  await AsyncStorage.setItem(
    "activeSubscription",
    JSON.stringify(DUMMY_SUBSCRIPTION),
  );

  const flattenedMeals = flattenDayMeals(DUMMY_SUBSCRIPTION.dayMeals);
  await AsyncStorage.setItem(
    "subscriptionMealsData",
    JSON.stringify(flattenedMeals),
  );

  if (DUMMY_SUBSCRIPTION.days.length) {
    await AsyncStorage.setItem(
      "subscriptionDaysData",
      JSON.stringify(createFallbackSubscriptionDays(DUMMY_SUBSCRIPTION.days)),
    );
  }

  await AsyncStorage.setItem("userSubscriptionId", DUMMY_SUBSCRIPTION.id);
};

function LegacyHomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeSubscription, setActiveSubscription] =
    useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingMeals, setSyncingMeals] = useState(false);
  const [demoUnlocked, setDemoUnlocked] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    // Disable gesture navigation (swipe back) on this screen
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      // Prevent default behavior of leaving the screen
      e.preventDefault();
    });

    navigation.setOptions({
      gestureEnabled: false,
    });

    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      // Reload subscription data when screen comes into focus
      loadActiveSubscription();

      // Prevent back navigation on home screen (hardware back button)
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          // Prevent going back - only allow navigation through bottom tabs
          return true;
        },
      );

      return () => backHandler.remove();
    }, []), // Empty dependency array is fine - we want to reload every time screen is focused
  );

  const syncSubscriptionFromApi = async (
    allowDummyFallback: boolean,
  ): Promise<Subscription | null> => {
    try {
      if (USE_DUMMY_SUBSCRIPTION) {
        if (allowDummyFallback) {
          await persistDummySubscriptionLocally();
          return DUMMY_SUBSCRIPTION;
        }
        return null;
      }

      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        return null;
      }

      const subscriptionFromApi = await getActiveSubscription(Number(userId));
      if (!subscriptionFromApi) {
        await clearSubscriptionCache();
        return null;
      }

      return await persistApiSubscriptionLocally(subscriptionFromApi);
    } catch (error) {
      return null;
    }
  };

  const loadActiveSubscription = async () => {
    try {
      setLoading(true);

      const storedFlag =
        (await AsyncStorage.getItem(DEMO_SUBSCRIPTION_FLAG)) === "true";
      const demoFlag = USE_DUMMY_SUBSCRIPTION && storedFlag;
      setDemoUnlocked(demoFlag);

      const [activeSubData, mealsData] = await Promise.all([
        AsyncStorage.getItem("activeSubscription"),
        AsyncStorage.getItem("subscriptionMealsData"),
      ]);

      let subscription: Subscription | null = null;

      if (activeSubData) {
        try {
          const parsed: Subscription = JSON.parse(activeSubData);
          const endDate = new Date(parsed.endDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (parsed.status === "Active" && endDate >= today) {
            subscription = parsed;
          } else {
            await clearSubscriptionCache();
          }
        } catch (error) {
          await clearSubscriptionCache();
        }
      }

      if (!subscription && demoFlag) {
        await persistDummySubscriptionLocally();
        subscription = DUMMY_SUBSCRIPTION;
      }

      const needsApiSync = !subscription || !mealsData;
      if (needsApiSync) {
        const refreshed = await syncSubscriptionFromApi(demoFlag);
        if (refreshed) {
          subscription = refreshed;
        }
      }

      setActiveSubscription(subscription);
    } catch (error) {
      setActiveSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const ensureSubscriptionDataAvailable = async () => {
    if (USE_DUMMY_SUBSCRIPTION) {
      if (!demoUnlocked) {
        return false;
      }
      await persistDummySubscriptionLocally();
      return true;
    }

    const [mealsData, daysData] = await Promise.all([
      AsyncStorage.getItem("subscriptionMealsData"),
      AsyncStorage.getItem("subscriptionDaysData"),
    ]);

    if (mealsData && daysData) {
      return true;
    }

    const refreshed = await syncSubscriptionFromApi(demoUnlocked);
    if (!refreshed) {
      return false;
    }
    setActiveSubscription(refreshed);

    const [refreshedMeals, refreshedDays] = await Promise.all([
      AsyncStorage.getItem("subscriptionMealsData"),
      AsyncStorage.getItem("subscriptionDaysData"),
    ]);

    return Boolean(refreshedMeals && refreshedDays);
  };

  const handleUpdateMealsPress = async () => {
    if (!activeSubscription) {
      Alert.alert(
        t("home.no_sub_alert_title"),
        t("home.no_sub_alert_msg"),
      );
      return;
    }

    try {
      setSyncingMeals(true);
      const hasData = await ensureSubscriptionDataAvailable();
      if (!hasData) {
        Alert.alert(t("home.unable_load_meals"), t("home.try_again"));
        return;
      }
      router.push("/auth/selected-meals");
    } catch (error) {
      Alert.alert(t("home.error"), t("home.unable_open_updater"));
    } finally {
      setSyncingMeals(false);
    }
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

  const getPlanSummaryText = () => {
    if (!activeSubscription) return "";
    const plan = activeSubscription.plan;
    // Handle both old format (with meal_count, snack_count) and new format (just title)
    if (plan?.title) {
      const rawDays: unknown = activeSubscription.days;
      const daysCount = Array.isArray(activeSubscription.days)
        ? activeSubscription.days.length
        : typeof rawDays === "string"
          ? rawDays.split(",").length
          : 0;
      const duration = activeSubscription.duration?.title || "";

      if (plan.meal_count !== undefined && plan.snack_count !== undefined) {
        // Old format with meal/snack counts
        return `${plan.title}, ${plan.meal_count} ${plan.meal_count > 1 ? "Meals" : "Meal"}, ${plan.snack_count} ${plan.snack_count > 1 ? "snacks" : "snack"}, ${daysCount} days/ week`;
      } else {
        // New format from check-user API
        return `${plan.title}${duration ? ` - ${duration}` : ""}, ${daysCount} days/ week`;
      }
    }
    return t("home.active_subscription");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Text style={styles.headerTitle}>{t("home.title")}</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>{t("home.loading_subscription")}</Text>
            </View>
          ) : activeSubscription ? (
            <>
              {/* Active Subscription Card */}
              <View style={styles.subscriptionCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{t("home.active_subscription")}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {activeSubscription.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.planSummary}>{getPlanSummaryText()}</Text>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#344225"
                    />
                    <Text style={styles.detailLabel}>{t("home.start_date")}</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(activeSubscription.startDate)}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="calendar" size={16} color="#344225" />
                    <Text style={styles.detailLabel}>{t("home.end_date")}</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(activeSubscription.endDate)}
                    </Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t("home.total_price")}</Text>
                  <Text style={styles.priceValue}>
                    {t("home.kwd")} {activeSubscription.totalPrice.toFixed(3)}
                  </Text>
                </View>

                {activeSubscription.paymentStatus === "pending" && (
                  <TouchableOpacity
                    style={styles.payNowButton}
                    onPress={() => router.push("/auth/payment")}
                  >
                    <Text style={styles.payNowButtonText}>{t("home.pay_now")}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push("/(tabs)/order-history")}
                >
                  <Ionicons name="time-outline" size={24} color="#344225" />
                  <Text style={styles.actionText}>{t("home.view_history")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    syncingMeals && styles.actionButtonDisabled,
                  ]}
                  onPress={handleUpdateMealsPress}
                  disabled={syncingMeals}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={24}
                    color="#344225"
                  />
                  <Text style={styles.actionText}>
                    {syncingMeals ? t("home.syncing") : t("home.update_meals")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push("/auth/subscription")}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={24}
                    color="#344225"
                  />
                  <Text style={styles.actionText}>{t("home.new_subscription")}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => router.push("/auth/reviews")}
              >
                <Ionicons name="star-outline" size={24} color="#344225" />
                <Text style={styles.reviewButtonText}>{t("home.add_review")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="restaurant-outline" size={80} color="#B8D5C5" />
              </View>
              <Text style={styles.emptyTitle}>{t("home.no_active_subscription")}</Text>
              <Text style={styles.emptySubtitle}>
                {t("home.get_started")}
              </Text>
              <Text style={styles.emptyText}>
                {t("home.empty_desc")}
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push("/auth/subscription")}
              >
                <Ionicons
                  name="add-circle"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.createButtonText}>
                  {t("home.activate_subscription")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      <BottomTabNav activeTab="home" onHomePress={loadActiveSubscription} />
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
    paddingHorizontal: "5%",
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#344225",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
  },
  subscriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344225",
  },
  statusBadge: {
    backgroundColor: "#7A9B7E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  planSummary: {
    fontSize: 14,
    fontWeight: "500",
    color: "#344225",
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7F75",
    marginTop: 4,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#D4E8E0",
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#344225",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
  },
  payNowButton: {
    marginTop: 16,
    backgroundColor: "#FAD979",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  payNowButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FAD979",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#344225",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#344225",
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#F0F7F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7F75",
    marginBottom: 16,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "400",
    color: "#6B7F75",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7F75",
    marginTop: 12,
  },
  createButton: {
    backgroundColor: "#344225",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    minWidth: 240,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
});
