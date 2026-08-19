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

import BottomTabNav from "@/components/bottom-tab-nav";
import { getMySubscriptions, type UserSubscriptionSummary } from "@/api/services/subscriptions";

const FULL_MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const formatDisplayDate = (s?: string): string => {
  if (!s) return "-";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const day = d.getDate();
    const month = FULL_MONTHS[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const mins = d.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;
    const minStr = mins > 0 ? `:${String(mins).padStart(2, "0")}` : "";
    return `${day} ${month} ${year}, ${hours}${minStr}${ampm}`;
  } catch { return s; }
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

  const hasAny =
    activeSubscriptions.length > 0 ||
    queuedSubscriptions.length > 0 ||
    recentSubscriptions.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
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
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/auth/subscription")}
            >
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
            {activeSubscriptions.map((sub) => (
              <SubCard key={sub.id} sub={sub} />
            ))}
            {queuedSubscriptions.map((sub) => (
              <SubCard key={sub.id} sub={sub} />
            ))}
            {recentSubscriptions.map((sub) => (
              <SubCard key={sub.id} sub={sub} />
            ))}
          </ScrollView>
        )}
      </View>

      <BottomTabNav activeTab="history" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

function SubCard({ sub }: { sub: UserSubscriptionSummary }) {
  const s = sub as any;

  const mealCount: number = s.subcrption_plans?.meal_count ?? s.meal_count ?? 0;
  const snackCount: number = s.subcrption_plans?.snack_count ?? s.snack_count ?? 0;

  // Day count — prefer selected_days array length, fall back to plan min_days
  const selectedDays: unknown[] = Array.isArray(s.selected_days) ? s.selected_days : [];
  const dayCount: number =
    selectedDays.length > 0
      ? selectedDays.length
      : s.subcrption_plans?.min_days ?? s.min_days ?? 0;

  // Duration label
  const weeksLabel: string =
    sub.duration?.title ||
    (s.no_of_weeks ? `${s.no_of_weeks} Week${s.no_of_weeks > 1 ? "s" : ""}` : "");

  // Price — format as "46.000KWD"
  const rawPrice = parseFloat(String(sub.price ?? "0"));
  const priceStr = `${isNaN(rawPrice) ? sub.price : rawPrice.toFixed(3)}KWD`;

  // Status label
  const isPaused = !!s.is_paused;
  const statusRaw = isPaused ? "Paused" : (sub.status || "");
  const statusLabel = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

  // Info line: "2 meals • 6 days • 1 Weeks"
  const infoParts: string[] = [];
  if (mealCount > 0) infoParts.push(`${mealCount} meal${mealCount !== 1 ? "s" : ""}`);
  if (snackCount > 0) infoParts.push(`${snackCount} snack${snackCount !== 1 ? "s" : ""}`);
  if (dayCount > 0) infoParts.push(`${dayCount} days`);
  if (weeksLabel) infoParts.push(weeksLabel);
  const infoLine = infoParts.join(" • ");

  const dateStr = formatDisplayDate(s.created_at || sub.start_date);

  return (
    <View style={styles.card}>
      {/* Info + price row */}
      <View style={styles.cardRow}>
        <Text style={styles.cardInfo} numberOfLines={1}>{infoLine}</Text>
        <Text style={styles.cardPrice}>{priceStr}</Text>
      </View>
      {/* Status */}
      <Text style={styles.cardStatus}>{statusLabel}</Text>
      {/* Date */}
      <Text style={styles.cardDate}>{dateStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  header: { paddingHorizontal: "5%", paddingBottom: 20 },
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

  card: {
    backgroundColor: "#FAD979",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardInfo: { fontSize: 14, fontWeight: "600", color: "#344225", flex: 1, marginRight: 8 },
  cardPrice: { fontSize: 14, fontWeight: "700", color: "#344225" },
  cardStatus: { fontSize: 14, fontWeight: "600", color: "#344225", marginBottom: 2 },
  cardDate: { fontSize: 12, color: "#5A6B5A" },
});
