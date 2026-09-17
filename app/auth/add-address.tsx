import type { Area } from "@/api";
import { getAllAreas } from "@/api";
import { getAddresses, type Address } from "@/api/services/profile";
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

type ScreenMode = "choose" | "form";

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
  const [showAreaModal, setShowAreaModal] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [screenMode, setScreenMode] = useState<ScreenMode>("form");
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<number | null>(null);

  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setInitialLoading(true);
    const [areasResult, addressesResult] = await Promise.allSettled([
      getAllAreas(),
      getAddresses(),
    ]);

    const fetchedAreas = areasResult.status === "fulfilled" ? areasResult.value : [];
    setAreas(fetchedAreas);

    const fetchedAddresses =
      addressesResult.status === "fulfilled" && addressesResult.value.success
        ? addressesResult.value.data ?? []
        : [];
    setSavedAddresses(fetchedAddresses);
    setScreenMode(fetchedAddresses.length > 0 ? "choose" : "form");

    setInitialLoading(false);
  };

  const applySavedAddress = (addr: Address) => {
    setBlockNumber(addr.block_number ?? "");
    setStreet(addr.street ?? "");
    setHouseBuliding(addr.house_building ?? "");
    setFloorApartment(addr.floor_apartment ?? "");
    setRemarks(addr.remarks ?? "");
    setDeliveryNotes(addr.delivery_notes ?? "");
    setAddressCategory(addr.category ?? "home");
    setIsPrimary(addr.is_primary ?? false);
    setSelectedArea(areas.find((a) => a.name === addr.area) ?? null);
    setSelectedSavedAddressId(addr.id);
    setScreenMode("form");
  };

  const startNewAddress = () => {
    setBlockNumber("");
    setStreet("");
    setHouseBuliding("");
    setFloorApartment("");
    setRemarks("");
    setDeliveryNotes("");
    setAddressCategory("home");
    setIsPrimary(true);
    setSelectedArea(null);
    setSelectedSavedAddressId(null);
    setScreenMode("form");
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

  if (initialLoading) {
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

          <View style={styles.loadingCenter}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingTitle}>{t("address.loading_addresses")}</Text>
              <Text style={styles.loadingSubtitle}>{t("address.loading_addresses_sub")}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (screenMode === "choose") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextBlock}>
              <Text style={[styles.title, isArabic && styles.rtlText]}>{t("address.saved_addresses_title")}</Text>
              <Text style={[styles.subtitle, isArabic && styles.rtlText]}>{t("address.saved_addresses_desc")}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {savedAddresses.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                style={styles.savedAddrCard}
                onPress={() => applySavedAddress(addr)}
                activeOpacity={0.8}
              >
                <View style={[styles.addrCategoryRow, isArabic && styles.rtlRow]}>
                  <Ionicons
                    name={addr.category === "home" ? "home-outline" : "briefcase-outline"}
                    size={14}
                    color="#5A7C65"
                  />
                  <Text style={styles.addrCategory}>
                    {addr.category === "home" ? t("address.home") : t("address.office")}
                  </Text>
                  {addr.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>{t("address.primary_badge")}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.addrDetails}>
                  {(addr.first_name || addr.last_name) ? (
                    <View style={[styles.addrDetailRow, isArabic && styles.rtlRow]}>
                      <Text style={styles.addrDetailLabel}>{t("address.first_name")}</Text>
                      <Text style={[styles.addrDetailValue, isArabic && styles.rtlText]}>
                        {[addr.first_name, addr.last_name].filter(Boolean).join(" ")}
                      </Text>
                    </View>
                  ) : null}
                  {addr.area ? (
                    <View style={[styles.addrDetailRow, isArabic && styles.rtlRow]}>
                      <Text style={styles.addrDetailLabel}>{t("address.select_area")}</Text>
                      <Text style={[styles.addrDetailValue, isArabic && styles.rtlText]}>{addr.area}</Text>
                    </View>
                  ) : null}
                  {addr.block_number ? (
                    <View style={[styles.addrDetailRow, isArabic && styles.rtlRow]}>
                      <Text style={styles.addrDetailLabel}>{t("address.block")}</Text>
                      <Text style={[styles.addrDetailValue, isArabic && styles.rtlText]}>{addr.block_number}</Text>
                    </View>
                  ) : null}
                  {addr.street ? (
                    <View style={[styles.addrDetailRow, isArabic && styles.rtlRow]}>
                      <Text style={styles.addrDetailLabel}>{t("address.street")}</Text>
                      <Text style={[styles.addrDetailValue, isArabic && styles.rtlText]}>{addr.street}</Text>
                    </View>
                  ) : null}
                  {addr.house_building ? (
                    <View style={[styles.addrDetailRow, isArabic && styles.rtlRow]}>
                      <Text style={styles.addrDetailLabel}>{t("address.house")}</Text>
                      <Text style={[styles.addrDetailValue, isArabic && styles.rtlText]}>{addr.house_building}</Text>
                    </View>
                  ) : null}
                  {addr.floor_apartment ? (
                    <View style={[styles.addrDetailRow, isArabic && styles.rtlRow]}>
                      <Text style={styles.addrDetailLabel}>{t("address.apartment")}</Text>
                      <Text style={[styles.addrDetailValue, isArabic && styles.rtlText]}>{addr.floor_apartment}</Text>
                    </View>
                  ) : null}
                  {addr.phone_number ? (
                    <View style={[styles.addrDetailRow, isArabic && styles.rtlRow]}>
                      <Text style={styles.addrDetailLabel}>{t("address.phone")}</Text>
                      <Text style={[styles.addrDetailValue, isArabic && styles.rtlText]}>{addr.phone_number}</Text>
                    </View>
                  ) : null}
                  {addr.remarks ? (
                    <View style={[styles.addrDetailRow, isArabic && styles.rtlRow]}>
                      <Text style={styles.addrDetailLabel}>{t("address.remarks")}</Text>
                      <Text style={[styles.addrDetailValue, isArabic && styles.rtlText]}>{addr.remarks}</Text>
                    </View>
                  ) : null}
                  {addr.delivery_notes ? (
                    <View style={[styles.addrDetailRow, isArabic && styles.rtlRow]}>
                      <Text style={styles.addrDetailLabel}>{t("address.delivery_notes_label")}</Text>
                      <Text style={[styles.addrDetailValue, isArabic && styles.rtlText]}>{addr.delivery_notes}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.useAddrRow, isArabic && styles.rtlRow]}>
                  <Text style={styles.useAddrText}>{t("address.use_address")}</Text>
                  <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={16} color="#344225" />
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.addAddrBtn} onPress={startNewAddress}>
              <Ionicons name="add-circle-outline" size={20} color="#344225" />
              <Text style={styles.addAddrBtnText}>{t("address.add_new_address")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, isArabic && styles.rtlText]}>
              {selectedSavedAddressId ? t("address.title") : (savedAddresses.length > 0 ? t("address.new_address_title") : t("address.title"))}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {savedAddresses.length > 0 && (
            <TouchableOpacity style={styles.changeAddressLink} onPress={() => setScreenMode("choose")}>
              <Ionicons name={isArabic ? "chevron-forward" : "chevron-back"} size={16} color="#344225" />
              <Text style={styles.changeAddressLinkText}>{t("address.change_address")}</Text>
            </TouchableOpacity>
          )}

          {/* Area Picker */}
          <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t("address.select_area")} <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.pickerButton, isArabic && styles.rtlRow]}
            onPress={() => setShowAreaModal(true)}
          >
            <Text style={[styles.pickerText, isArabic && styles.rtlText, !selectedArea && styles.pickerPlaceholder]}>
              {selectedArea ? (i18n.language === "ar" && selectedArea.name_ar ? selectedArea.name_ar : selectedArea.name) : t("address.select_area")}
            </Text>
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

  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingTitle: { fontSize: 15, fontWeight: "700", color: "#344225", marginTop: 16, textAlign: "center" },
  loadingSubtitle: { fontSize: 12, color: "#6B7F75", marginTop: 6, textAlign: "center" },

  subtitle: { fontSize: 13, fontWeight: "400", color: "#5A7C65", marginTop: 4 },

  savedAddrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DDE9E4",
  },
  addrCategoryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  addrCategory: { fontSize: 12, fontWeight: "700", color: "#5A7C65", textTransform: "uppercase" },
  primaryBadge: {
    backgroundColor: "#FAD979",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  primaryBadgeText: { fontSize: 10, fontWeight: "700", color: "#344225" },
  addrDetails: { gap: 6 },
  addrDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  addrDetailLabel: { fontSize: 12, color: "#6B7F75", flexShrink: 0 },
  addrDetailValue: { fontSize: 13, fontWeight: "600", color: "#344225", flex: 1, textAlign: "right" },
  useAddrRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F7F3",
  },
  useAddrText: { fontSize: 13, fontWeight: "700", color: "#344225" },
  addAddrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 4,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#344225",
    borderStyle: "dashed",
  },
  addAddrBtnText: { fontSize: 14, fontWeight: "700", color: "#344225" },
  changeAddressLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  changeAddressLinkText: { fontSize: 13, fontWeight: "600", color: "#344225" },
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
