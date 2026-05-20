import { getMySubscriptions } from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface SubscriptionRange {
  startDate: string;
  endDate: string;
  planTitle?: string;
  currency?: string;
  price?: string;
}

interface CalendarCell {
  key: string;
  day: number | null;
  isInRange: boolean;
  isStart: boolean;
  isEnd: boolean;
  isToday: boolean;
}

interface MonthGrid {
  id: string;
  monthName: string;
  year: number;
  cells: CalendarCell[];
}

const parseDateSafe = (value?: string): Date | null => {
  if (!value) return null;
  // Handle "DD.MM.YYYY"
  const parts = value.split(".");
  if (parts.length === 3) {
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const buildMonthGrid = (year: number, month: number, rangeStart: Date, rangeEnd: Date): MonthGrid => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ key: `ph-${year}-${month}-${i}`, day: null, isInRange: false, isStart: false, isEnd: false, isToday: false });
  }
  for (let d = 1; d <= totalDays; d++) {
    const cur = new Date(year, month, d);
    const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
    cells.push({
      key: `d-${year}-${month}-${d}`,
      day: d,
      isInRange: cur >= rangeStart && cur <= rangeEnd,
      isStart: isSameDay(cur, rangeStart),
      isEnd: isSameDay(cur, rangeEnd),
      isToday: isSameDay(cur, today),
    });
  }
  return { id: `${year}-${month}`, monthName: MONTH_NAMES[month], year, cells };
};

