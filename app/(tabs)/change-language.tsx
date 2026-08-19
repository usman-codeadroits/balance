import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { changeLanguage } from '@/constants/i18n';
import { isArabicLanguage } from '@/constants/i18n';

export default function ChangeLanguageScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const isArabic = isArabicLanguage(currentLanguage);
  const [switching, setSwitching] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLanguageSelect = async (language: 'en' | 'ar') => {
    if (currentLanguage === language || switching) return;

    const rtlChanging = (language === 'ar') !== I18nManager.isRTL;

    setSwitching(true);
    try {
      await changeLanguage(language);

      if (rtlChanging) {
        Alert.alert(
          t('change_language.changed_title'),
          t('change_language.restart_message'),
          [
            {
              text: t('common.ok'),
              onPress: async () => {
                try {
                  await Updates.reloadAsync();
                } catch {
                  Alert.alert(
                    t('change_language.restart_required_title'),
                    t('change_language.restart_required_message'),
                  );
                }
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        router.replace('/(tabs)/profile' as any);
      }
    } catch {
      Alert.alert(t('common.error'), t('change_language.error'));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === 'ios' ? 6 : Math.max(insets.top, 8) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/profile' as any)}
        >
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('change_language.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Logo centered */}
      <View style={styles.logoWrap}>
        <Image
          source={require('@/assets/images/balance-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Bottom buttons */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => handleLanguageSelect('en')}
          disabled={switching}
          activeOpacity={0.85}
        >
          {switching && currentLanguage !== 'en' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.langBtnText}>English</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => handleLanguageSelect('ar')}
          disabled={switching}
          activeOpacity={0.85}
        >
          {switching && currentLanguage !== 'ar' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.langBtnText}>العربية</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8E0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#344225',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#344225',
  },
  headerSpacer: {
    width: 38,
  },
  logoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  footer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  langBtn: {
    backgroundColor: '#344225',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
