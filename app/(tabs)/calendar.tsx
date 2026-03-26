import { getMySubscriptions } from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import {
  DUMMY_SUBSCRIPTION,
  USE_DUMMY_SUBSCRIPTION,
} from "@/constants/dummy-subscription";
import i18n from "@/constants/i18n";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const getWeekdayLabels = () => {
  return i18n.t("calendar.weekdays", { returnObjects: true }) as string[];
};

interface SubscriptionRange {
  startDate: string;
  endDate: string;
}

interface CalendarCell {
  key: string;
  label: string;
  isPlaceholder?: boolean;
  isInRange?: boolean;
  isStart?: boolean;
  isEnd?: boolean;
}

interface MonthGrid {
  id: string;
  title: string;
  cells: CalendarCell[];
}

const parseDateSafe = (value?: string): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildMonthGrid = (
  year: number,
  month: number,
  rangeStart: Date,
  rangeEnd: Date,
  locale: string = "en",
): MonthGrid => {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({
      key: `placeholder-${year}-${month}-${i}`,
      label: "",
      isPlaceholder: true,
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const currentDate = new Date(year, month, day);
    const isInRange = currentDate >= rangeStart && currentDate <= rangeEnd;
    cells.push({
      key: `day-${year}-${month}-${day}`,
      label: String(day),
      isInRange,
      isStart: currentDate.toDateString() === rangeStart.toDateString(),
      isEnd: currentDate.toDateString() === rangeEnd.toDateString(),
    });
  }

  return {
    id: `${year}-${month}`,
    title: firstDay.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      month: "long",
      year: "numeric",
    }),
    cells,
  };
};

const generateMonthsBetween = (startDate: Date, endDate: Date, locale: string = "en"): MonthGrid[] => {
  const months: MonthGrid[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= lastMonth) {
    months.push(
      buildMonthGrid(
        cursor.getFullYear(),
        cursor.getMonth(),
        startDate,
        endDate,
        locale
      ),
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};

export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<SubscriptionRange | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);

      if (USE_DUMMY_SUBSCRIPTION) {
        const storedFlag = await AsyncStorage.getItem(
          "demoSubscriptionUnlocked",
        );
        if (storedFlag === "true") {
          setRange({
            startDate: DUMMY_SUBSCRIPTION.startDate,
            endDate: DUMMY_SUBSCRIPTION.endDate,
          });
          setLoading(false);
          return;
        }
      }

      // Fetch from new API
      const response = await getMySubscriptions();

      if (response.success && response.data.active && response.data.active.length > 0) {
        // Get the first active subscription
        const activeSubscription = response.data.active[0];

        // Parse dates from format "20.03.2024" to "YYYY-MM-DD"
        const parseDate = (dateStr: string): string => {
          const parts = dateStr.split('.');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            // Return in ISO format YYYY-MM-DD
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          return dateStr;
        };

        const startDate = parseDate(activeSubscription.start_date);
        const endDate = parseDate(activeSubscription.end_date);

        // Verify dates are valid
        const endDateObj = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Only show if subscription is active and not expired
        if (activeSubscription.status === "active" && endDateObj >= today) {
          setRange({ startDate, endDate });
        } else {
          setRange(null);
        }
      } else {
        // Fallback to AsyncStorage for backward compatibility
        const stored = await AsyncStorage.getItem("activeSubscription");
        if (stored) {
          const parsed = JSON.parse(stored);

          // Check if subscription is still active (not expired)
          if (parsed?.startDate && parsed?.endDate) {
            const endDate = new Date(parsed.endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Only show if subscription is Active and not expired
            if (parsed.status === "Active" && endDate >= today) {
              setRange({ startDate: parsed.startDate, endDate: parsed.endDate });
            } else {
              setRange(null);
            }
          } else {
            setRange(null);
          }
        } else {
          setRange(null);
        }
      }
    } catch (error) {
      console.error("Failed to load subscription for calendar:", error);
      setRange(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Reload subscription when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSubscription();
    }, [loadSubscription]),
  );

  const startDate = useMemo(() => parseDateSafe(range?.startDate), [range]);
  const endDate = useMemo(() => parseDateSafe(range?.endDate), [range]);

  const monthGrids = useMemo(() => {
    if (!startDate || !endDate) {
      return [];
    }
    if (endDate < startDate) {
      return [];
    }
    return generateMonthsBetween(startDate, endDate, i18n.language);
  }, [startDate, endDate, i18n.language]);

  const renderCalendar = () => {
    if (!startDate || !endDate) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="calendar-outline" size={48} color="#B0C4B1" />
          <Text style={styles.emptyStateTitle}>{t("calendar.no_sub")}</Text>
          <Text style={styles.emptyStateText}>
            {t("calendar.no_sub_desc")}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.calendarScroll}
        contentContainerStyle={styles.calendarScrollContent}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t("calendar.sub_window")}</Text>
          <Text style={styles.summaryDate}>{startDate.toDateString()}</Text>
          <Ionicons
            name="arrow-down"
            size={18}
            color="#6B7F75"
            style={styles.summaryIcon}
          />
          <Text style={styles.summaryDate}>{endDate.toDateString()}</Text>
        </View>

        {monthGrids.map((month) => (
          <View key={month.id} style={styles.monthContainer}>
            <Text style={styles.monthTitle}>{month.title}</Text>
            <View style={styles.weekdayRow}>
              {getWeekdayLabels().map((label) => (
                <Text key={`${month.id}-${label}`} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {month.cells.map((cell) => (
                <View
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    cell.isPlaceholder && styles.dayCellPlaceholder,
                    cell.isInRange && styles.dayCellActive,
                    cell.isStart && styles.dayCellEdge,
                    cell.isEnd && styles.dayCellEdge,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      (cell.isPlaceholder || !cell.label) &&
                      styles.dayLabelDisabled,
                      cell.isInRange && styles.dayLabelActive,
                    ]}
                  >
                    {cell.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {t("calendar.header")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#344225" />
          <Text style={styles.loaderText}>{t("calendar.loading")}</Text>
        </View>
      ) : (
        renderCalendar()
      )}

      <BottomTabNav
        activeTab="calendar"
        onHomePress={() => router.replace("/main-screen")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4E8E0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: "5%",
    paddingTop: 40,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    textAlign: "center",
    flex: 1,
    marginLeft: 16,
    fontSize: 22,
    fontWeight: "700",
    color: "#344225",
  },
  headerSpacer: {
    width: 40,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 12,
    color: "#6B7F75",
  },
  calendarScroll: {
    flex: 1,
  },
  calendarScrollContent: {
    paddingHorizontal: "5%",
    paddingBottom: 140,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7F75",
  },
  summaryDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
    marginTop: 6,
  },
  summaryIcon: {
    marginVertical: 8,
  },
  monthContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 12,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7F75",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayCell: {
    width: "13%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F4F7F5",
  },
  dayCellPlaceholder: {
    backgroundColor: "transparent",
  },
  dayCellActive: {
    backgroundColor: "#FAD979",
  },
  dayCellEdge: {
    borderWidth: 2,
    borderColor: "#344225",
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A0ADA4",
  },
  dayLabelDisabled: {
    color: "transparent",
  },
  dayLabelActive: {
    color: "#344225",
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    marginTop: 16,
  },
  emptyStateText: {
    textAlign: "center",
    color: "#6B7F75",
    marginTop: 8,
  },
});
