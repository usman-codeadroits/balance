import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { isArabicLanguage } from '@/constants/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { i18n } = useTranslation();
  const direction = isArabicLanguage(i18n.language) ? 'rtl' : 'ltr';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: 'none' },
        gestureEnabled: false,
        sceneStyle: { direction },
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
      {/* Every screen in this folder must be registered here: an unregistered route falls back to
          "index", which redirects to /main-screen (looked like a crash back to Home) */}
      <Tabs.Screen name="order-history" options={{ title: 'Order History' }} />
      <Tabs.Screen name="app-inquiries" options={{ title: 'Ask a Question' }} />
      <Tabs.Screen name="contact-us" options={{ title: 'Contact Us' }} />
      <Tabs.Screen name="change-language" options={{ title: 'Change Language' }} />
      <Tabs.Screen name="my-information" options={{ title: 'My Information' }} />
      <Tabs.Screen name="allergies-preference" options={{ title: 'Allergies' }} />
      <Tabs.Screen name="allergies-list" options={{ title: 'Allergies' }} />
      <Tabs.Screen name="dislikes-preference" options={{ title: 'Dislikes' }} />
      <Tabs.Screen name="dislikes-input" options={{ title: 'Dislikes' }} />
      <Tabs.Screen name="privacy-policy" options={{ title: 'Privacy Policy' }} />
      <Tabs.Screen name="terms-and-conditions" options={{ title: 'Terms & Conditions' }} />
    </Tabs>
  );
}
