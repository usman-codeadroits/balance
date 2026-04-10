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

export default function HasAffiliatedCodeScreen() {
  const { t } = useTranslation();
  const [hasAffiliatedCode, setHasAffiliatedCode] = useState<boolean | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  useStaticScreen();

  useEffect(() => {
    const loadPreference = async () => {
      const stored = await AsyncStorage.getItem("tempHasAffiliatedCode");
      if (stored) {
        setHasAffiliatedCode(JSON.parse(stored));
      }
    };
    loadPreference();
  }, []);

  const handleContinue = async () => {
    if (hasAffiliatedCode === null) {
      Alert.alert(
        t("has_affiliated.select_error_title"),
        t("has_affiliated.select_error"),
      );
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem(
        "tempHasAffiliatedCode",
        JSON.stringify(hasAffiliatedCode),
      );

      if (hasAffiliatedCode) {
        setLoading(false);
        router.push("/auth/affiliated-code" as any);
        return;
      }

      // If no affiliated code, go to email screen
      await AsyncStorage.setItem("tempAffiliatedCode", "");
      setLoading(false);
      router.push("/auth/email" as any);
    } catch (error) {
      Alert.alert(
        t("has_affiliated.error_title"),
        error instanceof Error ? error.message : t("has_affiliated.unexpected_error"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/balance-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title and Subtitle */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{t("has_affiliated.title")}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Yes Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                hasAffiliatedCode === true && styles.optionCardSelected,
              ]}
              onPress={() => setHasAffiliatedCode(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>{t("has_affiliated.yes")}</Text>
              <Text style={styles.emoji}>👍</Text>
            </TouchableOpacity>

            {/* No Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                hasAffiliatedCode === false && styles.optionCardSelected,
              ]}
              onPress={() => setHasAffiliatedCode(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>{t("has_affiliated.no")}</Text>
              <Text style={styles.emoji}>👎</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <AuthButtonGreen
            title={loading ? t("has_affiliated.wait") : t("has_affiliated.continue")}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
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
