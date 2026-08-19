import { getMeals, type Meal } from "@/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  name_ar: string;
  meals: Meal[];
};

export default function LandingScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
      const catNameAr =
        (m.category && typeof m.category === "object" ? (m.category as any).name_ar : null) ||
        m.category_name_ar ||
        "";
      const catId = m.category_id ?? 0;
      if (!catName) return;

      if (q) {
        const haystack = [m.title, m.title_ar, (m as any).description, m.description_ar, catName, catNameAr]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(" ");
        if (!haystack.includes(q)) return;
      }

      if (!map.has(catId)) {
        map.set(catId, { id: catId, name: catName, name_ar: catNameAr, meals: [] });
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
        <Text style={styles.calorieText}>{meal.calories} {t("main.kcal")}</Text>
      </View>
      <Image
        source={meal.image_url ? { uri: meal.image_url } : require("@/assets/images/meal.jpg")}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, isArabic && styles.rtlText]} numberOfLines={2}>
          {(isArabic && meal.title_ar) ? meal.title_ar : meal.title}
        </Text>
        <View style={[styles.macroRow, isArabic && styles.rtlRow]}>
          <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
            <View style={[styles.macroDot, { backgroundColor: "#4A90E2" }]} />
            <Text style={styles.macroText}>{t("main.cal")} {meal.calories}</Text>
          </View>
          <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
            <View style={[styles.macroDot, { backgroundColor: "#D0021B" }]} />
            <Text style={styles.macroText}>{t("main.protein")} {meal.protein_g}g</Text>
          </View>
        </View>
        <View style={[styles.macroRow, isArabic && styles.rtlRow]}>
          <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
            <View style={[styles.macroDot, { backgroundColor: "#7ED321" }]} />
            <Text style={styles.macroText}>{t("main.carbs")} {meal.carbs_g}g</Text>
          </View>
          <View style={[styles.macroItem, isArabic && styles.rtlRow]}>
            <View style={[styles.macroDot, { backgroundColor: "#F5A623" }]} />
            <Text style={styles.macroText}>{t("main.fat")} {meal.fat_g}g</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMealListRow = (meal: Meal) => {
    const desc = (isArabic && meal.description_ar) ? meal.description_ar : (meal as any).description;
    return (
      <View style={[styles.listRow, isArabic && styles.rtlRow]}>
        <View style={styles.listInfo}>
          <Text style={[styles.listTitle, isArabic && styles.rtlText]} numberOfLines={2}>
            {(isArabic && meal.title_ar) ? meal.title_ar : meal.title}
          </Text>
          {!!desc && (
            <Text style={[styles.listDesc, isArabic && styles.rtlText]} numberOfLines={3}>{desc}</Text>
          )}
          <View style={[styles.listMacroRow, isArabic && styles.rtlRow]}>
            <View style={styles.listMacroCol}>
              <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                <View style={[styles.listMacroDot, { backgroundColor: "#4A90E2" }]} />
                <Text style={styles.listMacroText}>{t("main.cal")} {meal.calories}</Text>
              </View>
              <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                <View style={[styles.listMacroDot, { backgroundColor: "#7ED321" }]} />
                <Text style={styles.listMacroText}>{t("main.carbs")} {meal.carbs_g}g</Text>
              </View>
            </View>
            <View style={styles.listMacroCol}>
              <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                <View style={[styles.listMacroDot, { backgroundColor: "#D0021B" }]} />
                <Text style={styles.listMacroText}>{t("main.protein")} {meal.protein_g}g</Text>
              </View>
              <View style={[styles.listMacroItem, isArabic && styles.rtlRow]}>
                <View style={[styles.listMacroDot, { backgroundColor: "#F5A623" }]} />
                <Text style={styles.listMacroText}>{t("main.fat")} {meal.fat_g}g</Text>
              </View>
            </View>
          </View>
        </View>
        <Image
          source={meal.image_url ? { uri: meal.image_url } : require("@/assets/images/meal.jpg")}
          style={styles.listImage}
          resizeMode="cover"
        />
      </View>
    );
  };

  const renderCategorySection = (group: CategoryGroup) => {
    const rows: Meal[][] = [];
    for (let i = 0; i < group.meals.length; i += 2) {
      rows.push(group.meals.slice(i, i + 2));
    }

    return (
      <View key={group.id} style={styles.categorySection}>
        {/* Section header */}
        <View style={[styles.sectionHeader, isArabic && styles.rtlRow]}>
          <Text style={[styles.sectionTitle, isArabic && styles.rtlText]}>
            {(isArabic && group.name_ar) ? group.name_ar : group.name}
          </Text>
          <Text style={styles.sectionCount}>{group.meals.length}</Text>
        </View>

        {viewMode === "grid" ? (
          <View style={styles.grid}>
            {rows.map((row, rowIdx) => (
              <View key={rowIdx}>
                <View style={styles.gridRow}>
                  {row.map(renderMealCard)}
                  {row.length === 1 && <View style={{ width: cardWidth }} />}
                  {row.length === 2 && <View style={styles.colDivider} pointerEvents="none" />}
                </View>
                {rowIdx < rows.length - 1 && <View style={styles.rowDivider} />}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.listWrap}>
            {group.meals.map((meal, idx) => (
              <View key={meal.id}>
                {renderMealListRow(meal)}
                {idx < group.meals.length - 1 && <View style={styles.listDivider} />}
              </View>
            ))}
          </View>
        )}
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
          style={[styles.searchInput, isArabic && styles.searchInputRTL]}
          placeholder={t("landing.search_placeholder")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#6B7F75"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          selectTextOnFocus
          textAlign={isArabic ? "right" : "left"}
        />
        <Ionicons
          name="search"
          size={18}
          color="#6B7F75"
          style={[styles.searchIcon, isArabic && styles.searchIconRTL]}
          pointerEvents="none"
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#344225" />
        </View>
      ) : groupedCategories.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>{t("main.no_meals")}</Text>
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
            <View style={[styles.greetingTopRow, isArabic && styles.rtlRow]}>
              <View style={[styles.greetingTextBlock, isArabic && styles.rtlTextBlock]}>
                <Text style={[styles.greetingText, isArabic && styles.rtlText]}>{t("landing.greeting")}</Text>
                <Text style={[styles.greetingSubtext, isArabic && styles.rtlText]}>
                  {t("landing.subtitle")}
                </Text>
              </View>
              <View style={styles.viewToggleRow}>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, viewMode === "grid" && styles.viewToggleBtnActive]}
                  onPress={() => setViewMode("grid")}
                  activeOpacity={1}
                >
                  <Ionicons name="grid-outline" size={18} color={viewMode === "grid" ? "#FFFFFF" : "#344225"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, viewMode === "list" && styles.viewToggleBtnActive]}
                  onPress={() => setViewMode("list")}
                  activeOpacity={1}
                >
                  <Ionicons name="list-outline" size={20} color={viewMode === "list" ? "#FFFFFF" : "#344225"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {groupedCategories.map(renderCategorySection)}
        </ScrollView>
      )}

      {/* Bottom nav — all tabs redirect to login on landing screen */}
      <View style={[styles.bottomNav, isArabic && styles.rtlRow, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
        {([
          { icon: "home", label: t("nav.home") },
          { icon: "time", label: t("nav.history") },
          { icon: "calendar", label: t("nav.calendar") },
          { icon: "person", label: t("nav.profile") },
        ] as const).map((item) => (
          <TouchableOpacity
            key={item.icon}
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
  searchInputRTL: {
    paddingRight: 14,
    paddingLeft: 42,
  },
  searchIconRTL: {
    right: undefined,
    left: 14,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
  greetingRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  greetingTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  rtlTextBlock: {
    paddingRight: 0,
    paddingLeft: 12,
    alignItems: "flex-end",
  },
  greetingText: {
    fontSize: 16,
    color: "#344225",
    fontWeight: "700",
  },
  greetingSubtext: {
    fontSize: 13,
    color: "#5A7C65",
    lineHeight: 19,
  },
  greetingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  viewToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C9D7CE",
  },
  viewToggleBtnActive: {
    backgroundColor: "#344225",
    borderColor: "#344225",
  },
  listWrap: {
    paddingHorizontal: 16,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 18,
  },
  listInfo: {
    flex: 1,
    justifyContent: "center",
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 8,
  },
  listDesc: {
    fontSize: 14,
    color: "#8A8F8B",
    lineHeight: 20,
    marginBottom: 14,
  },
  listMacroRow: {
    flexDirection: "row",
  },
  listMacroCol: {
    flex: 1,
    gap: 10,
  },
  listMacroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listMacroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listMacroText: {
    fontSize: 14,
    color: "#344225",
  },
  listImage: {
    width: 128,
    height: 118,
    borderRadius: 12,
    alignSelf: "center",
  },
  listDivider: {
    height: 1,
    backgroundColor: "#93A79B",
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
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    position: "relative",
    paddingVertical: 10,
  },
  colDivider: {
    position: "absolute",
    left: "50%",
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: "#C9D7CE",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#C9D7CE",
  },
  card: {},
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
    borderRadius: 10,
  },
  cardBody: {
    paddingVertical: 8,
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
