import { sendOtp } from '@/api/services/otp';
import AuthButton from '@/components/auth/auth-button';
import AuthTabs from '@/components/auth/auth-tabs';
import { COUNTRIES, Country } from '@/components/auth/country-picker';
import PhoneInput from '@/components/auth/phone-input';
import { changeLanguage } from '@/constants/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, I18nManager, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isArabicLanguage } from '@/constants/i18n';

export default function AuthScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const isArabic = isArabicLanguage(currentLanguage);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Kuwait by default
  const [loading, setLoading] = useState(false);
  const [langSwitching, setLangSwitching] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLangToggle = async () => {
    if (langSwitching) return;
    const next = isArabic ? 'en' : 'ar';
    const rtlChanging = isArabicLanguage(next) !== I18nManager.isRTL;
    setLangSwitching(true);
    try {
      await changeLanguage(next);
      if (rtlChanging) {
        Alert.alert(
          t('change_language.changed_title'),
          t('change_language.restart_message'),
          [{ text: t('common.ok'), onPress: async () => {
            try { await Updates.reloadAsync(); } catch {
              Alert.alert(t('change_language.restart_required_title'), t('change_language.restart_required_message'));
            }
          }}],
          { cancelable: false },
        );
      }
    } catch {
      Alert.alert(t('common.error'), t('change_language.error'));
    } finally {
      setLangSwitching(false);
    }
  };

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

      // Navigate to OTP screen
      router.push('/auth/otp');
    } catch (error) {
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
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo + language toggle */}
          <View style={styles.header}>
            <TouchableOpacity style={[styles.skipBtn, isArabic && styles.skipBtnRTL]} onPress={() => router.replace('/landing')} activeOpacity={0.75}>
              <Text style={styles.skipText}>{t('auth.skip')}</Text>
            </TouchableOpacity>
            <Image
              source={require('@/assets/images/authlogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <TouchableOpacity style={[styles.langPill, isArabic && styles.langPillRTL]} onPress={handleLangToggle} disabled={langSwitching} activeOpacity={0.75}>
              {langSwitching ? (
                <ActivityIndicator size="small" color="#FAD979" />
              ) : (
                <>
                  <Text style={[styles.langPillText, currentLanguage === 'en' && styles.langPillActive]}>EN</Text>
                  <Text style={styles.langPillSep}>|</Text>
                  <Text style={[styles.langPillText, currentLanguage === 'ar' && styles.langPillActive]}>AR</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Tabs + Phone input — static, centred in remaining space */}
          <View style={styles.formSection}>
            <AuthTabs activeTab={activeTab} onTabChange={handleTabChange} isArabic={isArabic} />
            <PhoneInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder={t('auth.phone_placeholder')}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
              isArabic={isArabic}
            />
          </View>

          {/* Bottom — button + links pinned to bottom */}
          <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <AuthButton
              title={loading ? t('auth.sending_otp') : activeTab === 'login' ? t('auth.sign_in') : t('auth.signup')}
              onPress={handleAuth}
              disabled={loading}
            />

            <View style={[styles.bottomTextContainer, isArabic && styles.rtlRow]}>
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

            <View style={[styles.menuLinkContainer, isArabic && styles.rtlRow]}>
              <Text style={styles.menuLinkText}>{t('auth.check_menu')} </Text>
              <Text style={styles.menuLinkBtn} onPress={() => router.replace('/landing')}>
                {t('auth.click_here')}
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
    paddingTop: '1%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  skipBtn: {
    position: 'absolute',
    left: 0,
    top: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  skipText: {
    color: '#FAD979',
    fontSize: 15,
    fontWeight: '600',
  },
  skipBtnRTL: {
    left: undefined,
    right: 0,
  },
  langPillRTL: {
    right: undefined,
    left: 0,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  logo: {
    width: 80,
    height: 80,
  },
  langPill: {
    position: 'absolute',
    right: 0,
    top: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 64,
    justifyContent: 'center',
  },
  langPillText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  langPillActive: {
    color: '#FAD979',
    fontWeight: '800',
  },
  langPillSep: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 13,
    marginHorizontal: 5,
  },
  formSection: {
    marginTop: 8,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
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
  menuLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  menuLinkText: {
    color: '#C5D4CC',
    fontSize: 14,
  },
  menuLinkBtn: {
    color: '#FAD979',
    fontSize: 14,
    fontWeight: '600',
  },
});
