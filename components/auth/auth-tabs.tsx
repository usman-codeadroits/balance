import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AuthTabsProps {
  activeTab: 'login' | 'signup';
  onTabChange: (tab: 'login' | 'signup') => void;
}

export default function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  return (
    <View style={styles.container}>
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
          Login
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
          Create account
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
