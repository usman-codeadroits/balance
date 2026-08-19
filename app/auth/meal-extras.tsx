import { getMeals, type Meal, type MealExtra } from "@/api";
import { assignMealToSlot } from "@/app/auth/utils/assign-meal-to-slot";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MealExtrasScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const mealId = Number(params.mealId);
  const dayIndex = Number(params.dayIndex);
  const mealIndex = Number(params.mealIndex);
  const type = (params.type as string) === "snack" ? "snack" : "meal";
  const subscriptionMealId = params.subscriptionMealId
    ? Number(params.subscriptionMealId)
    : undefined;
  const from = (params.from as string) || "browse"; // "browse" (add) | "slots" (edit)
  const preselectedIds = useMemo(() => {
    const raw = (params.preselected as string) || "";
    return raw
      .split(",")
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);
  }, [params.preselected]);

  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // extra.id -> selected ingredient ids
  const [selected, setSelected] = useState<Record<number, number[]>>({});

  useEffect(() => {
    let mounted = true;
    getMeals()
      .then((meals) => {
        if (!mounted) return;
        const found = meals.find((m) => m.id === mealId) || null;
        setMeal(found);
        // Seed selection from preselected ids, grouped under their extra
        if (found?.meal_extras?.length) {
          const seed: Record<number, number[]> = {};
          found.meal_extras.forEach((ex) => {
            const ids = ex.ingredients
              .filter((ing) => preselectedIds.includes(ing.id))
              .map((ing) => ing.id);
            if (ids.length) seed[ex.id] = ids;
          });
          setSelected(seed);
        }
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [mealId, preselectedIds]);

  const extras: MealExtra[] = meal?.meal_extras ?? [];

  const toggleOption = (extra: MealExtra, optionId: number) => {
    setSelected((prev) => {
      const current = prev[extra.id] ?? [];
      if (extra.selection_type === "single") {
        return { ...prev, [extra.id]: current[0] === optionId ? [] : [optionId] };
      }
      // multiple: toggle off if selected; when adding, enforce max_select cap
      if (current.includes(optionId)) {
        return { ...prev, [extra.id]: current.filter((id) => id !== optionId) };
      }
      const max = extra.max_select;
      if (max != null && current.length >= max) {
        return prev; // at the cap — ignore extra picks (server enforces too)
      }
      return { ...prev, [extra.id]: [...current, optionId] };
    });
  };

  const missingRequired = extras.filter(
    (ex) => ex.is_required && (selected[ex.id]?.length ?? 0) === 0,
  );
  const canSubmit = missingRequired.length === 0 && !saving;

  const goBackToSlots = () => {
    const count = from === "browse" ? 2 : 1;
    const nav = navigation as any;
    if (typeof nav.pop === "function") nav.pop(count);
    else router.back();
  };

  const handleSubmit = async () => {
    if (!meal) return;
    if (missingRequired.length > 0) {
      const names = missingRequired
        .map((ex) => (isArabic && ex.name_ar ? ex.name_ar : ex.name))
        .join(", ");
      Alert.alert(t("meal_extras.required_title"), t("meal_extras.required_msg", { names }));
      return;
    }
    const extraIngredientIds = extras.flatMap((ex) => selected[ex.id] ?? []);
    try {
      setSaving(true);
      await assignMealToSlot({
        meal,
        dayIndex,
        mealIndex,
        type,
        subscriptionMealId,
        extraIngredientIds,
      });
      goBackToSlots();
    } catch (error) {
      setSaving(false);
      Alert.alert(
        t("common.error"),
        error instanceof Error ? error.message : t("select_meals.error_update_failed"),
      );
    }
  };

  const mealName = meal ? (isArabic && meal.title_ar ? meal.title_ar : meal.title) : "";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === "ios" ? 6 : Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isArabic ? "arrow-forward" : "arrow-back"} size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isArabic && styles.rtlText]} numberOfLines={1}>
          {t("meal_extras.title")}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#344225" />
        </View>
      ) : !meal || extras.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("meal_extras.none")}</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Meal summary */}
            <View style={[styles.mealSummary, isArabic && styles.rtlRow]}>
              <Image
                source={meal.image_url ? { uri: meal.image_url } : require("@/assets/images/meal.jpg")}
                style={styles.mealThumb}
                resizeMode="cover"
              />
              <Text style={[styles.mealName, isArabic && styles.rtlText]} numberOfLines={2}>{mealName}</Text>
            </View>

            {extras.map((extra) => {
              const sel = selected[extra.id] ?? [];
              const single = extra.selection_type === "single";
              const atCap =
                !single && extra.max_select != null && sel.length >= extra.max_select;
              const hint = single
                ? t("meal_extras.pick_one")
                : extra.max_select != null
                  ? t("meal_extras.pick_up_to", { count: extra.max_select })
                  : t("meal_extras.pick_any");
              return (
                <View key={extra.id} style={styles.extraBlock}>
                  <View style={[styles.extraHeader, isArabic && styles.rtlRow]}>
                    <Text style={[styles.extraName, isArabic && styles.rtlText]}>
                      {isArabic && extra.name_ar ? extra.name_ar : extra.name}
                    </Text>
                    {extra.is_required ? (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredBadgeText}>{t("meal_extras.required")}</Text>
                      </View>
                    ) : (
                      <Text style={styles.optionalHint}>{t("meal_extras.optional")}</Text>
                    )}
                  </View>
                  <Text style={[styles.pickHint, isArabic && styles.rtlText]}>{hint}</Text>

                  {extra.ingredients.map((opt) => {
                    const checked = sel.includes(opt.id);
                    const disabled = atCap && !checked;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.optionRow, isArabic && styles.rtlRow, disabled && styles.optionRowDisabled]}
                        activeOpacity={0.7}
                        disabled={disabled}
                        onPress={() => toggleOption(extra, opt.id)}
                      >
                        <View
                          style={[
                            single ? styles.radioOuter : styles.checkboxOuter,
                            checked && styles.controlChecked,
                          ]}
                        >
                          {checked &&
                            (single ? (
                              <View style={styles.radioInner} />
                            ) : (
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            ))}
                        </View>
                        <Text style={[styles.optionLabel, isArabic && styles.rtlText]}>
                          {isArabic && opt.name_ar ? opt.name_ar : opt.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#344225" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {from === "slots" ? t("meal_extras.save") : t("meal_extras.add_to_plan")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4E8E0",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: "5%",
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#344225",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
    flexShrink: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7F75",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: "5%",
    paddingBottom: 24,
  },
  mealSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  mealThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  mealName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
  },
  extraBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#D7E3DC",
  },
  extraHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  extraName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
    flexShrink: 1,
  },
  requiredBadge: {
    backgroundColor: "#344225",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FAD979",
  },
  optionalHint: {
    fontSize: 11,
    color: "#8A8F8B",
    fontWeight: "500",
  },
  pickHint: {
    fontSize: 12,
    color: "#8A8F8B",
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  optionRowDisabled: {
    opacity: 0.4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#B8C6BD",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#344225",
  },
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#B8C6BD",
    alignItems: "center",
    justifyContent: "center",
  },
  controlChecked: {
    borderColor: "#344225",
    backgroundColor: "#344225",
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    color: "#344225",
  },
  footer: {
    paddingHorizontal: "5%",
    paddingTop: 12,
    backgroundColor: "#D4E8E0",
    borderTopWidth: 1,
    borderTopColor: "#C4D6CC",
  },
  submitButton: {
    backgroundColor: "#FAD979",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#344225",
  },
});
