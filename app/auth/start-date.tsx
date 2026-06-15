import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StartDateScreen() {
  const { t } = useTranslation();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 2);
  const [selectedDate, setSelectedDate] = useState<Date | null>(minDate);
  const [currentMonth, setCurrentMonth] = useState(minDate.getMonth());
  const [currentYear, setCurrentYear] = useState(minDate.getFullYear());
  useStaticScreen();
  const insets = useSafeAreaInsets();

  const handleContinue = async () => {
    if (!selectedDate) {
      Alert.alert(
        t("start_date_screen.invalid_date_title"),
        t("start_date_screen.select_error")
      );
      return;
    }
    try {
      await AsyncStorage.setItem("startDate", selectedDate.toISOString());
      await AsyncStorage.removeItem("selectedDayMeals");
      router.push("/auth/selected-meals" as any);
    } catch (error) {}
  };

  const isDateDisabled = (day: number): boolean => {
    const checkDate = new Date(currentYear, currentMonth, day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < minDate;
  };

  const handleDateSelect = (day: number) => {
    if (isDateDisabled(day)) return;
    setSelectedDate(new Date(currentYear, currentMonth, day));
  };

  const generateCalendar = () => {
    const days = [];
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.cellWrap} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isDisabled = isDateDisabled(day);
      const isSelected =
        !!selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear;

      days.push(
        <TouchableOpacity
          key={day}
          style={styles.cellWrap}
          onPress={() => handleDateSelect(day)}
          activeOpacity={0.7}
          disabled={isDisabled}
        >
          <View
            style={[
              styles.circle,
              isSelected
                ? styles.circleSelected
                : isDisabled
                ? styles.circleDisabled
                : styles.circleDefault,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                isSelected
                  ? styles.dayTextSelected
                  : isDisabled
                  ? styles.dayTextDisabled
                  : styles.dayTextDefault,
              ]}
            >
              {day}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const handlePreviousMonth = () => {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    if (prevYear < minDate.getFullYear()) return;
    if (prevYear === minDate.getFullYear() && prevMonth < minDate.getMonth()) return;
    setCurrentMonth(prevMonth);
    setCurrentYear(prevYear);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const monthNames = t("calendar.months", { returnObjects: true }) as string[];
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  const formatSelectedDate = (date: Date | null): string => {
    if (!date) return "";
    return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>{t("start_date_screen.title")}</Text>
            </View>
          </View>

          {/* Selected date display */}
          {selectedDate && (
            <View style={styles.selectedBadge}>
              <Ionicons name="calendar-outline" size={18} color="#344225" />
              <Text style={styles.selectedBadgeText}>{formatSelectedDate(selectedDate)}</Text>
            </View>
          )}

          {/* Availability note */}
          <View style={styles.noteContainer}>
            <Ionicons name="information-circle-outline" size={18} color="#5A7C65" />
            <Text style={styles.noteText}>{t("start_date_screen.availability_note")}</Text>
          </View>

          {/* Calendar card — matches calendar tab style */}
          <View style={styles.calCard}>
            {/* Month nav */}
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.navArrow} onPress={handlePreviousMonth} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={22} color="#344225" />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {(monthNames[currentMonth] ?? "").toUpperCase()}{"  "}{currentYear}
              </Text>
              <TouchableOpacity style={styles.navArrow} onPress={handleNextMonth} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={22} color="#344225" />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekRow}>
              {weekDays.map((wd, i) => (
                <Text key={i} style={styles.weekdayLabel}>{wd}</Text>
              ))}
            </View>

            {/* Days grid */}
            <View style={styles.daysGrid}>{generateCalendar()}</View>
          </View>
        </ScrollView>

        {/* Fixed bottom button */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen title={t("start_date_screen.continue")} onPress={handleContinue} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4E8E0",
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    backgroundColor: "#FAD979",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  selectedBadgeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#344225",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#C8DFCF",
    borderRadius: 10,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#5A7C65",
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: "#344225",
    lineHeight: 18,
  },

  /* Calendar card — matches calendar tab */
  calCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navArrow: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: 1,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayLabel: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#AAAAAA",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cellWrap: {
    width: "14.28%",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 40,
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDefault: {
    backgroundColor: "#E8E8E8",
  },
  circleSelected: {
    backgroundColor: "#344225",
  },
  circleDisabled: {
    backgroundColor: "#E8E8E8",
    opacity: 0.35,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dayTextDefault: {
    color: "#344225",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayTextDisabled: {
    color: "#999999",
  },

  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: "#D4E8E0",
  },
});
