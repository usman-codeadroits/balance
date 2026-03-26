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

export default function NameScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  useStaticScreen();

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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header with back button and logo */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Image
            source={require("@/assets/images/balance-logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{t("name.title")}</Text>
        </View>

        {/* Name Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
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
        <View style={styles.bottomSection}>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 20,
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
  headerLogo: {
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
