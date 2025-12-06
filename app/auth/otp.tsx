import AuthButton from '@/components/auth/auth-button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { sendOtp, verifyOtp } from '@/api/services/otp';
import { ONBOARDING_TEMP_KEYS } from '@/app/auth/utils/finalize-onboarding';

export default function OTPScreen() {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [authType, setAuthType] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    loadAuthType();
  }, []);

  const loadAuthType = async () => {
    const type = await AsyncStorage.getItem('tempAuthType');
    if (type) {
      setAuthType(type as 'login' | 'signup');
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
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const formatPhoneNumber = (countryCode: string | null, phoneNumber: string | null) => {
    if (!phoneNumber) {
      return null;
    }
    const sanitizedMobile = phoneNumber.replace(/\D/g, '');
    if (!sanitizedMobile) {
      return null;
    }
    if (countryCode && countryCode.startsWith('+')) {
      return `${countryCode}${sanitizedMobile}`.replace('++', '+');
    }
    if (countryCode) {
      return `+${countryCode.replace(/\D/g, '')}${sanitizedMobile}`;
    }
    return `+${sanitizedMobile}`;
  };

  const storeActiveSubscription = async (subscription: any) => {
    if (!subscription) {
      await AsyncStorage.removeItem('activeSubscription');
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
    };

    const selectedDays = typeof subscription.selected_days === 'string'
      ? subscription.selected_days
          .split(',')
          .map((day: string) => day.trim())
          .filter(Boolean)
      : [];

    const normalizedDays: number[] = selectedDays
      .map((day: string) => dayNameToIndex[day.toLowerCase()])
      .filter((dayIndex) => dayIndex !== undefined);

    const localSubscription = {
      id: subscription.id?.toString() ?? '',
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
      status: subscription.status === 'active'
        ? 'Active'
        : subscription.status === 'completed'
          ? 'Completed'
          : 'Cancelled',
      createdAt: subscription.created_at || new Date().toISOString(),
    };

    await AsyncStorage.setItem('activeSubscription', JSON.stringify(localSubscription));
  };

  const clearOnboardingStorage = async () => {
    await AsyncStorage.multiRemove(ONBOARDING_TEMP_KEYS);
  };

  const sanitizeDigits = (value: string | null) => (value || '').replace(/\D/g, '');

  const handleVerify = async () => {
    // Check if all OTP digits are filled
    const isComplete = otp.every(digit => digit !== '');
    if (!isComplete) {
      Alert.alert('Error', 'Please enter the complete OTP code');
      return;
    }

    const otpCode = otp.join('');
    const numericOtp = Number(otpCode);
    if (!Number.isFinite(numericOtp)) {
      Alert.alert('Error', 'Invalid OTP code');
      return;
    }
    const phoneNumber = await AsyncStorage.getItem('tempPhoneNumber');
    const countryCode = await AsyncStorage.getItem('tempCountryCode');

    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number not found');
      return;
    }
    const formattedPhone = formatPhoneNumber(countryCode, phoneNumber);
    if (!formattedPhone) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }
    const sanitizedPhone = sanitizeDigits(phoneNumber);
    const sanitizedCountryCode = sanitizeDigits(countryCode);
    if (!sanitizedPhone) {
      Alert.alert('Error', 'Phone number not found');
      return;
    }

    setLoading(true);

    try {
      const verification = await verifyOtp({
        phone_number: sanitizedPhone,
        otp_code: otpCode,
        ...(sanitizedCountryCode && { country_code: sanitizedCountryCode }),
      });

      if (!verification.success || !verification.data?.verified) {
        throw new Error(verification.message || 'Failed to verify OTP. Please try again.');
      }

      const {
        user,
        active_subscription: activeSubscription,
        token,
        user_data_exists: userDataExists,
      } = verification.data;
      const needsOnboarding = userDataExists === false || !user;

      if (token) {
        await AsyncStorage.setItem('authToken', token);
      }

      if (user) {
        const normalizedUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile ?? user.phone ?? formattedPhone,
          gender: user.gender,
          height: user.height,
          weight: user.weight,
          dob: (user as any).dob ?? user.date_of_birth,
          created_at: user.created_at,
          updated_at: user.updated_at,
        };
        await AsyncStorage.setItem('userId', normalizedUser.id.toString());
        await AsyncStorage.setItem('userData', JSON.stringify(normalizedUser));
      } else {
        await AsyncStorage.multiRemove(['userId', 'userData']);
      }

      await storeActiveSubscription(activeSubscription ?? null);

      if (needsOnboarding) {
        if (verification.message) {
          Alert.alert('Continue Registration', verification.message);
        }
        if (authType === 'login') {
          await AsyncStorage.setItem('tempAuthType', 'signup');
        }
        await AsyncStorage.setItem('tempOtpCode', otpCode);
        await AsyncStorage.setItem('otpVerifiedPhone', formattedPhone);
        router.push('/auth/email');
        return;
      }

      await clearOnboardingStorage();
      router.replace('/welcome');
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to verify OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    const phoneNumber = await AsyncStorage.getItem('tempPhoneNumber');
    const countryCode = await AsyncStorage.getItem('tempCountryCode');
    const sanitizedPhone = sanitizeDigits(phoneNumber);
    const sanitizedCountryCode = sanitizeDigits(countryCode);
    const formattedPhone = formatPhoneNumber(countryCode, phoneNumber);

    if (!sanitizedPhone || !formattedPhone) {
      Alert.alert('Error', 'Phone number not found. Please go back and enter it again.');
      return;
    }

    try {
      setResending(true);
      await sendOtp({
        phone_number: sanitizedPhone,
        ...(sanitizedCountryCode && { country_code: sanitizedCountryCode }),
      });
      Alert.alert('Success', `OTP has been resent to ${formattedPhone}.`);
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to resend OTP. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/authlogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title and Description */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>OTP Code Verification</Text>
          <Text style={styles.description}>
            We&apos;ve sent you the verification code to your phone number enter
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
          Didn&apos;t get the code?{' '}
          <Text
            style={[styles.resendLink, resending && styles.resendLinkDisabled]}
            onPress={resending ? undefined : handleResendCode}
          >
            {resending ? 'Sending...' : 'Resend'}
          </Text>
        </Text>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Verify Button */}
          <AuthButton title={loading ? "Verifying..." : "Verify"} onPress={handleVerify} disabled={loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#344225',
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
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
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
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#C5D4CC',
    lineHeight: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  otpBox: {
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#344225',
    borderWidth: 2,
    borderColor: '#FAD979',
  },
  resendText: {
    fontSize: 14,
    color: '#C5D4CC',
    textAlign: 'center',
    marginBottom: 20,
  },
  resendLink: {
    color: '#FAD979',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    opacity: 0.6,
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 30,
  },
});
