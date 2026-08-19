import { clearDislikes, getDislikes } from '@/api/services/dislikes';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DislikesPreferenceScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const insets = useSafeAreaInsets();
  const [hasDislikes, setHasDislikes] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFromApi();
  }, []);

  const loadFromApi = async () => {
    try {
      const res = await getDislikes();
      if (res.success && res.data) {
        setHasDislikes(res.data.dislikes.length > 0);
      }
    } catch {
      // ignore, user can still set preference
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (hasDislikes === null) return;

    if (hasDislikes) {
      router.push('/(tabs)/dislikes-input' as any);
      return;
    }

    // User chose No — clear dislikes via API
    setSaving(true);
    try {
      await clearDislikes();
      router.replace('/(tabs)/profile' as any);
    } catch {
      Alert.alert(t('common.error'), t('dislikes_pref.save_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === 'ios' ? 6 : Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dislikes_pref.header_title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#344225" />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroWrap}>
              <View style={styles.heroIconCircle}>
                <Ionicons name="restaurant-outline" size={40} color="#344225" />
              </View>
              <Text style={styles.title}>{t('dislikes_pref.question')}</Text>
              <Text style={styles.subtitle}>
                {t('dislikes_pref.subtitle')}
              </Text>
            </View>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[styles.optionCard, isArabic && styles.rtlRow, hasDislikes === true && styles.optionCardSelected]}
                onPress={() => setHasDislikes(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionLeft, isArabic && styles.rtlRow]}>
                  <View style={[styles.optionIconWrap, hasDislikes === true && styles.optionIconWrapSelected]}>
                    <Ionicons
                      name="create-outline"
                      size={22}
                      color={hasDislikes === true ? '#FAD979' : '#344225'}
                    />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionTitle, isArabic && styles.rtlText, hasDislikes === true && styles.optionTitleSelected]}>
                      {t('dislikes_pref.yes_title')}
                    </Text>
                    <Text style={[styles.optionDesc, isArabic && styles.rtlText, hasDislikes === true && styles.optionDescSelected]}>
                      {t('dislikes_pref.yes_desc')}
                    </Text>
                  </View>
                </View>
                <View style={[styles.radioOuter, hasDislikes === true && styles.radioOuterSelected]}>
                  {hasDislikes === true && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, isArabic && styles.rtlRow, hasDislikes === false && styles.optionCardSelected]}
                onPress={() => setHasDislikes(false)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionLeft, isArabic && styles.rtlRow]}>
                  <View style={[styles.optionIconWrap, hasDislikes === false && styles.optionIconWrapSelected]}>
                    <Ionicons
                      name="thumbs-up-outline"
                      size={22}
                      color={hasDislikes === false ? '#FAD979' : '#344225'}
                    />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionTitle, isArabic && styles.rtlText, hasDislikes === false && styles.optionTitleSelected]}>
                      {t('dislikes_pref.no_title')}
                    </Text>
                    <Text style={[styles.optionDesc, isArabic && styles.rtlText, hasDislikes === false && styles.optionDescSelected]}>
                      {t('dislikes_pref.no_desc')}
                    </Text>
                  </View>
                </View>
                <View style={[styles.radioOuter, hasDislikes === false && styles.radioOuterSelected]}>
                  {hasDislikes === false && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
            <TouchableOpacity
              style={[styles.continueButton, (hasDislikes === null || saving) && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={hasDislikes === null || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.continueButtonText}>
                  {hasDislikes ? t('dislikes_pref.continue') : t('dislikes_pref.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8E0',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    fontWeight: '700',
    color: '#344225',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAD979',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#344225',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7F75',
    textAlign: 'center',
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 14,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: '#344225',
    borderColor: '#344225',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: '#FFFFFF',
  },
  optionDesc: {
    fontSize: 12,
    color: '#6B7F75',
  },
  optionDescSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C8DDD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#FAD979',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FAD979',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D4E8E0',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: '#344225',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
