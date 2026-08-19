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

type Goal =
  | "eat-healthy"
  | "lose-weight"
  | "gain-weight"
  | "build-muscle"
  | "maintain-weight"
  | null;

export default function GoalScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");

  const goals_list = [
    {
      id: "eat-healthy" as Goal,
      title: t("goals.eat-healthy.title"),
      subtitle: t("goals.eat-healthy.subtitle"),
    },
    {
      id: "lose-weight" as Goal,
      title: t("goals.lose-weight.title"),
      subtitle: t("goals.lose-weight.subtitle"),
    },
    {
      id: "gain-weight" as Goal,
      title: t("goals.gain-weight.title"),
      subtitle: t("goals.gain-weight.subtitle"),
    },
    {
      id: "build-muscle" as Goal,
      title: t("goals.build-muscle.title"),
      subtitle: t("goals.build-muscle.subtitle"),
    },
    {
      id: "maintain-weight" as Goal,
      title: t("goals.maintain-weight.title"),
      subtitle: t("goals.maintain-weight.subtitle"),
    },
  ];

  const [selectedGoal, setSelectedGoal] = useState<Goal>(null);
  const [loading, setLoading] = useState(false);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadGoal = async () => {
      const storedGoal = await AsyncStorage.getItem("tempGoal");
      if (storedGoal) {
        setSelectedGoal(storedGoal as Goal);
      }
    };
    loadGoal();
  }, []);

  const handleContinue = async () => {
    if (!selectedGoal) {
      alert(t("goal.select_error"));
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem("tempGoal", selectedGoal);
      router.push("/auth/profile-setup");
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
            <Text style={[styles.title, isArabic && styles.rtlText]}>{t("goal.title")}</Text>
          </View>

          {/* Goal Options */}
          <View style={styles.optionsContainer}>
            {goals_list.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.optionCard,
                  isArabic && styles.rtlRow,
                  selectedGoal === goal.id && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedGoal(goal.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, isArabic && styles.rtlText]}>{goal.title}</Text>
                  <Text style={[styles.optionSubtitle, isArabic && styles.rtlText]}>{goal.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen
            title={loading ? t("goal.saving") : t("goal.continue")}
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
    paddingBottom: 16