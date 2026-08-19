import { getMeals, getMySubscriptions, logoutUser, type Meal } from "@/api";
import { getSubscriptionRenewal } from "@/api/services/subscriptions";
import type { QueuedRenewal, QueuedSubscription } from "@/api/services/users";
import BottomTabNav from "@/components/bottom-tab-nav";
import { resetAppCache } from "@/utils/reset-app-cache";
import { scheduleSubscriptionNotifications, clearSubscriptionNotifications } from "@/services/notifications";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isArabicLanguage } from "@/constants/i18n";

const normalizeCategoryName = (category: unknown): string => {
  if (typeof category === "string") return category;
  if (category && typeof category === "object") {
    const c = category as { name?: unknown; title?: unknown };
    if (typeof c.name === "string") return c.name;
    if (typeof c.title === "string") return c.title;
  }
  return "";
};

const getLocalizedPlanTitle = (plan: any, isArabic: boolean): string => {
  if (!plan) return "";
  return isArabic && plan.title_ar ? plan.title_ar : plan.title || "";
};

type CategoryGroup = { id: number; name: string; name_ar: string; meals: Meal[] };

export default function MainScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = isArabicLanguage(i18n.language);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = (width - 32 - 12) / 2;
  const [userName, setUserName] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [greetingPrefix, setGreetingPrefix] = useState(t("main.good_morning"));
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionTitle, setSubscriptionTitle] = useState("");
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<number | null>(null);
  const [queuedRenewal, setQueuedRenewal] = useState<QueuedRenewal | null>(null);
  const [queuedSubscriptions, setQueuedSubscriptions] = useState<QueuedSubscription[]>([]);
  const [autoRenew, setAutoRenew] = useState<boolean | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string>("");

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

        // Compare date strings (YYYY-MM-DD) in local time to avoid UTC midnight timezone issues
        let isSubActive = false;
        if (subscription) {
          const rawEnd = subscription.endDate || subscription.end_date || "";
          const endDateStr = rawEnd.split("T")[0];
          const todayStr = new Date().toLocaleDateString("en-CA");
          isSubActive = subscription.status === "Active" && !!endDateStr && endDateStr >= todayStr;
          if (!isSubActive) await AsyncStorage.removeItem("activeSubscription");
        }

        setHasSubscription(isSubActive);
        setSubscriptionTitle(getLocalizedPlanTitle(subscription?.plan, isArabic));
        if (isSubActive && subscription?.id) setActiveSubscriptionId(Number(subscription.id));

        const storedRenewal = await AsyncStorage.getItem("queuedRenewal");
        setQueuedRenewal(storedRenewal ? JSON.parse(storedRenewal) : null);

        const storedQueued = await AsyncStorage.getItem("queuedSubscriptions");
        setQueuedSubscriptions(storedQueued ? JSON.parse(storedQueued) : []);

        setLoading(true);
        const data = await getMeals();
        setMeals(data);
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Unable to load meals. Please try again.";
        Alert.alert("Error", msg);
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
          setQueuedSubscriptions((subsResponse.data.queued || []) as unknown as QueuedSubscription[]);

          if (!active) {
            // Before clearing, check if cached subscription ends today — API may mark it
            // completed on its last day while it should remain visible until midnight
            const storedSub = await AsyncStorage.getItem("activeSubscription");
            if (storedSub) {
              const cachedSub = JSON.parse(storedSub);
              const rawEnd = cachedSub.endDate || cachedSub.end_date || "";
              const endDateStr = rawEnd.split("T")[0];
              const todayStr = new Date().toLocaleDateString("en-CA");
              if (cachedSub.status === "Active" && endDateStr === todayStr) {
                // Subscription is still valid today — keep showing it
                setSubscriptionEndDate(endDateStr);
                setQueuedRenewal(null);
                await AsyncStorage.setItem("queuedRenewal", JSON.stringify(null));
                // Still fetch auto-renew so the Auto Renewal row shows correctly
                if (cachedSub.id) {
                  try {
                    const renewalRes = await getSubscriptionRenewal(Number(cachedSub.id));
                    setAutoRenew(renewalRes.data?.auto_renew ?? null);
                  } catch {}
                }
                return;
              }
              // Truly expired — clear stale cache
              await AsyncStorage.removeItem("activeSubscription");
            }
            setHasSubscription(false);
            setQueuedRenewal(null);
            await AsyncStorage.setItem("queuedRenewal", JSON.stringify(null));
            clearSubscriptionNotifications().catch(() => {});
            return;
          }

          setHasSubscription(true);
          setSubscriptionTitle(getLocalizedPlanTitle(active.subcrption_plans, isArabic));
          setActiveSubscriptionId(active.id);
          setSubscriptionEndDate((active.end_date || "").split("T")[0]);

          try {
            const renewalRes = await getSubscriptionRenewal(active.id);
            const autoRenewFlag = renewalRes.data?.auto_renew ?? false;
            setAutoRenew(autoRenewFlag);
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

            // Schedule/refresh notifications now that we have all subscription data
            scheduleSubscriptionNotifications({
              selectedDays: active.selected_days,
              endDate: active.end_date,
              autoRenew: autoRenewFlag,
              planTitle: getLocalizedPlanTitle(active.subcrption_plans, isArabic),
            }).catch(() => {});
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

  const groupedCategories = useMemo((): CategoryGroup[] => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<number, CategoryGroup>();

    meals.forEach((m) => {
      const catName = normalizeCategoryName(m.category) || (m as any).category_name || "";
      const catNameAr =
        (m.category && typeof m.category === "object" ? (m.category as any).name_ar : null) ||
        (m as any).category_name_ar ||
        "";
      const catId = (m as any).category_id ?? 0;
      if (!catName) return;

      if (q) {
        const haystack = [m.title, (m as any).title_ar, (m as any).description, (m as any).description_ar, catName, catNameAr]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(" ");
        if (!haystack.includes(q)) return;
      }

      if (!map.has(catId)) map.set(catId, { id: catId, name: catName, name_ar: catNameAr, meals: [] });
      map.get(catId)!.meals.push(m);
    });

    return Array.from(map.values()).filter((g) => g.meals.length > 0);
  }, [meals, searchQuery]);


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.titleContainer, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
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
            style={[styles.searchInput, isArabic && styles.searchInputRTL]}
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
            textAlign={isArabic ? "right" : "left"}
          />
          <Ionicons
            name="search"
            size={18}
            color="#6B7F75"
            style={[
              styles.searchIcon,
              isArabic ? { left: 26, right: undefined } : { right: 26, left: undefined }
            ]}
            pointerEvents="none"
          />
        </View>

        <View style={[styles.welcomeRow, isArabic && styles.rtlRow]}>
          <Text style={[styles.welcomeText, isArabic && styles.rtlText]}>
            {greetingPrefix},{" "}
            <Text style={styles.welcomeName}>{userName || t("main.user_fallback")}</Text>
          </Text>
          {/* View toggle: grid (2 per row) vs list (1 per row with description) */}
          <View style={styles.viewToggleRow}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === "grid" && styles.viewToggleBtnActive]}
              onPress={() => setViewMode("grid")}
              activeOpacity={1}
              accessibilityLabel={t("main.view_grid")}
            >
              <Ionicons name="grid-outline" size={18} color={viewMode === "grid" ? "#FFFFFF" : "#344225"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
              onPress={() => setViewMode("list")}
              activeOpacity={1}
              accessibilityLabel={t("main.view_list")}
            >
              <Ionicons name="list-outline" size={20} color={viewMode === "list" ? "#FFFFFF" : "#344225"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subscription Card */}
        {hasSubscription ? (
          <TouchableOpacity
            style={[styles.subCard, isArabic && styles.rtlRow]}
            onPress={() => router.push("/subscription-details")}
            activeOpacity={0.85}
          >
            <View style={[styles.subCardLeft, isArabic && styles.rtlRow]}>
              <View style={styles.subActiveDot} />
              <View>
                <Text style={[styles.subCardLabel, isArabic && styles.rtlText]}>{t("main.view_subscription")}</Text>
                <Text style={[styles.subCardTitle, isArabic && styles.rtlText]} numberOfLines={1}>{subscriptionTitle}</Text>
              </View>
            </View>
            <View style={styles.subCardRight}>
              <Text style={styles.subCardChevron}>{isArabic ? "‹" : "›"}</Text>
            </View>
          </TouchableOpacity>
        ) : queuedSubscriptions.length > 0 ? (
          <TouchableOpacity
            style={[styles.subCardQueued, isArabic && styles.rtlRow]}
            onPress={() => router.push("/(tabs)/order-history" as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.subCardLeft, isArabic && styles.rtlRow]}>
              <Ionicons name="time-outline" size={18} color="#FAD979" />
              <View>
                <Text style={[styles.subCardLabel, isArabic && styles.rtlText]}>{t("main.plan_starts_soon")}</Text>
                <Text style={[styles.subCardTitle, isArabic && styles.rtlText]} numberOfLines={1}>
                  {queuedSubscriptions[0].plan_title}
                </Text>
              </View>
            </View>
            <Text style={styles.subCardChevron}>{isArabic ? "‹" : "›"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.subCardEmpty, isArabic && styles.rtlRow]}
            onPress={() => router.push("/auth/subscription")}
            activeOpacity={0.85}
          >
            <View style={styles.subCardEmptyIcon}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subCardEmptyTitle, isArabic && styles.rtlText]}>{t("main.add_subscription")}</Text>
              <Text style={[styles.subCardEmptyDesc, isArabic && styles.rtlText]}>{t("main.add_subscription_desc")}</Text>
            </View>
            <Text style={styles.subCardChevronDark}>{isArabic ? "‹" : "›"}</Text>
          </TouchableOpacity>
        )}

        {/* Auto-Renewal Row — only visible the day before subscription ends */}
        {(() => {
          if (!hasSubscription || !activeSubscriptionId || autoRenew === null || !subscriptionEndDate) return null;
          const todayStr = new Date().toLocaleDateString("en-CA");
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toLocaleDateString("en-CA");
          const isLastDay = subscriptionEndDate === todayStr || subscriptionEndDate === tomorrowStr;
          if (!isLastDay) return null;
          return (
            <TouchableOpacity
              style={[styles.autoRenewRow, isArabic && styles.rtlRow]}
              onPress={() =>
                router.push({
                  pathname: "/renewal-details",
                  params: { subscriptionId: activeSubscriptionId },
                } as any)
              }
              activeOpacity={0.85}
            >
              <Ionicons name="notifications-outline" size={18} color="#E67E22" />
              <Text style={[styles.autoRenewLabel, isArabic && styles.rtlText]}>Auto Renewal</Text>
              <View style={[styles.autoRenewBadge, autoRenew ? styles.autoRenewOn : styles.autoRenewOff]}>
                <Text style={styles.autoRenewBadgeText}>{autoRenew ? "ON" : "OFF"}</Text>
              </View>
              <Ionicons
                name={isArabic ? "chevron-back" : "chevron-forward"}
                size={14}
                color="#6B7F75"
                style={isArabic ? { marginRight: "auto" } : { marginLeft: "auto" }}
              />
            </TouchableOpacity>
          );
        })()}

        {/* Renewal Banner — shown only when backend has created a queued renewal (≤3 days before plan ends) */}
        {queuedRenewal && activeSubscriptionId && (
          <TouchableOpacity
            style={[styles.renewalBanner, isArabic && styles.rtlRow]}
            onPress={() =>
              router.push({
                pathname: "/renewal-details",
                params: { subscriptionId: activeSubscriptionId },
              } as any)
            }
            activeOpacity={0.85}
          >
            <View style={[styles.renewalBannerLeft, isArabic && styles.rtlRow]}>
              <Ionicons name="refresh-circle-outline" size={22} color="#FAD979" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.renewalBannerTitle, isArabic && styles.rtlText]}>{t("main.renewal_banner_title")}</Text>
                <Text style={[styles.renewalBannerDesc, isArabic && styles.rtlText]} numberOfLines={1}>
                  {`${queuedRenewal.plan_title} · ${queuedRenewal.currency} ${Number(queuedRenewal.price).toFixed(3)} · ${queuedRenewal.start_date}`}
                </Text>
              </View>
            </View>
            <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={16} color="#FAD979" />
          </TouchableOpacity>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 96 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>{t("main.loading_meals")}</Text>
            </View>
          ) : groupedCategories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t("main.no_meals")}</Text>
            </View>
          ) : (
            groupedCategories.map((group) => {
              const rows: Meal[][] = [];
              for (let i = 0; i < group.meals.length; i += 2) {
                rows.push(group.meals.slice(i, i + 2));
              }
              return (
                <View key={group.id} style={styles.categorySection}>
                  {/* Section header */}
                  <View style={[styles.sectionHeader, isArabic && styles.rtlRow]}>
                    <Text style={[styles.sectionTitle, isArabic && styles.rtlText]}>{(isArabic && group.name_ar) ? group.name_ar : group.name}</Text>
                    <Text style={styles.sectionCount}>{group.meals.length}</Text>
                  </View>
                  {viewMode === "grid" ? (
                  <View style={styles.grid}>
                    {rows.map((row, rowIdx) => (
                      <View key={rowIdx}>
                        <View style={styles.gridRow}>
                        {row.map((meal) => (
                          <View key={meal.id} style={[styles.card, { width: cardWidth }]}>
                            <View style={styles.calorieBadge}>
                              <Text style={styles.calorieText}>{meal.calories} kcal</Text>
                            </View>
                            <Image
                              source={meal.image_url ? { uri: meal.image_url } : require("@/assets/images/meal.jpg")}
                              style={styles.cardImage}
                              resizeMode="cover"
                            />
                            <View style={styles.cardBody}>
                              <Text style={[styles.cardTitle, isArabic && styles.rtlText]} numberOfLines={2}>{(isArabic && meal.title_ar) ? meal.title_ar : meal.title}</Text>
                              <View style={[styles.macroRow, isArabic && styles.rtlRow]}>
                                <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
                                  <View style={[styles.macroDot, { backgroundColor: "#4A90E2" }]} />
                                  <Text style={styles.macroText}>{t("main.cal")} {meal.calories}</Text>
                                </View>
                                <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
                                  <View style={[styles.macroDot, { backgroundColor: "#D0021B" }]} />
                                  <Text style={styles.macroText}>{t("main.protein")} {meal.protein_g}g</Text>
                                </View>
                              </View>
                              <View style={[styles.macroRow, isArabic && styles.rtlRow]}>
                                <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
                                  <View style={[styles.macroDot, { backgroundColor: "#7ED321" }]} />
                                  <Text style={styles.macroText}>{t("main.carbs")} {meal.carbs_g}g</Text>
                                </View>
                                <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
                                  <View style={[styles.macroDot, { backgroundColor: "#F5A623" }]} />
                                  <Text style={styles.macroText}>{t("main.fat")} {meal.fat_g}g</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        ))}
                        {row.length === 1 && <View style={{ width: cardWidth }} />}
                          {row.length === 2 && <View style={styles.colDivider} pointerEvents="none" />}
                        </View>
                        {rowIdx < rows.length - 1 && <View style={styles.rowDivider} />}
                      </View>
                    ))}
                  </View>
                  ) : (
                    <View style={styles.listWrap}>
                      {group.meals.map((meal, idx) => (
                        <View key={meal.id}>
                          <View style={[styles.listRow, isArabic && styles.rtlRow]}>
                            <View style={styles.listInfo}>
                              <Text style={[styles.listTitle, isArabic && styles.rtlText]} numberOfLines={2}>
                                {(isArabic && meal.title_ar) ? meal.title_ar : meal.title}
                              </Text>
                              {!!((isArabic && meal.description_ar) ? meal.description_ar : meal.description) && (
                                <Text style={[styles.listDesc, isArabic && styles.rtlText]} numberOfLines={3}>
                                  {(isArabic && meal.description_ar) ? meal.description_ar : meal.description}
                                </Text>
                              )}
                              <View style={[styles.listMacroRow, isArabic && styles.rtlRow]}>
                                <View style={styles.listMacroCol}>
                                  <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                                    <View style={[styles.listMacroDot, { backgroundColor: "#4A90E2" }]} />
                                    <Text style={styles.listMacroText}>{t("main.cal")} {meal.calories}</Text>
                                  </View>
                                  <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                                    <View style={[styles.listMacroDot, { backgroundColor: "#7ED321" }]} />
                                    <Text style={styles.listMacroText}>{t("main.carbs")} {meal.carbs_g}g</Text>
                                  </View>
                                </View>
                                <View style={styles.listMacroCol}>
                                  <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                                    <View style={[styles.listMacroDot, { backgroundColor: "#D0021B" }]} />
                                    <Text style={styles.listMacroText}>{t("main.protein")} {meal.protein_g}g</Text>
                                  </View>
                                  <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                                    <View style={[styles.listMacroDot, { backgroundColor: "#F5A623" }]} />
                                    <Text style={styles.listMacroText}>{t("main.fat")} {meal.fat_g}g</Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                            <Image
                              source={meal.image_url ? { uri: meal.image_url } : require("@/assets/images/meal.jpg")}
                              style={styles.listImage}
                              resizeMode="cover"
                            />
                          </View>
                          {idx < group.meals.length - 1 && <View style={styles.listDivider} />}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
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
    paddingHorizontal: 16,
    paddingVertical: 4,
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
  searchInputRTL: {
    paddingRight: 14,
    paddingLeft: 42,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 17,
    color: "#344225",
    flexShrink: 1,
    marginRight: 12,
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
  autoRenewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#D7E3DC",
  },
  autoRenewLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#344225",
    flex: 1,
  },
  autoRenewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  autoRenewOn: {
    backgroundColor: "#E8F5E9",
  },
  autoRenewOff: {
    backgroundColor: "#F5F5F5",
  },
  autoRenewBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#344225",
  },
  viewToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C9D7CE",
  },
  viewToggleBtnActive: {
    backgroundColor: "#344225",
    borderColor: "#344225",
  },
  // List (1-per-row) layout — full-width rows split by thin divider lines
  listWrap: {
    paddingHorizontal: 16,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
  },
  listInfo: {
    flex: 1,
    justifyContent: "center",
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  listDesc: {
    fontSize: 14,
    color: "#8A8F8B",
    lineHeight: 20,
    marginBottom: 14,
  },
  listMacroRow: {
    flexDirection: "row",
  },
  listMacroCol: {
    flex: 1,
    gap: 10,
  },
  listMacroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listMacroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listMacroText: {
    fontSize: 14,
    color: "#344225",
  },
  listImage: {
    width: 128,
    height: 118,
    borderRadius: 12,
    alignSelf: "center",
  },
  listDivider: {
    height: 1,
    backgroundColor: "#93A79B",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  categorySection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#344225",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FAD979",
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    color: "#FAD979",
    fontWeight: "600",
  },
  grid: {
    paddingHorizontal: 16,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    position: "relative",
    paddingVertical: 10,
  },
  colDivider: {
    position: "absolute",
    left: "50%",
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: "#C9D7CE",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#C9D7CE",
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
  card: {
    width: "48%",
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
    borderRadius: 10,
  },
  cardBody: {
    paddingVertical: 8,
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
