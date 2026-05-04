import { getMeals, type Meal } from "@/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    getMeals()
      .then(setMeals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter((m) => {
      const haystack = [m.title, (m as any).description, m.category_name]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [meals, searchQuery]);

  const cardWidth = (width - width * 0.1 - 12) / 2;

  const renderCard = ({ item: meal }: { item: Meal }) => (
    <View style={[styles.card, { width: cardWidth }]}>
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
            <View style={[styles.macroDot, { backgroundColor: "#4A90E2" }]} />
            <Text style={styles.macroText}>Cal {meal.calories}</Text>
          </View>
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: "#D0021B" }]} />
            <Text style={styles.macroText}>Protein {meal.protein_g}g</Text>
          </View>
        </View>
        <View style={styles.macroRow}>
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: "#7ED321" }]} />
            <Text style={styles.macroText}>Carbs {meal.carbs_g}g</Text>
          </View>
          <View style={styles.macroItem}>
            <View style={[styles.macroDot, { backgroundColor: "#F5A623" }]} />
            <Text style={styles.macroText}>Fat {meal.fat_g}g</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const topPad = Platform.OS === "android" ? insets.top + 4 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="menu" size={26} color="#344225" />
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <Image
            source={require("@/assets/images/balance-text.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.7}
          onPress={() => router.push("/auth")}
        >
          <Ionicons name="person-circle-outline" size={28} color="#344225" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#6B7F75"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          selectTextOnFocus
        />
        <Ionicons
          name="search"
          size={18}
          color="#6B7F75"
          style={styles.searchIcon}
          pointerEvents="none"
        />
      </View>

      {/* Greeting */}
      <View style={styles.greetingRow}>
        <Text style={styles.greetingText}>Glad to see you!</Text>
      </View>

      {/* Meal grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#344225" />
        </View>
      ) : filteredMeals.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>No meals found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMeals}
          renderItem={renderCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}

      {/* Static bottom nav — in normal flow, no active state, no navigation */}
      <View style={[styles.navOuter, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.navBar}>
          {[
            { icon: "home" as const, label: "Home" },
            { icon: "time" as const, label: "Macros History" },
            { icon: "calendar" as const, label: "Calendar" },
            { icon: "person" as const, label: "Profile" },
          ].map((item) => (
            <View key={item.label} style={styles.navItem}>
              <Ionicons name={item.icon} size={26} color="#FFFFFF" />
              <Text style={styles.navLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  backgroundColor: "#DCE6E0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: "5%",
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerLogo: {
    width: "60%",
    height: 32,
  },
  searchWrap: {
    marginHorizontal: "5%",
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    paddingRight: 42,
    borderWidth: 1,
    borderColor: "#C9D7CE",
    fontSize: 14,
    color: "#344225",
  },
  searchIcon: {
    position: "absolute",
    right: 14,
    top: 12,
  },
  greetingRow: {
    paddingHorizontal: "5%",
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 16,
    color: "#344225",
    fontWeight: "500",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7F75",
  },
  listContent: {
    paddingHorizontal: "5%",
    paddingBottom: 12,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navOuter: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "#DCE6E0",
  },
  navBar: {
    backgroundColor: "#344225",
    borderRadius: 24,
    flexDirection: "row",
    paddingVertical: 13,
    paddingHorizontal: 16,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
  card: {
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
    marginBottom: 4,
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
});
