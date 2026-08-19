import { finalizeOnboarding } from "@/app/auth/utils/finalize-onboarding";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

export default function AllergiesPreferencesScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");

  const allergy_list_data = [
    { id: "Milk", title: t("allergy_list.milk") },
    { id: "Tree Nuts", title: t("allergy_list.tree_nuts") },
    { id: "Eggs", title: t("allergy_list.eggs") },
    { id: "Peanuts", title: t("allergy_list.peanuts") },
    { id: "Shellfish", title: t("allergy_list.shellfish") },
    { id: "Soybeans", title: t("allergy_list.soybeans") },
    { id: "Wheat", title: t("allergy_list.wheat") },
    { id: "Fish", title: t("allergy_list.fish") },
    { id: "Sesame", title: t("allergy_list.sesame") },
  ];

  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  const normalizeAllergies = (list: string[]) => {
    const normalized = list.flatMap((item) =>
      item === "Wheat/Fish" ? ["Wheat", "Fish"] : item,
    );
    return Array.from(new Set(normalized));
  };

  useEffect(() => {
    const loadSelections = async () => {
      const stored = await AsyncStorage.getItem("tempAllergiesSelection");
      if (stored) {
        try {
          setSelectedAllergies(normalizeAllergies(JSON.parse(stored)));
        } catch {
          setSelectedAllergies([]);
        }
      }
    };
    loadSelections();
  }, []);

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev: string[]) =>
      prev.includes(allergy)
        ? prev.filter((item: string) => item !== allergy)
        : [...prev, allergy],
    );
  };

  const handleUpdate = async () => {
    if (!selectedAllergies.length) {
      Alert.alert(
        t("allergies_prefs.select_error_title"),
        t("allergies_prefs.select_error"),
      );
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem(
        "tempAllergiesSelection",
        JSON.stringify(selectedAllergies),
      );
      await AsyncStorage.setItem(
        "userAllergies",
        JSON.stringify(selectedAllergies),
      );

      const registrationResponse = await finalizeOnboarding({
        hasAllergies: true,
        allergies: selectedAllergies,
      });

      // Registration successful - finalizeOnboarding will navigate to welcome screen
      // No need to show alert or navigate here as finalizeOnboarding handles it
    } catch (error) {
      // Format error message for better display
      let errorMessage =
        error instanceof Error
          ? error.message
          : t("allergies_prefs.unexpected_error");

      // Handle specific error cases (phone number already registered is now handled in API service)
      if (error instanceof Error) {
        const errorAny = error as any;
        if (errorAny.isInvalidAffiliatedCode) {
          errorMessage = t("allergies_prefs.invalid_affiliate");
        }
      }

      Alert.alert(t("allergies_prefs.registration_failed"), errorMessage, [
        { text: t("common.ok"), style: "default" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, isArabic && styles.rtlRow]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isArabic && styles.rtlText]}>{t("allergies_prefs.title")}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.description, isArabic && styles.rtlText]}>
            {t("allergies_prefs.description")}
          </Text>
          <Text style={[styles.subtitle, isArabic && styles.rtlText]}>{t("allergies_prefs.subtitle")}</Text>

          <View style={styles.allergiesContainer}>
            {allergy_list_data.map((allergy) => (
              <TouchableOpacity
                key={allergy.id}
                style={[
                  styles.allergyItem,
                  isArabic && styles.rtlRow,
                  selectedAllergies.includes(allergy.id) &&
                  styles.allergyItemSelected,
                ]}
                onPress={() => toggleAllergy(allergy.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.allergyText,
                    isArabic && styles.rtlText,
                    selectedAllergies.includes(allergy.id) &&
                    styles.allergyTextSelected,
                  ]}
                >
                  {allergy.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 32) }]}>
          <TouchableOpacity
            style={[
              styles.updateButton,
              loading && styles.updateButtonDisabled,
            ]}
            onPress={handleUpdate}
            disabled={loading}
          >
            <Text style={styles.updateButtonText}>
              {loading ? t("allergies_prefs.saving") : t("allergies_prefs.continue")}
            </Text>
          </TouchableOpacity>
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
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#344225",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
  placeholder: {
    width: 36,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  description: {
    fontSize: 14,
    color: "#344225",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#344225",
    marginBottom: 24,
  },
  allergiesContainer: {
    gap: 12,
  },
  allergyItem: {
    backgroundColor: "#E8F0ED",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  allergyItemSelected: {
    backgroundColor: "#344225",
    borderColor: "#344225",
  },
  allergyText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#344225",
  },
  allergyTextSelected: {
    color: "#FFFFFF",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#D4E8E0",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  updateButton: {
    backgroundColor: "#344225",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
