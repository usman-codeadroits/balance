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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Gender = "male" | "female" | null;

export default function GenderScreen() {
  const { t } = useTranslation();
  const [selectedGender, setSelectedGender] = useState<Gender>(null);
  const [loading, setLoading] = useState(false);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadGender = async () => {
      const storedGender = await AsyncStorage.getItem("tempGender");
      if (storedGender === "male" || storedGender === "female") {
        setSelectedGender(storedGender);
      }
    };
    loadGender();
  }, []);

  const handleContinue = async () => {
    if (!selectedGender) {
      Alert.alert(t("common.error"), t("gender.select_error"));
      return;
    }

    setLoading(true);

    try {
      // Store gender in AsyncStorage
      await AsyncStorage.setItem("tempGender", selectedGender);

      // Navigate to goal screen
      router.push("/auth/goal");
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error instanceof Error
          ? error.message
          : t("gender.save_error"),
      );
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>{t("gender.title")}</Text>
          <Text style={styles.subtitle}>
            {t("gender.subtitle")}
          </Text>
        </View>

        {/* Gender Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedGender === "male" && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedGender("male")}
            activeOpacity={0.7}
          >
            <Text style={styles.optionEmoji}>👨</Text>
            <Text style={styles.optionText}>{t("gender.male")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedGender === "female" && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedGender("female")}
            activeOpacity={0.7}
          >
            <Text style={styles.optionEmoji}>👩</Text>
            <Text style={styles.optionText}>{t("gender.female")}</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen
            title={loading ? t("gender.saving") : t("gender.continue")}
            onPress={handleContinue}
            disabled={loading}
          />
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7F75",
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: "#344225",
    backgroundColor: "#F0F7F4",
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  optionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#344225",
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 16,
  },
});
