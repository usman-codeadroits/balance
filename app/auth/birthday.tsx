import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BirthdayScreen() {
  const { t } = useTranslation();
  const months = t("months", { returnObjects: true }) as string[];
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(2000);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= 1900; i--) {
      years.push(i);
    }
    return years;
  };

  const generateDays = (month: number, year: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const years = generateYears();
  const days = generateDays(selectedMonth, selectedYear);

  useEffect(() => {
    if (selectedDay && selectedDay > days.length) {
      setSelectedDay(null);
    }
  }, [days.length, selectedDay]);

  const handleContinue = async () => {
    if (!selectedDay) {
      Alert.alert(t("common.error"), t("birthday.enter_birthday"));
      return;
    }

    const birthDate = new Date(selectedYear, selectedMonth, selectedDay);
    if (Number.isNaN(birthDate.getTime())) {
      Alert.alert(t("common.error"), t("birthday.enter_birthday"));
      return;
    }

    // Store birthday in ISO format to avoid locale-dependent month names
    const birthdayString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    await AsyncStorage.setItem("tempBirthday", birthdayString);

    // Navigate to gender screen
    router.push("/auth/gender");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back button and logo */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Image
              source={require("@/assets/images/balance-logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{t("birthday.title")}</Text>
        </View>

        {/* Birthday Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={
              selectedDay
                ? `${selectedDay}/${months[selectedMonth]}/${selectedYear}`
                : ""
            }
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#8B9D94"
            editable={false}
          />
        </View>

        {/* Date Picker */}
        <View style={styles.pickerSection}>
          <ScrollView
            style={styles.pickerColumn}
            showsVerticalScrollIndicator={false}
          >
            {days.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.pickerItem,
                  selectedDay === day && styles.pickerItemSelected,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    selectedDay === day && styles.pickerTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.pickerColumn}
            showsVerticalScrollIndicator={false}
          >
            {months.map((month, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pickerItem,
                  selectedMonth === index && styles.pickerItemSelected,
                ]}
                onPress={() => setSelectedMonth(index)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    selectedMonth === index && styles.pickerTextSelected,
                  ]}
                >
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.pickerColumn}
            showsVerticalScrollIndicator={false}
          >
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.pickerItem,
                  selectedYear === year && styles.pickerItemSelected,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    selectedYear === year && styles.pickerTextSelected,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen title={t("birthday.continue")} onPress={handleContinue} />
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
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
  },
  headerLogo: {
    width: 72,
    height: 72,
  },
  headerContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#344225",
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#344225",
  },
  pickerSection: {
    flexDirection: "row",
    height: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  pickerItem: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  pickerItemSelected: {
    backgroundColor: "#FAD979",
  },
  pickerText: {
    fontSize: 14,
    color: "#6B7F75",
  },
  pickerTextSelected: {
    color: "#344225",
    fontWeight: "600",
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 16,
  },
});
