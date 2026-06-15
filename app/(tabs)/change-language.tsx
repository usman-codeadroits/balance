import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, I18nManager, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { changeLanguage } from '@/constants/i18n';

function LangIcon() {
  return (
    <View style={iconStyles.wrap}>
      <View style={[iconStyles.badge, { backgroundColor: '#344225', left: 10, top: 10 }]}>
        <Text style={iconStyles.badgeText}>EN</Text>
      </View>
      <View style={[iconStyles.badge, { backgroundColor: '#007A3D', right: 10, bottom: 10 }]}>
        <Text style={iconStyles.badgeText}>ع</Text>
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrap: {
    width: 88,
    height: 88,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#D4E8E0',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});

export default function ChangeLanguageScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [switching, setSwitching] = useState(false);

  const handleLanguageSelect = async (language: 'en' | 'ar') => {
    if (currentLanguage === language || switching) return;

    const rtlChanging = (language === 'ar') !== I18nManager.isRTL;

    setSwitching(true);
    try {
      await changeLanguage(language);

      if (rtlChanging) {
        // RTL/LTR direction changed — must reload the app for layout to apply
        Alert.alert(
          language === 'ar' ? 'تم تغيير اللغة' : 'Language Changed',
          language === 'ar'
            ? 'سيتم إعادة تشغيل التطبيق لتطبيق اتجاه العربية.'
            : 'The app will restart to apply the new layout direction.',
          [
            {
              text: 'OK',
              onPress: async () => {
                try {
                  await Updates.reloadAsync();
                } catch {
                  // In dev mode expo-updates reload may not work — inform user
                  Alert.alert(
                    'Restart Required',
                    'Please close and reopen the app to apply the layout direction.',
                  );
                }
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        // Same RTL direction — text updates immediately, no reload needed
        router.replace('/(tabs)/profile' as any);
      }
    } catch {
      Alert.alert('Error', 'Failed to change language. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/profile' as any)}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('change_language.title')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Language Options */}
          {([
            { lang: 'en', label: 'English', native: 'English', accent: '#344225' },
            { lang: 'ar', label: 'العربية', native: 'Arabic', accent: '#007A3D' },
          ] as const).map(({ lang, label, native, accent }) => {
            const isActive = currentLanguage === lang;
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.languageButton, isActive && styles.languageButtonActive]}
                onPress={() => handleLanguageSelect(lang)}
                disabled={switching}
                activeOpacity={0.8}
              >
                <View style={[styles.langAccent, { backgroundColor: isActive ? '#FAD979' : accent }]} />
                <View style={styles.langTextWrap}>
                  <Text style={[styles.languageButtonText, isActive && styles.languageButtonTextActive]}>
                    {label}
                  </Text>
                  <Text style={[styles.langNative, isActive && styles.langNativeActive]}>
                    {native}
                  </Text>
                </View>
                {isActive && !switching && (
                  <Ionicons name="checkmark-circle" size={24} color="#FAD979" />
                )}
                {switching && isActive && (
                  <ActivityIndicator size="small" color="#FAD979" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8E0',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '5%',
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#344225',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#344225',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: '5%',
    paddingTop: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7F75',
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '500',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  languageButtonActive: {
    backgroundColor: '#344225',
  },
  langAccent: {
    width: 5,
    height: 42,
    borderRadius: 3,
  },
  langTextWrap: {
    flex: 1,
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 2,
  },
  languageButtonTextActive: {
    color: '#FFFFFF',
  },
  langNative: {
    fontSize: 12,
    color: '#6B7F75',
    fontWeight: '400',
  },
  langNativeActive: {
    color: '#B8D5C5',
  },
});
