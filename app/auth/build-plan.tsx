import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const proteinOptions = [
  { value: "100", label: "100 g", percentage: "" },
  { value: "150", label: "150 g", percentage: "" },
  { value: "200", label: "200 g", percentage: "" },
];

const carbsOptions = [
  { value: "80", label: "80 g", percentage: "" },
  { value: "100", label: "100 g", percentage: "" },
  { value: "150", label: "150 g", percentage: "" },
  { value: "200", label: "200 g", percentage: "" },
];

export default function BuildPlanScreen() {
  const { t } = useTranslation();
  const [selectedProtein, setSelectedProtein] = useState<string | null>(null);
  const [selectedCarbs, setSelectedCarbs] = useState<string | null>(null);
  const [showProteinDropdown, setShowProteinDropdown] = useState(false);
  const [showCarbsDropdown, setShowCarbsDropdown] = useState(false);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadSaved = async () => {
      const [protein, carbs] = await Promise.all([
        AsyncStorage.getItem("personalizedProtein"),
        AsyncStorage.getItem("personalizedCarbs"),
      ]);
      if (protein) setSelectedProtein(protein);
      if (carbs) setSelectedCarbs(carbs);
    };
    loadSaved();
  }, []);

  const handleContinue = async () => {
    if (!selectedProtein || !selectedCarbs) {
      alert(t("build_plan.error_missing_fields"));
      return;
    }

    try {
      // Save personalized plan selection
      await AsyncStorage.setItem("hasPersonalizedPlan", "true");
      await AsyncStorage.setItem("personalizedProtein", selectedProtein);
      await AsyncStorage.setItem("personalizedCarbs", selectedCarbs);
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        await AsyncStorage.setItem("personalizedPlanOwner", userId);
      }

      // Return to subscription screen to select meals per day
      router.back();
    } catch (error) {
      alert(t("build_plan.error_saving"));
    }
  };

  const getProteinLabel = () => {
    const option = proteinOptions.find((opt) => opt.value === selectedProtein);
    return option ? option.label : t("build_plan.protein_placeholder");
  };

  const getCarbsLabel = () => {
    const option = carbsOptions.find((opt) => opt.value === selectedCarbs);
    return option ? option.label : t("build_plan.carbs_placeholder");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t("build_plan.title")}</Text>
            <Text style={styles.subtitle}>
              {t("build_plan.subtitle")}
            </Text>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Select Protein Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("build_plan.select_protein")}</Text>
            <Text style={styles.sectionDescription}>
              {t("build_plan.protein_desc")}
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setShowProteinDropdown(!showProteinDropdown);
                setShowCarbsDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !selectedProtein && styles.dropdownPlaceholder,
                ]}
              >
                {getProteinLabel()}
              </Text>
              <Ionicons
                name={showProteinDropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color="#344225"
              />
            </TouchableOpacity>
            {showProteinDropdown && (
              <View style={styles.dropdownCard}>
                {proteinOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownRow,
                      selectedProtein === option.value &&
                      styles.dropdownRowSelected,
                      index === proteinOptions.length - 1 &&
                      styles.dropdownRowLast,
                    ]}
                    onPress={() => {
                      setSelectedProtein(option.value);
                      setShowProteinDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownRowText,
                        selectedProtein === option.value &&
                        styles.dropdownRowTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.dropdownRowText,
                        styles.dropdownRowPercentage,
                        selectedProtein === option.value &&
                        styles.dropdownRowTextSelected,
                      ]}
                    >
                      {option.percentage}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Select Carbs Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("build_plan.select_carbs")}</Text>
            <Text style={styles.sectionDescription}>
              {t("build_plan.carbs_desc")}
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setShowCarbsDropdown(!showCarbsDropdown);
                setShowProteinDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !selectedCarbs && styles.dropdownPlaceholder,
                ]}
              >
                {getCarbsLabel()}
              </Text>
              <Ionicons
                name={showCarbsDropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color="#344225"
              />
            </TouchableOpacity>
            {showCarbsDropdown && (
              <View style={styles.dropdownCard}>
                {carbsOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownRow,
                      selectedCarbs === option.value &&
                      styles.dropdownRowSelected,
                      index === carbsOptions.length - 1 &&
                      styles.dropdownRowLast,
                    ]}
                    onPress={() => {
                      setSelectedCarbs(option.value);
                      setShowCarbsDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownRowText,
                        selectedCarbs === option.value &&
                        styles.dropdownRowTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.dropdownRowText,
                        styles.dropdownRowPercentage,
                        selectedCarbs === option.value &&
                        styles.dropdownRowTextSelected,
                      ]}
                    >
                      {option.percentage}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen title={t("build_plan.continue")} onPress={handleContinue} />
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
  headerSection: {
    paddingHorizontal: "5%",
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7F75",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
    paddingBottom: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7F75",
    marginBottom: 16,
    lineHeight: 20,
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B8D5C5",
  },
  dropdownText: {
    fontSize: 14,
    color: "#344225",
    fontWeight: "500",
  },
  dropdownPlaceholder: {
    color: "#6B7F75",
    fontWeight: "400",
  },
  dropdownCard: {
    backgroundColor: "#E8E8E8",
    borderRadius: 8,
    marginTop: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  dropdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D0D0D0",
  },
  dropdownRowLast: {
    borderBottomWidth: 0,
  },
  dropdownRowSelected: {
    backgroundColor: "#D4E8E0",
  },
  dropdownRowText: {
    fontSize: 14,
    color: "#4A4A4A",
    fontWeight: "400",
  },
  dropdownRowPercentage: {
    textAlign: "right",
  },
  dropdownRowTextSelected: {
    fontWeight: "600",
    color: "#344225",
  },
  noteText: {
    fontSize: 12,
    color: "#6B7F75",
    marginTop: 8,
    fontStyle: "italic",
  },
  bottomSection: {
    paddingHorizontal: "5%",
    paddingBottom: 30,
  },
});
