import {
  getSubscriptionDetails,
  updateSubscriptionDays,
  type UserSubscriptionDetails,
} from "@/api/services/subscriptions";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const sameDays = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((d) => b.has(d));

export default function UpdateSubscriptionDaysScreen() {
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId?: string }>();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const insets = useSafeAreaInsets();

  const [details, setDetails] = useState<UserSubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [initialDays, setInitialDays] = useState<Set<string>>(new Set());

  const weekdayShort = t("calendar.weekdays", { returnObjects: true }) as string[];

  const plan = (details as any)?.subcrption_plans;
  const minDays: number | null = plan?.min_days ?? null;
  const maxDays: number | null = plan?.max_days ?? null;

  const daysRangeNote = (): string | null => {
    if (minDays != null && maxDays != null) {
      return t("update_days.days_range_between", { min: minDays, max: maxDays });
    }
    if (minDays != null) {
      return t("update_days.days_range_min_only", { count: minDays, s: minDays !== 1 ? "s" : "" });
    }
    if (maxDays != null) {
      return t("update_days.days_range_max_only", { count: maxDays, s: maxDays !== 1 ? "s" : "" });
    }
    return null;
  };

  const selectedCount = selectedDays.size;
  const isOutOfRange =
    (minDays != null && selectedCount < minDays) || (maxDays != null && selectedCount > maxDays);

  const loadData = useCallback(async () => {
    if (!subscriptionId) {
      setError(t("update_days.load_error_generic"));
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const res = await getSubscriptionDetails(Number(subscriptionId));
      if (res.success && res.data) {
        setDetails(res.data);
        const current = new Set(
          (res.data.subscription_days || []).map((d) => (d.day || "").toLowerCase()),
        );
        setSelectedDays(current);
        setInitialDays(current);
      } else {
        setError(t("update_days.load_error_generic"));
      }
    } catch {
      setError(t("update_days.load_error_generic"));
    } finally {
      setLoading(false);
    }
  }, [subscriptionId, t]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const toggleDay = (day: string) => {
    if (saving) return;
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleSave = async () => {
    if (!subscriptionId) return;
    if (selectedDays.size === 0) {
      Alert.alert(t("common.error"), t("update_days.no_days_selected"));
      return;
    }
    if (sameDays(selectedDays, initialDays)) {
      Alert.alert(t("common.error"), t("update_days.no_changes"));
      return;
    }
    if (minDays != null && selectedDays.size < minDays) {
      Alert.alert(t("common.error"), t("update_days.min_days_error", { count: minDays }));
      return;
    }
    if (maxDays != null && selectedDays.size > maxDays) {
      Alert.alert(t("common.error"), t("update_days.max_days_error", { count: maxDays }));
      return;
    }

    const newDays = [...selectedDays];
    const addedDays = newDays.filter((d) => !initialDays.has(d));

    try {
      setSaving(true);
      await updateSubscriptionDays(Number(subscriptionId), newDays);

      Alert.alert(
        t("update_days.success_title"),
        addedDays.length > 0
          ? `${t("update_days.success_msg")} ${t("update_days.success_new_days_msg")}`
          : t("update_days.success_msg"),
        addedDays.length > 0
          ? [
              {
                text: t("update_days.go_to_meals"),
                onPress: () =>
                  router.replace({
                    pathname: "/update-subscription-meals",
                    params: { subscriptionId },
                  } as any),
              },
              {
                text: t("update_days.done"),
                style: "cancel",
                onPress: () => router.back(),
              },
            ]
          : [{ text: t("update_days.done"), onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message || t("update_days.load_error_generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.headerTitle, isArabic && styles.rtlText]}>{t("update_days.header_title")}</Text>
            <Text style={[styles.headerSubtitle, isArabic && styles.rtlText]}>{t("update_days.description")}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.loadingText}>{t("update_days.loading")}</Text>
          </View>
        ) : error || !details ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
            <Text style={styles.errorText}>{error || t("update_days.load_error_generic")}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Text style={styles.retryBtnText}>{t("update_days.try_again")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.warningCard}>
              <Ionicons name="information-circle-outline" size={18} color="#B94A00" />
              <Text style={[styles.warningText, isArabic && styles.rtlText]}>
                {t("update_days.warning")}
              </Text>
            </View>

            {daysRangeNote() ? (
              <View style={styles.rangeNoteCard}>
                <Ionicons name="calendar-outline" size={16} color="#2A6041" />
                <Text style={[styles.rangeNoteText, isArabic && styles.rtlText]}>{daysRangeNote()}</Text>
              </View>
            ) : null}

            <Text style={[styles.sectionLabel, isArabic && styles.rtlText]}>
              {t("update_days.select_days_label")}
            </Text>
            <View style={styles.daysGrid}>
              {DAY_ORDER.map((day, idx) => {
                const active = selectedDays.has(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    onPress={() => toggleDay(day)}
                    disabled={saving}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                      {weekdayShort[idx]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.selectedCountText, isOutOfRange && styles.selectedCountTextError]}>
              {t("update_days.selected_count", { count: selectedCount, s: selectedCount !== 1 ? "s" : "" })}
            </Text>
          </ScrollView>
        )}

        {!loading && !error && details ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={[styles.saveBtn, (saving || isOutOfRange) && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving || isOutOfRange}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#344225" />
              ) : (
                <Text style={styles.saveBtnText}>{t("update_days.save_button")}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  rtlRow: { flexDirection: "row-reverse" },
  rtlText: { textAlign: "right" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
    flexShrink: 0,
  },
  headerTextBlock: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7F75",
    marginTop: 2,
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

  warningCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFD7A8",
  },
  warningText: { flex: 1, fontSize: 12, color: "#8A4B00", lineHeight: 17 },

  rangeNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E8F4EC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#C7E3D3",
  },
  rangeNoteText: { flex: 1, fontSize: 12, fontWeight: "600", color: "#2A6041", lineHeight: 17 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7F75",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  selectedCountText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7F75",
    marginBottom: 16,
  },
  selectedCountTextError: {
    color: "#D64545",
  },
  dayChip: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DDE9E4",
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: {
    backgroundColor: "#344225",
    borderColor: "#344225",
  },
  dayChipText: { fontSize: 13, fontWeight: "700", color: "#344225" },
  dayChipTextActive: { color: "#FAD979" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#D4E8E0",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveBtn: {
    backgroundColor: "#FAD979",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#344225" },
  btnDisabled: { opacity: 0.6 },
});
