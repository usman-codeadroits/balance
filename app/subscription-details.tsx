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

export default function SubscriptionDetailsScreen() {
  const [subscription, setSubscription] = useState<UserSubscriptionSummary | null>(null);
  const [pauseLogs, setPauseLogs] = useState<PauseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (response.success && response.data.active && response.data.active.length > 0) {
        const active = response.data.active[0];
        setSubscription(active);
        if (active.is_paused) {
          fetchPauseLogs(active.id);
        }
      } else {
        setError("No active subscription found");
        setSubscription(null);
      }
    } catch {
      setError("Failed to load subscription details. Please try again.");
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPauseLogs = async (subscriptionId: number) => {
    try {
      const response = await getSubscriptionPauseLogs(subscriptionId);
      if (response.success) {
        setPauseLogs(response.pause_logs);
      }
    } catch {
      // non-critical — pause log fetch failure doesn't break the screen
    }
  };

  // Returns the latest active pause log (action=pause, not yet resumed)
  const getActivePauseLog = (): PauseLog | null => {
    const pauseEntries = pauseLogs.filter((l) => l.action === "pause" && !l.resumed_at);
    if (pauseEntries.length === 0) return null;
    return pauseEntries.sort(
      (a, b) => new Date(b.action_timestamp).getTime() - new Date(a.action_timestamp).getTime(),
    )[0];
  };

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return "-";
    try {
      const parts = dateString.split(".");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${day} ${getMonthName(parseInt(month))} ${year}`;
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return `${date.getDate()} ${getMonthName(date.getMonth() + 1)} ${date.getFullYear()}`;
    } catch {
      return dateString || "-";
    }
  };

  const getMonthName = (month: number): string => {
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return names[month - 1] || "";
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "active": return "#4CAF50";
      case "completed": return "#FF9800";
      case "cancelled": return "#F44336";
      default: return "#999999";
    }
  };

  const activePauseLog = getActivePauseLog();
  const isPausedByAdmin = subscription?.is_paused && activePauseLog?.performed_by_type === "admin";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#344225" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.loadingText}>Loading subscription...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
            <Text style={styles.errorTitle}>No Active Subscription</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push("/auth/subscription")}>
              <Text style={styles.addButtonText}>Add New Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : subscription ? (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Admin Pause Banner */}
            {isPausedByAdmin && (
              <View style={styles.adminPauseBanner}>
                <View style={styles.adminPauseBannerHeader}>
                  <Ionicons name="pause-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.adminPauseBannerTitle}>Paused by Admin</Text>
                </View>
                <Text style={styles.adminPauseBannerText}>
                  Your subscription has been paused by an administrator.
                </Text>
                {activePauseLog?.reason ? (
                  <View style={styles.adminPauseDetail}>
                    <Text style={styles.adminPauseDetailLabel}>Reason</Text>
                    <Text style={styles.adminPauseDetailValue}>{activePauseLog.reason}</Text>
                  </View>
                ) : null}
                {subscription.paused_until ? (
                  <View style={styles.adminPauseDetail}>
                    <Text style={styles.adminPauseDetailLabel}>Paused Until</Text>
                    <Text style={styles.adminPauseDetailValue}>{formatDate(subscription.paused_until)}</Text>
                  </View>
                ) : null}
                {activePauseLog?.notes ? (
                  <View style={styles.adminPauseDetail}>
                    <Text style={styles.adminPauseDetailLabel}>Notes</Text>
                    <Text style={styles.adminPauseDetailValue}>{activePauseLog.notes}</Text>
                  </View>
                ) : null}
                {activePauseLog?.paused_days ? (
                  <View style={styles.adminPauseDetail}>
                    <Text style={styles.adminPauseDetailLabel}>Paused Days</Text>
                    <Text style={styles.adminPauseDetailValue}>{activePauseLog.paused_days} days</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* User-paused banner (not admin) */}
            {subscription.is_paused && !isPausedByAdmin && (
              <View style={styles.userPauseBanner}>
                <Ionicons name="pause-circle-outline" size={20} color="#344225" />
                <Text style={styles.userPauseBannerText}>
                  Subscription is currently paused
                  {subscription.paused_until ? ` until ${formatDate(subscription.paused_until)}` : ""}
                </Text>
              </View>
            )}

            {/* Status Badge */}
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: subscription.is_paused ? "#FF9800" : getStatusColor(subscription.status) }]} />
              <Text style={[styles.statusText, { color: subscription.is_paused ? "#FF9800" : getStatusColor(subscription.status) }]}>
                {subscription.is_paused
                  ? isPausedByAdmin ? "Paused by Admin" : "Paused"
                  : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </Text>
            </View>

            {/* Plan Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Plan Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Plan Name</Text>
                <Text style={styles.infoValue}>{subscription.subcrption_plans?.title || "-"}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{subscription.duration?.title || "-"}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Price</Text>
                <Text style={styles.infoPrice}>{subscription.price}</Text>
              </View>
            </View>

            {/* Date Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Subscription Period</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start Date</Text>
                <Text style={styles.infoValue}>{formatDate(subscription.start_date)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End Date</Text>
                <Text style={styles.infoValue}>{formatDate(subscription.end_date)}</Text>
              </View>
              {subscription.total_paused_days ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Total Paused Days</Text>
                    <Text style={styles.infoValue}>{subscription.total_paused_days} days</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() =>
                  router.push({
                    pathname: "/subscription-full-details",
                    params: { subscriptionId: subscription.id },
                  })
                }
              >
                <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.viewDetailsButtonText}>View Full Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.updateMealsButton}
                onPress={() =>
                  router.push({
                    pathname: "/update-subscription-meals",
                    params: { subscriptionId: subscription.id },
                  })
                }
              >
                <Ionicons name="create-outline" size={20} color="#344225" />
                <Text style={styles.updateMealsButtonText}>Update Meal</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#B0C4B1" />
            <Text style={styles.emptyTitle}>No Active Subscription</Text>
            <Text style={styles.emptyText}>Start your meal journey by creating a new subscription</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push("/auth/subscription")}>
              <Text style={styles.addButtonText}>Create Subscription</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <BottomTabNav activeTab="home" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#D4E8E0",
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#344225", textAlign: "center", flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 140 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  loadingText: { fontSize: 16, fontWeight: "500", color: "#6B7F75", marginTop: 12 },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 60 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: "#D64545", marginTop: 16 },
  errorText: { fontSize: 14, fontWeight: "400", color: "#6B7F75", textAlign: "center", marginTop: 8 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#344225", marginTop: 16 },
  emptyText: { fontSize: 14, fontWeight: "400", color: "#6B7F75", textAlign: "center", marginTop: 8 },

  // Admin pause banner
  adminPauseBanner: {
    backgroundColor: "#B94A00",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  adminPauseBannerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  adminPauseBannerTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  adminPauseBannerText: { fontSize: 13, color: "#FFD4B0", marginBottom: 10, lineHeight: 18 },
  adminPauseDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  adminPauseDetailLabel: { fontSize: 12, color: "#FFD4B0", fontWeight: "500" },
  adminPauseDetailValue: { fontSize: 12, color: "#FFFFFF", fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 8 },

  // User pause banner
  userPauseBanner: {
    backgroundColor: "#FFF3CD",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#FAD979",
  },
  userPauseBannerText: { fontSize: 13, color: "#344225", fontWeight: "500", flex: 1 },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginVertical: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: "600" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#344225", marginBottom: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  infoLabel: { fontSize: 14, fontWeight: "500", color: "#6B7F75" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#344225" },
  infoPrice: { fontSize: 16, fontWeight: "700", color: "#2E7D32" },
  divider: { height: 1, backgroundColor: "#E6EFE9", marginVertical: 12 },
  actionsContainer: { gap: 12, marginBottom: 20 },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#344225",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewDetailsButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  updateMealsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6EFE9",
    gap: 8,
  },
  updateMealsButtonText: { fontSize: 16, fontWeight: "600", color: "#344225" },
  addButton: {
    backgroundColor: "#344225",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  addButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF", textAlign: "center" },
});
