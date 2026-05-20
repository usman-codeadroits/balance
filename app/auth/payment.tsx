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
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DurationSummary = {
  id?: number | string;
  title?: string;
  no_of_weeks: number;
};

type CheckoutDraft = {
  payload: CheckoutRequest & {
    address: NonNullable<CheckoutRequest["address"]>;
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
    proteinExtra?: number;
    vat: number;
    totalPrice: number;
    discount?: number;
  };
};

export default function PaymentScreen() {
  const { t } = useTranslation();
  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [ccvNumber, setCcvNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "debit_card" | "credit_card">("debit_card");
  const [processing, setProcessing] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(
    null,
  );
  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem("pendingCheckoutData");
        if (stored) {
          setCheckoutDraft(JSON.parse(stored));
        }
      } catch (error) {
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
        } as CheckoutDraft["payload"],
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

    const expiryDetails = parseExpiry(expiryDate);

    if (paymentMethod !== "cash") {
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
      const rawDays = checkoutDraft.payload.selected_days;
      const selectedDaysArray: string[] = Array.isArray(rawDays)
        ? rawDays
        : typeof rawDays === "string"
          ? rawDays.split(",").map((d: string) => d.trim()).filter(Boolean)
          : [];

      const rawStartDate = checkoutDraft.payload.start_date;
      const startDateObj = new Date(rawStartDate);
      const localStartDate = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, "0")}-${String(startDateObj.getDate()).padStart(2, "0")}`;

      const storedPayload = checkoutDraft.payload;
      const isPersonalized = storedPayload.is_personalized ?? false;
      const paymentCheckoutPayload: any = {
        user_id: storedPayload.user_id,
        subcrption_plans_id: storedPayload.subcrption_plans_id,
        area_id: storedPayload.area_id,
        start_date: localStartDate,
        selected_days: selectedDaysArray,
        payment_method: paymentMethod,
        is_personalized: isPersonalized,
        ...(isPersonalized && {
          protein: storedPayload.protein ?? 0,
          carbs: storedPayload.carbs ?? storedPayload.protein ?? 0,
        }),
        meals: storedPayload.meals ?? [],
        address: storedPayload.address,
        ...(storedPayload.currency && { currency: storedPayload.currency }),
        ...((storedPayload as any).coupon_code && { coupon_code: (storedPayload as any).coupon_code }),
        ...(paymentMethod !== "cash" && {
          card_holder_name: nameOnCard.trim(),
          card_number: sanitizeCardNumber(cardNumber),
          card_expiry_month: expiryDetails!.month,
          card_expiry_year: expiryDetails!.year,
          card_cvv: ccvNumber,
          save_card: saveCard,
        }),
      };

      // Call payment checkout API
      const response = await apiClient.post(
        "/v1/payment/checkout",
        paymentCheckoutPayload,
      );

      // Handle success:false (422 validation or 502 payment failure)
      if ((response as any)?.success === false) {
        const apiMsg = (response as any)?.message || t("payment.alerts.failed_msg");
        const errors = (response as any)?.errors;
        const errorDetail = errors
          ? Object.values(errors).flat().join("\n")
          : "";
        Alert.alert(
          t("payment.alerts.failed_title"),
          errorDetail ? `${apiMsg}\n\n${errorDetail}` : apiMsg,
        );
        setProcessing(false);
        return;
      }

      // Process successful payment
      const responseData = (response as any)?.data || response;
      await handlePaymentSuccess(responseData, paymentCheckoutPayload);
    } catch (error: any) {
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
      // Response shape: { payment: { status, method, amount, ... }, subscription: { ... } }
      const paymentInfo = response?.payment;
      const subscriptionRaw = response?.subscription || response?.data?.subscription;
      const subscriptionData =
        subscriptionRaw?.user_subscription ||
        subscriptionRaw ||
        response?.user_subscription ||
        response;

      if (!subscriptionData) {
        throw new Error("Invalid response from server");
      }

      if (subscriptionRaw?.subscription_days && !subscriptionData.subscription_days) {
        subscriptionData.subscription_days = subscriptionRaw.subscription_days;
      }
      if (subscriptionRaw?.subscription_meals && !subscriptionData.subscription_meals) {
        subscriptionData.subscription_meals = subscriptionRaw.subscription_meals;
      }

      const apiPaymentStatus = paymentInfo?.status?.toLowerCase();
      const paymentStatus: "paid" | "pending" =
        apiPaymentStatus === "paid" ? "paid" : "pending";

      await persistSubscriptionLocally(subscriptionData, paymentStatus, checkoutDraft.payload);

      const isCash = paymentInfo?.method === "cash" || payload?.payment_method === "cash";
      const successTitle = isCash ? "Order Placed" : t("payment.alerts.success_title");
      const successMsg = isCash
        ? "Order placed successfully. Cash will be collected on delivery."
        : t("payment.alerts.success_msg");

      Alert.alert(successTitle, successMsg, [
        { text: t("nav.home"), onPress: () => router.replace("/(tabs)/" as any) },
      ]);
    } catch (error) {
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
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
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
          {/* Payment Method */}
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <View style={styles.paymentMethodGroup}>
            {([
              { key: "cash", label: "Cash", icon: "💵", desc: "We will collect cash from you" },
              { key: "debit_card", label: "Debit Card", icon: "💳", desc: "" },
              { key: "credit_card", label: "Credit Card", icon: "🏦", desc: "" },
            ] as const).map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[styles.paymentMethodItem, paymentMethod === method.key && styles.paymentMethodItemSelected]}
                onPress={() => setPaymentMethod(method.key)}
              >
                <View style={styles.paymentMethodLeft}>
                  <View style={styles.paymentMethodRadioOuter}>
                    {paymentMethod === method.key && <View style={styles.paymentMethodRadioInner} />}
                  </View>
                  <View>
                    <Text style={styles.paymentMethodLabel}>{method.label}</Text>
                    {method.desc ? <Text style={styles.paymentMethodDesc}>{method.desc}</Text> : null}
                  </View>
                </View>
                <Text style={styles.paymentMethodIcon}>{method.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Card Details — hidden for cash */}
          {paymentMethod !== "cash" && (
            <>
              <Text style={styles.sectionLabel}>{t("payment.card_details")}</Text>

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
                  onChangeText={(text) => setExpiryDate(formatExpiryInput(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <View style={styles.saveCardRow}>
                <Text style={styles.saveCardText}>{t("payment.save_card")}</Text>
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

            {/* Base plan price (before discount) */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("payment.plan_total")}</Text>
              <Text style={styles.summaryValue}>
                {checkoutDraft.payload.currency}{" "}
                {checkoutDraft.summary.planPrice.toFixed(3)}
              </Text>
            </View>

            {/* Protein upgrade — uses value stored by add-address.tsx */}
            {checkoutDraft.payload.is_personalized &&
              (checkoutDraft.summary.proteinExtra ?? 0) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Protein Upgrade ({checkoutDraft.payload.protein}g)
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#FAD979" }]}>
                    + {checkoutDraft.payload.currency}{" "}
                    {(checkoutDraft.summary.proteinExtra ?? 0).toFixed(3)}
                  </Text>
                </View>
              )}

            {/* Discount row */}
            {(checkoutDraft.summary.discount ?? 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, { color: "#7ED321" }]}>
                  - {checkoutDraft.payload.currency}{" "}
                  {(checkoutDraft.summary.discount ?? 0).toFixed(3)}
                </Text>
              </View>
            )}

            {/* Delivery */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("checkout.delivery_fee")}</Text>
              <Text style={styles.summaryValue}>{t("checkout.free")}</Text>
            </View>

            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>{t("payment.amount_due")}</Text>
              <Text style={styles.summaryTotalValue}>
                {checkoutDraft.payload.currency}{" "}
                {checkoutDraft.summary.totalPrice.toFixed(3)}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[
              styles.payButton,
              (processing || !checkoutDraft) && styles.payButtonDisabled,
            ]}
            onPress={handlePayNow}
            disabled={processing || !checkoutDraft}
          >
            <Text style={styles.payButtonText}>
              {processing ? t("payment.processing") : paymentMethod === "cash" ? "Place Order" : t("payment.pay_now")}
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
  paymentMethodGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  paymentMethodItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F7F3",
  },
  paymentMethodItemSelected: {
    backgroundColor: "#F4FAF6",
  },
  paymentMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentMethodRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#344225",
  },
  paymentMethodLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#344225",
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: "#6B7F75",
    marginTop: 2,
  },
  paymentMethodIcon: {
    fontSize: 28,
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
