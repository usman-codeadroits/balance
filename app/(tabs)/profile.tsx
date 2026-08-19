import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomTabNav from "@/components/bottom-tab-nav";
import { logoutUser } from "@/api";
import { resetAppCache } from "@/utils/reset-app-cache";

import { useTranslation } from "react-i18next";

import { isArabicLanguage } from "@/constants/i18n";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = isArabicLanguage(i18n.language);
  const insets = useSafeAreaInsets();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuItems = [
    { id: 1, title: t("profile.my_information"),   route: "/my-profile" },
    { id: 2, title: t("profile.allergies"),         route: "/(tabs)/allergies-preference" },
    { id: 3, title: t("profile.dislikes"),          route: "/(tabs)/dislikes-preference" },
    { id: 5, title: t("profile.about_us"),          route: null },
    { id: 6, title: t("profile.terms_conditions"),  route: "/(tabs)/terms-and-conditions" },
    { id: 7, title: t("profile.privacy_policy"),    route: "/(tabs)/privacy-policy" },
    { id: 8, title: t("profile.contact_us"),        route: "/contact-us" },
    { id: 9, title: t("profile.ask_a_question"),    route: "/(tabs)/app-inquiries" },
    { id: 10, title: t("profile.change_language"),  route: "/change-language" },
  ];

  const handleLogout = async () => {
    Alert.alert(t("profile.logout"), t("profile.logout_confirm"), [
      {
        text: t("profile.cancel"),
        style: "cancel",
      },
      {
        text: t("profile.logout"),
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            // Invalidate the server-side token (best-effort — proceed even if API fails)
            await logoutUser().catch(() => {});
            await resetAppCache();
            router.replace("/auth");
          } catch (error) {
            Alert.alert(t("profile.error"), t("profile.logout_error"));
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <View style={[styles.titleContainer, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
          <Text style={styles.title}>{t("profile.title")}</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => item.route && router.push(item.route as any)}
              >
                {isArabic ? (
                  <>
                    <Ionicons name="chevron-back" size={20} color="#344225" />
                    <Text style={styles.menuText}>{item.title}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.menuText}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#344225" />
                  </>
                )}
              </TouchableOpacity>
            ))}

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isArabic ? (
                <>
                  <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                  <Text style={[styles.menuText, styles.logoutText]}>{t("profile.logout")}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.menuText, styles.logoutText]}>{t("profile.logout")}</Text>
                  <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <BottomTabNav
        activeTab="profile"
        onHomePress={() => router.replace("/main-screen")}
      />
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
  },
  titleContainer: {
    paddingHorizontal: "5%",
    paddingBottom: 20,
    backgroundColor: "#D4E8E0",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#344225",
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    backgroundColor: "#E8F0ED",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#344225",
  },
  logoutItem: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#D4E8E0",
    paddingTop: 18,
  },
  logoutText: {
    color: "#FF6B6B",
    fontWeight: "600",
  },
});
