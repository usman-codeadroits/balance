import { useStaticScreen } from "@/app/auth/utils/use-static-screen";
import AuthButtonGreen from "@/components/auth/auth-button-green";
import { Ionicons } from "@expo/vector-icons";
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
  TouchableOpacity,
  View,
} from "react-native";

export default function AffiliatedCodeScreen() {
  const { t } = useTranslation();
  const [affiliatedCode, setAffiliatedCode] = useState("");
  const [error, setError] = useState("");
  useStaticScreen();

  const handleContinue = async () => {
    // Store affiliated code temporarily (can be empty if user doesn't enter one)
    await AsyncStorage.setItem("tempAffiliatedCode", affiliatedCode.trim());

    // Navigate to email screen (affiliate code comes before email)
    router.push("/auth/email");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/balance-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{t("affiliated.title")}</Text>
          <Text style={styles.subtitle}>
            {t("affiliated.subtitle")}
          </Text>
        </View>

        {/* Affiliated Code Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={affiliatedCode}
            onChangeText={(text) => {
              setAffiliatedCode(text);
              setError("");
            }}
            placeholder={t("affiliated.placeholder")}
            placeholderTextColor="#8B9D94"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <AuthButtonGreen title={t("affiliated.continue")} onPress={handleContinue} />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerPlaceholder: {
    width: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
  },
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7F75",
    lineHeight: 18,
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
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 30,
  },
});
