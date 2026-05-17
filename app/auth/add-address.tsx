import type { Area, Duration } from "@/api";
import { getAllAreas } from "@/api";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddAddressScreen() {
  const { t } = useTranslation();
  const [blockNumber, setBlockNumber] = useState("");
  const [street, setStreet] = useState("");
  const [houseBuliding, setHouseBuliding] = useState("");
  const [floorApartment, setFloorApartment] = useState("");
  const [remarks, setRemarks] = useState("");
  const [addressCategory, setAddressCategory] = useState<"home" | "office">("home");
  const [isPrimary, setIsPrimary] = useState(true);
  const [deliveryTime, setDeliveryTime] = useState<"4pm-8pm" | "8pm-12am">("4pm-8pm");
  const [loading, setLoading] = useState(false);

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

  const handleCheckout = async () => {
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
    setLoading(true);
    try {
      const planData = await AsyncStorage.getItem("selectedPlan");
      const durationData = await AsyncStorage.getItem("selectedDuration");
      const daysData = await AsyncStorage.getItem("selectedDays");
      const dateData = await AsyncStorage.getItem("startDate");
      const mealsData = await AsyncStorage.getItem("selectedDayMeals");
      const couponData = await AsyncStorage.getItem("appliedCoupon");

      if (!planData || !durationData || !daysData || !dateData || !mealsData) {
        Alert.alert(t("common.error"), "Subscription data not found. Please start over.");
        return;
      }

      const selectedPlan = JSON.parse(planData);
      const selectedDuration: Duration = JSON.parse(durationData);
      const selectedDays: number[] = JSON.parse(daysData);
      const startDate = dateData;
      const dayMeals = JSON.parse(mealsData);
      const appliedCoupon = couponData ? JSON.parse(couponData) : null;

      if (!selectedPlan || !selectedPlan.id) {
        Alert.alert(t("common.error"), "Subscription plan data is invalid. Please select a plan again.");
        return;
      }

      const start = new Date(startDate);
      const endDate = new Date(start);
      endDate.setDate(start.getDate() + selectedDuration.no_of_weeks * 7);

      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        Alert.alert(t("common.error"), t("select_meals.error_user_not_found"));
        router.replace("/auth");
        return;
      }

      const storedUserData = await AsyncStorage.getItem("userData");
      const parsedUser = storedUserData ? JSON.parse(storedUserData) : null;
      const userFirstName: string = parsedUser?.name || "";
      const userPhoneNumber: string = parsedUser?.mobile ? String(parsedUser.mobile) : "";

      const basePrice =
        typeof selectedPlan.pricePerDay === "number"
          ? selectedPlan.pricePerDay
          : typeof selectedPlan.price === "number"
            ? selectedPlan.price
            : parseFloat(String(selectedPlan.price || "").replace(/[^0-9.]/g, "")) || 0;

      const calculateDiscount = (price: number) => {
        if (!appliedCoupon?.data) return 0;
        const { discount_type, discount_value } = appliedCoupon.data;
        if (discount_type === "percentage") {
          return Math.max(0, price * (discount_value / 100));
        }
        return Math.max(0, Math.min(price, discount_value));
      };

      const discountAmount = calculateDiscount(basePrice);
      const planPrice = Math.max(0, basePrice - discountAmount);
      const totalPrice = planPrice;

      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const selectedDaysArray = selectedDays.map((dayIndex) => dayNames[dayIndex]);

      const mealsArray: { day: string; meal_id: number; type: "is meal" | "is snack" }[] = [];
      Object.keys(dayMeals).forEach((dayIndexStr) => {
        const dayIndex = parseInt(dayIndexStr, 10);
        const dayName = dayNames[dayIndex];
        const dayMealData = dayMeals[dayIndex];

        if (dayMealData?.meals) {
          dayMealData.meals.forEach((meal: any) => {
            if (meal?.id) {
              mealsArray.push({ day: dayName, meal_id: parseInt(meal.id, 10), type: "is meal" });
            }
          });
        }
        if (dayMealData?.snacks) {
          dayMealData.snacks.forEach((snack: any) => {
            if (snack?.id) {
              mealsArray.push({ day: dayName, meal_id: parseInt(snack.id, 10), type: "is snack" });
            }
          });
        }
      });

      const startDateObj = new Date(startDate);
      const formattedStartDate = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, "0")}-${String(startDateObj.getDate()).padStart(2, "0")}`;

      let planId: number;
      if (typeof selectedPlan.id === "string") {
        const parsedId = parseInt(selectedPlan.id, 10);
        if (Number.isNaN(parsedId) || parsedId <= 0) {
          Alert.alert(t("common.error"), "Invalid subscription plan ID. Please select a plan again.");
          return;
        }
        planId = parsedId;
      } else if (typeof selectedPlan.id === "number") {
        planId = selectedPlan.id;
      } else {
        Alert.alert(t("common.error"), "Invalid subscription plan ID format. Please select a plan again.");
        return;
      }

      const hasPersonalizedPlan = await AsyncStorage.getItem("hasPersonalizedPlan");
      const personalizedProtein = await AsyncStorage.getItem("personalizedProtein");
      const personalizedCarbs = await AsyncStorage.getItem("personalizedCarbs");

      const isPersonalized = hasPersonalizedPlan === "true";
      const protein = isPersonalized && personalizedProtein ? parseFloat(personalizedProtein) : 0;
      const carbs = isPersonalized && personalizedCarbs ? parseFloat(personalizedCarbs) : 0;

      const preferredDeliverySlot =
        deliveryTime === "4pm-8pm" ? "four_pm_to_eight_pm" : "eight_pm_to_midnight";

      const checkoutPayload = {
        user_id: parseInt(userId, 10),
        subcrption_plans_id: planId,
        duration_id: Number(selectedDuration.id),
        selected_days: selectedDaysArray,
        start_date: formattedStartDate,
        price: Math.round(totalPrice),
        is_personalized: isPersonalized,
        protein,
        carbs,
        meals: mealsArray,
        area_id: selectedArea.id,
        ...(appliedCoupon?.code && { coupon_code: appliedCoupon.code }),
        address: {
          first_name: userFirstName,
          phone_number: userPhoneNumber,
          area: selectedArea.name,
          block_number: blockNumber,
          street,
          house_building: houseBuliding,
          floor_apartment: floorApartment,
          remarks,
          category: addressCategory,
          is_primary: isPrimary,
          preferred_delivery_slot: preferredDeliverySlot,
        },
        amount: totalPrice,
        currency: selectedPlan.currency || "KWD",
      };

      const checkoutDraft = {
        payload: checkoutPayload,
        summary: {
          plan: selectedPlan,
          duration: selectedDuration,
          days: selectedDays,
          startDate,
          endDate: endDate.toISOString(),
          dayMeals,
          address: checkoutPayload.address,
          planPrice,
          vat: 0,
          totalPrice,
          discount: discountAmount,
        },
      };

      await AsyncStorage.setItem("pendingCheckoutData", JSON.stringify(checkoutDraft));
      router.push("/auth/payment" as any);
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : t("checkout.error_validate_failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t("address.title")}</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Area Picker */}
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => !areasLoading && setShowAreaModal(true)}
            disabled={areasLoading}
          >
            {areasLoading ? (
              <ActivityIndicator size="small" color="#6B7F75" />
            ) : (
              <Text style={[styles.pickerText, !selectedArea && styles.pickerPlaceholder]}>
                {selectedArea ? selectedArea.name : t("address.select_area")}
              </Text>
            )}
            <Text style={styles.pickerChevron}>▾</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={t("address.block")}
            placeholderTextColor="#6B7F75"
            value={blockNumber}
            onChangeText={setBlockNumber}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder={t("address.street")}
            placeholderTextColor="#6B7F75"
            value={street}
            onChangeText={setStreet}
          />

          <TextInput
            style={styles.input}
            placeholder={t("address.house")}
            placeholderTextColor="#6B7F75"
            value={houseBuliding}
            onChangeText={setHouseBuliding}
          />

          <TextInput
            style={styles.input}
            placeholder={t("address.apartment")}
            placeholderTextColor="#6B7F75"
            value={floorApartment}
            onChangeText={setFloorApartment}
          />

          <TextInput
            style={styles.input}
            placeholder={t("address.remarks")}
            placeholderTextColor="#6B7F75"
            value={remarks}
            onChangeText={setRemarks}
            multiline
          />

          {/* Address Category */}
          <Text style={styles.sectionLabel}>{t("address.category_title")}</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioOption} onPress={() => setAddressCategory("home")}>
              <View style={styles.radioOuter}>
                {addressCategory === "home" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{t("address.home")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.radioOption} onPress={() => setAddressCategory("office")}>
              <View style={styles.radioOuter}>
                {addressCategory === "office" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{t("address.office")}</Text>
            </TouchableOpacity>
          </View>

          {/* Save as Primary Address */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t("address.primary_label")}</Text>
            <Switch
              value={isPrimary}
              onValueChange={setIsPrimary}
              trackColor={{ false: "#D4E8E0", true: "#7A9B7E" }}
              thumbColor={isPrimary ? "#344225" : "#f4f3f4"}
            />
          </View>

          {/* Delivery Time */}
          <Text style={styles.sectionLabel}>{t("address.delivery_time_title")}</Text>
          <View style={styles.timeButtonGroup}>
            <TouchableOpacity
              style={[styles.timeButton, deliveryTime === "4pm-8pm" && styles.timeButtonActiveYellow]}
              onPress={() => setDeliveryTime("4pm-8pm")}
            >
              <Text style={[styles.timeButtonText, deliveryTime === "4pm-8pm" && styles.timeButtonTextActive]}>
                {t("address.time_4_8")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.timeButton, deliveryTime === "8pm-12am" && styles.timeButtonActiveYellow]}
              onPress={() => setDeliveryTime("8pm-12am")}
            >
              <Text style={[styles.timeButtonText, deliveryTime === "8pm-12am" && styles.timeButtonTextActive]}>
                {t("address.time_8_12")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Checkout Button */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
            onPress={handleCheckout}
            disabled={loading}
          >
            <Text style={styles.checkoutButtonText}>
              {loading ? t("address.processing") : t("address.checkout")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Area Modal */}
      <Modal visible={showAreaModal} transparent animationType="slide" onRequestClose={() => setShowAreaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
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
                  <Text style={[styles.modalItemText, selectedArea?.id === item.id && styles.modalItemTextSelected]}>
                    {item.name}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: "5%",
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { fontSize: 20, color: "#FFFFFF", fontWeight: "600" },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: "5%", paddingBottom: 120 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#344225",
    flex: 1,
    textAlign: "center",
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
  timeButtonGroup: { flexDirection: "row", gap: 12, marginBottom: 20 },
  timeButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B8D5C5",
  },
  timeButtonActiveYellow: { backgroundColor: "#FAD979", borderColor: "#FAD979" },
  timeButtonActiveGreen: { backgroundColor: "#344225", borderColor: "#344225" },
  timeButtonText: { fontSize: 14, fontWeight: "600", color: "#344225" },
  timeButtonTextGreen: { fontSize: 14, fontWeight: "600", color: "#344225" },
  timeButtonTextActive: { color: "#344225" },
  timeButtonTextActiveWhite: { color: "#FFFFFF" },
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
