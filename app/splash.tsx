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

export default function SplashScreen() {
  const [showSecondScreen, setShowSecondScreen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check if user is authenticated (has userId)
    const checkAuthentication = async () => {
      try {
        const userId = await AsyncStorage.getItem("userId");
        const userData = await AsyncStorage.getItem("userData");
        setIsAuthenticated(!!(userId && userData));
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
      }
    };

    checkAuthentication();
  }, []);

  useEffect(() => {
    // Prevent back navigation on Android
    let backHandler: { remove: () => void } | null = null;
    if (Platform.OS === "android" && BackHandler) {
      backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
        return true; // Prevent default back behavior
      });
    }

    // After 5 seconds, show second screen with logo and button (always show animation)
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
    }, 5000);

    return () => {
      clearTimeout(timer);
      if (backHandler) {
        backHandler.remove();
      }
    };
  }, [logoOpacity, buttonOpacity]);

  const handleNext = () => {
    // Always redirect to welcome screen first
    router.replace("/welcome");
  };

  // First screen - only "Balance" text
  if (!showSecondScreen) {
    return (
      <View style={styles.container}>
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

  // Second screen - logo, "Balance" text, and Next button
  return (
    <View style={styles.container}>
      {/* Keep logo + text close together */}
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

      {/* Next button at bottom */}
      <Animated.View
        style={[styles.buttonContainer, { opacity: buttonOpacity }]}
      >
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAD979",
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 8,
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