const generateMonthsBetween = (start: Date, end: Date): MonthGrid[] => {
  const months: MonthGrid[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    months.push(buildMonthGrid(cursor.getFullYear(), cursor.getMonth(), start, end));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

const formatDisplayDate = (d: Date) =>
  `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;

const getDaysRemaining = (end: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = end.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const getTotalDays = (start: Date, end: Date): number => {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export default function CalendarScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<SubscriptionRange | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMySubscriptions();
      if (response.success && response.data.active?.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const valid = response.data.active
          .map((sub) => ({ sub, start: parseDateSafe(sub.start_date), end: parseDateSafe(sub.end_date) }))
          .filter(({ sub, start, end }) => sub.status === "active" && start && end && end >= today)
          .sort((a, b) => a.end!.getTime() - b.end!.getTime());

        if (valid.length > 0) {
          const { sub, start, end } = valid[0];
          setRange({
            startDate: start!.toISOString(),
            endDate: end!.toISOString(),
            planTitle: sub.subcrption_plans?.title,
            currency: (sub as any).currency || "KWD",
            price: sub.price,
          });
        } else {
          setRange(null);
        }
      } else {
        setRange(null);
      }
    } catch {
      setRange(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);
  useFocusEffect(useCallback(() => { loadSubscription(); }, [loadSubscription]));

  const startDate = useMemo(() => range ? new Date(range.startDate) : null, [range]);
  const endDate = useMemo(() => range ? new Date(range.endDate) : null, [range]);
  const monthGrids = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return [];
    return generateMonthsBetween(startDate, endDate);
  }, [startDate, endDate]);

  const daysRemaining = endDate ? getDaysRemaining(endDate) : 0;
  const totalDays = (startDate && endDate) ? getTotalDays(startDate, endDate) : 0;
  const progressPercent = totalDays > 0 ? Math.min(100, Math.round(((totalDays - daysRemaining) / totalDays) * 100)) : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>{t("calendar.header")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#344225" />
          <Text style={styles.loaderText}>{t("calendar.loading")}</Text>
        </View>
      ) : !startDate || !endDate ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={40} color="#344225" />
          </View>
          <Text style={styles.emptyTitle}>{t("calendar.no_sub")}</Text>
          <Text style={styles.emptyDesc}>{t("calendar.no_sub_desc")}</Text>
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
          {/* Summary hero card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Subscription Period</Text>
                <Text style={styles.heroPlan}>{range?.planTitle || "Meal Plan"}</Text>
              </View>
              <View style={styles.daysRemainingBadge}>
                <Text style={styles.daysRemainingNum}>{daysRemaining}</Text>
                <Text style={styles.daysRemainingLabel}>days left</Text>
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroDateRow}>
              <View style={styles.heroDateBlock}>
                <Text style={styles.heroDateLabel}>Start</Text>
                <Text style={styles.heroDateValue}>{formatDisplayDate(startDate)}</Text>
              </View>
              <View style={styles.heroArrow}>
                <Ionicons name="arrow-forward" size={16} color="#B8D5C5" />
              </View>
              <View style={[styles.heroDateBlock, { alignItems: "flex-end" }]}>
                <Text style={styles.heroDateLabel}>End</Text>
                <Text style={styles.heroDateValue}>{formatDisplayDate(endDate)}</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{`${progressPercent}% completed`}</Text>
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#344225" }]} />
              <Text style={styles.legendText}>Start / End</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#FAD979" }]} />
              <Text style={styles.legendText}>Active days</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDotOutline]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
          </View>

          {/* Month grids */}
          {monthGrids.map((month) => (
            <View key={month.id} style={styles.monthCard}>
              <View style={styles.monthTitleRow}>
                <Text style={styles.monthTitle}>{month.monthName}</Text>
                <Text style={styles.monthYear}>{month.year}</Text>
              </View>

              {/* Weekday headers */}
              <View style={styles.weekRow}>
                {WEEKDAYS.map((wd) => (
                  <Text key={wd} style={styles.weekdayLabel}>{wd}</Text>
                ))}
              </View>

              {/* Days grid */}
              <View style={styles.daysGrid}>
                {month.cells.map((cell) => {
                  if (cell.day === null) {
                    return <View key={cell.key} style={styles.dayCellEmpty} />;
                  }
                  const isEdge = cell.isStart || cell.isEnd;
                  return (
                    <View
                      key={cell.key}
                      style={[
                        styles.dayCell,
                        cell.isInRange && !isEdge && styles.dayCellRange,
                        isEdge && styles.dayCellEdge,
                        cell.isToday && !isEdge && styles.dayCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          cell.isInRange && !isEdge && styles.dayNumRange,
                          isEdge && styles.dayNumEdge,
                          cell.isToday && !cell.isInRange && styles.dayNumToday,
                        ]}
                      >
                        {String(cell.day)}
                      </Text>
                      {cell.isToday ? <View style={styles.todayDot} /> : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <BottomTabNav activeTab="calendar" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerSpacer: { width: 40 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: "700", color: "#344225", textAlign: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, backgroundColor: "#D4E8E0" },
  loaderText: { fontSize: 14, color: "#344225", marginTop: 12 },
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

  scroll: { flex: 1, backgroundColor: "#D4E8E0" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  heroCard: { backgroundColor: "#344225", borderRadius: 22, padding: 20, marginBottom: 14 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  heroLabel: { fontSize: 11, color: "#8FA880", fontWeight: "500", marginBottom: 4 },
  heroPlan: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  daysRemainingBadge: { alignItems: "center", backgroundColor: "#FAD979", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  daysRemainingNum: { fontSize: 22, fontWeight: "800", color: "#344225" },
  daysRemainingLabel: { fontSize: 10, fontWeight: "600", color: "#344225" },
  heroDivider: { height: 1, backgroundColor: "#4A6040", marginBottom: 16 },
  heroDateRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  heroDateBlock: { flex: 1 },
  heroDateLabel: { fontSize: 10, color: "#8FA880", marginBottom: 3 },
  heroDateValue: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  heroArrow: { paddingHorizontal: 8 },
  progressWrap: { gap: 6 },
  progressTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#FAD979", borderRadius: 3 },
  progressLabel: { fontSize: 11, color: "#B8D5C5", textAlign: "right" },

  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDotOutline: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "#344225" },
  legendText: { fontSize: 11, color: "#6B7F75", fontWeight: "500" },

  monthCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, marginBottom: 14 },
  monthTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 14 },
  monthTitle: { fontSize: 17, fontWeight: "700", color: "#344225" },
  monthYear: { fontSize: 13, color: "#6B7F75" },
  weekRow: { flexDirection: "row", marginBottom: 10 },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: "#6B7F75" },

  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCellEmpty: { width: "14.28%", aspectRatio: 1 },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellRange: { backgroundColor: "#FFF5CC" },
  dayCellEdge: { backgroundColor: "#344225", borderRadius: 100 },
  dayCellToday: { borderRadius: 100, borderWidth: 2, borderColor: "#344225" },
  dayNum: { fontSize: 13, fontWeight: "500", color: "#344225" },
  dayNumRange: { color: "#344225", fontWeight: "600" },
  dayNumEdge: { color: "#FFFFFF", fontWeight: "700" },
  dayNumToday: { color: "#344225", fontWeight: "700" },
  todayDot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FAD979",
  },
});
