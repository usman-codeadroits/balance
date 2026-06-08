import { getMeals, getMySubscriptions, logoutUser, type Meal } from "@/api";
import { getSubscriptionRenewal } from "@/api/services/subscriptions";
import type { QueuedRenewal, QueuedSubscription } from "@/api/services/users";
import BottomTabNav from "@/components/bottom-tab-nav";
import { resetAppCache } from "@/utils/reset-app-cache";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  I18nManager,
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

export default function MainScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [greetingPrefix, setGreetingPrefix] = useState(t("main.good_morning"));
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionTitle, setSubscriptionTitle] = useState("");
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<number | null>(null);
  const [queuedRenewal, setQueuedRenewal] = useState<QueuedRenewal | null>(null);
  const [queuedSubscriptions, setQueuedSubscriptions] = useState<QueuedSubscription[]>([]);

  useEffect(() => {
    // Disable back button
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreetingPrefix(t("main.good_morning"));
    else if (hour < 18) setGreetingPrefix(t("main.good_afternoon"));
    else setGreetingPrefix(t("main.good_evening"));
  }, [t]);

  useEffect(() => {
    const load = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("userData");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserName(parsed.name || "");
        }

        const storedSub = await AsyncStorage.getItem("activeSubscription");
        const subscription = storedSub ? JSON.parse(storedSub) : null;

        setHasSubscription(!!subscription);
        setSubscriptionTitle(subscription?.plan?.title || "");
        if (subscription?.id) setActiveSubscriptionId(Number(subscription.id));

        const storedRenewal = await AsyncStorage.getItem("queuedRenewal");
        setQueuedRenewal(storedRenewal ? JSON.parse(storedRenewal) : null);

        const storedQueued = await AsyncStorage.getItem("queuedSubscriptions");
        setQueuedSubscriptions(storedQueued ? JSON.parse(storedQueued) : []);

        setLoading(true);
        const data = await getMeals();
        setMeals(data);
      } catch (error) {
        Alert.alert(t("common.error"), t("main.error_load_meals"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

  const handleLogout = () => {
    Alert.alert(
      t("profile.logout"),
      t("profile.logout_confirm"),
      [
        { text: t("profile.cancel"), style: "cancel" },
        {
          text: t("profile.logout"),
          style: "destructive",
          onPress: async () => {
            try {
              // Invalidate the server-side token (best-effort — proceed even if API fails)
              await logoutUser().catch(() => {});
              await resetAppCache();
              router.replace("/auth");
            } catch (error) {
              Alert.alert(t("common.error"), t("profile.logout_error"));
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  // Refresh renewal + queued data from API every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      const refreshRenewalData = async () => {
        try {
          const subsResponse = await getMySubscriptions();
          if (!subsResponse.success) return;

          const active = subsResponse.data.active?.[0];
          setQueuedSubscriptions(subsResponse.data.queued || []);

          if (!active) {
            setHasSubscription(false);
            setQueuedRenewal(null);
            await AsyncStorage.setItem("queuedRenewal", JSON.stringify(null));
            return;
          }

          setHasSubscription(true);
          setSubscriptionTitle(active.subcrption_plans?.title || "");
          setActiveSubscriptionId(active.id);

          try {
            const renewalRes = await getSubscriptionRenewal(active.id);
            const detail = renewalRes.data?.renewal ?? null;

            if (detail) {
              // Map RenewalDetail → QueuedRenewal shape used by banner
              const mapped: QueuedRenewal = {
                id: detail.id,
                plan_id: detail.plan.id,
                plan_title: detail.plan.title,
                selected_days: detail.selected_days,
                start_date: detail.start_date,
                end_date: detail.end_date,
                price: detail.price,
                currency: detail.currency,
                payment: detail.payment,
                status: detail.status,
              };
              setQueuedRenewal(mapped);
              await AsyncStorage.setItem("queuedRenewal", JSON.stringify(mapped));
            } else {
              setQueuedRenewal(null);
              await AsyncStorage.setItem("queuedRenewal", JSON.stringify(null));
            }
          } catch {
            // Renewal API failed — keep cached value, don't crash
          }
        } catch {
          // Subscriptions API failed — keep cached values, don't crash
        }
      };

      refreshRenewalData();
    }, []),
  );

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter((m) => {
      const haystack = [m.title, (m as any).description, (m as any).category]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [meals, searchQuery]);


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.titleContainer, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.headerSpacer} />
          <View style={styles.headerLogoWrap}>
            <Image
              source={require("@/assets/images/balance-text.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t("main.search_placeholder")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7F75"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => setSearchQuery((prev) => prev.trim())}
            clearButtonMode="while-editing"
            selectTextOnFocus
          />
          <Ionicons
            name="search"
            size={18}
            color="#6B7F75"
            style={[
              styles.searchIcon,
              I18nManager.isRTL ? { left: 26, right: undefined } : { right: 26, left: undefined }
            ]}
            pointerEvents="none"
          />
        </View>

        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>
            {greetingPrefix},{" "}
            <Text style={styles.welcomeName}>{userName || t("main.user_fallback")}</Text>
          </Text>
        </View>

        {/* Subscription Card */}
        {hasSubscription ? (
          <TouchableOpacity
            style={styles.subCard}
            onPress={() => router.push("/subscription-details")}
            activeOpacity={0.85}
          >
            <View style={styles.subCardLeft}>
              <View style={styles.subActiveDot} />
              <View>
                <Text style={styles.subCardLabel}>{t("main.view_subscription")}</Text>
                <Text style={styles.subCardTitle} numberOfLines={1}>{subscriptionTitle}</Text>
              </View>
            </View>
            <View style={styles.subCardRight}>
              <Text style={styles.subCardChevron}>›</Text>
            </View>
          </TouchableOpacity>
        ) : queuedSubscriptions.length > 0 ? (
          <TouchableOpacity
            style={styles.subCardQueued}
            onPress={() => router.push("/(tabs)/order-history" as any)}
            activeOpacity={0.85}
          >
            <View style={styles.subCardLeft}>
              <Ionicons name="time-outline" size={18} color="#FAD979" />
              <View>
                <Text style={styles.subCardLabel}>{t("main.plan_starts_soon")}</Text>
                <Text style={styles.subCardTitle} numberOfLines={1}>
                  {queuedSubscriptions[0].plan_title}
                </Text>
              </View>
            </View>
            <Text style={styles.subCardChevron}>›</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.subCardEmpty}
            onPress={() => router.push("/auth/subscription")}
            activeOpacity={0.85}
          >
            <View style={styles.subCardEmptyIcon}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subCardEmptyTitle}>{t("main.add_subscription")}</Text>
              <Text style={styles.subCardEmptyDesc}>Start your healthy meal journey</Text>
            </View>
            <Text style={styles.subCardChevronDark}>›</Text>
          </TouchableOpacity>
        )}

        {/* Renewal Banner — shown only when backend has created a queued renewal (≤3 days before plan ends) */}
        {queuedRenewal && activeSubscriptionId && (
          <TouchableOpacity
            style={styles.renewalBanner}
            onPress={() =>
              router.push({
                pathname: "/renewal-details",
                params: { subscriptionId: activeSubscriptionId },
              } as any)
            }
            activeOpacity={0.85}
          >
            <View style={styles.renewalBannerLeft}>
              <Ionicons name="refresh-circle-outline" size={22} color="#FAD979" />
              <View style={{ flex: 1 }}>
                <Text style={styles.renewalBannerTitle}>{t("main.renewal_banner_title")}</Text>
                <Text style={styles.renewalBannerDesc} numberOfLines={1}>
                  {`${queuedRenewal.plan_title} · ${queuedRenewal.currency} ${Number(queuedRenewal.price).toFixed(3)} · ${queuedRenewal.start_date}`}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FAD979" />
          </TouchableOpacity>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 120 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>{t("main.loading_meals")}</Text>
            </View>
          ) : filteredMeals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t("main.no_meals")}</Text>
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {filteredMeals.map((meal) => (
                <View key={meal.id} style={styles.card}>
                  <View style={styles.calorieBadge}>
                    <Text style={styles.calorieText}>{meal.calories} kcal</Text>
                  </View>
                  <Image
                    source={
                      meal.image_url
                        ? { uri: meal.image_url }
                        : require("@/assets/images/meal.jpg")
                    }
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {meal.title}
                    </Text>
                    <View style={styles.macroRow}>
                      <View style={styles.macroItem}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: "#4A90E2" },
                          ]}
                        />
                        <Text style={styles.macroText}>
                          {t("main.cal")} {meal.calories}
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: "#D0021B" },
                          ]}
                        />
                        <Text style={styles.macroText}>
                          {t("main.protein")} {meal.protein_g}g
                        </Text>
                      </View>
                    </View>
                    <View style={styles.macroRow}>
                      <View style={styles.macroItem}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: "#7ED321" },
                          ]}
                        />
                        <Text style={styles.macroText}>
                          {t("main.carbs")} {meal.carbs_g}g
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: "#F5A623" },
                          ]}
                        />
                        <Text style={styles.macroText}>{t("main.fat")} {meal.fat_g}g</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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
    backgroundColor: "#DCE6E0",
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: "5%",
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#DCE6E0",
  },
  headerSpacer: {
    width: 36,
  },
  headerLogoWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerLogo: {
    width: "60%",
    height: 32,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    position: "relative",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#C9D7CE",
    fontSize: 14,
    color: "#344225",
  },
  searchIcon: {
    position: "absolute",
    right: 26,
    top: 14,
  },
  welcomeRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 17,
    color: "#344225",
  },
  welcomeName: {
    fontWeight: "800",
    color: "#344225",
  },
  // Active subscription card
  subCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#344225",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  subCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  subActiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FAD979",
  },
  subCardLabel: {
    fontSize: 11,
    color: "#B8D5C5",
    fontWeight: "500",
    marginBottom: 2,
  },
  subCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subCardRight: {
    paddingLeft: 8,
  },
  subCardChevron: {
    fontSize: 24,
    color: "#FAD979",
    fontWeight: "300",
  },
  // Queued subscription card (no active plan, but one starting soon)
  subCardQueued: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#4A6040",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  // Empty subscription card
  subCardEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#344225",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  // Renewal banner
  renewalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#4A6040",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FAD979",
  },
  renewalBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  renewalBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FAD979",
    marginBottom: 2,
  },
  renewalBannerDesc: {
    fontSize: 11,
    color: "#B8D5C5",
  },
  subCardEmptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  subCardEmptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subCardEmptyDesc: {
    fontSize: 12,
    color: "#B8D5C5",
    marginTop: 1,
  },
  subCardChevronDark: {
    fontSize: 24,
    color: "#FAD979",
    fontWeight: "300",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 200,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    color: "#344225",
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D7E3DC",
  },
  calorieBadge: {
    position: "absolute",
    zIndex: 1,
    top: 8,
    left: 8,
    backgroundColor: "#E52C49",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  calorieText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  cardImage: {
    width: "100%",
    height: 130,
  },
  cardBody: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroText: {
    fontSize: 10,
    color: "#344225",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7F75",
  },
});
