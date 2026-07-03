import { getMeals, type Meal } from "@/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const normalizeCategoryName = (category: unknown): string => {
  if (typeof category === "string") return category;
  if (category && typeof category === "object") {
    const c = category as { name?: unknown; title?: unknown };
    if (typeof c.name === "string") return c.name;
    if (typeof c.title === "string") return c.title;
  }
  return "";
};

type CategoryGroup = {
  id: number;
  name: string;
  meals: Meal[];
};

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

  const groupedCategories = useMemo((): CategoryGroup[] => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<number, CategoryGroup>();

    meals.forEach((m) => {
      const catName = normalizeCategoryName(m.category) || m.category_name || "";
      const catId = m.category_id ?? 0;
      if (!catName) return;

      if (q) {
        const haystack = [m.title, (m as any).description, catName]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(" ");
        if (!haystack.includes(q)) return;
      }

      if (!map.has(catId)) {
        map.set(catId, { id: catId, name: catName, meals: [] });
      }
      map.get(catId)!.meals.push(m);
    });

    return Array.from(map.values()).filter((g) => g.meals.length > 0);
  }, [meals, searchQuery]);

  const cardWidth = (width - 32 - 12) / 2;
  const topPad = Platform.OS === "android" ? insets.top + 4 : insets.top;

  const renderMealCard = (meal: Meal) => (
    <View key={meal.id} style={[styles.card, { width: cardWidth }]}>
      <View style={styles.calorieBadge}>
        <Text style={styles.calorieText}>{meal.calories} kcal</Text>
      </View>
      <Image
        source={meal.image_url ? { uri: meal.image_url } : require("@/assets/images/meal.jpg")}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{meal.title}</Text>
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

  const renderCategorySection = (group: CategoryGroup) => {
    const rows: Meal[][] = [];
    for (let i = 0; i < group.meals.length; i += 2) {
      rows.push(group.meals.slice(i, i + 2));
    }

    return (
      <View key={group.id} style={styles.categorySection}>
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{group.name}</Text>
          <Text style={styles.sectionCount}>{group.meals.length}</Text>
        </View>

        {/* 2-column grid */}
        <View style={styles.grid}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {row.map(renderMealCard)}
              {row.length === 1 && <View style={{ width: cardWidth }} />}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
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
        <Ionicons name="search" size={18} color="#6B7F75" style={styles.searchIcon} pointerEvents="none" />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#344225" />
        </View>
      ) : groupedCategories.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>No meals found</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Greeting scrolls with content */}
          <View style={styles.greetingRow}>
            <Text style={styles.greetingText}>Glad to see you!</Text>
            <Text style={styles.greetingSubtext}>
              Browse our menu and discover fresh, balanced meals crafted just for you.
            </Text>
          </View>
          {groupedCategories.map(renderCategorySection)}
        </ScrollView>
      )}

      {/* Bottom nav — all tabs redirect to login on landing screen */}
      <View style={[styles.bottomNav, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
        {([
          { icon: "home", label: "Home" },
          { icon: "time", label: "History" },
          { icon: "calendar", label: "Calendar" },
          { icon: "person", label: "Profile" },
        ] as const).map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.navItem}
            onPress={() => router.replace("/auth")}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={26} color={item.icon === "home" ? "#FAD979" : "#FFFFFF"} />
            <Text style={[styles.navLabel, item.icon === "home" && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: 16,
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
    marginHorizontal: 16,
    marginBottom: 12,
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
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 16,
    color: "#344225",
    fontWeight: "700",
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 13,
    color: "#5A7C65",
    lineHeight: 19,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
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
  categorySection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#344225",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FAD979",
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FAD979",
  },
  grid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
