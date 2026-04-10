import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ComponentProps } from "react";

type TabKey = "home" | "history" | "calendar" | "profile";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface BottomTabNavProps {
  activeTab: TabKey;
  onHomePress?: () => void;
}

import { useTranslation } from "react-i18next";

const BottomTabNav: React.FC<BottomTabNavProps> = ({
  activeTab,
  onHomePress,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const NAV_ITEMS = [
    { key: "home", label: t("nav.home"), icon: "home", route: "/main-screen" },
    {
      key: "history",
      label: t("nav.history"),
      icon: "time",
      route: "/(tabs)/order-history",
    },
    {
      key: "calendar",
      label: t("nav.calendar"),
      icon: "calendar",
      route: "/(tabs)/calendar",
    },
    {
      key: "profile",
      label: t("nav.profile"),
      icon: "person",
      route: "/(tabs)/profile",
    },
  ] as const;

  const handlePress = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.key === "home") {
      onHomePress?.();
      router.replace(item.route);
      return;
    }

    router.push(item.route);
  };

  return (
    <View style={[styles.bottomNav, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeTab;

        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => handlePress(item)}
          >
            <Ionicons
              name={item.icon}
              size={26}
              color={isActive ? "#FAD979" : "#FFFFFF"}
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#344225",
    borderRadius: 24,
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#FFFFFF",
    marginTop: 4,
  },
  navLabelActive: {
    color: "#FAD979",
  },
});

export default BottomTabNav;
