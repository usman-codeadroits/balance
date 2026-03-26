import { sendOtp } from '@/api/services/otp';
import AuthButton from '@/components/auth/auth-button';
import AuthTabs from '@/components/auth/auth-tabs';
import { COUNTRIES, Country } from '@/components/auth/country-picker';
import PhoneInput from '@/components/auth/phone-input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AuthScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Kuwait by default
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!phoneNumber.trim()) {
      alert(t('auth.enter_phone'));
      return;
    }

    const sanitizedMobile = phoneNumber.replace(/\D/g, '');
    if (!sanitizedMobile) {
      alert(t('auth.invalid_phone'));
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = `${selectedCountry.dialCode}${sanitizedMobile}`.replace('++', '+');
      const countryCodeDigits = selectedCountry.dialCode.replace(/\D/g, '');

      // Store phone number and country code for later use
      await AsyncStorage.setItem('tempPhoneNumber', sanitizedMobile);
      await AsyncStorage.setItem('tempCountryCode', selectedCountry.dialCode);
      await AsyncStorage.setItem('tempAuthType', activeTab);

      // Call OTP/send API
      const otpResponse = await sendOtp({
        phone_number: sanitizedMobile,
        country_code: countryCodeDigits || undefined,
      });

      // Log success for debugging
      if (otpResponse.success) {
        console.log('OTP sent successfully:', otpResponse.message);
      }

      // Navigate to OTP screen
      router.push('/auth/otp');
    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert(
        t('auth.error'),
        error instanceof Error ? error.message : t('auth.otp_failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setPhoneNumber(''); // Clear phone number when switching tabs
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/authlogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Auth Form */}
            <View style={styles.formContainer}>
              {/* Tabs */}
              <AuthTabs activeTab={activeTab} onTabChange={handleTabChange} />

              {/* Phone Input */}
              <PhoneInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder={t('auth.phone_placeholder')}
                selectedCountry={selectedCountry}
                onSelectCountry={setSelectedCountry}
              />
            </View>
          </ScrollView>

          {/* Bottom Section - Always at bottom */}
          <View style={styles.bottomSection}>
            {activeTab === 'signup' && (
              <View style={styles.dividerContainer}>


              </View>
            )}

            {/* Sign In/Sign Up Button */}
            <AuthButton
              title={loading ? t('auth.sending_otp') : activeTab === 'login' ? t('auth.sign_in') : t('auth.signup')}
              onPress={handleAuth}
              disabled={loading}
            />

            {/* Bottom Text */}
            <View style={styles.bottomTextContainer}>
              <Text style={styles.bottomText}>
                {activeTab === 'login' ? t('auth.no_account') : t('auth.have_account')}
              </Text>
              <Text
                style={styles.bottomTextLink}
                onPress={() => handleTabChange(activeTab === 'login' ? 'signup' : 'login')}
              >
                {activeTab === 'login' ? t('auth.signup') : t('auth.sign_in')}
              </Text>
            </View>
          </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 80,
    height: 80,
  },
  formContainer: {
    marginBottom: 20,
  },
  bottomSection: {
    paddingBottom: 30,
  },
  bottomTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  bottomText: {
    color: '#C5D4CC',
    fontSize: 14,
  },
  bottomTextLink: {
    color: '#FAD979',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#5A7365',
  },
  dividerText: {
    color: '#C5D4CC',
    fontSize: 12,
    marginHorizontal: 12,
  },
});
