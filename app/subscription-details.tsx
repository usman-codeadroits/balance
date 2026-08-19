import { getMySubscriptions, getSubscriptionDetails, getSubscriptionPauseLogs, getSubscriptionRenewal, type PauseLog, type RenewalDetail, type UserSubscriptionDetails, type UserSubscriptionSummary } from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

export default function SubscriptionDetailsScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const [subscription, setSubscription] = useState<UserSubscriptionSummary | null>(null);
  const [details, setDetails] = useState<UserSubscriptionDetails | null>(null);
  const [pauseLogs, setPauseLogs] = useState<PauseLog[]>([]);
  const [renewalDetail, setRenewalDetail] = useState<RenewalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const weekdayNames = t("calendar.weekdays", { returnObjects: true }) as string[];
  const getDayName = (day: string) => {
    const idx = DAY_NAME_TO_INDEX[(day || "").toLowerCase()];
    return idx !== undefined ? weekdayNames[idx] : (day.charAt(0).toUpperCase() + day.slice(1));
  };

  useFocusEffect(
    useCallback(() => {
      loadActiveSubscription();
    }, []),
  );

  const loadActiveSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMySubscriptions();

      let active = response.data.active?.[0] ?? null;

      // Backend may mark the subscription as completed at UTC midnight even though
      // the user's local last day hasn't ended yet — fall back to a recent subscription
      // that ends today so the details screen remains visible on the last day.
      if (!active && response.success) {
        const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
        active = (response.data.recent || []).find(
          (s) => (s.end_date || "").split("T")[0] === todayStr,
        ) ?? null;
      }

      if (response.success && active) {
        setSubscription(active);
        if (active.is_paused) fetchPauseLogs(active.id);
        // Load full details and renewal in parallel
        try {
          const [det, renewalRes] = await Promise.allSettled([
            getSubscriptionDetails(active.id),
            getSubscriptionRenewal(active.id),
          ]);
          if (det.status === "fulfilled" && det.value.success && det.value.data) {
            setDetails(det.value.data);
          }
          if (renewalRes.status === "fulfilled" && renewalRes.value.data?.renewal) {
            setRenewalDetail(renewalRes.value.data.renewal);
          }
        } catch {}
      } else {
        setError("no_active");
        setSubscription(null);
      }
    } catch {
      setError("failed");
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPauseLogs = async (id: number) => {
    try {
      const res = await getSubscriptionPauseLogs(id);
      if (res.success) setPauseLogs(res.pause_logs);
    } catch {}
  };

  const getActivePauseLog = (): PauseLog | null => {
    const entries = pauseLogs.filter((l) => l.action === "pause" && !l.resumed_at);
    if (!entries.length) return null;
    return entries.sort(
      (a, b) => new Date(b.action_timestamp).getTime() - new Date(a.action_timestamp).getTime(),
    )[0];
  };

  const formatDate = (s?: string | null): string => {
    if (!s) return "-";
    try {
      const parts = s.split(".");
      if (parts.length === 3) {
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${parts[0]} ${months[parseInt(parts[1]) - 1]} ${parts[2]}`;
      }
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return s; }
  };

  const activePauseLog = getActivePauseLog();
  const isPausedByAdmin = !!(subscription?.is_paused) && activePauseLog?.performed_by_type === "admin";

  const statusLabel = subscription?.is_paused
    ? isPausedByAdmin ? t("subscription_details.paused_by_admin") : t("subscription_details.paused")
    : subscription
      ? subscription.status === "active" ? t("subscription_details.status_active")
        : subscription.status === "completed" ? t("subscription_details.status_completed")
        : subscription.status === "cancelled" ? t("subscription_details.status_cancelled")
        : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
      : "";

  const statusColor = subscription?.is_paused
    ? "#FF9800"
    : subscription?.status === "active" ? "#4CAF50"
    : subscription?.status === "completed" ? "#FF9800"
    : "#F44336";

  const address = details?.address as any;

  const formatAddressLine = () => {
    if (!address) return "";
    return [
      address.area ? String(typeof address.area === "object" ? (address.area.name || address.area.title || "") : address.area) : null,
      address.block_number ? `${t("address.block")} ${address.block_number}` : null,
      address.street ? `${t("address.street")} ${address.street}` : null,
    ].filter(Boolean).join(", ");
  };

  // Macro calculations from detailed subscription data
  type MacroTotals = { cal: number; protein: number; carbs: number; fat: number };
  const perDayMacros: { day: string; macros: MacroTotals }[] = (details?.subscription_days || []).map((day) => {
    const totals: MacroTotals = { cal: 0, protein: 0, carbs: 0, fat: 0 };
    (day.subscription_meals || []).forEach((sm) => {
      totals.cal += sm.meal?.calories ?? 0;
      totals.protein += sm.meal?.protein_g ?? 0;
      totals.carbs += sm.meal?.carbs_g ?? 0;
      totals.fat += sm.meal?.fat_g ?? 0;
    });
    return { day: day.day, macros: totals };
  });

  const totalMacros: MacroTotals = perDayMacros.reduce(
    (acc, d) => ({
      cal: acc.cal + d.macros.cal,
      protein: acc.protein + d.macros.protein,
      carbs: acc.carbs + d.macros.carbs,
      fat: acc.fat + d.macros.fat,
    }),
    { cal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const dayCount = perDayMacros.length;
  const avgDayMacros: MacroTotals = dayCount > 0
    ? {
        cal: Math.round(totalMacros.cal / dayCount),
        protein: Math.round(totalMacros.protein / dayCount),
        carbs: Math.round(totalMacros.carbs / dayCount),
        fat: Math.round(totalMacros.fat / dayCount),
      }
    : { cal: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("subscription_details.header_title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.loadingText}>{t("subscription_details.loading")}</Text>
          </View>
        ) : error || !subscription ? (
          <View style={styles.center}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={40} color="#344225" />
            </View>
            <Text style={styles.emptyTitle}>{t("subscription_details.no_active_title")}</Text>
            <Text style={styles.emptyDesc}>
              {t("subscription_details.no_active_desc")}
            </Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => router.push("/auth/subscription")}
            >
              <Ionicons name="add" size={18} color="#344225" />
              <Text style={styles.startBtnText}>{t("subscription_details.create_subscription")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Pause banners */}
            {isPausedByAdmin ? (
              <View style={styles.adminPauseBanner}>
                <View style={[styles.pauseBannerRow, isArabic && styles.rtlRow]}>
                  <Ionicons name="pause-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.adminPauseTitle}>{t("subscription_details.paused_by_admin")}</Text>
                </View>
                <Text style={[styles.adminPauseDesc, isArabic && styles.rtlText]}>
                  {t("subscription_details.admin_pause_desc")}
                </Text>
                {activePauseLog?.reason ? (
                  <View style={[styles.pauseDetailRow, isArabic && styles.rtlRow]}>
                    <Text style={styles.pauseDetailLabel}>{t("subscription_details.reason")}</Text>
                    <Text style={styles.pauseDetailValue}>{activePauseLog.reason}</Text>
                  </View>
                ) : null}
                {subscription.paused_until ? (
                  <View style={[styles.pauseDetailRow, isArabic && styles.rtlRow]}>
                    <Text style={styles.pauseDetailLabel}>{t("subscription_details.paused_until")}</Text>
                    <Text style={styles.pauseDetailValue}>{formatDate(subscription.paused_until)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {!!(subscription.is_paused) && !isPausedByAdmin ? (
              <View style={[styles.userPauseBanner, isArabic && styles.rtlRow]}>
                <Ionicons name="pause-circle-outline" size={18} color="#344225" />
                <Text style={styles.userPauseText}>
                  {subscription.paused_until ? t("subscription_details.paused_until_inline", { date: formatDate(subscription.paused_until) }) : t("subscription_details.paused")}
                </Text>
              </View>
            ) : null}

            {/* Hero Card */}
            <View style={styles.heroCard}>
              <View style={[styles.heroTop, isArabic && styles.rtlRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroPlanName, isArabic && styles.rtlText]}>
                    {(isArabic && subscription.subcrption_plans?.title_ar) ? subscription.subcrption_plans.title_ar : (subscription.subcrption_plans?.title || t("subscription_details.subscription_plan_fallback"))}
                  </Text>
                  <Text style={[styles.heroDuration, isArabic && styles.rtlText]}>
                    {subscription.duration?.title || ""}
                  </Text>
                </View>
                <View style={[styles.statusChip, { borderColor: statusColor }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={[styles.heroBottom, isArabic && styles.rtlRow]}>
                <View style={styles.heroDateBlock}>
                  <Text style={styles.heroDateLabel}>{t("subscription_details.start_date")}</Text>
                  <Text style={styles.heroDateValue}>{formatDate(subscription.start_date)}</Text>
                </View>
                <View style={styles.heroArrow}>
                  <Ionicons name={isArabic ? "arrow-back" : "arrow-forward"} size={16} color="#B8D5C5" />
                </View>
                <View style={styles.heroDateBlock}>
                  <Text style={styles.heroDateLabel}>{t("subscription_details.end_date")}</Text>
                  <Text style={styles.heroDateValue}>{formatDate(subscription.end_date)}</Text>
                </View>
                <View style={[styles.heroPriceBlock, isArabic && { alignItems: "flex-start" }]}>
                  <Text style={styles.heroPriceLabel}>{t("subscription_details.total")}</Text>
                  <Text style={styles.heroPriceValue}>{`${subscription.price} ${(subscription as any).currency || "KWD"}`}</Text>
                </View>
              </View>

              {subscription.total_paused_days ? (
                <View style={[styles.pausedDaysBadge, isArabic && styles.rtlRow]}>
                  <Ionicons name="time-outline" size={13} color="#FAD979" />
                  <Text style={styles.pausedDaysText}>
                    {t("subscription_details.days_paused", { count: subscription.total_paused_days, s: subscription.total_paused_days !== 1 ? "s" : "" })}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.updateMealBtn, isArabic && styles.rtlRow]}
              onPress={() =>
                router.push({
                  pathname: "/update-subscription-meals",
                  params: { subscriptionId: subscription.id },
                })
              }
            >
              <View style={styles.updateMealBtnIcon}>
                <Ionicons name="create-outline" size={20} color="#344225" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.updateMealBtnTitle, isArabic && styles.rtlText]}>{t("subscription_details.update_meals_title")}</Text>
                <Text style={[styles.updateMealBtnDesc, isArabic && styles.rtlText]}>{t("subscription_details.update_meals_desc")}</Text>
              </View>
              <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={18} color="#6B7F75" />
            </TouchableOpacity>

            {address ? (
              <View style={[styles.addressCard, isArabic && styles.rtlText]}>
                <View style={[styles.addressHeader, isArabic && styles.rtlRow]}>
                  <View style={styles.addressIconWrap}>
                    <Ionicons name="location-outline" size={18} color="#344225" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addressTitle, isArabic && styles.rtlText]}>{t("subscription_details.delivery_address")}</Text>
                    <Text style={[styles.addressSubtitle, isArabic && styles.rtlText]} numberOfLines={2}>
                      {formatAddressLine() || t("subscription_details.no_address")}
                    </Text>
                  </View>
                </View>

                <View style={[styles.addressBody, isArabic && styles.rtlText]}>
                  {address.first_name || address.last_name ? (
                    <View style={[styles.addressRow, isArabic && styles.rtlRow]}>
                      <Ionicons name="person-outline" size={14} color="#6B7F75" />
                      <Text style={[styles.addressText, isArabic && styles.rtlText]}>
                        {[address.first_name, address.last_name].filter(Boolean).join(" ")}
                      </Text>
                    </View>
                  ) : null}
                  {address.phone_number ? (
                    <View style={[styles.addressRow, isArabic && styles.rtlRow]}>
                      <Ionicons name="call-outline" size={14} color="#6B7F75" />
                      <Text style={[styles.addressText, isArabic && styles.rtlText]}>{String(address.phone_number)}</Text>
                    </View>
                  ) : null}
                  {formatAddressLine() ? (
                    <View style={[styles.addressRow, isArabic && styles.rtlRow]}>
                      <Ionicons name="map-outline" size={14} color="#6B7F75" />
                      <Text style={[styles.addressText, isArabic && styles.rtlText]}>{formatAddressLine()}</Text>
                    </View>
                  ) : null}
                  {address.house_building || address.floor_apartment ? (
                    <View style={[styles.addressRow, isArabic && styles.rtlRow]}>
                      <Ionicons name="home-outline" size={14} color="#6B7F75" />
                      <Text style={[styles.addressText, isArabic && styles.rtlText]}>
                        {[
                          address.house_building ? `${t("address.house")} ${address.house_building}` : null,
                          address.floor_apartment ? `${t("address.apartment")} ${address.floor_apartment}` : null,
                        ].filter(Boolean).join(", ")}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Renewal button — shown only when backend has a queued renewal for this subscription */}
            {renewalDetail && (
              <TouchableOpacity
                style={[styles.renewalBtn, isArabic && styles.rtlRow]}
                onPress={() =>
                  router.push({
                    pathname: "/renewal-details",
                    params: { subscriptionId: subscription.id },
                  } as any)
                }
              >
                <View style={styles.renewalBtnIcon}>
                  <Ionicons name="refresh-circle-outline" size={20} color="#344225" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.renewalBtnTitle, isArabic && styles.rtlText]}>{t("subscription_details.renewal_plan_title")}</Text>
                  <Text style={[styles.renewalBtnDesc, isArabic && styles.rtlText]}>
                    {t("subscription_details.renewal_plan_desc", { plan: (isArabic && (renewalDetail.plan as any)?.title_ar) ? (renewalDetail.plan as any).title_ar : renewalDetail.plan?.title, date: renewalDetail.start_date })}
                  </Text>
                </View>
                <View style={styles.renewalArrowWrap}>
                  <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={18} color="#344225" />
                </View>
              </TouchableOpacity>
            )}

            {/* Nutrition Summary */}
            {details && perDayMacros.length > 0 && (
              <View style={styles.macroCard}>
                <View style={[styles.macroCardHeader, isArabic && styles.rtlRow]}>
                  <Ionicons name="nutrition-outline" size={18} color="#344225" />
                  <Text style={styles.macroCardTitle}>{t("subscription_details.nutrition_summary")}</Text>
                </View>

                {/* Per-day breakdown */}
                <Text style={[styles.macroSectionLabel, isArabic && styles.rtlText]}>{t("subscription_details.per_day")}</Text>
                {perDayMacros.map(({ day, macros }) => (
                  <View key={day} style={styles.macroDayRow}>
                    <Text style={[styles.macroDayName, isArabic && styles.rtlText]}>
                      {getDayName(day)}
                    </Text>
                    <View style={[styles.macroPillRow, isArabic && styles.rtlRow]}>
                      <View style={[styles.macroPill, { backgroundColor: "#FFF3CD" }]}>
                        <Text style={styles.macroPillVal}>{macros.cal}</Text>
                        <Text style={styles.macroPillLabel}>kcal</Text>
                      </View>
                      <View style={[styles.macroPill, { backgroundColor: "#D4E8E0" }]}>
                        <Text style={styles.macroPillVal}>{macros.protein}g</Text>
                        <Text style={styles.macroPillLabel}>{t("subscription_details.protein").toLowerCase()}</Text>
                      </View>
                      <View style={[styles.macroPill, { backgroundColor: "#EEF4F0" }]}>
                        <Text style={styles.macroPillVal}>{macros.carbs}g</Text>
                        <Text style={styles.macroPillLabel}>{t("subscription_details.carbs").toLowerCase()}</Text>
                      </View>
                      <View style={[styles.macroPill, { backgroundColor: "#FDE8D8" }]}>
                        <Text style={styles.macroPillVal}>{macros.fat}g</Text>
                        <Text style={styles.macroPillLabel}>{t("subscription_details.fat").toLowerCase()}</Text>
                      </View>
                    </View>
                  </View>
                ))}

                {dayCount > 1 && (
                  <>
                    <View style={styles.macroDivider} />
                    {/* Average per day */}
                    <Text style={[styles.macroSectionLabel, isArabic && styles.rtlText]}>{t("subscription_details.daily_average")}</Text>
                    <View style={[styles.macroTotalGrid, isArabic && styles.rtlRow]}>
                      {[
                        { label: t("subscription_details.calories"), val: `${avgDayMacros.cal}`, bg: "#FFF3CD" },
                        { label: t("subscription_details.protein"),  val: `${avgDayMacros.protein}g`, bg: "#D4E8E0" },
                        { label: t("subscription_details.carbs"),    val: `${avgDayMacros.carbs}g`,   bg: "#EEF4F0" },
                        { label: t("subscription_details.fat"),      val: `${avgDayMacros.fat}g`,     bg: "#FDE8D8" },
                      ].map((item) => (
                        <View key={item.label} style={[styles.macroTotalBox, { backgroundColor: item.bg }]}>
                          <Text style={styles.macroTotalVal}>{item.val}</Text>
                          <Text style={styles.macroTotalLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                <View style={styles.macroDivider} />

                {/* Grand total */}
                <Text style={[styles.macroSectionLabel, isArabic && styles.rtlText]}>
                  {t("subscription_details.total_days", { count: dayCount, s: dayCount !== 1 ? "s" : "" })}
                </Text>
                <View style={[styles.macroTotalGrid, isArabic && styles.rtlRow]}>
                  {[
                    { label: t("subscription_details.calories"), val: `${totalMacros.cal}`, bg: "#FFF3CD" },
                    { label: t("subscription_details.protein"),  val: `${totalMacros.protein}g`, bg: "#D4E8E0" },
                    { label: t("subscription_details.carbs"),    val: `${totalMacros.carbs}g`,   bg: "#EEF4F0" },
                    { label: t("subscription_details.fat"),      val: `${totalMacros.fat}g`,     bg: "#FDE8D8" },
                  ].map((item) => (
                    <View key={item.label} style={[styles.macroTotalBox, { backgroundColor: item.bg }]}>
                      <Text style={styles.macroTotalVal}>{item.val}</Text>
                      <Text style={styles.macroTotalLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <BottomTabNav activeTab="home" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  rtlRow: { flexDirection: "row-reverse" },
  rtlText: { textAlign: "right" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    flex: 1,
    textAlign: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: { fontSize: 14, color: "#6B7F75", marginTop: 12 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#B8D5C5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#344225", marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: "#6B7F75", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FAD979",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startBtnText: { fontSize: 15, fontWeight: "700", color: "#344225" },

  // Pause banners
  adminPauseBanner: {
    backgroundColor: "#B94A00",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  pauseBannerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  adminPauseTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  adminPauseDesc: { fontSize: 13, color: "#FFD4B0", marginBottom: 8, lineHeight: 18 },
  pauseDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  pauseDetailLabel: { fontSize: 12, color: "#FFD4B0" },
  pauseDetailValue: { fontSize: 12, color: "#FFFFFF", fontWeight: "600" },
  userPauseBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF3CD",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FAD979",
  },
  userPauseText: { fontSize: 13, color: "#344225", fontWeight: "500", flex: 1 },

  // Hero card
  heroCard: {
    backgroundColor: "#344225",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroPlanName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  heroDuration: { fontSize: 13, color: "#B8D5C5" },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusChipText: { fontSize: 12, fontWeight: "600" },
  heroDivider: { height: 1, backgroundColor: "#4A6040", marginBottom: 16 },
  heroBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroDateBlock: { flex: 1 },
  heroDateLabel: { fontSize: 11, color: "#8FA880", marginBottom: 4 },
  heroDateValue: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  heroArrow: { paddingHorizontal: 4 },
  heroPriceBlock: { alignItems: "flex-end" },
  heroPriceLabel: { fontSize: 11, color: "#8FA880", marginBottom: 4 },
  heroPriceValue: { fontSize: 18, fontWeight: "700", color: "#FAD979" },
  pausedDaysBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pausedDaysText: { fontSize: 12, color: "#FAD979", fontWeight: "500" },

  // Action buttons
  updateMealBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FAD979",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  updateMealBtnIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(52,66,37,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  updateMealBtnTitle: { fontSize: 15, fontWeight: "700", color: "#344225" },
  updateMealBtnDesc: { fontSize: 12, color: "#5C6B45", marginTop: 2 },

  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#344225",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  viewDetailsBtnIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewDetailsBtnTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  viewDetailsBtnDesc: { fontSize: 12, color: "#B8D5C5", marginTop: 2 },

  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DDE9E4",
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  addressTitle: { fontSize: 15, fontWeight: "700", color: "#344225" },
  addressSubtitle: { fontSize: 12, color: "#6B7F75", marginTop: 2, textAlign: "left" },
  addressBody: { gap: 10 },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  addressText: { flex: 1, fontSize: 13, color: "#344225", lineHeight: 18 },

  renewalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FAD979",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  renewalBtnIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(52,66,37,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  renewalBtnTitle: { fontSize: 15, fontWeight: "700", color: "#344225" },
  renewalBtnDesc: { fontSize: 12, color: "#5C6B45", marginTop: 2 },
  renewalArrowWrap: { paddingLeft: 4 },

  // Macro card
  macroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  macroCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  macroCardTitle: { fontSize: 15, fontWeight: "700", color: "#344225" },
  macroSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7F75",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  macroDayRow: {
    marginBottom: 10,
  },
  macroDayName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 4,
  },
  macroPillRow: {
    flexDirection: "row",
    gap: 6,
  },
  macroPill: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  macroPillVal: { fontSize: 12, fontWeight: "700", color: "#344225" },
  macroPillLabel: { fontSize: 9, color: "#6B7F75", marginTop: 1 },
  macroDivider: { height: 1, backgroundColor: "#EEF4F0", marginVertical: 12 },
  macroTotalGrid: {
    flexDirection: "row",
    gap: 8,
  },
  macroTotalBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  macroTotalVal: { fontSize: 13, fontWeight: "700", color: "#344225" },
  macroTotalLabel: { fontSize: 10, color: "#6B7F75", marginTop: 2 },
});
