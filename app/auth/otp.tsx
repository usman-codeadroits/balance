import { sendOtp, verifyOtp } from "@/api/services/otp";
import { ONBOARDING_TEMP_KEYS } from "@/app/auth/utils/finalize-onboarding";
import AuthButton from "@/components/auth/auth-button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function OTPScreen() {
  const { t } = useTranslation();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [authType, setAuthType] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    loadAuthType();
  }, []);

  // Keep OTP screen static: disable gestures and block hardware back
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ gestureEnabled: false });
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );
      return () => backHandler.remove();
    }, [navigation]),
  );

  const loadAuthType = async () => {
    const type = await AsyncStorage.getItem("tempAuthType");
    if (type) {
      setAuthType(type as "login" | "signup");
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to next input
      if (value && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const formatPhoneNumber = (
    countryCode: string | null,
    phoneNumber: string | null,
  ) => {
    if (!phoneNumber) {
      return null;
    }
    const sanitizedMobile = phoneNumber.replace(/\D/g, "");
    if (!sanitizedMobile) {
      return null;
    }
    if (countryCode && countryCode.startsWith("+")) {
      return `${countryCode}${sanitizedMobile}`.replace("++", "+");
    }
    if (countryCode) {
      return `+${countryCode.replace(/\D/g, "")}${sanitizedMobile}`;
    }
    return `+${sanitizedMobile}`;
  };

  const storeActiveSubscription = async (subscription: any) => {
    if (!subscription) {
      await AsyncStorage.removeItem("activeSubscription");
      return;
    }

    const dayNameToIndex: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    // Handle both string and array formats for selected_days
    let selectedDays: string[] = [];
    if (Array.isArray(subscription.selected_days)) {
      selectedDays = subscription.selected_days;
    } else if (typeof subscription.selected_days === "string") {
      selectedDays = subscription.selected_days
        .split(",")
        .map((day: string) => day.trim())
        .filter(Boolean);
    }

    const normalizedDays: number[] = selectedDays
      .map((day: string) => dayNameToIndex[day.toLowerCase()])
      .filter((dayIndex) => dayIndex !== undefined);

    const localSubscription = {
      id: subscription.id?.toString() ?? "",
      plan: {
        id: subscription.subscription_plan_id,
        title: subscription.subscription_plan_title,
      },
      duration: {
        id: subscription.duration_id,
        title: subscription.duration_title,
      },
      days: normalizedDays.length ? normalizedDays : selectedDays,
      startDate: subscription.start_date,
      endDate: subscription.end_date,
      dayMeals: {},
      address: {},
      planPrice: subscription.price ?? 0,
      vat: 0,
      totalPrice: subscription.price ?? 0,
      status:
        subscription.status === "active"
          ? "Active"
          : subscription.status === "completed"
            ? "Completed"
            : "Cancelled",
      createdAt: subscription.created_at || new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      "activeSubscription",
      JSON.stringify(localSubscription),
    );
  };

  const clearOnboardingStorage = async () => {
    await AsyncStorage.multiRemove(ONBOARDING_TEMP_KEYS);
  };

  const normalizeAddress = (address: any) => {
    if (!address || typeof address !== "object") return null;

    const areas =
      address.area || address.areas || address.city || address.region || "";
    const blockNumber =
      address.block_number || address.blockNumber || address.block || "";
    const street = address.street || "";
    const avenue = address.avenue || address.ave || "";
    const houseBuliding =
      address.house_building ||
      address.houseBuliding ||
      address.house ||
      address.building ||
      "";
    const floorApartment =
      address.floor_apartment ||
      address.floorApartment ||
      address.apartment ||
      "";
    const remarks = address.remarks || address.notes || "";

    return {
      areas,
      blockNumber,
      street,
      avenue,
      houseBuliding,
      floorApartment,
      remarks,
    };
  };

  const extractAddressFromVerification = (verificationData: any) => {
    if (!verificationData) return null;
    const candidate =
      verificationData.address ||
      verificationData.user?.address ||
      (Array.isArray(verificationData.user?.addresses)
        ? verificationData.user.addresses[0]
        : null) ||
      (Array.isArray(verificationData.addresses)
        ? verificationData.addresses[0]
        : null) ||
      verificationData.subscription?.address ||
      null;

    return normalizeAddress(candidate);
  };

  const sanitizeDigits = (value: string | null) =>
    (value || "").replace(/\D/g, "");

  const handleVerify = async () => {
    // Check if all OTP digits are filled
    const isComplete = otp.every((digit) => digit !== "");
    if (!isComplete) {
      Alert.alert(t("otp.error"), t("otp.complete_otp"));
      return;
    }

    const otpCode = otp.join("");
    // Validate OTP is exactly 4 digits
    if (otpCode.length !== 4 || !/^\d{4}$/.test(otpCode)) {
      Alert.alert(t("otp.error"), t("otp.invalid_digits"));
      return;
    }

    const phoneNumber = await AsyncStorage.getItem("tempPhoneNumber");
    const countryCode = await AsyncStorage.getItem("tempCountryCode");

    if (!phoneNumber) {
      Alert.alert(t("otp.error"), t("otp.phone_not_found"));
      return;
    }
    const formattedPhone = formatPhoneNumber(countryCode, phoneNumber);
    if (!formattedPhone) {
      Alert.alert(t("otp.error"), t("otp.invalid_phone"));
      return;
    }
    const sanitizedPhone = sanitizeDigits(phoneNumber);
    const sanitizedCountryCode = sanitizeDigits(countryCode);
    if (!sanitizedPhone) {
      Alert.alert(t("otp.error"), t("otp.phone_not_found"));
      return;
    }

    setLoading(true);

    try {
      const verification = await verifyOtp({
        phone_number: sanitizedPhone,
        otp_code: otpCode,
        ...(sanitizedCountryCode && { country_code: sanitizedCountryCode }),
      });

      // Mark OTP as verified to prevent back navigation
      await AsyncStorage.setItem("otpVerified", "true");

      // Save auth token from data object
      if (verification.success && verification.data) {
        const dataObj = verification.data as any;
        const token = dataObj?.token;

        if (token) {
          await AsyncStorage.setItem("authToken", token);
        }
      }

      // Case A: User exists and profile complete (HTTP 200, success: true, user_exists: true)
      if (verification.success && verification.user_exists === true) {
        const data = verification.data as any;

        // Show success message
        Alert.alert(
          t("otp.verified_title"),
          t("otp.verified_exists"),
          [
            {
              text: t("common.ok"),
              onPress: async () => {
                if (data.user) {
                  const normalizedUser = {
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    mobile: data.user.mobile ?? sanitizedPhone,
                    gender: data.user.gender,
                    height: data.user.height,
                    weight: data.user.weight,
                    dob: data.user.dob,
                    created_at: data.user.created_at,
                    updated_at: data.user.updated_at,
                  };
                  await AsyncStorage.setItem(
                    "userId",
                    normalizedUser.id.toString(),
                  );
                  await AsyncStorage.setItem(
                    "userData",
                    JSON.stringify(normalizedUser),
                  );

                  // Store address if available from verification payload
                  const normalizedAddress =
                    extractAddressFromVerification(data);
                  if (normalizedAddress) {
                    await AsyncStorage.setItem(
                      "userAddress",
                      JSON.stringify(normalizedAddress),
                    );
                  }

                  // Store welcome status and user name for welcome message on home screen
                  await AsyncStorage.setItem("showWelcome", "true");
                  await AsyncStorage.setItem(
                    "welcomeUserName",
                    normalizedUser.name,
                  );
                }

                // Store subscription if available
                if (data.subscription) {
                  await storeActiveSubscription(data.subscription);
                }

                // Clear onboarding storage
                await clearOnboardingStorage();

                // Clear OTP verified flag
                await AsyncStorage.removeItem("otpVerified");

                // Navigate to Main Screen (Meals)
                router.replace("/main-screen");
              },
            },
          ],
        );
        return;
      }

      // Case B: User exists but profile incomplete (HTTP 200, success: true, user_exists: false)
      if (verification.success && verification.user_exists === false) {
        // Show message and proceed to onboarding
        Alert.alert(
          t("otp.verified_title"),
          t("otp.verified_incomplete"),
          [
            {
              text: t("common.ok"),
              onPress: async () => {
                // Store OTP verification data for registration flow
                await AsyncStorage.setItem("tempOtpCode", otpCode);
                await AsyncStorage.setItem("otpVerifiedPhone", formattedPhone);

                if (authType === "login") {
                  await AsyncStorage.setItem("tempAuthType", "signup");
                }

                // Clear OTP verified flag before navigating
                await AsyncStorage.removeItem("otpVerified");

                // Navigate directly to email to start onboarding
                router.push("/auth/email");
              },
            },
          ],
        );
        return;
      }

      // Case C & D: User not found or Invalid OTP (HTTP 400, success: false)
      if (!verification.success) {
        // Check if it's "user not found" vs "invalid OTP"
        const message = verification.message || "";
        const isUserNotFound =
          message.toLowerCase().includes("user not found") ||
          message.toLowerCase().includes("not found");

        if (isUserNotFound) {
          Alert.alert(
            t("otp.account_not_found"),
            t("otp.account_not_found_msg"),
            [
              {
                text: t("common.ok"),
                onPress: async () => {
                  // Store OTP verification data for registration flow
                  await AsyncStorage.setItem("tempOtpCode", otpCode);
                  await AsyncStorage.setItem(
                    "otpVerifiedPhone",
                    formattedPhone,
                  );

                  if (authType === "login") {
                    await AsyncStorage.setItem("tempAuthType", "signup");
                  }

                  // Clear OTP verified flag before navigating
                  await AsyncStorage.removeItem("otpVerified");

                  // Navigate directly to email to start onboarding
                  router.push("/auth/email");
                },
              },
            ],
          );
        } else {
          Alert.alert(
            t("otp.error"),
            verification.message || "OTP verification failed",
          );
        }
        return;
      }

      // Fallback: unexpected response
      Alert.alert(
        t("otp.error"),
        t("otp.unexpected_error"),
      );
      await AsyncStorage.removeItem("otpVerified");
    } catch (error: any) {
      // Handle validation errors (HTTP 422)
      if (error?.status === 422) {
        const errorData = error?.response || {};
        let errorMessage = error.message || "Validation error";

        // Extract validation errors
        if (errorData.errors && typeof errorData.errors === "object") {
          const errorMessages: string[] = [];
          Object.entries(errorData.errors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              errorMessages.push(`${field}: ${messages.join(", ")}`);
            }
          });
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join("\n");
          }
        }

        Alert.alert(t("otp.error"), errorMessage);
        return;
      }

      // Handle other errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Alert.alert(t("otp.error"), errorMessage);
      await AsyncStorage.removeItem("otpVerified");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    const phoneNumber = await AsyncStorage.getItem("tempPhoneNumber");
    const countryCode = await AsyncStorage.getItem("tempCountryCode");
    const sanitizedPhone = sanitizeDigits(phoneNumber);
    const sanitizedCountryCode = sanitizeDigits(countryCode);
    const formattedPhone = formatPhoneNumber(countryCode, phoneNumber);

    if (!sanitizedPhone || !formattedPhone) {
      Alert.alert(
        t("otp.error"),
        t("otp.phone_not_found"),
      );
      return;
    }

    try {
      setResending(true);
      await sendOtp({
        phone_number: sanitizedPhone,
        ...(sanitizedCountryCode && { country_code: sanitizedCountryCode }),
      });
      Alert.alert(t("common.ok"), t("otp.resent_success", { phone: formattedPhone }));
    } catch (error) {
      Alert.alert(
        t("otp.error"),
        error instanceof Error
          ? error.message
          : t("otp.otp_failed"),
      );
    } finally {
      setResending(false);
    }
  };

  const handleChangePhoneNumber = async () => {
    try {
      setOtp(["", "", "", ""]);
      await AsyncStorage.multiRemove([
        "tempPhoneNumber",
        "tempCountryCode",
        "tempAuthType",
        "tempOtpCode",
        "otpVerifiedPhone",
        "otpVerified",
      ]);
    } catch (error) {
    } finally {
      router.replace("/auth");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}>
        <View style={styles.header}>
        </View>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/authlogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title and Description */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{t("otp.title")}</Text>
          <Text style={styles.description}>
            {t("otp.description")}
          </Text>
        </View>

        {/* OTP Input Boxes */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={styles.otpBox}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Resend Code */}
        <Text style={styles.resendText}>
          {t("otp.didnt_get_code")}
          <Text
            style={[styles.resendLink, resending && styles.resendLinkDisabled]}
            onPress={resending ? undefined : handleResendCode}
          >
            {resending ? t("otp.sending") : t("otp.resend")}
          </Text>
        </Text>

        {/* Change phone number entry */}
        <Text style={styles.changePhoneText} onPress={handleChangePhoneNumber}>
          {t("otp.change_phone")}
        </Text>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Verify Button */}
          <AuthButton
            title={loading ? t("otp.verifying") : t("otp.verify")}
            onPress={handleVerify}
            disabled={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#344225",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
  },
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#C5D4CC",
    lineHeight: 20,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  otpBox: {
    width: "20%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
    color: "#344225",
    borderWidth: 2,
    borderColor: "#FAD979",
  },
  resendText: {
    fontSize: 14,
    color: "#C5D4CC",
    textAlign: "center",
    marginBottom: 20,
  },
  resendLink: {
    color: "#FAD979",
    fontWeight: "600",
  },
  resendLinkDisabled: {
    opacity: 0.6,
  },
  changePhoneText: {
    marginTop: 8,
    fontSize: 14,
    color: "#FAD979",
    textAlign: "center",
    fontWeight: "600",
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 30,
  },
});
