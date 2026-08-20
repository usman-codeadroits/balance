import { Tabs } from 'expo-router';
import React from 'react';
import { I18nManager } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: 'none' },
        gestureEnabled: false,
        sceneStyle: { direction: I18nManager.isRTL ? 'rtl' : 'ltr' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          gestureEnabled: false,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen name="allergies-preference" options={{ title: 'Allergies' }} />
      <Tabs.Screen name="allergies-list" options={{ title: 'Allergies' }} />
      <Tabs.Screen name="dislikes-preference" options={{ title: 'Dislikes' }} />
      <Tabs.Screen name="dislikes-input" options={{ title: 'Dislikes' }} />
      <Tabs.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
      <Tabs.Screen name="terms-and-conditions" options={{ title: 'Terms & Conditions' }} />
    </Tabs>
  );
}
