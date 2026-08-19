import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AuthTabsProps {
  activeTab: 'login' | 'signup';
  onTabChange: (tab: 'login' | 'signup') => void;
  isArabic?: boolean;
}

export default function AuthTabs({ activeTab, onTabChange, isArabic = false }: AuthTabsProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.container, isArabic && styles.containerRTL]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'login' && styles.activeTab,
        ]}
        onPress={() => onTabChange('login')}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.tabText,
          activeTab === 'login' && styles.activeTabText,
        ]}>
          {t('auth.login')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'signup' && styles.activeTab,
        ]}
        onPress={() => onTabChange('signup')}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.tabText,
          activeTab === 'signup' && styles.activeTabText,
        ]}>
          {t('auth.create_account')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FAD979',
    borderRadius: 8,
    padding: 4,
    marginBottom: 30,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#344225',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#344225',
  },
  activeTabText: {
    color: '#FAD979',
  },
});
