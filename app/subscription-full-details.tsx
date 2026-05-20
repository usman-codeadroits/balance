import { getSubscriptionDetails, getSubscriptionPauseLogs, type PauseLog, type UserSubscriptionDetails } from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
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

export default function SubscriptionFullDetailsScreen() {
  const { subscriptionId } = useLocalSearchParams();
  const [details, setDetails] = useState<UserSubscriptionDetails | null>(null);
  const [pauseLogs, setPauseLogs] = useState<PauseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      if (subscriptionId) loadSubscriptionDetails(Number(subscriptionId));
    }, [subscriptionId]),
  );

  const loadSubscriptionDetails = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSubscriptionDetails(id);
      if (response.success && response.data) {
        setDetails(response.data);
        if (response.data.is_paused) {
          try {
            const logsRes = await getSubscriptionPauseLogs(id);
            if (logsRes.success) setPauseLogs(logsRes.pause_logs);
          } catch {}
        }
      } else {
        setError("Failed to load subscription details");
      }
    } catch {
      setError("Failed to load subscription details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (s?: string | null): string => {
    if (!s) return "-";
    try {
      const parts = s.split(".");
      if (parts.length === 3) {
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const m = parseInt(parts[1], 10);
        return `${parts[0]} ${months[m - 1] ?? ""} ${parts[2]}`;
      }
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return s; }
  };

  const getActivePauseLog = (): PauseLog | null => {
    const entries = pauseLogs.filter((l) => l.action === "pause" && !l.resumed_at);
    if (!entries.length) return null;
    return entries.sort(
      (a, b) => new Date(b.action_timestamp).getTime() - new Date(a.action_timestamp).getTime(),
    )[0];
  };

  const activePauseLog = getActivePauseLog();
  const isPausedByAdmin = !!(details?.is_paused && activePauseLog?.performed_by_type === "admin");

  const statusColor = details?.is_paused
    ? "#FF9800"
    : details?.status === "active" ? "#4CAF50"
    : details?.status === "completed" ? "#FF9800"
    : "#F44336";

  const statusLabel = (() => {
    if (!details) return "";
    if (details.is_paused) return isPausedByAdmin ? "Paused by Admin" : "Paused";
    const s = details.status || "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const addr = details?.address as any;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
            <Text style={styles.errorTitle}>Could not load</Text>
            <Text style={styles.errorDesc}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { if (subscriptionId) loadSubscriptionDetails(Number(subscriptionId)); }}
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : details ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {isPausedByAdmin ? (
              <View style={styles.adminPauseBanner}>
                <View style={styles.pauseBannerRow}>
                  <Ionicons name="pause-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.adminPauseTitle}>Paused by Admin</Text>
                </View>
                <Text style={styles.adminPauseDesc}>
                  Your subscription has been paused by an administrator.
                </Text>
                {activePauseLog?.performed_by_name ? (
                  <View style={styles.pauseDetailRow}>
                    <Text style={styles.pauseDetailLabel}>Paused By</Text>
                    <Text style={styles.pauseDetailValue}>{activePauseLog.performed_by_name}</Text>
                  </View>
                ) : null}
                {activePauseLog?.reason ? (
                  <View style={styles.pauseDetailRow}>
                    <Text style={styles.pauseDetailLabel}>Reason</Text>
                    <Text style={styles.pauseDetailValue}>{activePauseLog.reason}</Text>
                  </View>
                ) : null}
                {details.paused_until ? (
                  <View style={styles.pauseDetailRow}>
                    <Text style={styles.pauseDetailLabel}>Paused Until</Text>
                    <Text style={styles.pauseDetailValue}>{formatDate(details.paused_until)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {details.is_paused && !isPausedByAdmin ? (
              <View style={styles.userPauseBanner}>
                <Ionicons name="pause-circle-outline" size={18} color="#344225" />
                <Text style={styles.userPauseText}>
                  {details.paused_until ? `Paused until ${formatDate(details.paused_until)}` : "Paused"}
                </Text>
              </View>
            ) : null}

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryPlanName}>
                    {String((details as any)?.subcrption_plans?.title || (details as any)?.plan?.title || "Subscription Plan")}
                  </Text>
                  <Text style={styles.summaryDuration}>
                    {String((details as any)?.duration?.title || "")}
                  </Text>
                </View>
                <View style={[styles.statusChip, { borderColor: statusColor }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryGrid}>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryCellLabel}>Start Date</Text>
                  <Text style={styles.summaryCellValue}>{formatDate(details.start_date)}</Text>
                </View>
                <View style={styles.summaryCellSep} />
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryCellLabel}>End Date</Text>
                  <Text style={styles.summaryCellValue}>{formatDate(details.end_date)}</Text>
                </View>
                <View style={styles.summaryCellSep} />
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryCellLabel}>Total Price</Text>
                  <Text style={styles.summaryCellPrice}>{`${details.price ?? ""} ${details.currency ?? ""}`}</Text>
                </View>
              </View>

              {details.is_personalized ? (
                <View style={styles.personalizedBadge}>
                  <Ionicons name="star" size={12} color="#344225" />
                  <Text style={styles.personalizedBadgeText}>Personalized Plan</Text>
                </View>
              ) : null}
            </View>

            {/* Delivery Address */}
            {addr ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrap}>
                    <Ionicons name="location" size={16} color="#344225" />
                  </View>
                  <Text style={styles.sectionTitle}>Delivery Address</Text>
                </View>

                <View style={styles.addressBlock}>
                  {addr.first_name ? (
                    <View style={styles.addressRow}>
                      <Ionicons name="person-outline" size={14} color="#6B7F75" />
                      <Text style={styles.addressText}>{String(addr.first_name)}</Text>
                    </View>
                  ) : null}
                  {addr.phone_number ? (
                    <View style={styles.addressRow}>
                      <Ionicons name="call-outline" size={14} color="#6B7F75" />
                      <Text style={styles.addressText}>{String(addr.phone_number)}</Text>
                    </View>
                  ) : null}
                  {addr.area || addr.street ? (
                    <View style={styles.addressRow}>
                      <Ionicons name="map-outline" size={14} color="#6B7F75" />
                      <Text style={styles.addressText}>
                        {[
                          addr.area ? String(typeof addr.area === "object" ? (addr.area.name || addr.area.title || "") : addr.area) : null,
                          addr.block_number ? `Block ${addr.block_number}` : null,
                          addr.street ? `Street ${addr.street}` : null,
                        ].filter(Boolean).join(", ")}
                      </Text>
                    </View>
                  ) : null}
                  {addr.house_building || addr.floor_apartment ? (
                    <View style={styles.addressRow}>
                      <Ionicons name="home-outline" size={14} color="#6B7F75" />
                      <Text style={styles.addressText}>
                        {[
                          addr.house_building ? `Bldg ${addr.house_building}` : null,
                          addr.floor_apartment ? `Floor/Apt ${addr.floor_apartment}` : null,
                        ].filter(Boolean).join(", ")}
                      </Text>
                    </View>
                  ) : null}
                  {addr.preferred_delivery_slot ? (
                    <View style={styles.addressRow}>
                      <Ionicons name="time-outline" size={14} color="#6B7F75" />
                      <Text style={styles.addressText}>{String(addr.preferred_delivery_slot)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Schedule */}
            {details.subscription_days && details.subscription_days.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrap}>
                    <Ionicons name="calendar" size={16} color="#344225" />
                  </View>
                  <Text style={styles.sectionTitle}>Weekly Schedule</Text>
                  <View style={styles.dayCountBadge}>
                    <Text style={styles.dayCountText}>{`${details.subscription_days.length} days/week`}</Text>
                  </View>
                </View>

                {details.subscription_days.map((day, dayIndex) => (
                  <View key={dayIndex} style={styles.dayBlock}>
                    <View style={styles.dayLabelRow}>
                      <View style={styles.dayPill}>
                        <Text style={styles.dayPillText}>
                          {day.day ? day.day.charAt(0).toUpperCase() + day.day.slice(1) : ""}
                        </Text>
                      </View>
                      <Text style={styles.dayMealCount}>
                        {`${day.subscription_meals?.length ?? 0} item${(day.subscription_meals?.length ?? 0) !== 1 ? "s" : ""}`}
                      </Text>
                    </View>

                    <View style={styles.mealsContainer}>
                      {(day.subscription_meals || []).map((meal, mealIndex) => {
                        const isMeal = meal.type === "is meal";
                        const mealTitle = meal?.meal?.title ?? "Unknown";
                        const mealCals = meal?.meal?.calories;
                        const mealProtein = (meal?.meal as any)?.protein_g;
                        const mealLabel = isMeal ? "Meal" : "Snack";
                        const calStr = mealCals != null ? ` · ${mealCals} kcal` : "";
                        const protStr = mealProtein != null ? ` · P ${mealProtein}g` : "";
                        return (
                          <View key={mealIndex} style={styles.mealRow}>
                            <View style={[styles.mealTypeDot, { backgroundColor: isMeal ? "#344225" : "#FAD979" }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.mealName}>{mealTitle}</Text>
                              <Text style={styles.mealMeta}>{`${mealLabel}${calStr}${protStr}`}</Text>
                            </View>
                            {mealCals != null ? (
                              <View style={styles.calBadge}>
                                <Text style={styles.calBadgeText}>{String(mealCals)}</Text>
                                <Text style={styles.calBadgeUnit}>kcal</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>

                    {dayIndex < details.subscription_days.length - 1 ? (
                      <View style={styles.dayDivider} />
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>

      <BottomTabNav activeTab="home" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#344225", flex: 1, textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loadingText: { fontSize: 14, color: "#6B7F75", marginTop: 12 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: "#344225", marginTop: 16 },
  errorDesc: { fontSize: 13, color: "#6B7F75", textAlign: "center", marginTop: 6, marginBottom: 20 },
  retryBtn: { backgroundColor: "#344225", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  adminPauseBanner: { backgroundColor: "#B94A00", borderRadius: 14, padding: 16, marginBottom: 14 },
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

  summaryCard: { backgroundColor: "#344225", borderRadius: 20, padding: 20, marginBottom: 14 },
  summaryTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  summaryPlanName: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 3 },
  summaryDuration: { fontSize: 13, color: "#B8D5C5" },
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
  summaryDivider: { height: 1, backgroundColor: "#4A6040", marginBottom: 16 },
  summaryGrid: { flexDirection: "row", alignItems: "center" },
  summaryCell: { flex: 1, alignItems: "center" },
  summaryCellSep: { width: 1, height: 32, backgroundColor: "#4A6040" },
  summaryCellLabel: { fontSize: 10, color: "#8FA880", marginBottom: 4 },
  summaryCellValue: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  summaryCellPrice: { fontSize: 15, fontWeight: "700", color: "#FAD979" },
  personalizedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#FAD979",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  personalizedBadgeText: { fontSize: 11, fontWeight: "700", color: "#344225" },

  sectionCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#D4E8E0", alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#344225", flex: 1 },
  dayCountBadge: { backgroundColor: "#D4E8E0", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dayCountText: { fontSize: 11, fontWeight: "600", color: "#344225" },

  addressBlock: { gap: 8 },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  addressText: { fontSize: 13, color: "#344225", flex: 1, lineHeight: 18 },

  dayBlock: { marginBottom: 4 },
  dayLabelRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  dayPill: { backgroundColor: "#344225", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  dayPillText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  dayMealCount: { fontSize: 12, color: "#6B7F75" },
  mealsContainer: { gap: 8, paddingLeft: 4 },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F7FAF8",
    borderRadius: 10,
    padding: 10,
  },
  mealTypeDot: { width: 8, height: 8, borderRadius: 4 },
  mealName: { fontSize: 13, fontWeight: "600", color: "#344225" },
  mealMeta: { fontSize: 11, color: "#6B7F75", marginTop: 2 },
  calBadge: {
    alignItems: "center",
    backgroundColor: "#EEF4F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 44,
  },
  calBadgeText: { fontSize: 13, fontWeight: "700", color: "#344225" },
  calBadgeUnit: { fontSize: 9, color: "#6B7F75" },
  dayDivider: { height: 1, backgroundColor: "#EEF4F0", marginVertical: 12 },
});
