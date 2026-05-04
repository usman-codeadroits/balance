import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { initI18n } from "@/constants/i18n";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect, useState } from "react";

// Keep native splash visible only until JS/app initialization finishes.
void SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initI18n().then(() => setInitialized(true));
  }, []);

  useEffect(() => {
    if (initialized) {
      void SplashScreen.hideAsync();
    }
  }, [initialized]);

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
