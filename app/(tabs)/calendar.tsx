import { getMySubscriptions } from "@/api/services/subscriptions";
import {
  cancelPauseRequest,
  getPauseRequests,
  resumePauseRequest,
  submitPauseRequest,
  type PauseRequest,
} from "@/api/services/pauseRequests";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WEEKDAYS_SHORT = ["S","M","T","W","T","F","S"];

interface SubscriptionRange {
  id: number;
  startDate: string;
  endDate: string;
  planTitle?: string;
  meals?: number;
  days?: number;
  weeks?: number;
}

const parseDateSafe = (value?: string): Date | null => {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length === 3) {
    const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const getDaysRemaining = (end: Date): number => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
};

const formatDisplayDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatApiDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function CalendarScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const [range, setRange] = useState<SubscriptionRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [pauseRequests, setPauseRequests] = useState<PauseRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMySubscriptions();
      if (response.success && response.data.active?.length > 0) {
        const valid = response.data.active
          .map((sub) => ({ sub, start: parseDateSafe(sub.start_date), end: parseDateSafe(sub.end_date) }))
          .filter(({ sub, start, end }) => sub.status === "active" && start && end && end >= today)
          .sort((a, b) => a.end!.getTime() - b.end!.getTime());
        if (valid.length > 0) {
          const { sub, start, end } = valid[0];
          const totalDays = Math.ceil((end!.getTime() - start!.getTime()) / (1000 * 60 * 60 * 24));
          setRange({
            id: sub.id,
            startDate: start!.toISOString(),
            endDate: end!.toISOString(),
            planTitle: sub.subcrption_plans?.title,
            meals: (sub as any).meals_per_day ?? 2,
            days: totalDays,
            weeks: Math.ceil(totalDays / 7),
          });
          setViewYear(start!.getFullYear());
          setViewMonth(start!.getMonth());
          loadPauseRequests(sub.id);
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
  }, [today]);

  const loadPauseRequests = async (subscriptionId: number) => {
    try {
      const res = await getPauseRequests(subscriptionId);
      if (res.success) setPauseRequests(res.data || []);
    } catch {
      setPauseRequests([]);
    }
  };

  useEffect(() => { loadSubscription(); }, [loadSubscription]);
  useFocusEffect(useCallback(() => { loadSubscription(); }, [loadSubscription]));

  const startDate = useMemo(() => range ? new Date(range.startDate) : null, [range]);
  const endDate   = useMemo(() => range ? new Date(range.endDate)   : null, [range]);

  // ymd → PauseRequest for approved and pending days
  const pausedDayMap = useMemo(() => {
    const map = new Map<string, PauseRequest>();
    pauseRequests
      .filter(r => r.status === "approved")
      .forEach(r => {
        const s = new Date(r.pause_start_date); s.setHours(0, 0, 0, 0);
        const e = new Date(r.pause_end_date);   e.setHours(0, 0, 0, 0);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) map.set(toYMD(d), r);
      });
    return map;
  }, [pauseRequests]);

  const pendingDayMap = useMemo(() => {
    const map = new Map<string, PauseRequest>();
    pauseRequests
      .filter(r => r.status === "pending")
      .forEach(r => {
        const s = new Date(r.pause_start_date); s.setHours(0, 0, 0, 0);
        const e = new Date(r.pause_end_date);   e.setHours(0, 0, 0, 0);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) map.set(toYMD(d), r);
      });
    return map;
  }, [pauseRequests]);

  const pausedDays = useMemo(() => new Set(pausedDayMap.keys()), [pausedDayMap]);
  const pendingDays = useMemo(() => new Set(pendingDayMap.keys()), [pendingDayMap]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: { day: number | null; ymd: string }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, ymd: "" });
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ day: d, ymd: toYMD(new Date(viewYear, viewMonth, d)) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isInRange = (ymd: string) => {
    if (!startDate || !endDate) return false;
    const d = new Date(ymd); d.setHours(0, 0, 0, 0);
    return d >= startDate && d <= endDate;
  };

  const handleDayPress = (ymd: string) => {
    if (!range || submitting) return;
    if (!isInRange(ymd)) return;

    const approvedReq = pausedDayMap.get(ymd);
    const pendingReq  = pendingDayMap.get(ymd);

    if (approvedReq) {
      // Approved pause → ask to resume
      Alert.alert(
        "Resume this day?",
        `Do you want to resume delivery for ${ymd}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Resume",
            onPress: async () => {
              try {
                setSubmitting(true);
                await resumePauseRequest(range.id, approvedReq.id);
                await loadSubscription();
                Alert.alert("Done", "Day resumed successfully.");
              } catch (err: any) {
                Alert.alert("Error", err?.message || "Something went wrong. Please try again.");
              } finally {
                setSubmitting(false);
              }
            },
          },
        ],
      );
    } else if (pendingReq) {
      // Pending pause → ask to cancel request
      Alert.alert(
        "Cancel pause request?",
        `Your pause request for ${ymd} is pending approval. Do you want to cancel it?`,
        [
          { text: "Keep", style: "cancel" },
          {
            text: "Cancel Request",
            style: "destructive",
            onPress: async () => {
              try {
                setSubmitting(true);
                await cancelPauseRequest(range.id, pendingReq.id);
                // Optimistic update — drop the pending request so the day stops showing Pending
                setPauseRequests(prev => prev.filter(r => r.id !== pendingReq.id));
                Alert.alert("Done", "Pause request cancelled.");
                loadPauseRequests(range.id);
              } catch (err: any) {
                Alert.alert("Error", err?.message || "Something went wrong. Please try again.");
              } finally {
                setSubmitting(false);
              }
            },
          },
        ],
      );
    } else {
      // Active day → ask to pause
      Alert.alert(
        "Pause this day?",
        `Do you want to pause delivery for ${ymd}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Pause",
            onPress: async () => {
              try {
                setSubmitting(true);
                const dayDate = new Date(ymd); dayDate.setHours(0, 0, 0, 0);
                await submitPauseRequest(range.id, {
                  pause_start_date: formatApiDate(dayDate),
                  pause_end_date: formatApiDate(dayDate),
                  reason: "Not available on this day",
                });
                Alert.alert("Done", "Pause request submitted. Waiting for approval.");
                loadPauseRequests(range.id);
              } catch (err: any) {
                Alert.alert("Error", err?.message || "Something went wrong. Please try again.");
              } finally {
                setSubmitting(false);
              }
            },
          },
        ],
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.headerTitle}>{t('calendar.my_subscriptions')}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#344225" />
        </View>
      ) : !startDate || !endDate ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={48} color="#B8D5C5" />
          <Text style={styles.emptyTitle}>No Active Subscription</Text>
          <Text style={styles.emptyDesc}>Subscribe to a plan to view your calendar.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/auth/subscription")}>
            <Text style={styles.emptyBtnText}>Get a Plan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEndDate}>
              {t('calendar.end_date')} : {formatDisplayDate(endDate)}
              {"  "}
              <Text style={styles.summaryDaysLeft}>• {getDaysRemaining(endDate)} {t('calendar.days_left')}</Text>
            </Text>
            <Text style={styles.summaryDetails}>
              {range.meals ?? 2} {t('calendar.meals')}{"  "}•{"  "}{range.days ?? 0} {t('calendar.days')}{"  "}•{"  "}{range.weeks ?? 0} {t('calendar.weeks')}
            </Text>
          </View>

          {/* Calendar */}
          <View style={styles.calCard}>
            {/* Month nav — force LTR so arrows stay in position in RTL mode */}
            <View style={[styles.monthNav, I18nManager.isRTL && { flexDirection: 'row-reverse' }]}>
              <TouchableOpacity style={styles.navArrow} onPress={prevMonth} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={22} color="#344225" />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {((t('calendar.months', { returnObjects: true }) as string[])[viewMonth] ?? '').toUpperCase()}
              </Text>
              <TouchableOpacity style={styles.navArrow} onPress={nextMonth} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={22} color="#344225" />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekRow}>
              {WEEKDAYS_SHORT.map((wd, i) => (
                <Text key={i} style={styles.weekdayLabel}>{wd}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.daysGrid}>
              {calendarCells.map((cell, idx) => {
                if (!cell.day) return <View key={`ph-${idx}`} style={styles.cellWrap} />;

                const inRange  = isInRange(cell.ymd);
                const paused   = pausedDays.has(cell.ymd);
                const pending  = pendingDays.has(cell.ymd);
                const todayDay = cell.ymd === toYMD(today);

                let circleStyle = styles.circleDefault;
                let textStyle   = styles.dayTextDefault;
                let label: string | null = null;

                if (paused) {
                  circleStyle = styles.circlePaused;
                  textStyle   = styles.dayTextPaused;
                  label       = t('calendar.status_paused');
                } else if (pending) {
                  circleStyle = styles.circlePending;
                  textStyle   = styles.dayTextPending;
                  label       = t('calendar.status_pending');
                } else if (todayDay) {
                  circleStyle = styles.circleToday;
                  textStyle   = styles.dayTextToday;
                  label       = t('calendar.status_today');
                } else if (inRange) {
                  circleStyle = styles.circleInRange;
                  textStyle   = styles.dayTextInRange;
                  label       = t('calendar.status_active');
                }

                return (
                  <TouchableOpacity
                    key={cell.ymd}
                    style={styles.cellWrap}
                    onPress={() => handleDayPress(cell.ymd)}
                    activeOpacity={inRange ? 0.7 : 1}
                    disabled={submitting}
                  >
                    <View style={[styles.circle, circleStyle]}>
                      <Text style={[styles.dayText, textStyle]}>{cell.day}</Text>
                    </View>
                    {label ? <Text style={styles.dayLabel}>{label}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.circleToday]} />
              <Text style={styles.legendText}>{t('calendar.status_today')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.circleInRange]} />
              <Text style={styles.legendText}>{t('calendar.status_active')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.circlePending]} />
              <Text style={styles.legendText}>{t('calendar.status_pending')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.circlePaused]} />
              <Text style={styles.legendText}>{t('calendar.status_paused')}</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <BottomTabNav activeTab="calendar" onHomePress={() => router.replace("/main-screen")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },

  header: {
    paddingHorizontal: "5%",
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#344225", textAlign: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, backgroundColor: "#D4E8E0" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#344225", marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: "#6B7F75", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: { backgroundColor: "#FAD979", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: "#344225" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  summaryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    backgroundColor: "#FAD979",
  },
  summaryEndDate: { fontSize: 14, fontWeight: "700", color: "#344225", marginBottom: 8 },
  summaryDaysLeft: { color: "#344225", fontWeight: "700" },
  summaryDetails: { fontSize: 16, fontWeight: "500", color: "#344225" },

  calCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12, marginBottom: 16 },

  monthNav: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16, paddingHorizontal: 4,
  },
  navArrow: { padding: 8 },
  monthLabel: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", letterSpacing: 1 },

  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekdayLabel: { width: "14.28%", textAlign: "center", fontSize: 12, fontWeight: "600", color: "#AAAAAA" },

  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: { width: "14.28%", alignItems: "center", marginBottom: 10, minHeight: 52 },

  circle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  circleDefault: { backgroundColor: "#E8E8E8" },
  circleInRange: { backgroundColor: "#FAD979" },
  circleToday: { backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#344225" },
  circlePaused: { backgroundColor: "#344225" },
  circlePending: { backgroundColor: "#F5A623" },

  dayText: { fontSize: 14, fontWeight: "500" },
  dayTextDefault: { color: "#999999" },
  dayTextInRange: { color: "#344225", fontWeight: "700" },
  dayTextToday: { color: "#344225", fontWeight: "700" },
  dayTextPaused: { color: "#FAD979", fontWeight: "700" },
  dayTextPending: { color: "#FFFFFF", fontWeight: "700" },

  dayLabel: { fontSize: 9, fontWeight: "600", color: "#344225", marginTop: 2 },

  legendRow: { flexDirection: "row", justifyContent: "center", gap: 20, marginBottom: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 12, color: "#6B7F75", fontWeight: "500" },
});
