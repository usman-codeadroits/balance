import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomTabNav from "@/components/bottom-tab-nav";
import {
  getMySubscriptions,
  getSubscriptionHistory,
  type SubscriptionHistoryItem,
  type UserSubscriptionSummary,
} from "@/api/services/subscriptions";

const HISTORY_PAGE_SIZE = 10;

type CardKind = "active" | "paused" | "queued" | "ended";

// Parse "YYYY-MM-DD..." as a local date to avoid UTC day shifts
const parseLocalDate = (value?: string | null): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

const toDayList = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map((d) => String(d).trim().toLowerCase()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  return [];
};

const toNumber = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? null : n;
};

export default function OrderHistoryScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const insets = useSafeAreaInsets();

  const [currentSubs, setCurrentSubs] = useState<{ sub: UserSubscriptionSummary; kind: CardKind }[]>([]);
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, []),
  );

  const loadAll = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const [mine, hist] = await Promise.all([
        getMySubscriptions(),
        getSubscriptionHistory(1, HISTORY_PAGE_SIZE),
      ]);

      if (mine.success) {
        setCurrentSubs([
          ...(mine.data.active || []).map((sub) => ({ sub, kind: (sub.is_paused ? "paused" : "active") as CardKind })),
          ...(mine.data.queued || []).map((sub) => ({ sub, kind: "queued" as CardKind })),
        ]);
      }
      if (hist.success) {
        setHistory(hist.data || []);
        setHistoryTotal(hist.meta?.total ?? (hist.data || []).length);
        setPage(hist.meta?.current_page ?? 1);
        setLastPage(hist.meta?.last_page ?? 1);
      }
      if (!mine.success && !hist.success) setError(t("history.error"));
    } catch {
      setError(t("history.error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (loadingMoreRef.current || page >= lastPage) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await getSubscriptionHistory(page + 1, HISTORY_PAGE_SIZE);
      if (res.success) {
        setHistory((prev) => {
          const seen = new Set(prev.map((s) => s.id));
          return [...prev, ...(res.data || []).filter((s) => !seen.has(s.id))];
        });
        setPage(res.meta?.current_page ?? page + 1);
        setLastPage(res.meta?.last_page ?? lastPage);
      }
    } catch {
      // keep what we have; the next scroll to the bottom retries
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const openDetails = (id: number) => {
    router.push({ pathname: "/subscription-full-details", params: { subscriptionId: id } } as any);
  };

  const hasAny = currentSubs.length > 0 || history.length > 0;

  const renderSectionTitle = (title: string, count?: number) => (
    <View style={[styles.sectionHeader, isArabic && styles.rtlRow]}>
      <Text style={[styles.sectionTitle, isArabic && styles.rtlText]}>{title}</Text>
      {count != null && count > 0 ? (
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );

  const listHeader = (
    <>
      {currentSubs.length > 0 && (
        <>
          {renderSectionTitle(t("history.current_plans"), currentSubs.length)}
          {currentSubs.map(({ sub, kind }) => (
            <PlanCard key={`cur-${sub.id}`} sub={sub as any} kind={kind} onPress={() => openDetails(sub.id)} />
          ))}
        </>
      )}
      {renderSectionTitle(t("history.plan_history"), historyTotal)}
      {history.length === 0 && (
        <View style={styles.historyEmpty}>
          <Ionicons name="time-outline" size={22} color="#6B7F75" />
          <Text style={[styles.historyEmptyText, isArabic && styles.rtlText]}>{t("history.no_history")}</Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <Text style={styles.headerTitle}>{t("history.title")}</Text>
          <Text style={styles.headerSubtitle}>{t("history.subtitle")}</Text>
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
            <TouchableOpacity onPress={() => loadAll()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>{t("history.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : !hasAny ? (
          <View style={styles.center}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={40} color="#344225" />
            </View>
            <Text style={styles.emptyTitle}>{t("history.no_subs")}</Text>
            <Text style={styles.emptyDesc}>{t("history.empty_desc")}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/auth/subscription")}>
              <Ionicons name="add" size={18} color="#344225" />
              <Text style={styles.emptyBtnText}>{t("history.create_subscription")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => `hist-${item.id}`}
            renderItem={({ item }) => (
              <PlanCard sub={item} kind="ended" onPress={() => openDetails(item.id)} />
            )}
            ListHeaderComponent={listHeader}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={{ marginVertical: 16 }} color="#344225" />
              ) : history.length > 0 && page >= lastPage ? (
                <Text style={styles.endOfList}>{t("history.end_of_list")}</Text>
              ) : null
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#344225" colors={["#344225"]} />
            }
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <BottomTabNav activeTab="history" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

function PlanCard({ sub, kind, onPress }: { sub: any; kind: CardKind; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const locale = isArabic ? "ar" : "en-GB";

  const plan = sub.subcrption_plans || {};
  const planTitle: string =
    (isArabic && plan.title_ar) ? plan.title_ar : (plan.title || t("history.plan_fallback"));

  const fmtDate = (s?: string | null) => {
    const d = parseLocalDate(s);
    return d ? d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "-";
  };

  // Plan composition
  const mealCount: number = plan.meal_count ?? sub.meal_count ?? 0;
  const snackCount: number = plan.snack_count ?? sub.snack_count ?? 0;
  const weeks: number = plan.no_of_weeks ?? sub.no_of_weeks ?? 0;
  const days = toDayList(sub.selected_days);

  // Money
  const currency: string = sub.currency || "KWD";
  const price = toNumber(sub.price);
  const discount = toNumber(sub.discount_amount);

  // Payment
  const gateway = String(sub.payment_gateway || "").toLowerCase();
  const paymentMethod = gateway.includes("knet")
    ? t("history.method_knet")
    : gateway.includes("card") || gateway.includes("credit")
      ? t("history.method_card")
      : gateway.includes("cash")
        ? t("history.method_cash")
        : sub.payment_gateway || null;
  const isPaid = String(sub.payment || "").toLowerCase() === "paid";

  // Area
  const areaName: string | null =
    (isArabic && sub.area?.name_ar) ? sub.area.name_ar : (sub.area?.name || sub.address?.area || null);

  const statusMeta: Record<CardKind, { label: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    active: { label: t("history.status_active"), bg: "#DFF3E4", fg: "#2E7D32", icon: "checkmark-circle" },
    paused: { label: t("history.status_paused"), bg: "#FFFFFF", fg: "#8A5A00", icon: "pause-circle" },
    queued: { label: t("history.status_upcoming"), bg: "#E3EEF9", fg: "#2F5D8A", icon: "time" },
    ended: { label: t("history.status_ended"), bg: "#ECEFED", fg: "#5A6B5A", icon: "flag" },
  };
  const status = statusMeta[kind];

  const chips: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [];
  if (mealCount > 0) chips.push({ icon: "restaurant-outline", text: t("history.meals_count", { count: mealCount }) });
  if (snackCount > 0) chips.push({ icon: "cafe-outline", text: t("history.snacks_count", { count: snackCount }) });
  if (days.length > 0) chips.push({ icon: "calendar-outline", text: t("history.days_per_week", { count: days.length }) });
  if (weeks > 0) chips.push({ icon: "hourglass-outline", text: t("history.weeks_count", { count: weeks }) });

  if (sub.is_personalized) chips.push({ icon: "sparkles-outline", text: t("history.personalized") });

  // Area · payment method · coupon on one line
  const metaParts = [
    areaName,
    paymentMethod,
    sub.coupon_code ? t("history.coupon", { code: sub.coupon_code }) + (discount ? ` (−${discount.toFixed(3)})` : "") : null,
  ].filter(Boolean);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Green header: title + status */}
      <View style={[styles.cardHeader, isArabic && styles.rtlRow]}>
        <Text style={[styles.cardTitle, isArabic && styles.rtlText]} numberOfLines={1}>{planTitle}</Text>
        <View style={[styles.statusChip, { backgroundColor: status.bg }, isArabic && styles.rtlRow]}>
          <Ionicons name={status.icon} size={11} color={status.fg} />
          <Text style={[styles.statusChipText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>

      {/* Dates · order no. */}
      <View style={[styles.metaRow, isArabic && styles.rtlRow]}>
        <Ionicons name="calendar-outline" size={13} color="#5A6B5A" />
        <Text style={[styles.metaText, isArabic && styles.rtlText]} numberOfLines={1}>
          {fmtDate(sub.start_date)} {isArabic ? "←" : "→"} {fmtDate(sub.end_date)}
          {"  ·  "}
          {t("history.order_no", { id: sub.id })}
        </Text>
      </View>

      {/* Plan composition */}
      {chips.length > 0 && (
        <View style={[styles.chipRow, isArabic && styles.rtlRow]}>
          {chips.map((c) => (
            <View key={c.text} style={[styles.infoChip, isArabic && styles.rtlRow]}>
              <Ionicons name={c.icon} size={11} color="#344225" />
              <Text style={styles.infoChipText}>{c.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Area · payment */}
      {metaParts.length > 0 && (
        <View style={[styles.metaRow, isArabic && styles.rtlRow]}>
          <Ionicons name="location-outline" size={13} color="#5A6B5A" />
          <Text style={[styles.metaText, { flex: 1 }, isArabic && styles.rtlText]} numberOfLines={1}>
            {metaParts.join("  ·  ")}
          </Text>
          {sub.payment ? (
            <View style={[styles.payBadge, isPaid ? styles.payBadgePaid : styles.payBadgePending]}>
              <Text style={[styles.payBadgeText, { color: isPaid ? "#2E7D32" : "#8A5A00" }]}>
                {isPaid ? t("history.paid") : t("history.payment_pending")}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Total + details */}
      <View style={[styles.cardFooter, isArabic && styles.rtlRow]}>
        <Text style={styles.totalValue}>
          {price != null ? `${price.toFixed(3)} ${currency}` : "-"}
        </Text>
        <View style={[styles.detailsLink, isArabic && styles.rtlRow]}>
          <Text style={styles.detailsLinkText}>{t("history.view_details")}</Text>
          <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={14} color="#FAD979" />
        </View>
      </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  rtlRow: { flexDirection: "row-reverse" },
  rtlText: { textAlign: "right" },
  header: { paddingHorizontal: "5%", paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#344225", textAlign: "center" },
  headerSubtitle: { fontSize: 13, color: "#6B7F75", textAlign: "center", marginTop: 4 },

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

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: 8, marginTop: 8, marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#344225" },
  sectionCount: {
    minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: "#344225", alignItems: "center", justifyContent: "center",
  },
  sectionCountText: { fontSize: 11, fontWeight: "700", color: "#FAD979" },

  historyEmpty: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, marginBottom: 12,
  },
  historyEmptyText: { flex: 1, fontSize: 13, color: "#6B7F75" },
  endOfList: { textAlign: "center", fontSize: 12, color: "#6B7F75", marginVertical: 16 },

  // Card (compact, yellow like the rest of the app)
  card: {
    backgroundColor: "#FAD979",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#344225",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cardBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, gap: 7 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  statusChipText: { fontSize: 10, fontWeight: "700" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  infoChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  infoChipText: { fontSize: 11, fontWeight: "600", color: "#344225" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, color: "#4A5A40", flexShrink: 1 },
  payBadge: { borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 },
  payBadgePaid: { backgroundColor: "#DFF3E4" },
  payBadgePending: { backgroundColor: "#FFFFFF" },
  payBadgeText: { fontSize: 10, fontWeight: "700" },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(52,66,37,0.15)",
  },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#344225" },
  detailsLink: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: "#344225", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  detailsLinkText: { fontSize: 12, fontWeight: "700", color: "#FAD979" },
});
