import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const [showSecondScreen, setShowSecondScreen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Check authentication state as early as possible
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [userId, userData] = await Promise.all([
          AsyncStorage.getItem("userId"),
          AsyncStorage.getItem("userData"),
        ]);
        setAuthState(!!(userId && userData) ? "authenticated" : "unauthenticated");
      } catch {
        setAuthState("unauthenticated");
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    // Block Android hardware back on splash
    let backHandler: { remove: () => void } | null = null;
    if (Platform.OS === "android" && BackHandler) {
      backHandler = BackHandler.addEventListener("hardwareBackPress", () => true);
    }

    const timer = setTimeout(() => {
      setShowSecondScreen(true);

      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 600,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2500);

    return () => {
      clearTimeout(timer);
      backHandler?.remove();
    };
  }, [logoOpacity, buttonOpacity]);

  // Once second screen is visible and we know auth state, handle auto-navigation
  useEffect(() => {
    if (!showSecondScreen || authState === "loading") return;

    if (authState === "authenticated") {
      // Check if this is a fresh login that should show welcome screen
      AsyncStorage.getItem("showWelcome").then((showWelcome) => {
        if (showWelcome === "true") {
          // Just logged in or onboarding just completed → show welcome
          router.replace("/welcome");
        } else {
          // Returning user → go straight to home without any button press
          router.replace("/main-screen");
        }
      });
    }
    // For unauthenticated, we keep the Next button visible
  }, [showSecondScreen, authState]);

  const handleNext = () => {
    router.replace("/welcome");
  };

  // First screen – just the Balance text
  if (!showSecondScreen) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.centerContent}>
          <Image
            source={require("@/assets/images/balance-text.png")}
            style={styles.balanceTextLarge}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  // Second screen – logo, text, and conditional button
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.secondScreenContent}>
        <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
          <Image
            source={require("@/assets/images/balance-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <View style={styles.secondTextContainer}>
          <Image
            source={require("@/assets/images/balance-text.png")}
            style={styles.balanceText}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Only show Next button for unauthenticated users */}
      {authState === "unauthenticated" && (
        <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAD979",
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  logo: {
    width: 150,
    height: 150,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  secondScreenContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceTextLarge: {
    width: 220,
    height: 70,
  },
  balanceText: {
    width: 180,
    height: 50,
  },
  secondTextContainer: {
    marginTop: 8,
  },
  buttonContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: "#344225",
    paddingVertical: 16,
    paddingHorizontal: 120,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#FAD979",
    fontSize: 16,
    fontWeight: "600",
  },
});
