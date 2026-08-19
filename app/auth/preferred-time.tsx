import type { Duration } from "@/api";
import { apiClient } from "@/api/client";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TimeSlot = { value: string; label_en: string; label_ar: string };

export default function PreferredTimeScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const insets = useSafeAreaInsets();

  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setSlotsLoading(true);
    try {
      const resp = await apiClient.get("/v1/settings");
      const inner = (resp as any)?.data ?? resp;
      const slots: TimeSlot[] = (inner as any)?.delivery_time_slots ?? [];
      if (slots.length > 0) {
        setTimeSlots(slots);
        setSelectedSlot(slots[0].value);
      }
    } catch {
      // slots stay empty
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedSlot) {
      Alert.alert(t("common.error"), t("preferred_time.select_slot_error"));
      return;
    }
    setLoading(true);
    try {
      const addressDataStr = await AsyncStorage.getItem("pendingAddressData");
      if (!addressDataStr) {
        Alert.alert(t("common.error"), t("preferred_time.address_not_found"));
        return;
      }
      const addressData = JSON.parse(addressDataStr);

      const planData = await AsyncStorage.getItem("selectedPlan");
      const durationData = await AsyncStorage.getItem("selectedDuration");
      const daysData = await AsyncStorage.getItem("selectedDays");
      const dateData = await AsyncStorage.getItem("startDate");
      const mealsData = await AsyncStorage.getItem("selectedDayMeals");
      const couponData = await AsyncStorage.getItem("appliedCoupon");
      const userId = await AsyncStorage.getItem("userId");
      const storedUserData = await AsyncStorage.getItem("userData");
      const hasPersonalizedPlanFlag = await AsyncStorage.getItem("hasPersonalizedPlan");
      const personalizedProteinStr = await AsyncStorage.getItem("personalizedProtein");
      const personalizedCarbsStr = await AsyncStorage.getItem("personalizedCarbs");
      const personalizedProteinExtraPrice = await AsyncStorage.getItem("personalizedProteinExtraPrice");
      const proteinOptionsRaw = await AsyncStorage.getItem("proteinOptionsData");

      if (!planData || !durationData || !daysData || !dateData || !mealsData) {
        Alert.alert(t("common.error"), t("preferred_time.subscription_not_found"));
        return;
      }
      if (!userId) {
        Alert.alert(t("common.error"), t("select_meals.error_user_not_found"));
        router.replace("/auth");
        return;
      }

      const selectedPlan = JSON.parse(planData);
      const selectedDuration: Duration = JSON.parse(durationData);
      const selectedDays: number[] = JSON.parse(daysData);
      const startDate = dateData;
      const dayMeals = JSON.parse(mealsData);
      const appliedCoupon = couponData ? JSON.parse(couponData) : null;

      if (!selectedPlan?.id) {
        Alert.alert(t("common.error"), t("preferred_time.invalid_plan"));
        return;
      }

      const parsedUser = storedUserData ? JSON.parse(storedUserData) : null;
      const userFirstName: string = parsedUser?.name || "";
      const userPhoneNumber: string = parsedUser?.mobile ? String(parsedUser.mobile) : "";

      const isPersonalized = hasPersonalizedPlanFlag === "true";
      const protein = isPersonalized && personalizedProteinStr ? parseFloat(personalizedProteinStr) : 0;
      const carbs = isPersonalized && personalizedCarbsStr ? parseFloat(personalizedCarbsStr) : 0;

      const basePrice =
        typeof selectedPlan.pricePerDay === "number"
          ? selectedPlan.pricePerDay
          : typeof selectedPlan.price === "number"
            ? selectedPlan.price
            : parseFloat(String(selectedPlan.price || "").replace(/[^0-9.]/g, "")) || 0;

      const calculateDiscount = (price: number) => {
        if (!appliedCoupon?.data) return 0;
        const { discount_type, discount_value } = appliedCoupon.data;
        if (discount_type === "percentage") return Math.max(0, price * (discount_value / 100));
        return Math.max(0, Math.min(price, discount_value));
      };
      const discountAmount = calculateDiscount(basePrice);

      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const selectedDaysArray = selectedDays.map((di) => dayNames[di]);

      let proteinExtra = 0;
      if (isPersonalized && protein > 0) {
        let extraPerMeal = 0;
        if (proteinOptionsRaw) {
          const opts: { protein_grams: number; extra_price_per_meal: string | number }[] = JSON.parse(proteinOptionsRaw);
          const match = opts.find((o) => o.protein_grams === protein);
          if (match) extraPerMeal = parseFloat(String(match.extra_price_per_meal)) || 0;
        }
        if (!extraPerMeal && personalizedProteinExtraPrice) {
          extraPerMeal = parseFloat(personalizedProteinExtraPrice) || 0;
        }
        if (extraPerMeal > 0) {
          const mealCount = selectedPlan.meal_count ?? selectedPlan.mealCount ?? 1;
          const planWeeks = Math.max(1, (selectedDuration as any)?.no_of_weeks ?? selectedPlan?.no_of_weeks ?? 1);
          proteinExtra = extraPerMeal * (mealCount || 1) * selectedDays.length * planWeeks;
        }
      }

      const totalPrice = Math.max(0, basePrice - discountAmount) + proteinExtra;

      const mealsArray: { day: string; meal_id: number; type: "is meal" | "is snack"; extra_ingredient_ids?: number[] }[] = [];
      const pushMeal = (dayName: string, item: any, type: "is meal" | "is snack") => {
        if (!item?.id) return;
        const entry: { day: string; meal_id: number; type: "is meal" | "is snack"; extra_ingredient_ids?: number[] } = {
          day: dayName,
          meal_id: parseInt(item.id, 10),
          type,
        };
        if (Array.isArray(item.selectedExtraIds) && item.selectedExtraIds.length > 0) {
          entry.extra_ingredient_ids = item.selectedExtraIds;
        }
        mealsArray.push(entry);
      };
      Object.keys(dayMeals).forEach((dayIndexStr) => {
        const di = parseInt(dayIndexStr, 10);
        const dayName = dayNames[di];
        const dm = dayMeals[di];
        dm?.meals?.forEach((meal: any) => pushMeal(dayName, meal, "is meal"));
        dm?.snacks?.forEach((snack: any) => pushMeal(dayName, snack, "is snack"));
      });

      const [sYear, sMonth, sDay] = startDate.split("-").map(Number);

      let planId: number;
      if (typeof selectedPlan.id === "string") {
        planId = parseInt(selectedPlan.id, 10);
        if (Number.isNaN(planId) || planId <= 0) {
          Alert.alert(t("common.error"), t("preferred_time.invalid_plan_id"));
          return;
        }
      } else {
        planId = selectedPlan.id;
      }

      const preferredDeliverySlot = selectedSlot;
      const slotData = timeSlots.find((s) => s.value === preferredDeliverySlot);
      const preferredDeliverySlotLabel =
        i18n.language.startsWith("ar") && slotData?.label_ar
          ? slotData.label_ar
          : slotData?.label_en ?? preferredDeliverySlot;

      const checkoutPayload = {
        user_id: parseInt(userId, 10),
        subcrption_plans_id: planId,
        area_id: addressData.areaId,
        start_date: startDate,
        selected_days: selectedDaysArray,
        is_personalized: isPersonalized,
        ...(isPersonalized && protein > 0 && { protein, carbs: carbs || protein }),
        meals: mealsArray,
        ...(appliedCoupon?.code && { coupon_code: appliedCoupon.code }),
        currency: selectedPlan.currency || "KWD",
        address: {
          first_name: userFirstName,
          phone_number: userPhoneNumber,
          area: addressData.areaName,
          block_number: addressData.blockNumber,
          street: addressData.street,
          house_building: addressData.houseBuliding,
          floor_apartment: addressData.floorApartment,
          remarks: addressData.remarks,
          ...(addressData.deliveryNotes?.trim() && { delivery_notes: addressData.deliveryNotes.trim() }),
          category: addressData.addressCategory,
          is_primary: addressData.isPrimary,
          preferred_delivery_slot: preferredDeliverySlot,
        },
      };

      const endDateObj = new Date(sYear, sMonth - 1, sDay);
      endDateObj.setDate(endDateObj.getDate() + selectedDuration.no_of_weeks * 7);
      const formattedEndDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, "0")}-${String(endDateObj.getDate()).padStart(2, "0")}`;

      await AsyncStorage.setItem("pendingCheckoutData", JSON.stringify({
        payload: checkoutPayload,
        summary: {
          plan: selectedPlan,
          duration: selectedDuration,
          days: selectedDays,
          startDate,
          endDate: formattedEndDate,
          dayMeals,
          address: checkoutPayload.address,
          planPrice: basePrice,
          proteinExtra,
          vat: 0,
          totalPrice,
          discount: discountAmount,
          preferredDeliverySlotLabel,
        },
      }));

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
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, isArabic && styles.rtlText]}>{t("preferred_time.title")}</Text>
            <Text style={[styles.subtitle, isArabic && styles.rtlText]}>{t("preferred_time.subtitle")}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {slotsLoading ? (
            <ActivityIndicator size="large" color="#344225" style={{ marginVertical: 32 }} />
          ) : timeSlots.length === 0 ? (
            <Text style={styles.noSlots}>{t("preferred_time.no_slots")}</Text>
          ) : (
            <View style={styles.slotList}>
              {timeSlots.map((slot) => {
                const isActive = selectedSlot === slot.value;
                const label = i18n.language.startsWith("ar") ? slot.label_ar : slot.label_en;
                return (
                  <TouchableOpacity
                    key={slot.value}
                    style={[styles.slotCard, isArabic && styles.rtlRow, isActive && styles.slotCardActive]}
                    onPress={() => setSelectedSlot(slot.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.slotRadio, isActive && styles.slotRadioActive]}>
                      {isActive && <View style={styles.slotRadioInner} />}
                    </View>
                    <Text style={[styles.slotLabel, isArabic && styles.rtlText, isActive && styles.slotLabelActive]}>{label}</Text>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={22} color="#FAD979" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.continueButton, (loading || !selectedSlot) && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={loading || !selectedSlot}
          >
            <Text style={styles.continueButtonText}>
              {loading ? t("address.processing") : t("preferred_time.continue")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  title: { fontSize: 22, fontWeight: "700", color: "#344225" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: "5%", paddingTop: 16, paddingBottom: 120 },
  subtitle: {
    fontSize: 13,
    color: "#5A7C65",
    marginTop: 3,
    lineHeight: 18,
  },
  noSlots: {
    fontSize: 14,
    color: "#6B7F75",
    textAlign: "center",
    marginTop: 32,
  },
  slotList: { gap: 12 },
  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAD979",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: "#E8C94B",
    gap: 14,
  },
  slotCardActive: {
    borderColor: "#344225",
    backgroundColor: "#344225",
  },
  slotRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  slotRadioActive: { borderColor: "#FAD979" },
  slotRadioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#FAD979",
  },
  slotLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#344225",
  },
  slotLabelActive: { color: "#FAD979", fontWeight: "600" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#D4E8E0",
    paddingHorizontal: "5%",
    paddingVertical: 20,
  },
  continueButton: {
    backgroundColor: "#344225",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueButtonDisabled: { opacity: 0.5 },
  continueButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
