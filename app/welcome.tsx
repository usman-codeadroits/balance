import AuthButton from "@/components/auth/auth-button";
import { LanguageSwitcherSegmented } from "@/components/auth/language-switcher-segmented";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BackHandler,
  Image,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

const WelcomeScreen = () => {
  const { t } = useTranslation();
  const [userName, setUserName] = useState("");
  const navigation = useNavigation();

  // Keep Welcome screen static: disable gestures and block hardware back
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ gestureEnabled: false });
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );
      return () => backHandler.remove();
    }, [navigation]),
  );

  useEffect(() => {
    loadUserName();
  }, []);

  const loadUserName = async () => {
    try {
      const name = await AsyncStorage.getItem("welcomeUserName");
      if (name) {
        setUserName(name);
      }
    } catch (error) {
      console.error("Error loading user name:", error);
    }
  };

  const handleNext = async () => {
    // Clear welcome flags
    await AsyncStorage.removeItem("showWelcome");
    await AsyncStorage.removeItem("welcomeUserName");

    // Check if user is authenticated
    try {
      const userId = await AsyncStorage.getItem("userId");
      const userData = await AsyncStorage.getItem("userData");
      const isAuthenticated = !!(userId && userData);

      if (isAuthenticated) {
        // User is authenticated, go to main screen
        router.replace("/main-screen");
      } else {
        // User is not authenticated, go to auth
        router.replace("/auth");
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
      // On error, redirect to auth to be safe
      router.replace("/auth");
    }
  };

  return (
    <ImageBackground
      source={require("@/assets/images/meal.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <LanguageSwitcherSegmented />
        </View>
        <View style={styles.content}>
          <Image
            source={require("@/assets/images/authlogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.textContainer}>
            <Text style={styles.welcome}>
              {userName ? `${t("welcome.welcome_msg")} ${userName}!` : t("welcome.welcome_to")}
            </Text>
            <Text style={styles.brand}>Balance</Text>
          </View>
        </View>

        <View style={styles.buttonWrapper}>
          <AuthButton title={t("welcome.next")} onPress={handleNext} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 32,
  },
  textContainer: {
    alignItems: "center",
    gap: 6,
  },
  welcome: {
    fontSize: 20,
    color: "#FAD979",
    fontWeight: "600",
  },
  brand: {
    fontSize: 34,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    color: "#E6F0EB",
    textAlign: "center",
    lineHeight: 20,
  },
  buttonWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
});

export default WelcomeScreen;
