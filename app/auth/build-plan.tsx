import { apiClient } from "@/api/client";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProteinOption = {
  id: number;
  protein_grams: number;
  extra_price_per_meal: string;
  is_active: boolean;
};


export default function BuildPlanScreen() {
  const { t } = useTranslation();
  const [selectedProtein, setSelectedProtein] = useState<string | null>(null);
  const [selectedCarbs, setSelectedCarbs] = useState<string | null>(null);
  const [showProteinDropdown, setShowProteinDropdown] = useState(false);
  const [showCarbsDropdown, setShowCarbsDropdown] = useState(false);
  const [proteinApiOptions, setProteinApiOptions] = useState<ProteinOption[]>([]);

  const carbsOptions = [
    { grams: 150, label: "150 g" },
    { grams: 200, label: "200 g" },
  ];
  const [optionsLoading, setOptionsLoading] = useState(true);
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchProteinOptions();
    loadSaved();
  }, []);

  const fetchProteinOptions = async () => {
    try {
      const response = await apiClient.get("/v1/protein-options");
      const data: ProteinOption[] = (response as any)?.data || [];
      const filtered = data.filter((opt) => opt.is_active && opt.protein_grams !== 100);
      setProteinApiOptions(filtered);
      await AsyncStorage.setItem("proteinOptionsData", JSON.stringify(filtered));
    } catch {
      const fallback = [
        { id: 1, protein_grams: 150, extra_price_per_meal: "0.650", is_active: true },
        { id: 2, protein_grams: 200, extra_price_per_meal: "1.300", is_active: true },
      ];
      setProteinApiOptions(fallback);
      await AsyncStorage.setItem("proteinOptionsData", JSON.stringify(fallback));
    } finally {
      setOptionsLoading(false);
    }
  };

  const loadSaved = async () => {
    const [protein, carbs] = await Promise.all([
      AsyncStorage.getItem("personalizedProtein"),
      AsyncStorage.getItem("personalizedCarbs"),
    ]);
    if (protein) setSelectedProtein(protein);
    if (carbs) setSelectedCarbs(carbs);
  };

  const handleProteinSelect = (proteinGrams: string) => {
    setSelectedProtein(proteinGrams);
    setShowProteinDropdown(false);
    const option = proteinApiOptions.find(
      (opt) => String(opt.protein_grams) === proteinGrams,
    );
    if (option) {
      AsyncStorage.setItem("personalizedProteinExtraPrice", option.extra_price_per_meal);
    }
  };

  const handleCarbsSelect = (carbsGrams: string) => {
    setSelectedCarbs(carbsGrams);
    setShowCarbsDropdown(false);
  };

  const getCarbsLabel = () => {
    if (!selectedCarbs) return t("build_plan.carbs_placeholder");
    return `${selectedCarbs} g (${t("build_plan.carbs_free")})`;
  };

  const handleContinue = async () => {
    if (!selectedProtein || !selectedCarbs) {
      alert(t("build_plan.error_missing_fields"));
      return;
    }

    try {
      await AsyncStorage.setItem("hasPersonalizedPlan", "true");
      await AsyncStorage.setItem("personalizedProtein", selectedProtein);
      await AsyncStorage.setItem("personalizedCarbs", selectedCarbs);
      const userId = await AsyncStorage.getItem("userId");
      if (userId) {
        await AsyncStorage.setItem("personalizedPlanOwner", userId);
      }
      router.back();
    } catch (error) {
      alert(t("build_plan.error_saving"));
    }
  };

  const getProteinLabel = () => {
    const option = proteinApiOptions.find(
      (opt) => String(opt.protein_grams) === selectedProtein,
    );
    return option ? `${option.protein_grams} g` : t("build_plan.protein_placeholder");
  };

return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t("build_plan.title")}</Text>
            <Text style={styles.subtitle}>{t("build_plan.subtitle")}</Text>
          </View>
        </View>

        {optionsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#344225" />
          </View>
        ) : (
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
                  {proteinApiOptions.map((option, index) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.dropdownRow,
                        selectedProtein === String(option.protein_grams) &&
                          styles.dropdownRowSelected,
                        index === proteinApiOptions.length - 1 &&
                          styles.dropdownRowLast,
                      ]}
                      onPress={() => handleProteinSelect(String(option.protein_grams))}
                    >
                      <Text
                        style={[
                          styles.dropdownRowText,
                          selectedProtein === String(option.protein_grams) &&
                            styles.dropdownRowTextSelected,
                        ]}
                      >
                        {option.protein_grams} g
                      </Text>
                      <Text
                        style={[
                          styles.dropdownRowPrice,
                          selectedProtein === String(option.protein_grams) &&
                            styles.dropdownRowTextSelected,
                        ]}
                      >
                        +{parseFloat(option.extra_price_per_meal).toFixed(3)} KWD/meal
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
                      key={option.grams}
                      style={[
                        styles.dropdownRow,
                        selectedCarbs === String(option.grams) &&
                          styles.dropdownRowSelected,
                        index === carbsOptions.length - 1 &&
                          styles.dropdownRowLast,
                      ]}
                      onPress={() => handleCarbsSelect(String(option.grams))}
                    >
                      <Text
                        style={[
                          styles.dropdownRowText,
                          selectedCarbs === String(option.grams) &&
                            styles.dropdownRowTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.dropdownRowFree}>
                        {t("build_plan.carbs_free")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

          </ScrollView>
        )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  dropdownRowTextSelected: {
    fontWeight: "600",
    color: "#344225",
  },
  dropdownRowPrice: {
    fontSize: 12,
    color: "#6B7F75",
    fontWeight: "400",
  },
  dropdownRowFree: {
    fontSize: 12,
    color: "#1A6F46",
    fontWeight: "600",
  },
  bottomSection: {
    paddingHorizontal: "5%",
    paddingBottom: 30,
  },
});
