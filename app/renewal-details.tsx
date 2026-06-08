import { cancelRenewal, getMySubscriptions, getSubscriptionRenewal, type RenewalDetail, type UserSubscriptionSummary } from "@/api";
import { getSubscriptionPlans } from "@/api/services/subscriptionPlans";
import { updateRenewalPlan } from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatDate = (s?: string | null): string => {
  if (!s) return "-";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return s; }
};

const formatDays = (days: string): string =>
  days
    .split(",")
    .map((d) => d.trim().charAt(0).toUpperCase() + d.trim().slice(1))
    .join(" / ");

export default function RenewalDetailsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const subscriptionId = params.subscriptionId ? Number(params.subscriptionId) : null;

  const [activeSubscription, setActiveSubscription] = useState<UserSubscriptionSummary | null>(null);
  const [renewal, setRenewal] = useState<RenewalDetail | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [subscriptionId]),
  );

  const loadData = async () => {
    if (!subscriptionId) {
      setError("No subscription ID provided");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const [subsResponse, renewalResponse] = await Promise.all([
        getMySubscriptions(),
        getSubscriptionRenewal(subscriptionId),
      ]);

      if (subsResponse.success) {
        const active = subsResponse.data.active.find((s) => s.id === subscriptionId) ?? subsResponse.data.active[0] ?? null;
        setActiveSubscription(active);
      }

      if (renewalResponse.data) {
        setAutoRenew(renewalResponse.data.auto_renew);
        setRenewal(renewalResponse.data.renewal);
      }
    } catch {
      setError("Failed to load renewal details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!subscriptionId || !renewal) return;
    try {
      setActionLoading(true);
      const plans = await getSubscriptionPlans();
      setActionLoading(false);

      Alert.alert(
        "Change Renewal Plan",
        "Select a new plan for your renewal:",
        [
          ...plans.map((plan: any) => ({
            text: `${plan.title} — ${plan.price} KWD`,
            onPress: async () => {
              try {
                setActionLoading(true);
                await updateRenewalPlan(subscriptionId, plan.id);
                Alert.alert("Updated", `Renewal plan updated to ${plan.title}.`);
                loadData();
              } catch (err) {
                Alert.alert("Error", "Failed to update renewal plan. Please try again.");
              } finally {
                setActionLoading(false);
              }
            },
          })),
          { text: "Cancel", style: "cancel" },
        ],
      );
    } catch {
      setActionLoading(false);
      Alert.alert("Error", "Failed to load plans. Please try again.");
    }
  };

  const handleCancelRenewal = () => {
    if (!subscriptionId) return;
    const endDate = activeSubscription?.end_date ? formatDate(activeSubscription.end_date) : "";
    Alert.alert(
      "Cancel Renewal",
      `Your plan will end on ${endDate} and won't renew. Continue?`,
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Cancel Renewal",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              const res = await cancelRenewal(subscriptionId);
              Alert.alert("Renewal Cancelled", res.message || "Auto-renewal cancelled. Your plan will not renew after it ends.", [
                { text: "OK", onPress: () => router.replace("/main-screen") },
              ]);
            } catch {
              Alert.alert("Error", "Failed to cancel renewal. Please try again.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Renewal Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.loadingText}>Loading renewal details...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Plan Block */}
            {activeSubscription && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Current Plan</Text>
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoRowLabel}>Plan</Text>
                    <Text style={styles.infoRowValue}>{activeSubscription.subcrption_plans?.title || "-"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoRowLabel}>Ends On</Text>
                    <Text style={styles.infoRowValue}>{formatDate(activeSubscription.end_date)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Renewal Block */}
            {renewal ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Renewing To</Text>
                <View style={[styles.infoCard, styles.renewalCard]}>
                  <View style={styles.renewalCardHeader}>
                    <Ionicons name="refresh-circle" size={22} color="#FAD979" />
                    <Text style={styles.renewalCardTitle}>{renewal.plan?.title || "-"}</Text>
                    <View style={[
                      styles.paymentBadge,
                      renewal.payment === "paid" ? styles.paymentBadgePaid : styles.paymentBadgePending,
                    ]}>
                      <Text style={styles.paymentBadgeText}>
                        {renewal.payment === "paid" ? "Confirmed" : "Pending"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.renewalCardBody}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoRowLabelLight}>Start Date</Text>
                      <Text style={styles.infoRowValueLight}>{formatDate(renewal.start_date)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoRowLabelLight}>End Date</Text>
                      <Text style={styles.infoRowValueLight}>{formatDate(renewal.end_date)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoRowLabelLight}>Days</Text>
                      <Text style={styles.infoRowValueLight}>{formatDays(renewal.selected_days)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoRowLabelLight}>Price</Text>
                      <Text style={styles.renewalPrice}>{renewal.currency} {Number(renewal.price).toFixed(3)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <View style={styles.noRenewalCard}>
                  <Ionicons name="information-circle-outline" size={24} color="#6B7F75" />
                  <Text style={styles.noRenewalText}>No renewal is currently queued.</Text>
                </View>
              </View>
            )}

            {/* Action Buttons — only when a pending renewal exists */}
            {renewal && renewal.payment === "paid" && (
              <View style={styles.confirmedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.confirmedBannerText}>
                  Renewal is confirmed. Payment has been collected.
                </Text>
              </View>
            )}

            {renewal && renewal.payment !== "paid" && (
              <View style={styles.actionsSection}>
                <TouchableOpacity
                  style={[styles.changePlanBtn, actionLoading && styles.btnDisabled]}
                  onPress={handleChangePlan}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#344225" />
                  ) : (
                    <>
                      <Ionicons name="swap-horizontal-outline" size={20} color="#344225" />
                      <Text style={styles.changePlanBtnText}>Change Plan</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelRenewalBtn, actionLoading && styles.btnDisabled]}
                  onPress={handleCancelRenewal}
                  disabled={actionLoading}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#D64545" />
                  <Text style={styles.cancelRenewalBtnText}>Cancel Renewal</Text>
                </TouchableOpacity>
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
  errorText: { fontSize: 14, color: "#D64545", textAlign: "center", marginTop: 12, marginBottom: 20 },
  retryBtn: { backgroundColor: "#344225", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7F75",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF4F0",
  },
  infoRowLabel: { fontSize: 14, color: "#6B7F75" },
  infoRowValue: { fontSize: 14, fontWeight: "600", color: "#344225" },

  renewalCard: {
    backgroundColor: "#344225",
    padding: 0,
    overflow: "hidden",
  },
  renewalCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2A3620",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  renewalCardTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF", flex: 1 },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  paymentBadgePaid: { backgroundColor: "#4CAF50" },
  paymentBadgePending: { backgroundColor: "#FF9800" },
  paymentBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  renewalCardBody: { paddingHorizontal: 16, paddingVertical: 8 },
  infoRowLabelLight: { fontSize: 13, color: "#8FA880" },
  infoRowValueLight: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  renewalPrice: { fontSize: 18, fontWeight: "700", color: "#FAD979" },

  noRenewalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  noRenewalText: { fontSize: 14, color: "#6B7F75", flex: 1 },

  actionsSection: { gap: 12, marginBottom: 16 },
  changePlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FAD979",
    borderRadius: 14,
    paddingVertical: 16,
  },
  changePlanBtnText: { fontSize: 15, fontWeight: "700", color: "#344225" },
  cancelRenewalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#D64545",
  },
  cancelRenewalBtnText: { fontSize: 15, fontWeight: "700", color: "#D64545" },
  btnDisabled: { opacity: 0.5 },

  confirmedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  confirmedBannerText: { fontSize: 13, color: "#344225", fontWeight: "500", flex: 1 },
});
