import type { Area } from "@/api";
import { getAllAreas } from "@/api";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// ActivityIndicator kept for area loading spinner
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddAddressScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const [blockNumber, setBlockNumber] = useState("");
  const [street, setStreet] = useState("");
  const [houseBuliding, setHouseBuliding] = useState("");
  const [floorApartment, setFloorApartment] = useState("");
  const [remarks, setRemarks] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [addressCategory, setAddressCategory] = useState<"home" | "office">("home");
  const [isPrimary, setIsPrimary] = useState(true);

  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [areasLoading, setAreasLoading] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);

  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchAllAreas();
  }, []);

  const fetchAllAreas = async () => {
    try {
      setAreasLoading(true);
      const data = await getAllAreas();
      setAreas(data);
    } catch {
      // silently fail
    } finally {
      setAreasLoading(false);
    }
  };

  const handleNext = async () => {
    if (!selectedArea) {
      Alert.alert(t("common.error"), t("address.validation.areas"));
      return;
    }
    if (!blockNumber.trim()) {
      Alert.alert(t("common.error"), t("address.validation.block"));
      return;
    }
    if (!street.trim()) {
      Alert.alert(t("common.error"), t("address.validation.street"));
      return;
    }
    if (!houseBuliding.trim()) {
      Alert.alert(t("common.error"), t("address.validation.house"));
      return;
    }
    if (!floorApartment.trim()) {
      Alert.alert(t("common.error"), t("address.validation.apartment"));
      return;
    }
    try {
      await AsyncStorage.setItem("pendingAddressData", JSON.stringify({
        areaId: selectedArea.id,
        areaName: selectedArea.name,
        blockNumber,
        street,
        houseBuliding,
        floorApartment,
        remarks,
        deliveryNotes,
        addressCategory,
        isPrimary,
      }));
      router.push("/auth/preferred-time" as any);
    } catch {
      Alert.alert(t("common.error"), t("address.save_error"));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, isArabic && styles.rtlText]}>{t("address.title")}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Area Picker */}
          <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("address.select_area")} <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.pickerButton, isArabic && styles.rtlRow]}
            onPress={() => !areasLoading && setShowAreaModal(true)}
            disabled={areasLoading}
          >
            {areasLoading ? (
              <ActivityIndicator size="small" color="#6B7F75" />
            ) : (
              <Text style={[styles.pickerText, isArabic && styles.rtlText, !selectedArea && styles.pickerPlaceholder]}>
                {selectedArea ? (i18n.language === "ar" && selectedArea.name_ar ? selectedArea.name_ar : selectedArea.name) : t("address.select_area")}
              </Text>
            )}
            <Text style={styles.pickerChevron}>▾</Text>
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("address.block")} <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, isArabic && styles.rtlText]}
            placeholder={t("address.block")}
            placeholderTextColor="#6B7F75"
            value={blockNumber}
            onChangeText={setBlockNumber}
            keyboardType="numeric"
            textAlign={isArabic ? "right" : "left"}
          />

          <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("address.street")} <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, isArabic && styles.rtlText]}
            placeholder={t("address.street")}
            placeholderTextColor="#6B7F75"
            value={street}
            onChangeText={setStreet}
            textAlign={isArabic ? "right" : "left"}
          />

          <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("address.house")} <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, isArabic && styles.rtlText]}
            placeholder={t("address.house")}
            placeholderTextColor="#6B7F75"
            value={houseBuliding}
            onChangeText={setHouseBuliding}
            textAlign={isArabic ? "right" : "left"}
          />

          <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("address.apartment")} <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, isArabic && styles.rtlText]}
            placeholder={t("address.apartment")}
            placeholderTextColor="#6B7F75"
            value={floorApartment}
            onChangeText={setFloorApartment}
            textAlign={isArabic ? "right" : "left"}
          />

          <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("address.remarks")}</Text>
          <TextInput
            style={[styles.input, isArabic && styles.rtlText]}
            placeholder={t("address.remarks")}
            placeholderTextColor="#6B7F75"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            textAlign={isArabic ? "right" : "left"}
          />

          <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("address.delivery_notes_label")}</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline, isArabic && styles.rtlText]}
            placeholder={t("address.delivery_notes_placeholder")}
            placeholderTextColor="#6B7F75"
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            textAlign={isArabic ? "right" : "left"}
          />

          {/* Address Category */}
          <Text style={[styles.sectionLabel, isArabic && styles.rtlText]}>{t("address.category_title")}</Text>
          <View style={[styles.radioGroup, isArabic && styles.rtlRow]}>
            <TouchableOpacity style={[styles.radioOption, isArabic && styles.rtlRow]} onPress={() => setAddressCategory("home")}>
              <View style={styles.radioOuter}>
                {addressCategory === "home" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{t("address.home")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.radioOption, isArabic && styles.rtlRow]} onPress={() => setAddressCategory("office")}>
              <View style={styles.radioOuter}>
                {addressCategory === "office" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{t("address.office")}</Text>
            </TouchableOpacity>
          </View>

          {/* Save as Primary Address */}
          <View style={[styles.switchRow, isArabic && styles.rtlRow]}>
            <Text style={styles.switchLabel}>{t("address.primary_label")}</Text>
            <Switch
              value={isPrimary}
              onValueChange={setIsPrimary}
              trackColor={{ false: "#D4E8E0", true: "#7A9B7E" }}
              thumbColor={isPrimary ? "#344225" : "#f4f3f4"}
            />
          </View>

        </ScrollView>

        {/* Next Button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleNext}
          >
            <Text style={styles.checkoutButtonText}>{t("address.next")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Area Modal */}
      <Modal visible={showAreaModal} transparent animationType="slide" onRequestClose={() => setShowAreaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, isArabic && styles.rtlRow]}>
              <Text style={styles.modalTitle}>{t("address.select_area")}</Text>
              <TouchableOpacity onPress={() => setShowAreaModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={areas}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, selectedArea?.id === item.id && styles.modalItemSelected]}
                  onPress={() => { setSelectedArea(item); setShowAreaModal(false); }}
                >
                  <Text style={[styles.modalItemText, isArabic && styles.rtlText, selectedArea?.id === item.id && styles.modalItemTextSelected]}>
                    {i18n.language === "ar" && item.name_ar ? item.name_ar : item.name}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>{t("address.no_areas")}</Text>}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#D4E8E0" },
  content: { flex: 1 },
  rtlRow: { flexDirection: "row-reverse" },
  rtlText: { textAlign: "right" },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
  headerTextBlock: { flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: "5%", paddingBottom: 120 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#344225", marginBottom: 6, marginTop: 4 },
  required: { color: "#E53935", fontWeight: "700" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#344225",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#344225",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#B8D5C5",
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  pickerButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#B8D5C5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: { fontSize: 14, color: "#344225", flex: 1 },
  pickerPlaceholder: { color: "#6B7F75" },
  pickerChevron: { fontSize: 16, color: "#6B7F75", marginLeft: 8 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
    marginTop: 8,
    marginBottom: 12,
  },
  radioGroup: { flexDirection: "row", gap: 24, marginBottom: 16 },
  radioOption: { flexDirection: "row", alignItems: "center", gap: 8 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#344225" },
  radioLabel: { fontSize: 14, fontWeight: "500", color: "#344225" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 14, fontWeight: "500", color: "#344225" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#D4E8E0",
    paddingHorizontal: "5%",
    paddingVertical: 20,
  },
  checkoutButton: {
    backgroundColor: "#344225",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkoutButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  checkoutButtonDisabled: { opacity: 0.6 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0EDE6",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#344225" },
  modalClose: { fontSize: 18, color: "#6B7F75", fontWeight: "600" },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F7F3",
  },
  modalItemSelected: { backgroundColor: "#E8F4EC" },
  modalItemText: { fontSize: 14, color: "#344225" },
  modalItemTextSelected: { fontWeight: "700", color: "#344225" },
  modalEmpty: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    fontSize: 14,
    color: "#6B7F75",
    textAlign: "center",
  },
});
