import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import type { ComponentProps } from "react";

type TabKey = "home" | "history" | "calendar" | "profile";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface BottomTabNavProps {
  activeTab: TabKey;
  onHomePress?: () => void;
}

const BottomTabNav: React.FC<BottomTabNavProps> = ({
  activeTab,
  onHomePress,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const insets = useSafeAreaInsets();

  const NAV_ITEMS = [
    { key: "home", label: t("nav.home"), iconActive: "home", iconInactive: "home-outline", route: "/main-screen" },
    { key: "history", label: t("nav.history"), iconActive: "time", iconInactive: "time-outline", route: "/(tabs)/order-history" },
    { key: "calendar", label: t("nav.calendar"), iconActive: "calendar", iconInactive: "calendar-outline", route: "/(tabs)/calendar" },
    { key: "profile", label: t("nav.profile"), iconActive: "person", iconInactive: "person-outline", route: "/(tabs)/profile" },
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
    <View style={[styles.bottomNav, isArabic && styles.rtlRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeTab;

        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={(isActive ? item.iconActive : item.iconInactive) as IoniconName}
              size={22}
              color={isActive ? "#FAD979" : "#B8D5C5"}
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
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
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#344225",
    flexDirection: "row",
    paddingTop: 10,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 10,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#B8D5C5",
  },
  navLabelActive: {
    color: "#FAD979",
    fontWeight: "700",
  },
});

export default BottomTabNav;
