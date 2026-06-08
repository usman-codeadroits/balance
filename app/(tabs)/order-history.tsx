import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomTabNav from "@/components/bottom-tab-nav";
import { getMySubscriptions, type UserSubscriptionSummary } from "@/api/services/subscriptions";

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatDate = (s?: string): string => {
  if (!s) return "-";
  try {
    const parts = s.split(".");
    if (parts.length === 3) return `${parts[0]} ${MONTH_SHORT[parseInt(parts[1]) - 1] ?? ""} ${parts[2]}`;
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return s; }
};

const formatPrice = (sub: UserSubscriptionSummary): string => {
  const price = sub.price ?? "";
  const currency = (sub as any).currency || "KWD";
  return `${price} ${currency}`;
};

const getStatusColor = (status: string, isPaused: boolean | undefined): string => {
  if (isPaused) return "#FF9800";
  switch (status?.toLowerCase()) {
    case "active": return "#4CAF50";
    case "completed": return "#6B7F75";
    case "cancelled": return "#F44336";
    default: return "#6B7F75";
  }
};

const getStatusLabel = (status: string, isPaused: boolean | undefined): string => {
  if (isPaused) return "Paused";
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function OrderHistoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeSubscriptions, setActiveSubscriptions] = useState<UserSubscriptionSummary[]>([]);
  const [queuedSubscriptions, setQueuedSubscriptions] = useState<UserSubscriptionSummary[]>([]);
  const [recentSubscriptions, setRecentSubscriptions] = useState<UserSubscriptionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSubscriptions();
    }, []),
  );

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMySubscriptions();
      if (response.success) {
        setActiveSubscriptions(response.data.active || []);
        setQueuedSubscriptions(response.data.queued || []);
        setRecentSubscriptions(response.data.recent || []);
      } else {
        setError("Failed to load subscriptions");
      }
    } catch {
      setError("Failed to load subscriptions. Please try again.");
      setActiveSubscriptions([]);
      setQueuedSubscriptions([]);
      setRecentSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasAny = activeSubscriptions.length > 0 || queuedSubscriptions.length > 0 || recentSubscriptions.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <Text style={styles.headerTitle}>{t("history.title")}</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.loadingText}>{t("history.loading")}</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadSubscriptions} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>{t("history.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : !hasAny ? (
          <View style={styles.center}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={40} color="#344225" />
            </View>
            <Text style={styles.emptyTitle}>{t("history.no_subs")}</Text>
            <Text style={styles.emptyDesc}>Your subscription history will appear here</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/auth/subscription")}>
              <Ionicons name="add" size={18} color="#344225" />
              <Text style={styles.emptyBtnText}>Create Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Active subscriptions */}
            {activeSubscriptions.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: "#4CAF50" }]} />
                  <Text style={styles.sectionTitle}>{t("history.active_subs")}</Text>
                  <View style={styles.sectionCountBadge}>
                    <Text style={styles.sectionCountText}>{activeSubscriptions.length}</Text>
                  </View>
                </View>
                {activeSubscriptions.map((sub) => (
                  <SubscriptionCard key={sub.id} sub={sub} isActive />
                ))}
              </View>
            ) : null}

            {/* Starting Soon — queued subscriptions */}
            {queuedSubscriptions.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: "#FAD979" }]} />
                  <Text style={styles.sectionTitle}>Starting Soon</Text>
                  <View style={styles.sectionCountBadge}>
                    <Text style={styles.sectionCountText}>{queuedSubscriptions.length}</Text>
                  </View>
                </View>
                {queuedSubscriptions.map((sub) => (
                  <QueuedSubscriptionCard
                    key={sub.id}
                    sub={sub}
                    activeSubscriptionId={activeSubscriptions[0]?.id}
                  />
                ))}
              </View>
            ) : null}

            {/* Recent / completed subscriptions */}
            {recentSubscriptions.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: "#6B7F75" }]} />
                  <Text style={styles.sectionTitle}>
                    {activeSubscriptions.length > 0 ? t("history.recent_subs") : t("history.title")}
                  </Text>
                  <View style={styles.sectionCountBadge}>
                    <Text style={styles.sectionCountText}>{recentSubscriptions.length}</Text>
                  </View>
                </View>
                {recentSubscriptions.map((sub) => (
                  <SubscriptionCard key={sub.id} sub={sub} isActive={false} />
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

      <BottomTabNav activeTab="history" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

interface CardProps {
  sub: UserSubscriptionSummary;
  isActive: boolean;
}

function SubscriptionCard({ sub, isActive }: CardProps) {
  const statusColor = getStatusColor(sub.status, !!(sub.is_paused));
  const statusLabel = getStatusLabel(sub.status, !!(sub.is_paused));
  const isPaused = !!(sub.is_paused);

  return (
    <View style={[styles.card, isActive && styles.cardActive, isPaused && styles.cardPaused]}>
      {/* Top strip */}
      <View style={[styles.cardStrip, { backgroundColor: isActive ? "#344225" : "#EEF4F0" }]}>
        <Text style={[styles.cardPlanName, { color: isActive ? "#FFFFFF" : "#344225" }]} numberOfLines={1}>
          {sub.subcrption_plans?.title || "Meal Plan"}
        </Text>
        <View style={[styles.statusChip, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <View style={styles.cardCol}>
            <Text style={styles.cardColLabel}>Start Date</Text>
            <Text style={styles.cardColValue}>{formatDate(sub.start_date)}</Text>
          </View>
          <View style={styles.cardColSep} />
          <View style={styles.cardCol}>
            <Text style={styles.cardColLabel}>End Date</Text>
            <Text style={styles.cardColValue}>{formatDate(sub.end_date)}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterLeft}>
            <Ionicons name="calendar-outline" size={13} color="#6B7F75" />
            <Text style={styles.cardDateRange}>
              {`${formatDate(sub.start_date)} – ${formatDate(sub.end_date)}`}
            </Text>
          </View>
          <View style={[styles.priceBadge, { backgroundColor: isActive ? "#FAD979" : "#EEF4F0" }]}>
            <Text style={[styles.priceText, { color: "#344225" }]}>{formatPrice(sub)}</Text>
          </View>
        </View>

        {isPaused ? (
          <View style={styles.pausedBanner}>
            <Ionicons name="pause-circle" size={13} color="#B94A00" />
            <Text style={styles.pausedBannerText}>Subscription paused</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function QueuedSubscriptionCard({ sub, activeSubscriptionId }: { sub: UserSubscriptionSummary; activeSubscriptionId?: number }) {
  return (
    <TouchableOpacity
      style={[styles.card, styles.cardQueued]}
      activeOpacity={activeSubscriptionId ? 0.8 : 1}
      onPress={() => {
        if (activeSubscriptionId) {
          router.push({
            pathname: "/renewal-details",
            params: { subscriptionId: activeSubscriptionId },
          } as any);
        }
      }}
    >
      <View style={[styles.cardStrip, { backgroundColor: "#4A6040" }]}>
        <Text style={[styles.cardPlanName, { color: "#FAD979" }]} numberOfLines={1}>
          {sub.subcrption_plans?.title || "Meal Plan"}
        </Text>
        <View style={[styles.statusChip, { borderColor: "#FAD979" }]}>
          <View style={[styles.statusDot, { backgroundColor: "#FAD979" }]} />
          <Text style={[styles.statusChipText, { color: "#FAD979" }]}>Starting Soon</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <View style={styles.cardCol}>
            <Text style={styles.cardColLabel}>Start Date</Text>
            <Text style={styles.cardColValue}>{formatDate(sub.start_date)}</Text>
          </View>
          <View style={styles.cardColSep} />
          <View style={styles.cardCol}>
            <Text style={styles.cardColLabel}>End Date</Text>
            <Text style={styles.cardColValue}>{formatDate(sub.end_date)}</Text>
          </View>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardFooter}>
          <View style={styles.cardFooterLeft}>
            <Ionicons name="calendar-outline" size={13} color="#6B7F75" />
            <Text style={styles.cardDateRange}>
              {`${formatDate(sub.start_date)} – ${formatDate(sub.end_date)}`}
            </Text>
          </View>
          <View style={[styles.priceBadge, { backgroundColor: "#FAD979" }]}>
            <Text style={[styles.priceText, { color: "#344225" }]}>{formatPrice(sub)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  header: {
    paddingHorizontal: "5%",
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#344225", textAlign: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  loadingText: { fontSize: 14, color: "#6B7F75", marginTop: 12 },
  errorText: { fontSize: 14, color: "#D64545", textAlign: "center", marginTop: 12, marginBottom: 20 },
  retryBtn: { backgroundColor: "#344225", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#B8D5C5", alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#344225", marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: "#6B7F75", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FAD979", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: "#344225" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#344225", flex: 1 },
  sectionCountBadge: {
    backgroundColor: "#344225", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionCountText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardActive: {},
  cardPaused: { borderWidth: 1.5, borderColor: "#FF9800" },
  cardQueued: { borderWidth: 1.5, borderColor: "#FAD979" },

  cardStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardPlanName: { fontSize: 14, fontWeight: "700", flex: 1, marginRight: 10 },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: "600" },

  cardBody: { paddingHorizontal: 16, paddingVertical: 12 },
  cardRow: { flexDirection: "row", alignItems: "center" },
  cardCol: { flex: 1, alignItems: "center" },
  cardColSep: { width: 1, height: 28, backgroundColor: "#EEF4F0" },
  cardColLabel: { fontSize: 10, color: "#6B7F75", marginBottom: 3 },
  cardColValue: { fontSize: 12, fontWeight: "600", color: "#344225", textAlign: "center" },
  cardDivider: { height: 1, backgroundColor: "#EEF4F0", marginVertical: 10 },

  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardFooterLeft: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  cardDateRange: { fontSize: 11, color: "#6B7F75", flex: 1 },
  priceBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8 },
  priceText: { fontSize: 14, fontWeight: "800" },

  pausedBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 10, backgroundColor: "#FFF0E6",
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  pausedBannerText: { fontSize: 12, color: "#B94A00", fontWeight: "600" },
});
