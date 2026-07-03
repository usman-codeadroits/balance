import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";

import { initI18n } from "@/constants/i18n";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect, useRef, useState } from "react";

// Keep native splash visible only until JS/app initialization finishes.
void SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [initialized, setInitialized] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    initI18n().then(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (initialized) {
      void SplashScreen.hideAsync();
    }
  }, [initialized]);

  useEffect(() => {
    // Navigate to the right screen when the user taps a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const type = response.notification.request.content.data?.type;
      if (type === "auto_renewal") {
        router.push("/renewal-details" as any);
      } else if (type === "meal_reminder") {
        router.push("/subscription-details" as any);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (!initialized) {
    return null; // Or a loading spinner / splash screen
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="splash"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animationTypeForReplace: "push",
          }}
        />
        <Stack.Screen
          name="landing"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animationTypeForReplace: "push",
          }}
        />
        <Stack.Screen
          name="auth/index"
          options={{
            gestureEnabled: false,
            animationTypeForReplace: "push",
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            gestureEnabled: false,
            animationTypeForReplace: "push",
          }}
        />
        <Stack.Screen
          name="home"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animationTypeForReplace: "push",
          }}
        />
        <Stack.Screen
          name="main-screen"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animationTypeForReplace: "push",
          }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
