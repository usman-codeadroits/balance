import { finalizeOnboarding } from "@/app/auth/utils/finalize-onboarding";
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
  TouchableOpacity,
  View,
} from "react-native";

export default function AllergiesScreen() {
  const { t } = useTranslation();
  const [hasAllergies, setHasAllergies] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  useStaticScreen();

  useEffect(() => {
    const loadPreference = async () => {
      const stored = await AsyncStorage.getItem("tempHasAllergies");
      if (stored) {
        setHasAllergies(JSON.parse(stored));
      }
    };
    loadPreference();
  }, []);

  const handleContinue = async () => {
    if (hasAllergies === null) {
      Alert.alert(
        t("allergies.select_error_title"),
        t("allergies.select_error"),
      );
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem(
        "tempHasAllergies",
        JSON.stringify(hasAllergies),
      );

      if (hasAllergies) {
        setLoading(false);
        router.push("/auth/allergies-preferences" as any);
        return;
      }

      console.log(
        "📝 Allergies Screen: Starting registration (No allergies)...",
      );
      await AsyncStorage.setItem("tempAllergiesSelection", JSON.stringify([]));

      const registrationResponse = await finalizeOnboarding({
        hasAllergies: false,
        allergies: [],
      });

      console.log("✅ Allergies Screen: Registration completed");
      console.log(
        "📱 Allergies Screen: Showing success message and navigating to home",
      );

    } catch (error) {
      console.error("========================================");
      console.error("❌ REGISTRATION FAILED");
      console.error("========================================");
      console.error("Error completing onboarding:", error);
      if (error instanceof Error) {
        console.error("  - Error message:", error.message);
        console.error("  - Error stack:", error.stack);
      }
      console.error("========================================\n");

      let errorMessage =
        error instanceof Error
          ? error.message
          : t("allergies.unexpected_error");

      if (error instanceof Error) {
        const errorAny = error as any;
        if (errorAny.isInvalidAffiliatedCode) {
          errorMessage = t("allergies.invalid_affiliate");
        }
      }

      Alert.alert(t("allergies.registration_failed"), errorMessage, [
        { text: t("common.ok"), style: "default" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Image
              source={require("@/assets/images/balance-logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerContainer}>
            <Text style={styles.title}>{t("allergies.title")}</Text>
            <Text style={styles.subtitle}>
              {t("allergies.subtitle")}
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionCard,
                hasAllergies === true && styles.optionCardSelected,
              ]}
              onPress={() => setHasAllergies(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>{t("allergies.yes")}</Text>
              <Text style={styles.emoji}>👍</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                hasAllergies === false && styles.optionCardSelected,
              ]}
              onPress={() => setHasAllergies(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>{t("allergies.no")}</Text>
              <Text style={styles.emoji}>👎</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.bottomSection}>
          <AuthButtonGreen
            title={loading ? t("allergies.wait") : t("allergies.continue")}
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
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogo: {
    width: 80,
    height: 80,
  },
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7F75",
    lineHeight: 18,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionCardSelected: {
    borderColor: "#344225",
    backgroundColor: "#F0F7F4",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#344225",
  },
  emoji: {
    fontSize: 32,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
});
