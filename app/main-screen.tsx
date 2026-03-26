import { getMeals, type Meal } from "@/api";
import BottomTabNav from "@/components/bottom-tab-nav";
import { resetAppCache } from "@/utils/reset-app-cache";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  I18nManager,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function MainScreen() {
  const { t } = useTranslation();
  const [userName, setUserName] = useState("");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [greetingPrefix, setGreetingPrefix] = useState(t("main.good_morning"));
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionTitle, setSubscriptionTitle] = useState("");

  useEffect(() => {
    // Disable back button
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreetingPrefix(t("main.good_morning"));
    else if (hour < 18) setGreetingPrefix(t("main.good_afternoon"));
    else setGreetingPrefix(t("main.good_evening"));
  }, [t]);

  useEffect(() => {
    const load = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("userData");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserName(parsed.name || "");
        }

        const storedSub = await AsyncStorage.getItem("activeSubscription");
        const subscription = storedSub ? JSON.parse(storedSub) : null;

        setHasSubscription(!!subscription);
        setSubscriptionTitle(subscription?.plan?.title || "");

        setLoading(true);
        const data = await getMeals();
        setMeals(data);
      } catch (error) {
        console.error("Error loading meals:", error);
        Alert.alert(t("common.error"), t("main.error_load_meals"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter((m) => {
      const haystack = [m.title, (m as any).description, (m as any).category]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [meals, searchQuery]);

  const handleLogout = () => {
    Alert.alert(
      t("profile.logout"),
      t("profile.logout_confirm"),
      [
        { text: t("profile.cancel"), style: "cancel" },
        {
          text: t("profile.logout"),
          style: "destructive",
          onPress: async () => {
            try {
              await resetAppCache();
            } catch (error) {
              console.error("Error during logout:", error);
            } finally {
              router.replace("/auth");
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Balance</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t("main.search_placeholder")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7F75"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => setSearchQuery((prev) => prev.trim())}
            clearButtonMode="while-editing"
            selectTextOnFocus
          />
          <Ionicons
            name="search"
            size={18}
            color="#6B7F75"
            style={[
              styles.searchIcon,
              I18nManager.isRTL ? { left: 26, right: undefined } : { right: 26, left: undefined }
            ]}
            pointerEvents="none"
          />
        </View>

        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>
            {greetingPrefix}{" "}
            <Text style={styles.welcomeName}>{userName || t("main.user_fallback")}</Text>!
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              router.push(
                hasSubscription
                  ? "/subscription-details"
                  : "/auth/subscription"
              )
            }
          >
            <Text style={styles.actionButtonText}>
              {hasSubscription ? t("main.view_subscription") : t("main.add_subscription")}
            </Text>
            {hasSubscription && !!subscriptionTitle && (
              <Text style={styles.actionButtonSub}>{subscriptionTitle}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push("/auth/reviews")}
          >
            <Text style={styles.actionButtonText}>{t("main.user_reviews")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>{t("main.loading_meals")}</Text>
            </View>
          ) : filteredMeals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t("main.no_meals")}</Text>
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {filteredMeals.map((meal) => (
                <View key={meal.id} style={styles.card}>
                  <View style={styles.calorieBadge}>
                    <Text style={styles.calorieText}>{meal.calories} kcal</Text>
                  </View>
                  <Image
                    source={
                      meal.image_url
                        ? { uri: meal.image_url }
                        : require("@/assets/images/meal.jpg")
                    }
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {meal.title}
                    </Text>
                    <View style={styles.macroRow}>
                      <View style={styles.macroItem}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: "#4A90E2" },
                          ]}
                        />
                        <Text style={styles.macroText}>
                          {t("main.cal")} {meal.calories}
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: "#D0021B" },
                          ]}
                        />
                        <Text style={styles.macroText}>
                          {t("main.protein")} {meal.protein_g}g
                        </Text>
                      </View>
                    </View>
                    <View style={styles.macroRow}>
                      <View style={styles.macroItem}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: "#7ED321" },
                          ]}
                        />
                        <Text style={styles.macroText}>
                          {t("main.carbs")} {meal.carbs_g}g
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <View
                          style={[
                            styles.macroDot,
                            { backgroundColor: "#F5A623" },
                          ]}
                        />
                        <Text style={styles.macroText}>{t("main.fat")} {meal.fat_g}g</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      <BottomTabNav
        activeTab="home"
        onHomePress={() => router.replace("/main-screen")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DCE6E0",
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    position: "relative",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#C9D7CE",
    fontSize: 14,
    color: "#344225",
  },
  searchIcon: {
    position: "absolute",
    right: 26,
    top: 14,
  },
  welcomeRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: "#344225",
  },
  welcomeName: {
    fontWeight: "800",
    color: "#344225",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#344225",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#F6F0DF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  actionButtonSub: {
    color: "#DAD3C2",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 200,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    color: "#344225",
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D7E3DC",
  },
  calorieBadge: {
    position: "absolute",
    zIndex: 1,
    top: 8,
    left: 8,
    backgroundColor: "#E52C49",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  calorieText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  cardImage: {
    width: "100%",
    height: 130,
  },
  cardBody: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroText: {
    fontSize: 10,
    color: "#344225",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7F75",
  },
});
