import { apiClient } from "@/api/client";
import type { CheckoutRequest } from "@/api/services/subscriptions";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import { DEMO_SUBSCRIPTION_FLAG } from "@/constants/dummy-subscription";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type DurationSummary = {
  id?: number | string;
  title?: string;
  no_of_weeks: number;
};

type CheckoutDraft = {
  payload: CheckoutRequest & {
    address: NonNullable<CheckoutRequest["address"]>;
    amount: number;
    currency: string;
  };
  summary: {
    plan: any;
    duration: DurationSummary;
    days: number[];
    startDate: string;
    endDate: string;
    dayMeals: Record<string, any>;
    address: NonNullable<CheckoutRequest["address"]>;
    planPrice: number;
    vat: number;
    totalPrice: number;
  };
};

export default function PaymentScreen() {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<
    "credit" | "tabby" | "apple"
  >("credit");
  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [ccvNumber, setCcvNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(
    null,
  );
  useStaticScreen();

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem("pendingCheckoutData");
        if (stored) {
          setCheckoutDraft(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Failed to load checkout draft:", error);
      } finally {
        setDraftLoading(false);
      }
    };

    loadDraft();
  }, []);

  const sanitizeCardNumber = (value: string) => value.replace(/\s+/g, "");

  const formatExpiryInput = (value: string) => {
    // Keep only digits and limit to 4 (MMYY)
    const digits = value.replace(/[^0-9]/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const parseExpiry = (value: string) => {
    if (!value) return null;
    // Accept formats: "MM/YY", "MMYY", "MM/YYYY"
    const digitsOnly = value.replace(/[^0-9]/g, "");
    if (digitsOnly.length < 4) return null;
    const month = digitsOnly.substring(0, 2);
    const yearPart = digitsOnly.substring(2);
    if (!/^(0[1-9]|1[0-2])$/.test(month)) return null;
    let year = yearPart;
    if (year.length === 2) {
      year = `20${year}`;
    }
    // If year is longer than 4 digits, trim to 4
    if (year.length > 4) year = year.substring(0, 4);
    return { month, year };
  };

  const persistSubscriptionLocally = async (
    subscriptionData: any,
    paymentStatus: "paid" | "pending",
    payload: CheckoutRequest,
  ) => {
    if (!checkoutDraft) {
      return;
    }

    const { summary } = checkoutDraft;
    const subscriptionStatus =
      subscriptionData.status === "active"
        ? "Active"
        : subscriptionData.status === "completed"
          ? "Completed"
          : subscriptionData.status === "cancelled"
            ? "Cancelled"
            : "Active";

    const subscription = {
      id: subscriptionData.id?.toString() || Date.now().toString(),
      plan: summary.plan,
      duration: summary.duration,
      days: summary.days,
      startDate: summary.startDate,
      endDate: summary.endDate,
      dayMeals: summary.dayMeals,
      address: summary.address,
      planPrice: summary.planPrice,
      vat: summary.vat,
      totalPrice: summary.totalPrice,
      status: subscriptionStatus as "Active" | "Completed" | "Cancelled",
      paymentStatus,
      createdAt: subscriptionData.created_at || new Date().toISOString(),
    };

    if (subscriptionData.id) {
      await AsyncStorage.setItem(
        "userSubscriptionId",
        subscriptionData.id.toString(),
      );
    }

    if (
      subscriptionData.subscription_meals &&
      Array.isArray(subscriptionData.subscription_meals)
    ) {
      await AsyncStorage.setItem(
        "subscriptionMealsData",
        JSON.stringify(subscriptionData.subscription_meals),
      );
    }

    if (
      subscriptionData.subscription_days &&
      Array.isArray(subscriptionData.subscription_days)
    ) {
      await AsyncStorage.setItem(
        "subscriptionDaysData",
        JSON.stringify(subscriptionData.subscription_days),
      );
    }

    const subscriptionsData = await AsyncStorage.getItem("subscriptions");
    const subscriptions = subscriptionsData
      ? JSON.parse(subscriptionsData)
      : [];
    subscriptions.push(subscription);
    await AsyncStorage.setItem("subscriptions", JSON.stringify(subscriptions));
    await AsyncStorage.setItem(
      "activeSubscription",
      JSON.stringify(subscription),
    );
    await AsyncStorage.setItem(DEMO_SUBSCRIPTION_FLAG, "true");

    if (paymentStatus === "pending") {
      const updatedDraft: CheckoutDraft = {
        payload: {
          ...payload,
          payment: "pending",
          user_subscription_id: subscriptionData.id,
        },
        summary,
      };
      await AsyncStorage.setItem(
        "pendingCheckoutData",
        JSON.stringify(updatedDraft),
      );
    } else {
      await AsyncStorage.removeItem("pendingCheckoutData");
    }

    await AsyncStorage.multiRemove([
      "selectedPlan",
      "selectedDuration",
      "selectedDays",
      "startDate",
      "selectedDayMeals",
    ]);
  };

  const handleCheckoutResponse = async (
    response: any,
    payload: CheckoutRequest,
    attemptedPayment: "paid" | "pending",
  ) => {
    const responseBody = response?.data || response;
    const subscriptionData = responseBody?.user_subscription || responseBody;

    if (!subscriptionData) {
      throw new Error("Invalid response from server");
    }

    const paymentStatus =
      (subscriptionData.payment as string)?.toLowerCase() === "paid"
        ? "paid"
        : (subscriptionData.payment as string)?.toLowerCase() === "pending"
          ? "pending"
          : attemptedPayment;

    await persistSubscriptionLocally(
      subscriptionData,
      paymentStatus as "paid" | "pending",
      payload,
    );

    if (paymentStatus === "paid") {
      Alert.alert(t("payment.alerts.success_title"), t("payment.alerts.success_msg"), [
        {
          text: t("nav.home"),
          onPress: () => router.replace("/(tabs)/" as any),
        },
      ]);
    } else {
      Alert.alert(
        t("payment.alerts.pending_title"),
        t("payment.alerts.pending_msg"),
        [
          {
            text: t("nav.home"),
            onPress: () => router.replace("/(tabs)/" as any),
          },
        ],
        { cancelable: false },
      );
    }
  };

  const handlePayNow = async () => {
    if (!checkoutDraft) {
      Alert.alert(
        t("payment.alerts.no_sub_title"),
        t("payment.alerts.no_sub_msg"),
      );
      return;
    }

    let expiryDetails: { month: string; year: string } | null = null;

    if (paymentMethod === "credit") {
      expiryDetails = parseExpiry(expiryDate);
      if (
        !nameOnCard.trim() ||
        !cardNumber.trim() ||
        !ccvNumber.trim() ||
        !expiryDate.trim()
      ) {
        Alert.alert(t("payment.alerts.missing_details_title"), t("payment.alerts.missing_details_msg"));
        return;
      }

      if (!expiryDetails) {
        Alert.alert(
          t("payment.alerts.invalid_expiry_title"),
          t("payment.alerts.invalid_expiry_msg"),
        );
        return;
      }

      if (ccvNumber.length < 3) {
        Alert.alert(t("payment.alerts.invalid_cvv_title"), t("payment.alerts.invalid_cvv_msg"));
        return;
      }

      if (sanitizeCardNumber(cardNumber).length < 12) {
        Alert.alert(t("payment.alerts.invalid_card_title"), t("payment.alerts.invalid_card_msg"));
        return;
      }
    }

    setProcessing(true);

    try {
      // Build payment checkout payload
      const paymentCheckoutPayload: any = {
        user_id: parseInt(checkoutDraft.payload.user_id as string, 10),
        subcrption_plans_id: checkoutDraft.payload.subcrption_plans_id,
        duration_id: checkoutDraft.payload.duration_id,
        start_date: checkoutDraft.payload.start_date,
        amount: checkoutDraft.summary.totalPrice.toString(),
        currency: checkoutDraft.payload.currency || "KWD",
        card_holder_name: nameOnCard.trim(),
        card_number: sanitizeCardNumber(cardNumber),
        card_expiry_month: expiryDetails?.month || "",
        card_expiry_year: expiryDetails?.year || "",
        card_cvv: ccvNumber,
        save_card: saveCard,
        is_personalized: checkoutDraft.payload.is_personalized,
        selected_days: checkoutDraft.payload.selected_days,
        address: checkoutDraft.payload.address,
        meals: checkoutDraft.payload.meals,
      };

      // Add protein and carbs if personalized plan
      if (checkoutDraft.payload.is_personalized) {
        const protein = await AsyncStorage.getItem("personalizedProtein");
        const carbs = await AsyncStorage.getItem("personalizedCarbs");

        if (protein) paymentCheckoutPayload.protein = parseInt(protein, 10);
        if (carbs) paymentCheckoutPayload.carbs = parseInt(carbs, 10);
      }

      // Call payment checkout API
      const response = await apiClient.post(
        "/v1/payment/checkout",
        paymentCheckoutPayload,
      );

      if (response?.ok === false) {
        Alert.alert(
          t("payment.alerts.failed_title"),
          response?.message || t("payment.alerts.failed_msg"),
        );
        setProcessing(false);
        return;
      }

      // Process successful payment
      const responseData = response?.data || response;
      await handlePaymentSuccess(responseData, paymentCheckoutPayload);
    } catch (error) {
      console.error("Payment failed:", error);
      Alert.alert(
        t("payment.alerts.error_title"),
        error instanceof Error
          ? error.message
          : t("payment.alerts.error_msg"),
      );
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (response: any, payload: any) => {
    if (!checkoutDraft) return;

    try {
      const subscriptionData = response?.user_subscription || response;

      if (!subscriptionData) {
        throw new Error("Invalid response from server");
      }

      // Persist subscription locally
      await persistSubscriptionLocally(
        subscriptionData,
        "paid",
        checkoutDraft.payload,
      );

      Alert.alert(t("payment.alerts.success_title"), t("payment.alerts.success_msg"), [
        {
          text: t("nav.home"),
          onPress: () => router.replace("/(tabs)/" as any),
        },
      ]);
    } catch (error) {
      console.error("Failed to process payment response:", error);
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : t("selected_meals.error_save_failed"),
      );
    } finally {
      setProcessing(false);
    }
  };

  const renderShippingInfo = () => {
    if (!checkoutDraft?.summary?.address) {
      return null;
    }

    const address = checkoutDraft.summary.address;
    return (
      <>
        <Text style={styles.shippingName}>
          {address.first_name} {address.last_name}
        </Text>
        <Text style={styles.shippingAddress}>
          {address.area}, Block {address.block_number}, {address.street}
        </Text>
        <Text style={styles.shippingAddress}>
          {address.house_building}, {address.floor_apartment}
        </Text>
        <Text style={styles.shippingPhone}>{address.phone_number}</Text>
      </>
    );
  };

  if (draftLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#344225" />
        <Text style={styles.loadingText}>{t("payment.loading")}</Text>
      </SafeAreaView>
    );
  }

  if (!checkoutDraft) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t("payment.empty_title")}</Text>
        <Text style={styles.emptySubtitle}>
          {t("payment.empty_subtitle")}
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.replace("/auth/subscription" as any)}
        >
          <Text style={styles.createButtonText}>{t("payment.browse_plans")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>{t("payment.title")}</Text>
            <Text style={styles.subtitle}>
              {t("payment.subtitle")}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>{t("payment.payment_method")}</Text>

          <TouchableOpacity
            style={styles.paymentOption}
            onPress={() => setPaymentMethod("credit")}
          >
            <View style={styles.paymentLeft}>
              <View style={styles.creditCardIcon}>
                <View style={styles.masterCardCircle} />
                <View
                  style={[
                    styles.masterCardCircle,
                    styles.masterCardCircleOverlay,
                  ]}
                />
              </View>
              <Text style={styles.paymentText}>{t("payment.credit_card")}</Text>
            </View>
            <View style={styles.radioOuter}>
              {paymentMethod === "credit" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, styles.disabledPaymentOption]}
            disabled={true}
          >
            <View style={styles.paymentLeft}>
              <View style={styles.tabbyIcon}>
                <Text style={styles.tabbyText}>tabby</Text>
              </View>
              <Text style={[styles.paymentText, styles.disabledText]}>
                {t("payment.tabby")}
              </Text>
            </View>
            <View style={styles.radioOuter}>
              {paymentMethod === "tabby" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, styles.disabledPaymentOption]}
            disabled={true}
          >
            <View style={styles.paymentLeft}>
              <View style={styles.appleIcon}>
                <Ionicons name="logo-apple" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.paymentText, styles.disabledText]}>
                {t("payment.apple_pay")}
              </Text>
            </View>
            <View style={styles.radioOuter}>
              {paymentMethod === "apple" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {paymentMethod === "credit" && (
            <>
              <TextInput
                style={styles.input}
                placeholder={t("payment.name_on_card")}
                placeholderTextColor="#6B7F75"
                value={nameOnCard}
                onChangeText={setNameOnCard}
              />

              <TextInput
                style={styles.input}
                placeholder={t("payment.card_number")}
                placeholderTextColor="#6B7F75"
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.rowInput]}
                  placeholder={t("payment.ccv")}
                  placeholderTextColor="#6B7F75"
                  value={ccvNumber}
                  onChangeText={setCcvNumber}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TextInput
                  style={[styles.input, styles.rowInput]}
                  placeholder={t("payment.expiry")}
                  placeholderTextColor="#6B7F75"
                  value={expiryDate}
                  onChangeText={(text) =>
                    setExpiryDate(formatExpiryInput(text))
                  }
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.saveCardRow}>
                <Text style={styles.saveCardText}>
                  {t("payment.save_card")}
                </Text>
                <Switch
                  value={saveCard}
                  onValueChange={setSaveCard}
                  trackColor={{ false: "#D4E8E0", true: "#7A9B7E" }}
                  thumbColor={saveCard ? "#344225" : "#f4f3f4"}
                />
              </View>
            </>
          )}

          <View style={styles.shippingSection}>
            <View style={styles.shippingHeader}>
              <Text style={styles.shippingTitle}>{t("payment.delivery_title")}</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.editText}>{t("payment.edit")}</Text>
              </TouchableOpacity>
            </View>
            {renderShippingInfo()}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {t("payment.preferred_slot", { slot: checkoutDraft.summary.address.preferred_delivery_slot?.replace(/_/g, " ") })}
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t("payment.order_summary")}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("payment.plan_total")}</Text>
              <Text style={styles.summaryValue}>
                {checkoutDraft.payload.currency}{" "}
                {checkoutDraft.summary.planPrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("payment.vat_label", { percent: 10 })}</Text>
              <Text style={styles.summaryValue}>
                {checkoutDraft.payload.currency}{" "}
                {checkoutDraft.summary.vat.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>{t("payment.amount_due")}</Text>
              <Text style={styles.summaryTotalValue}>
                {checkoutDraft.payload.currency}{" "}
                {checkoutDraft.summary.totalPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.payButton,
              (processing || !checkoutDraft) && styles.payButtonDisabled,
            ]}
            onPress={handlePayNow}
            disabled={processing || !checkoutDraft}
          >
            <Text style={styles.payButtonText}>
              {processing ? t("payment.processing") : t("payment.pay_now")}
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
    paddingHorizontal: "5%",
    paddingTop: 10,
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
  headerPlaceholder: {
    width: 40,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#344225",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7F75",
    marginTop: 4,
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E8F0ED",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 12,
  },
  disabledPaymentOption: {
    opacity: 0.5,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  creditCardIcon: {
    width: 28,
    height: 20,
    position: "relative",
  },
  masterCardCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EB001B",
    position: "absolute",
    left: 0,
  },
  masterCardCircleOverlay: {
    backgroundColor: "#F79E1B",
    left: 8,
  },
  tabbyIcon: {
    width: 28,
    height: 20,
    backgroundColor: "#3EDFCF",
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  tabbyText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#000000",
  },
  appleIcon: {
    width: 28,
    height: 20,
    backgroundColor: "#000000",
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#344225",
  },
  disabledText: {
    color: "#999999",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#344225",
  },
  input: {
    backgroundColor: "#E8F0ED",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 14,
    color: "#344225",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowInput: {
    flex: 1,
  },
  saveCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 8,
  },
  saveCardText: {
    fontSize: 14,
    color: "#344225",
    fontWeight: "500",
  },
  shippingSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  shippingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
  },
  editText: {
    fontSize: 14,
    color: "#7A9B7E",
    fontWeight: "600",
  },
  shippingName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 4,
  },
  shippingAddress: {
    fontSize: 14,
    color: "#6B7F75",
    lineHeight: 20,
  },
  shippingPhone: {
    fontSize: 14,
    color: "#6B7F75",
    marginTop: 4,
  },
  badge: {
    marginTop: 12,
    backgroundColor: "#F4F7F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    color: "#344225",
    fontWeight: "500",
  },
  summaryCard: {
    backgroundColor: "#344225",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#C5D4CC",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  summaryTotal: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FAD979",
  },
  footer: {
    paddingHorizontal: "5%",
    paddingBottom: 40,
    paddingTop: 10,
  },
  payButton: {
    backgroundColor: "#FAD979",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#D4E8E0",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#344225",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "#D4E8E0",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7F75",
    marginBottom: 24,
    textAlign: "center",
  },
  createButton: {
    backgroundColor: "#344225",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
