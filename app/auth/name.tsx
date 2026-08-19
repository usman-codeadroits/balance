import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NameScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  useStaticScreen();
  const insets = useSafeAreaInsets();

  const handleContinue = async () => {
    if (!name.trim()) {
      setError(t("name.enter_name"));
      return;
    }
    if (name.trim().length < 2) {
      setError(t("name.invalid_name"));
      return;
    }
    setError("");

    // Store name temporarily
    await AsyncStorage.setItem("tempName", name);

    router.push("/auth/birthday");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
      >
        {/* Header — logo only, no back navigation */}
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/balance-logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, isArabic && styles.rtlText]}>{t("name.title")}</Text>
        </View>

        {/* Name Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, isArabic && styles.rtlText, error ? styles.inputError : null]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError("");
            }}
            placeholder={t("name.placeholder")}
            placeholderTextColor="#8B9D94"
            autoCapitalize="words"
            autoCorrect={false}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <AuthButtonGreen title={t("name.continue")} onPress={handleContinue} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4E8E0",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 16,
  },
  headerLogo: {
    width: 72,
    height: 72,
  },
  headerContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#344225",
  },
  rtlText: {
    textAlign: "right",
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#344225",
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: "#FF6B6B",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    textAlign: "right",
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 16,
  },
});
