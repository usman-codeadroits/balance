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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
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
      // Redirect to selected meals screen
      await AsyncStorage.removeItem("selectedDayMeals");
      router.push("/auth/selected-meals" as any);
    } catch (error) {
    }
  };

  const isDateDisabled = (day: number): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentYear, currentMonth, day);
    checkDate.setHours(0, 0, 0, 0);

    // Disable today and past dates - only allow from tomorrow onwards
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return checkDate < tomorrow;
  };

  const handleDateSelect = (day: number) => {
    if (isDateDisabled(day)) {
      Alert.alert(
        t("start_date_screen.invalid_date_title"),
        t("start_date_screen.invalid_date_msg"),
      );
      return;
    }
    const date = new Date(currentYear, currentMonth, day);
    setSelectedDate(date);
  };

  const generateCalendar = () => {
    const days = [];
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const isDisabled = isDateDisabled(day);
      const isSelected =
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear;

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isSelected && styles.dayCellSelected,
            isDisabled && styles.dayCellDisabled,
          ]}
          onPress={() => handleDateSelect(day)}
          activeOpacity={0.7}
          disabled={isDisabled}
        >
          <Text
            style={[
              styles.dayNumber,
              isSelected && styles.dayNumberSelected,
              isDisabled && styles.dayNumberDisabled,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>,
      );
    }

    return days;
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
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
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getSelectedDay = (): string => {
    if (!selectedDate) return "";
    return selectedDate.getDate().toString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title with Back Button */}
          <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>{t("start_date_screen.title")}</Text>
            </View>
          </View>

          {/* Calendar Icon - Shows Selected Date */}
          {selectedDate && (
            <View style={styles.calendarIconContainer}>
              <View style={styles.calendarIcon}>
                <View style={styles.calendarTop}>
                  <View style={styles.calendarRing} />
                  <View style={styles.calendarRing} />
                </View>
                <View style={styles.calendarBody}>
                  <Text style={styles.calendarText}>{getSelectedDay()}</Text>
                </View>
              </View>
              <Text style={styles.calendarLabel}>
                {formatSelectedDate(selectedDate)}
              </Text>
            </View>
          )}

          {/* Calendar */}
          <View style={styles.calendarContainer}>
            {/* Month/Year Header */}
            <View style={styles.monthHeader}>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={handlePreviousMonth}
              >
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={handleNextMonth}
              >
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Week Days */}
            <View style={styles.weekDaysContainer}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>{generateCalendar()}</View>
          </View>
        </ScrollView>

        {/* Fixed Bottom Section */}
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
    justifyContent: "space-between",
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
    paddingBottom: 20,
  },
  calendarIconContainer: {
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 24,
  },
  calendarIcon: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  calendarTop: {
    height: 16,
    backgroundColor: "#5A7C65",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    alignItems: "center",
  },
  calendarRing: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#344225",
  },
  calendarBody: {
    flex: 1,
    backgroundColor: "#D4E8E0",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#5A7C65",
    borderTopWidth: 0,
  },
  calendarText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#344225",
  },
  calendarLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#344225",
  },
  calendarContainer: {
    paddingHorizontal: 24,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  arrowButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 24,
    color: "#344225",
    fontWeight: "600",
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#344225",
  },
  weekDaysContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7F75",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emptyDay: {
    width: "14.28%",
    aspectRatio: 1,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: "#5A7C65",
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: 14,
    color: "#344225",
    fontWeight: "500",
  },
  dayNumberSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  dayNumberDisabled: {
    color: "#9E9E9E",
  },
  bottomSection: {
    paddingHorizontal: 24,
  },
});
