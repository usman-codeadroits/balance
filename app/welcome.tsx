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
      if (name) setUserName(name);
    } catch (error) {
      console.error("Error loading user name:", error);
    }
  };

  const handleNext = async () => {
    await AsyncStorage.removeItem("showWelcome");
    await AsyncStorage.removeItem("welcomeUserName");

    try {
      const userId = await AsyncStorage.getItem("userId");
      const userData = await AsyncStorage.getItem("userData");
      const isAuthenticated = !!(userId && userData);

      if (isAuthenticated) {
        router.replace("/main-screen");
      } else {
        router.replace("/auth");
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
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

      {/* ── Black overlay 65% ── */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <LanguageSwitcherSegmented />
        </View>

        <View style={styles.content}>
          {/* ── Logo — auto size via resizeMode contain ── */}
          <Image
            source={require("@/assets/images/authlogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.textContainer}>
            <Text style={styles.welcome}>
              {userName
                ? `${t("welcome.welcome_msg")} ${userName}!`
                : t("welcome.welcome_to")}
            </Text>

            {/* ── "Balance" text replaced with balance1.png — auto size ── */}
            <Image
              source={require("@/assets/images/balance1.png")}
              style={styles.brandImage}
              resizeMode="contain"
            />
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

  // 65% black overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },

  safeArea: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 15,
    alignItems: "center",
    width: "100%",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  // Auto size: width fills container, height scales automatically
  logo: {
    width: "40%",
    height: undefined,
    aspectRatio: 1,   // adjust to your actual logo ratio e.g. 1, 2, 0.5
    marginBottom: 28,
  },

  textContainer: {
    alignItems: "center",
    gap: 12,
  },

  welcome: {
    fontSize: 20,
    color: "#FAD979",
    fontWeight: "600",
  },

  // balance1.png — auto height based on aspect ratio
  brandImage: {
    width: "40%",
    height: undefined,
    aspectRatio: 3,   // adjust to your actual balance1.png ratio e.g. 3 means 3:1 wide
  },

  buttonWrapper: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
});

export default WelcomeScreen;