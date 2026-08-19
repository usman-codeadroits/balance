import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTION_KEYS = Array.from({ length: 11 }, (_, i) => i + 1);

export default function PrivacyPolicyScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === 'ios' ? 6 : Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('privacy_policy.header_title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, isArabic && styles.rtlText]}>
          {t('privacy_policy.intro')}
        </Text>

        {SECTION_KEYS.map((n) => (
          <React.Fragment key={n}>
            <Text style={[styles.sectionTitle, isArabic && styles.rtlText]}>{t(`privacy_policy.s${n}_title`)}</Text>
            <Text style={[styles.body, isArabic && styles.rtlText]}>{t(`privacy_policy.s${n}_body`)}</Text>
          </React.Fragment>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  intro: {
    fontSize: 14,
    color: '#4A6040',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 8,
    marginTop: 8,
  },
  body: {
    fontSize: 14,
    color: '#5A7C65',
    lineHeight: 22,
    marginBottom: 20,
  },
});
