import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActivityLevel =
  | "sedentary"
  | "lightly-active"
  | "very-active"
  | "highly-active"
  | null;

export default function ActivityLevelScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");

  const activityLevels_list = [
    {
      id: "sedentary" as ActivityLevel,
      title: t("activity_levels.sedentary.title"),
      subtitle: t("activity_levels.sedentary.subtitle"),
    },
    {
      id: "lightly-active" as ActivityLevel,
      title: t("activity_levels.lightly-active.title"),
      subtitle: t("activity_levels.lightly-active.subtitle"),
    },
    {
      id: "very-active" as ActivityLevel,
      title: t("activity_levels.very-active.title"),
      subtitle: t("activity_levels.very-active.subtitle"),
    },
    {
      id: "highly-active" as ActivityLevel,
      title: t("activity_levels.highly-active.title"),
      subtitle: t("activity_levels.highly-active.subtitle"),
    },
  ];

  const [selectedLevel, setSelectedLevel] = useState<ActivityLevel>(null);
  const [loading, setLoading] = useState(false);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadLevel = async () => {
      const storedLevel = await AsyncStorage.getItem("tempActivityLevel");
      if (storedLevel) {
        setSelectedLevel(storedLevel as ActivityLevel);
      }
    };
    loadLevel();
  }, []);

  const handleContinue = async () => {
    if (!selectedLevel) {
      alert(t("activity_level.select_error"));
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem("tempActivityLevel", selectedLevel);
      router.push("/auth/allergies" as any);
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
          <View style={[styles.header, isArabic && styles.rtlRow]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
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
            <Text style={[styles.title, isArabic && styles.rtlText]}>{t("activity_level.title")}</Text>
          </View>

          {/* Activity Level Options */}
          <View style={styles.optionsContainer}>
            {activityLevels_list.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.optionCard,
                  isArabic && styles.rtlRow,
                  selectedLevel === level.id && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedLevel(level.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, isArabic && styles.rtlText]}>{level.title}</Text>
                  <Text style={[styles.optionSubtitle, isArabic && styles.rtlText]}>{level.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen
            title={loading ? t("activity_level.saving") : t("activity_level.continue")}
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
  optionsContainer: {
    gap: 12,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: "#344225",
    backgroundColor: "#F0F7F4",
  },
  optionContent: {
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#344225",
  },
  optionSubtitle: {
    fontSize: 13,
    color: "#6B7F75",
    lineHeight: 18,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
});
