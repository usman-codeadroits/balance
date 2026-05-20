import { getMySubscriptions, getSubscriptionPauseLogs, type PauseLog, type UserSubscriptionSummary } from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
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

export default function SubscriptionDetailsScreen() {
  const [subscription, setSubscription] = useState<UserSubscriptionSummary | null>(null);
  const [pauseLogs, setPauseLogs] = useState<PauseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

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
      if (response.success && response.data.active?.length > 0) {
        const active = response.data.active[0];
        setSubscription(active);
        if (active.is_paused) fetchPauseLogs(active.id);
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
    ? isPausedByAdmin ? "Paused by Admin" : "Paused"
    : subscription
      ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
      : "";

  const statusColor = subscription?.is_paused
    ? "#FF9800"
    : subscription?.status === "active" ? "#4CAF50"
    : subscription?.status === "completed" ? "#FF9800"
    : "#F44336";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Subscription</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.loadingText}>Loading subscription...</Text>
          </View>
        ) : error || !subscription ? (
          <View style={styles.center}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={40} color="#344225" />
            </View>
            <Text style={styles.emptyTitle}>No Active Subscription</Text>
            <Text style={styles.emptyDesc}>
              Start your healthy meal journey by creating a new plan
            </Text>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => router.push("/auth/subscription")}
            >
              <Ionicons name="add" size={18} color="#344225" />
              <Text style={styles.startBtnText}>Create Subscription</Text>
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
                <View style={styles.pauseBannerRow}>
                  <Ionicons name="pause-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.adminPauseTitle}>Paused by Admin</Text>
                </View>
                <Text style={styles.adminPauseDesc}>
                  Your subscription has been paused by an administrator.
                </Text>
                {activePauseLog?.reason ? (
                  <View style={styles.pauseDetailRow}>
                    <Text style={styles.pauseDetailLabel}>Reason</Text>
                    <Text style={styles.pauseDetailValue}>{activePauseLog.reason}</Text>
                  </View>
                ) : null}
                {subscription.paused_until ? (
                  <View style={styles.pauseDetailRow}>
                    <Text style={styles.pauseDetailLabel}>Paused Until</Text>
                    <Text style={styles.pauseDetailValue}>{formatDate(subscription.paused_until)}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {!!(subscription.is_paused) && !isPausedByAdmin ? (
              <View style={styles.userPauseBanner}>
                <Ionicons name="pause-circle-outline" size={18} color="#344225" />
                <Text style={styles.userPauseText}>
                  {subscription.paused_until ? `Paused until ${formatDate(subscription.paused_until)}` : "Paused"}
                </Text>
              </View>
            ) : null}

            {/* Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroPlanName}>
                    {subscription.subcrption_plans?.title || "Subscription Plan"}
                  </Text>
                  <Text style={styles.heroDuration}>
                    {subscription.duration?.title || ""}
                  </Text>
                </View>
                <View style={[styles.statusChip, { borderColor: statusColor }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroBottom}>
                <View style={styles.heroDateBlock}>
                  <Text style={styles.heroDateLabel}>Start Date</Text>
                  <Text style={styles.heroDateValue}>{formatDate(subscription.start_date)}</Text>
                </View>
                <View style={styles.heroArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#B8D5C5" />
                </View>
                <View style={styles.heroDateBlock}>
                  <Text style={styles.heroDateLabel}>End Date</Text>
                  <Text style={styles.heroDateValue}>{formatDate(subscription.end_date)}</Text>
                </View>
                <View style={styles.heroPriceBlock}>
                  <Text style={styles.heroPriceLabel}>Total</Text>
                  <Text style={styles.heroPriceValue}>{`${subscription.price} ${(subscription as any).currency || "KWD"}`}</Text>
                </View>
              </View>

              {subscription.total_paused_days ? (
                <View style={styles.pausedDaysBadge}>
                  <Ionicons name="time-outline" size={13} color="#FAD979" />
                  <Text style={styles.pausedDaysText}>
                    {subscription.total_paused_days} day{subscription.total_paused_days !== 1 ? "s" : ""} paused
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.updateMealBtn}
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
                <Text style={styles.updateMealBtnTitle}>Update Meals</Text>
                <Text style={styles.updateMealBtnDesc}>Change your daily meal selections</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6B7F75" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewDetailsBtn}
              onPress={() =>
                router.push({
                  pathname: "/subscription-full-details",
                  params: { subscriptionId: subscription.id },
                })
              }
            >
              <View style={styles.viewDetailsBtnIcon}>
                <Ionicons name="list-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewDetailsBtnTitle}>View Full Details</Text>
                <Text style={styles.viewDetailsBtnDesc}>See schedule, address & history</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B8D5C5" />
            </TouchableOpacity>
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
});
