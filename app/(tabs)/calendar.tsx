import { getMySubscriptions } from "@/api/services/subscriptions";
import {
  getPauseRequests,
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
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  id: number;
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

const formatApiDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

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

const addDays = (d: Date, n: number): Date => {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#F5A623",
  approved: "#1A6F46",
  rejected: "#C0392B",
};

export default function CalendarScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<SubscriptionRange | null>(null);
  const [loading, setLoading] = useState(true);

  // Pause modal state
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [pauseStartDate, setPauseStartDate] = useState<Date>(addDays(new Date(), 1));
  const [pauseEndDate, setPauseEndDate] = useState<Date>(addDays(new Date(), 4));
  const [pauseReason, setPauseReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pause requests list
  const [pauseRequests, setPauseRequests] = useState<PauseRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

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
            id: sub.id,
            startDate: start!.toISOString(),
            endDate: end!.toISOString(),
            planTitle: sub.subcrption_plans?.title,
            currency: (sub as any).currency || "KWD",
            price: sub.price,
          });
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
  }, []);

  const loadPauseRequests = async (subscriptionId: number) => {
    try {
      setRequestsLoading(true);
      const res = await getPauseRequests(subscriptionId);
      if (res.success) setPauseRequests(res.data || []);
    } catch {
      setPauseRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

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

  const pauseDays = useMemo(() => {
    const diff = pauseEndDate.getTime() - pauseStartDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [pauseStartDate, pauseEndDate]);

  const hasApprovedPause = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pauseRequests.some(
      (r) => r.status === "approved" && new Date(r.pause_end_date) >= today,
    );
  }, [pauseRequests]);

  const openPauseModal = () => {
    if (startDate && endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Default start = subscription start (but not before today)
      const defaultStart = startDate >= today ? new Date(startDate) : new Date(today);
      defaultStart.setHours(0, 0, 0, 0);
      // Default end = subscription end
      const defaultEnd = new Date(endDate);
      defaultEnd.setHours(0, 0, 0, 0);
      setPauseStartDate(defaultStart);
      setPauseEndDate(defaultEnd);
    }
    setPauseReason("");
    setPauseModalVisible(true);
  };

  const handleSubmitPause = async () => {
    if (!range) return;
    if (!pauseReason.trim()) {
      Alert.alert("Required", "Please enter a reason for your pause request.");
      return;
    }
    if (pauseEndDate < pauseStartDate) {
      Alert.alert("Invalid dates", "End date cannot be before start date.");
      return;
    }
    try {
      setSubmitting(true);
      // Backend requires end > start strictly; for a single-day pause send start+1
      const apiEndDate =
        pauseEndDate.toDateString() === pauseStartDate.toDateString()
          ? addDays(pauseStartDate, 1)
          : pauseEndDate;
      const res = await submitPauseRequest(range.id, {
        pause_start_date: formatApiDate(pauseStartDate),
        pause_end_date: formatApiDate(apiEndDate),
        reason: pauseReason.trim(),
      });
      setPauseModalVisible(false);
      Alert.alert("Request Submitted", res.message || "Your pause request has been submitted. Please wait for admin approval.");
      loadPauseRequests(range.id);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to submit pause request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const adjustStartDate = (days: number) => {
    if (!startDate || !endDate) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minStart = startDate >= today ? new Date(startDate) : new Date(today);
    minStart.setHours(0, 0, 0, 0);
    const next = addDays(pauseStartDate, days);
    if (next < minStart) return;
    if (next > pauseEndDate) return;
    setPauseStartDate(next);
  };

  const adjustEndDate = (days: number) => {
    if (!endDate) return;
    const maxEnd = new Date(endDate);
    maxEnd.setHours(0, 0, 0, 0);
    const next = addDays(pauseEndDate, days);
    if (next < pauseStartDate) return;
    if (next > maxEnd) return;
    setPauseEndDate(next);
  };

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

            <View style={styles.heroDivider} />

            {/* Pause button */}
            <TouchableOpacity
              style={[styles.pauseBtn, hasApprovedPause && styles.pauseBtnDisabled]}
              onPress={hasApprovedPause ? undefined : openPauseModal}
              disabled={hasApprovedPause}
            >
              <Ionicons
                name={hasApprovedPause ? "pause-circle" : "pause-circle-outline"}
                size={18}
                color={hasApprovedPause ? "#8FA880" : "#FAD979"}
              />
              <Text style={[styles.pauseBtnText, hasApprovedPause && styles.pauseBtnTextDisabled]}>
                {hasApprovedPause ? "Pause Already Approved" : "Request Subscription Pause"}
              </Text>
            </TouchableOpacity>
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
              <View style={styles.weekRow}>
                {WEEKDAYS.map((wd) => (
                  <Text key={wd} style={styles.weekdayLabel}>{wd}</Text>
                ))}
              </View>
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

          {/* Pause Requests Section */}
          <View style={styles.pauseSection}>
            <Text style={styles.pauseSectionTitle}>Pause Requests</Text>
            {requestsLoading ? (
              <ActivityIndicator size="small" color="#344225" style={{ marginTop: 12 }} />
            ) : pauseRequests.length === 0 ? (
              <View style={styles.noPauseWrap}>
                <Text style={styles.noPauseText}>No pause requests yet.</Text>
              </View>
            ) : (
              pauseRequests.map((req) => (
                <View key={req.id} style={styles.pauseRequestCard}>
                  <View style={styles.pauseRequestHeader}>
                    <Text style={styles.pauseRequestDates}>
                      {req.pause_start_date} → {req.pause_end_date}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[req.status] + "22" }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLOR[req.status] }]}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.pauseRequestMeta}>{req.pause_days} day{req.pause_days !== 1 ? "s" : ""} · Submitted {req.created_at?.split(" ")[0]}</Text>
                  <Text style={styles.pauseRequestReason}>{req.reason}</Text>
                  {req.admin_notes ? (
                    <View style={styles.adminNotesWrap}>
                      <Text style={styles.adminNotesLabel}>Admin notes:</Text>
                      <Text style={styles.adminNotesText}>{req.admin_notes}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <BottomTabNav activeTab="calendar" onHomePress={() => router.replace("/main-screen")} />

      {/* Pause Request Modal */}
      <Modal
        visible={pauseModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPauseModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Pause</Text>
              <TouchableOpacity onPress={() => setPauseModalVisible(false)}>
                <Ionicons name="close" size={24} color="#344225" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalNote}>
                Your request will be reviewed by our team. You will be notified once it is approved or rejected.
              </Text>

              {/* Pause start date */}
              <Text style={styles.fieldLabel}>Pause Start Date</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateArrow} onPress={() => adjustStartDate(-1)}>
                  <Ionicons name="chevron-back" size={20} color="#344225" />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Text style={styles.dateDisplayText}>{formatDisplayDate(pauseStartDate)}</Text>
                </View>
                <TouchableOpacity style={styles.dateArrow} onPress={() => adjustStartDate(1)}>
                  <Ionicons name="chevron-forward" size={20} color="#344225" />
                </TouchableOpacity>
              </View>

              {/* Pause end date */}
              <Text style={styles.fieldLabel}>Pause End Date</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateArrow} onPress={() => adjustEndDate(-1)}>
                  <Ionicons name="chevron-back" size={20} color="#344225" />
                </TouchableOpacity>
                <View style={styles.dateDisplay}>
                  <Text style={styles.dateDisplayText}>{formatDisplayDate(pauseEndDate)}</Text>
                </View>
                <TouchableOpacity style={styles.dateArrow} onPress={() => adjustEndDate(1)}>
                  <Ionicons name="chevron-forward" size={20} color="#344225" />
                </TouchableOpacity>
              </View>

              {/* Days count */}
              <View style={styles.daysCountWrap}>
                <Ionicons name="time-outline" size={15} color="#5A7C65" />
                <Text style={styles.daysCountText}>
                  Pause duration: <Text style={styles.daysCountBold}>{pauseDays} day{pauseDays !== 1 ? "s" : ""}</Text>
                </Text>
              </View>

              {/* Reason */}
              <Text style={styles.fieldLabel}>Reason</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter your reason (e.g. travelling abroad, medical leave...)"
                placeholderTextColor="#9DB8AC"
                value={pauseReason}
                onChangeText={setPauseReason}
                multiline
                numberOfLines={4}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{pauseReason.length}/1000</Text>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmitPause}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={16} color="#344225" />
                    <Text style={styles.submitBtnText}>Submit Pause Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  heroCard: { backgroundColor: "#344225", borderRadius: 22, padding: 20, marginBottom: 14, minHeight: 160 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  heroLabel: { fontSize: 11, color: "#8FA880", fontWeight: "500", marginBottom: 4 },
  heroPlan: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  daysRemainingBadge: { alignItems: "center", backgroundColor: "#FAD979", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  daysRemainingNum: { fontSize: 22, fontWeight: "800", color: "#344225" },
  daysRemainingLabel: { fontSize: 10, fontWeight: "600", color: "#344225" },
  heroDivider: { height: 1, backgroundColor: "#4A6040", marginVertical: 14 },
  heroDateRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  heroDateBlock: { flex: 1 },
  heroDateLabel: { fontSize: 10, color: "#8FA880", marginBottom: 3 },
  heroDateValue: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  heroArrow: { paddingHorizontal: 8 },
  progressWrap: { gap: 6 },
  progressTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#FAD979", borderRadius: 3 },
  progressLabel: { fontSize: 11, color: "#B8D5C5", textAlign: "right" },
  pauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(250,217,121,0.12)",
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FAD979",
  },
  pauseBtnText: { fontSize: 14, fontWeight: "600", color: "#FAD979" },
  pauseBtnDisabled: {
    backgroundColor: "rgba(143,168,128,0.1)",
    borderColor: "#8FA880",
    opacity: 0.7,
  },
  pauseBtnTextDisabled: { color: "#8FA880" },

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
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: "#FAD979",
  },

  // Pause requests section
  pauseSection: { marginTop: 8, marginBottom: 8 },
  pauseSectionTitle: { fontSize: 16, fontWeight: "700", color: "#344225", marginBottom: 12 },
  noPauseWrap: {
    backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, alignItems: "center",
  },
  noPauseText: { fontSize: 14, color: "#6B7F75" },
  pauseRequestCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, marginBottom: 10,
  },
  pauseRequestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  pauseRequestDates: { fontSize: 13, fontWeight: "600", color: "#344225", flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: "700" },
  pauseRequestMeta: { fontSize: 11, color: "#9DB8AC", marginBottom: 6 },
  pauseRequestReason: { fontSize: 13, color: "#4A6040", lineHeight: 18 },
  adminNotesWrap: { marginTop: 8, backgroundColor: "#F5F5F5", borderRadius: 8, padding: 10 },
  adminNotesLabel: { fontSize: 11, fontWeight: "700", color: "#6B7F75", marginBottom: 2 },
  adminNotesText: { fontSize: 12, color: "#344225" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#D4E8E0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#344225" },
  modalNote: {
    fontSize: 13,
    color: "#5A7C65",
    lineHeight: 18,
    backgroundColor: "#C8DFCF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: "#344225",
  },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#344225", marginBottom: 8 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#B8D5C5",
  },
  dateArrow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#EAF3EE",
  },
  dateDisplay: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  dateDisplayText: { fontSize: 15, fontWeight: "600", color: "#344225" },
  daysCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
    marginTop: -8,
  },
  daysCountText: { fontSize: 13, color: "#5A7C65" },
  daysCountBold: { fontWeight: "700", color: "#344225" },
  reasonInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#344225",
    borderWidth: 1,
    borderColor: "#B8D5C5",
    minHeight: 110,
    marginBottom: 4,
  },
  charCount: { fontSize: 11, color: "#9DB8AC", textAlign: "right", marginBottom: 20 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FAD979",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#344225" },
});
