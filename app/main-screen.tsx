import { getMealCategories, getMeals, getMySubscriptions, logoutUser, type Meal } from "@/api";
import type { QueuedSubscription } from "@/api/services/users";
import BottomTabNav from "@/components/bottom-tab-nav";
import { resetAppCache } from "@/utils/reset-app-cache";
import { sortByCategoryOrder } from "@/utils/sort-by-category-order";
import { scheduleSubscriptionNotifications, clearSubscriptionNotifications } from "@/services/notifications";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import type { ComponentProps } from "react";

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
  const [showDrawer, setShowDrawer] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [greetingPrefix, setGreetingPrefix] = useState(t("main.good_morning"));
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionTitle, setSubscriptionTitle] = useState("");
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<number | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string>("");
  const [queuedSubscriptions, setQueuedSubscriptions] = useState<QueuedSubscription[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<number[]>([]);

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

        const storedQueued = await AsyncStorage.getItem("queuedSubscriptions");
        setQueuedSubscriptions(storedQueued ? JSON.parse(storedQueued) : []);

        setLoading(true);
        const data = await getMeals();
        setMeals(data);
        getMealCategories()
          .then((cats) => setCategoryOrder(cats.map((c) => c.id)))
          .catch(() => {});
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

  const openDrawer = () => {
    setShowDrawer(true);
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: -300, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowDrawer(false));
  };

  const goTo = (route: string) => {
    closeDrawer();
    router.push(route as any);
  };

  const DRAWER_ITEMS: { icon: ComponentProps<typeof Ionicons>["name"]; title: string; route: string }[] = [
    { icon: "person-outline", title: t("profile.my_information"), route: "/my-profile" },
    { icon: "receipt-outline", title: t("subscription_details.header_title"), route: "/subscription-details" },
    { icon: "nutrition-outline", title: t("profile.allergies"), route: "/(tabs)/allergies-preference" },
    { icon: "close-circle-outline", title: t("profile.dislikes"), route: "/(tabs)/dislikes-preference" },
    { icon: "language-outline", title: t("profile.change_language"), route: "/change-language" },
    { icon: "help-circle-outline", title: t("profile.ask_a_question"), route: "/(tabs)/app-inquiries" },
  ];

  // Refresh subscription + queued data from API every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      const refreshSubscriptionData = async () => {
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
                return;
              }
              // Truly expired — clear stale cache
              await AsyncStorage.removeItem("activeSubscription");
            }
            setHasSubscription(false);
            setSubscriptionEndDate("");
            clearSubscriptionNotifications().catch(() => {});
            return;
          }

          setHasSubscription(true);
          setSubscriptionTitle(getLocalizedPlanTitle(active.subcrption_plans, isArabic));
          setActiveSubscriptionId(active.id);
          setSubscriptionEndDate((active.end_date || "").split("T")[0]);

          // Schedule/refresh meal-day notifications now that we have subscription data
          scheduleSubscriptionNotifications({
            selectedDays: active.selected_days,
            endDate: active.end_date,
            planTitle: getLocalizedPlanTitle(active.subcrption_plans, isArabic),
          }).catch(() => {});
        } catch {
          // Subscriptions API failed — keep cached values, don't crash
        }
      };

      refreshSubscriptionData();
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

    const groups = Array.from(map.values()).filter((g) => g.meals.length > 0);
    return sortByCategoryOrder(groups, categoryOrder);
  }, [meals, searchQuery, categoryOrder]);


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.titleContainer, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer} activeOpacity={0.7}>
            <Ionicons name="menu" size={26} color="#344225" />
          </TouchableOpacity>
          <View style={styles.headerLogoWrap}>
            <Image
              source={require("@/assets/images/balance-text.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={26} color="#344225" />
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

        {(() => {
          if (!hasSubscription || !subscriptionEndDate) return null;
          const end = new Date(subscriptionEndDate);
          if (isNaN(end.getTime())) return null;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          const daysUntilEnd = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilEnd < 0 || daysUntilEnd > 3) return null;
          return (
            <TouchableOpacity
              style={[styles.reorderBanner, isArabic && styles.rtlRow]}
              onPress={() => router.push("/reorder" as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.reorderBannerLeft, isArabic && styles.rtlRow]}>
                <Ionicons name="repeat-outline" size={20} color="#FAD979" />
                <Text style={[styles.reorderBannerTitle, isArabic && styles.rtlText]}>{t("reorder.button_title")}</Text>
              </View>
              <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={16} color="#FAD979" />
            </TouchableOpacity>
          );
        })()}

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

      {showDrawer ? (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.drawerBackdrop, { opacity: backdropAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>

          <Animated.View style={[styles.drawerPanel, { paddingTop: Math.max(insets.top, 16), transform: [{ translateX: drawerAnim }] }]}>
            <View style={styles.drawerProfileRow}>
              <View style={styles.drawerAvatar}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.drawerUserName} numberOfLines={1}>{userName || t("profile.title")}</Text>
              <TouchableOpacity style={styles.drawerCloseBtn} onPress={closeDrawer} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#344225" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.drawerList}>
              {DRAWER_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.drawerItem, isArabic && styles.rtlRow]}
                  onPress={() => goTo(item.route)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon} size={20} color="#344225" />
                  <Text style={[styles.drawerItemText, isArabic && styles.rtlText]}>{item.title}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.drawerDivider} />

              <TouchableOpacity
                style={[styles.drawerItem, isArabic && styles.rtlRow]}
                onPress={() => { closeDrawer(); handleLogout(); }}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={20} color="#D64545" />
                <Text style={[styles.drawerItemText, styles.drawerLogoutText, isArabic && styles.rtlText]}>{t("profile.logout")}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
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
    paddingVertical: 8,
    backgroundColor: "#DCE6E0",
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerLogo: {
    width: "55%",
    height: 30,
  },
  profileButton: {
    width: 40,
    height: 40,
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
  reorderBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#344225",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FAD979",
  },
  reorderBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reorderBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
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

  // Side drawer
  drawerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  drawerPanel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 16,
  },
  drawerProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF4F0",
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerUserName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
  },
  drawerList: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
  },
  drawerItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
  },
  drawerDivider: {
    height: 1,
    backgroundColor: "#EEF4F0",
    marginVertical: 8,
  },
  drawerLogoutText: {
    color: "#D64545",
  },
});
