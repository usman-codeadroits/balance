import { apiClient } from "@/api/client";
import type { CheckoutRequest } from "@/api/services/subscriptions";
import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import { DEMO_SUBSCRIPTION_FLAG } from "@/constants/dummy-subscription";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

// "redirect" = Hesabe hosted page (KNET, credit_card, debit_card)
// "offline"  = Cash on delivery
type PaymentMethod = {
  id: string;
  label: string;
  label_ar?: string | null;
  description: string;
  description_ar?: string | null;
  type: "redirect" | "offline" | string;
};

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
    preferredDeliverySlotLabel?: string;
  };
};

export default function PaymentScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [settingsLoading, setSettingsLoading] = useState(true);

  // WebView modal state
  const [showWebView, setShowWebView] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState("");
  const [webViewLoading, setWebViewLoading] = useState(true);
  const orderTokenRef = useRef<string>("");

  const [polling, setPolling] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ title: "", message: "", amount: "" });

  const showSuccess = (title: string, message: string) => {
    const amount = checkoutDraft
      ? `${checkoutDraft.payload.currency} ${checkoutDraft.summary.totalPrice.toFixed(3)}`
      : "";
    setSuccessConfig({ title, message, amount });
    setShowSuccessModal(true);
  };

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingCountRef = useRef(0);
  const webViewDoneRef = useRef(false);

  useStaticScreen();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadDraft();
    fetchSettings();
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const loadDraft = async () => {
    try {
      const stored = await AsyncStorage.getItem("pendingCheckoutData");
      if (stored) setCheckoutDraft(JSON.parse(stored));
    } catch {
    } finally {
      setDraftLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const resp = await apiClient.get("/v1/settings");
      const methods: PaymentMethod[] = (resp as any)?.data?.payment_methods ?? [];
      if (methods.length > 0) {
        setPaymentMethods(methods);
        setSelectedMethodId(methods[0].id);
      } else {
        setFallbackMethods();
      }
    } catch {
      setFallbackMethods();
    } finally {
      setSettingsLoading(false);
    }
  };

  const setFallbackMethods = () => {
    const fallback: PaymentMethod[] = [
      {
        id: "knet",
        label: t("payment.fallback_knet_label"),
        description: t("payment.fallback_knet_desc"),
        type: "redirect",
      },
      {
        id: "credit_card",
        label: t("payment.fallback_card_label"),
        description: t("payment.fallback_card_desc"),
        type: "redirect",
      },
      {
        id: "cash",
        label: t("payment.fallback_cash_label"),
        description: t("payment.fallback_cash_desc"),
        type: "offline",
      },
    ];
    setPaymentMethods(fallback);
    setSelectedMethodId(fallback[0].id);
    setSettingsLoading(false);
  };

  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId) ?? null;

  // ---------- payload builder ----------

  const buildBasePayload = () => {
    if (!checkoutDraft) return null;
    const p = checkoutDraft.payload;

    const rawDays = p.selected_days;
    const selectedDaysArray: string[] = Array.isArray(rawDays)
      ? rawDays
      : typeof rawDays === "string"
        ? rawDays.split(",").map((d: string) => d.trim()).filter(Boolean)
        : [];

    // Parse as local midnight to avoid UTC timezone shift (start_date is stored as YYYY-MM-DD)
    const dateParts = p.start_date.split("-").map(Number);
    const localStartDate = p.start_date.length === 10 && dateParts.length === 3
      ? p.start_date // already YYYY-MM-DD, use directly
      : (() => {
          const d = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })();

    const isPersonalized = p.is_personalized ?? false;

    return {
      user_id: p.user_id,
      subcrption_plans_id: p.subcrption_plans_id,
      area_id: p.area_id,
      start_date: localStartDate,
      selected_days: selectedDaysArray,
      is_personalized: isPersonalized,
      ...(isPersonalized && {
        protein: p.protein ?? 0,
        carbs: p.carbs ?? p.protein ?? 0,
      }),
      meals: p.meals ?? [],
      address: p.address,
      currency: p.currency || "KWD",
      amount: checkoutDraft.summary.totalPrice,
      ...(p.coupon_code ? { coupon_code: p.coupon_code } : {}),
    };
  };

  // ---------- persist subscription locally ----------

  const persistSubscriptionLocally = async (
    subscriptionData: any,
    paymentStatus: "paid" | "pending",
    payload: CheckoutRequest,
  ) => {
    if (!checkoutDraft) return;
    const { summary } = checkoutDraft;

    const subscriptionStatus =
      subscriptionData?.status === "active" ? "Active"
        : subscriptionData?.status === "completed" ? "Completed"
        : subscriptionData?.status === "cancelled" ? "Cancelled"
        : "Active";

    const subscription = {
      id: subscriptionData?.id?.toString() || Date.now().toString(),
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
      createdAt: subscriptionData?.created_at || new Date().toISOString(),
    };

    if (subscriptionData?.id) {
      await AsyncStorage.setItem("userSubscriptionId", subscriptionData.id.toString());
    }
    if (subscriptionData?.subscription_meals && Array.isArray(subscriptionData.subscription_meals)) {
      await AsyncStorage.setItem("subscriptionMealsData", JSON.stringify(subscriptionData.subscription_meals));
    }
    if (subscriptionData?.subscription_days && Array.isArray(subscriptionData.subscription_days)) {
      await AsyncStorage.setItem("subscriptionDaysData", JSON.stringify(subscriptionData.subscription_days));
    }

    const existing = await AsyncStorage.getItem("subscriptions");
    const list = existing ? JSON.parse(existing) : [];
    list.push(subscription);
    await AsyncStorage.setItem("subscriptions", JSON.stringify(list));
    await AsyncStorage.setItem("activeSubscription", JSON.stringify(subscription));
    await AsyncStorage.setItem(DEMO_SUBSCRIPTION_FLAG, "true");

    if (paymentStatus === "pending") {
      await AsyncStorage.setItem("pendingCheckoutData", JSON.stringify({
        payload: { ...payload, payment: "pending", user_subscription_id: subscriptionData?.id },
        summary,
      }));
    } else {
      await AsyncStorage.removeItem("pendingCheckoutData");
    }

    await AsyncStorage.multiRemove(["selectedPlan", "selectedDuration", "selectedDays", "startDate", "selectedDayMeals"]);
  };

  // ---------- payment handlers ----------

  const handlePayNow = async () => {
    if (!checkoutDraft || !selectedMethod) return;
    setProcessing(true);

    if (selectedMethod.type === "offline") {
      await handleCashCheckout();
    } else {
      await handleHesabeInitiate();
    }
  };

  // Cash: POST /payment/checkout
  const handleCashCheckout = async () => {
    try {
      const base = buildBasePayload();
      if (!base) throw new Error(t("payment.checkout_data_missing"));

      const response = await apiClient.post("/v1/payment/checkout", { ...base, payment_method: "cash" });

      if ((response as any)?.success === false) {
        const msg = (response as any)?.message || t("payment.order_failed_default");
        const errors = (response as any)?.errors;
        const detail = errors ? Object.values(errors).flat().join("\n") : "";
        Alert.alert(t("payment.order_failed_title"), detail ? `${msg}\n\n${detail}` : msg);
        setProcessing(false);
        return;
      }

      const data = (response as any)?.data || response;
      const subRaw = data?.subscription;
      const subData = subRaw?.user_subscription || subRaw || data?.user_subscription || data;

      await persistSubscriptionLocally(subData, "pending", checkoutDraft!.payload);
      showSuccess(t("payment.order_placed_title"), t("payment.order_placed_msg"));
    } catch (error: any) {
      Alert.alert(t("payment.order_error_title"), error instanceof Error ? error.message : t("payment.order_error_default"));
    } finally {
      setProcessing(false);
    }
  };

  // KNET / Card: POST /payment/initiate → WebView → poll
  const handleHesabeInitiate = async () => {
    try {
      const base = buildBasePayload();
      if (!base) throw new Error(t("payment.checkout_data_missing"));

      let response: any;
      try {
        response = await apiClient.post("/v1/payment/initiate", { ...base, payment_method: selectedMethodId });
      } catch (apiError: any) {
        Alert.alert(t("payment.payment_error_title"), apiError instanceof Error ? apiError.message : t("payment.payment_error_reach"));
        setProcessing(false);
        return;
      }

      const orderToken: string = response?.data?.order_token;
      const paymentUrl: string = response?.data?.payment_url;

      if (!orderToken || !paymentUrl) {
        Alert.alert(t("payment.payment_error_title"), t("payment.payment_error_invalid_response"));
        setProcessing(false);
        return;
      }

      orderTokenRef.current = orderToken;
      webViewDoneRef.current = false;
      setWebViewUrl(paymentUrl);
      setWebViewLoading(true);
      setShowWebView(true);
    } catch (error: any) {
      Alert.alert(t("payment.payment_error_title"), error instanceof Error ? error.message : t("payment.order_error_default"));
      setProcessing(false);
    }
  };

  // Called when WebView detects callback URL or user closes modal
  const closeWebViewAndPoll = () => {
    if (webViewDoneRef.current) return; // prevent double-trigger
    webViewDoneRef.current = true;
    setShowWebView(false);
    startPolling(orderTokenRef.current);
  };

  const startPolling = (token: string) => {
    setPolling(true);
    pollingCountRef.current = 0;

    pollingIntervalRef.current = setInterval(async () => {
      pollingCountRef.current += 1;

      // 2-minute timeout: 40 × 3s = 120s
      if (pollingCountRef.current > 40) {
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        setPolling(false);
        setProcessing(false);
        Alert.alert(
          t("payment.payment_timeout_title"),
          t("payment.payment_timeout_msg"),
          [{ text: t("payment.home_btn"), onPress: () => router.replace("/(tabs)/" as any) }],
        );
        return;
      }

      try {
        const resp = await apiClient.get(`/v1/payment/status/${token}`);
        const statusData = (resp as any)?.data;
        const status: string = statusData?.status;

        if (status === "paid") {
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          setPolling(false);

          const subData = statusData?.subscription?.user_subscription || statusData?.subscription || statusData;
          await persistSubscriptionLocally(subData, "paid", checkoutDraft!.payload);
          setProcessing(false);
          showSuccess(t("payment.alerts.success_title"), t("payment.alerts.success_msg"));
        } else if (status === "failed") {
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          setPolling(false);
          setProcessing(false);
          Alert.alert(t("payment.alerts.failed_title"), t("payment.alerts.failed_msg"));
        }
      } catch {
        // transient error — keep polling
      }
    }, 3000);
  };

  // ---------- render helpers ----------

  const renderShippingInfo = () => {
    if (!checkoutDraft?.summary?.address) return null;
    const a = checkoutDraft.summary.address;
    return (
      <>
        <Text style={[styles.shippingName, isArabic && styles.rtlText]}>{a.first_name} {a.last_name}</Text>
        <Text style={[styles.shippingAddress, isArabic && styles.rtlText]}>{a.area}, {t("address.block")} {a.block_number}, {a.street}</Text>
        <Text style={[styles.shippingAddress, isArabic && styles.rtlText]}>{a.house_building}, {a.floor_apartment}</Text>
        <Text style={[styles.shippingPhone, isArabic && styles.rtlText]}>{a.phone_number}</Text>
      </>
    );
  };

  const getMethodIcon = (type: string, id: string) => {
    if (type === "offline") return "💵";
    if (id === "knet") return "🏦";
    return "💳";
  };

  const getPayButtonLabel = () => {
    if (polling) return t("payment.checking_payment");
    if (processing) return t("payment.processing");
    if (selectedMethod?.type === "offline") return t("payment.place_order");
    const methodLabel = (isArabic && selectedMethod?.label_ar) ? selectedMethod.label_ar : (selectedMethod?.label ?? "");
    return t("payment.pay_with", { label: methodLabel });
  };

  // ---------- loading / empty ----------

  if (draftLoading || settingsLoading) {
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
        <Text style={styles.emptySubtitle}>{t("payment.empty_subtitle")}</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => router.replace("/auth/subscription" as any)}>
          <Text style={styles.createButtonText}>{t("payment.browse_plans")}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ---------- main render ----------

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.title, isArabic && styles.rtlText]}>{t("payment.title")}</Text>
            <Text style={[styles.subtitle, isArabic && styles.rtlText]}>{t("payment.subtitle")}</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Payment Method */}
          <Text style={[styles.sectionLabel, isArabic && styles.rtlText]}>{t("payment.payment_method_label")}</Text>
          <View style={styles.paymentMethodGroup}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.paymentMethodItem, isArabic && styles.rtlRow, selectedMethodId === method.id && styles.paymentMethodItemSelected]}
                onPress={() => setSelectedMethodId(method.id)}
              >
                <View style={[styles.paymentMethodLeft, isArabic && styles.rtlRow]}>
                  <View style={styles.paymentMethodRadioOuter}>
                    {selectedMethodId === method.id && <View style={styles.paymentMethodRadioInner} />}
                  </View>
                  <View>
                    <Text style={[styles.paymentMethodLabel, isArabic && styles.rtlText]}>
                      {(isArabic && method.label_ar) ? method.label_ar : method.label}
                    </Text>
                    {method.description ? (
                      <Text style={[styles.paymentMethodDesc, isArabic && styles.rtlText]}>
                        {(isArabic && method.description_ar) ? method.description_ar : method.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.paymentMethodIcon}>{getMethodIcon(method.type, method.id)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Delivery Info */}
          <View style={styles.shippingSection}>
            <View style={[styles.shippingHeader, isArabic && styles.rtlRow]}>
              <Text style={[styles.shippingTitle, isArabic && styles.rtlText]}>{t("payment.delivery_title")}</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.editText}>{t("payment.edit")}</Text>
              </TouchableOpacity>
            </View>
            {renderShippingInfo()}
            <View style={[styles.badge, isArabic && styles.badgeRTL]}>
              <Text style={styles.badgeText}>
                {checkoutDraft.summary.preferredDeliverySlotLabel
                  ?? checkoutDraft.summary.address.preferred_delivery_slot?.replace(/_/g, " ")}
              </Text>
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryTitle, isArabic && styles.rtlText]}>{t("payment.order_summary")}</Text>

            <View style={[styles.summaryRow, isArabic && styles.rtlRow]}>
              <Text style={[styles.summaryLabel, isArabic && styles.rtlText]}>{t("payment.plan_total")}</Text>
              <Text style={styles.summaryValue}>
                {checkoutDraft.payload.currency} {checkoutDraft.summary.planPrice.toFixed(3)}
              </Text>
            </View>

            {checkoutDraft.payload.is_personalized && (checkoutDraft.summary.proteinExtra ?? 0) > 0 && (
              <View style={[styles.summaryRow, isArabic && styles.rtlRow]}>
                <Text style={[styles.summaryLabel, isArabic && styles.rtlText]}>{t("payment.protein_upgrade", { grams: checkoutDraft.payload.protein })}</Text>
                <Text style={[styles.summaryValue, { color: "#FAD979" }]}>
                  + {checkoutDraft.payload.currency} {(checkoutDraft.summary.proteinExtra ?? 0).toFixed(3)}
                </Text>
              </View>
            )}

            {(checkoutDraft.summary.discount ?? 0) > 0 && (
              <View style={[styles.summaryRow, isArabic && styles.rtlRow]}>
                <Text style={[styles.summaryLabel, isArabic && styles.rtlText]}>{t("payment.discount")}</Text>
                <Text style={[styles.summaryValue, { color: "#7ED321" }]}>
                  - {checkoutDraft.payload.currency} {(checkoutDraft.summary.discount ?? 0).toFixed(3)}
                </Text>
              </View>
            )}

            <View style={[styles.summaryRow, isArabic && styles.rtlRow]}>
              <Text style={[styles.summaryLabel, isArabic && styles.rtlText]}>{t("checkout.delivery_fee")}</Text>
              <Text style={styles.summaryValue}>{t("checkout.free")}</Text>
            </View>

            <View style={[styles.summaryRow, styles.summaryTotal, isArabic && styles.rtlRow]}>
              <Text style={styles.summaryTotalLabel}>{t("payment.amount_due")}</Text>
              <Text style={styles.summaryTotalValue}>
                {checkoutDraft.payload.currency} {checkoutDraft.summary.totalPrice.toFixed(3)}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.payButton, (processing || !checkoutDraft) && styles.payButtonDisabled]}
            onPress={handlePayNow}
            disabled={processing || !checkoutDraft}
          >
            {processing && !showWebView && !polling ? (
              <ActivityIndicator color="#344225" />
            ) : (
              <Text style={styles.payButtonText}>{getPayButtonLabel()}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Hesabe Payment WebView Modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={closeWebViewAndPoll}
      >
        <SafeAreaView style={styles.webViewContainer}>
          {/* Header */}
          <View style={[styles.webViewHeader, isArabic && styles.rtlRow]}>
            <Text style={styles.webViewTitle}>{t("payment.complete_payment")}</Text>
            <TouchableOpacity style={styles.webViewCloseBtn} onPress={closeWebViewAndPoll}>
              <Ionicons name="close" size={24} color="#344225" />
            </TouchableOpacity>
          </View>

          {/* Loading indicator shown behind WebView until page loads */}
          {webViewLoading && (
            <View style={styles.webViewLoadingOverlay}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.webViewLoadingText}>{t("payment.loading_payment_page")}</Text>
            </View>
          )}

          <WebView
            source={{ uri: webViewUrl }}
            style={styles.webView}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            onNavigationStateChange={(navState) => {
              const url = navState.url ?? "";
              if (
                url.includes("/v1/payment/callback/failure") ||
                url.includes("/v1/payment/callback")
              ) {
                closeWebViewAndPoll();
              }
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Polling overlay — shown while waiting for payment confirmation */}
      {polling && (
        <View style={styles.pollingOverlay}>
          <View style={styles.pollingCard}>
            <ActivityIndicator size="large" color="#344225" />
            <Text style={styles.pollingText}>{t("payment.checking_payment_status")}</Text>
            <Text style={styles.pollingSubText}>{t("payment.may_take_seconds")}</Text>
          </View>
        </View>
      )}

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View pointerEvents="none" style={styles.successCardBgLogoWrap}>
              <Image
                source={require("@/assets/images/balance-text.png")}
                style={styles.successCardBgLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={52} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>{successConfig.title}</Text>
            <Text style={styles.successMessage}>{successConfig.message}</Text>
            {!!successConfig.amount && (
              <View style={styles.successAmountPill}>
                <Text style={styles.successAmountLabel}>{t("payment.order_total_amount")}</Text>
                <Text style={styles.successAmountValue}>{successConfig.amount}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/(tabs)/" as any);
              }}
            >
              <Text style={styles.successButtonText}>{t("common.ok")}</Text>
            </TouchableOpacity>
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
    paddingHorizontal: "5%",
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
  headerTitleContainer: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700", color: "#344225" },
  subtitle: { fontSize: 14, color: "#6B7F75", marginTop: 4 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: "5%", paddingBottom: 120 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#344225", marginBottom: 12 },
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
  paymentMethodItemSelected: { backgroundColor: "#F4FAF6" },
  paymentMethodLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  paymentMethodRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#344225" },
  paymentMethodLabel: { fontSize: 15, fontWeight: "600", color: "#344225" },
  paymentMethodDesc: { fontSize: 12, color: "#6B7F75", marginTop: 2 },
  paymentMethodIcon: { fontSize: 28 },
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
  shippingTitle: { fontSize: 16, fontWeight: "700", color: "#344225" },
  editText: { fontSize: 14, color: "#7A9B7E", fontWeight: "600" },
  shippingName: { fontSize: 15, fontWeight: "600", color: "#344225", marginBottom: 4 },
  shippingAddress: { fontSize: 14, color: "#6B7F75", lineHeight: 20 },
  shippingPhone: { fontSize: 14, color: "#6B7F75", marginTop: 4 },
  badge: {
    marginTop: 12,
    backgroundColor: "#F4F7F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeRTL: { alignSelf: "flex-end" },
  badgeText: { fontSize: 12, color: "#344225", fontWeight: "500" },
  summaryCard: {
    backgroundColor: "#344225",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 16 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14, color: "#C5D4CC" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  summaryTotal: { marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  summaryTotalLabel: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  summaryTotalValue: { fontSize: 20, fontWeight: "700", color: "#FAD979" },
  footer: { paddingHorizontal: "5%", paddingTop: 10 },
  payButton: {
    backgroundColor: "#FAD979",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { fontSize: 16, fontWeight: "700", color: "#344225" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#D4E8E0" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#344225", fontWeight: "500" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, backgroundColor: "#D4E8E0" },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#344225", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#6B7F75", marginBottom: 24, textAlign: "center" },
  createButton: { backgroundColor: "#344225", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  createButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  // WebView Modal
  webViewContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  webViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E0EDE6",
    backgroundColor: "#FFFFFF",
  },
  webViewTitle: { fontSize: 16, fontWeight: "700", color: "#344225" },
  webViewCloseBtn: { padding: 4 },
  webView: { flex: 1 },
  webViewLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 1,
  },
  webViewLoadingText: { fontSize: 14, color: "#6B7F75" },
  // Polling overlay
  pollingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  pollingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 12,
    width: "70%",
  },
  pollingText: { fontSize: 16, fontWeight: "700", color: "#344225", textAlign: "center" },
  pollingSubText: { fontSize: 13, color: "#6B7F75", textAlign: "center" },
  // Success modal
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: "center",
    width: "100%",
    gap: 10,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  successCardBgLogoWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  successCardBgLogo: {
    width: 260,
    height: 260,
    opacity: 0.06,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#344225",
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    color: "#6B7F75",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 4,
  },
  successAmountPill: {
    backgroundColor: "#D4E8E0",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 2,
  },
  successAmountLabel: {
    fontSize: 12,
    color: "#5A7C65",
    fontWeight: "500",
  },
  successAmountValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344225",
  },
  successButton: {
    backgroundColor: "#344225",
    borderRadius: 10,
    width: 110,
    height: 40,
    alignSelf: "center",
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  successButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
