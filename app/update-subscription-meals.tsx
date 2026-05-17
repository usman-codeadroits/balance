import { getMeals, type Meal } from "@/api/services/meals";
import {
    getSubscriptionDetails,
    updateSubscriptionMeal,
    type UserSubscriptionDetails,
} from "@/api/services/subscriptions";
import BottomTabNav from "@/components/bottom-tab-nav";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface SelectedMeal {
  day: string;
  mealId: number;
  type: "is meal" | "is snack";
  subscriptionMealId?: number;
}

export default function UpdateSubscriptionMealsScreen() {
  const { subscriptionId } = useLocalSearchParams();
  const [details, setDetails] = useState<UserSubscriptionDetails | null>(null);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerContext, setPickerContext] = useState<
    | {
        day: string;
        type: "is meal" | "is snack";
        subscriptionMealId?: number;
      }
    | null
  >(null);

  useFocusEffect(
    useCallback(() => {
      if (subscriptionId) {
        loadData(Number(subscriptionId));
      }
    }, [subscriptionId]),
  );

  const loadData = async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      // Load subscription details
      const subResponse = await getSubscriptionDetails(id);
      if (subResponse.success && subResponse.data) {
        setDetails(subResponse.data);

        // Initialize selectedMeals from current subscription
        const currentMeals: SelectedMeal[] = [];
        subResponse.data.subscription_days?.forEach((day) => {
          day.subscription_meals?.forEach((meal) => {
            currentMeals.push({
              day: day.day,
              mealId: meal.meal_id,
              type: meal.type as "is meal" | "is snack",
              subscriptionMealId: meal.id,
            });
          });
        });
        setSelectedMeals(currentMeals);
      } else {
        setError("Failed to load subscription details");
      }

      // Load all available meals
      const mealsData = await getMeals();
      setAllMeals(mealsData);
    } catch (e) {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openMealPicker = (
    day: string,
    type: "is meal" | "is snack",
    subscriptionMealId?: number,
  ) => {
    setPickerContext({ day, type, subscriptionMealId });
    setSearchQuery("");
    setPickerVisible(true);
  };

  const handleSelectMeal = async (meal: Meal) => {
    if (!pickerContext || !details) return;

    try {
      setSavingSlot(true);

      const subscriptionDayId = details?.subscription_days?.find(
        (d) => d.day === pickerContext.day,
      )?.id;

      const response = await updateSubscriptionMeal({
        user_id: details.user_id,
        subscription_day_id: subscriptionDayId,
        day: subscriptionDayId === undefined ? pickerContext.day : undefined,
        meal_id: meal.id,
        type: pickerContext.type,
        subscription_meal_id: pickerContext.subscriptionMealId,
      });

      const newId = response.data?.subscription_meal?.id ?? pickerContext.subscriptionMealId;

      setSelectedMeals((prev) => {
        const existingIndex = prev.findIndex(
          (sm) =>
            sm.day === pickerContext.day &&
            sm.type === pickerContext.type &&
            sm.subscriptionMealId === pickerContext.subscriptionMealId,
        );

        const updatedEntry: SelectedMeal = {
          day: pickerContext.day,
          type: pickerContext.type,
          mealId: meal.id,
          subscriptionMealId: newId,
        };

        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = updatedEntry;
          return updated;
        }

        return [...prev, updatedEntry];
      });

      Alert.alert(
        "Meal updated",
        `${pickerContext.day} ${pickerContext.type === "is meal" ? "meal" : "snack"} saved successfully`,
      );

      setPickerVisible(false);
      setPickerContext(null);
    } catch (err) {
      Alert.alert("Update failed", "Could not update meal. Please try again.");
    } finally {
      setSavingSlot(false);
    }
  };

  const filteredMeals = pickerContext
    ? allMeals.filter((meal) => {
        const matchesType = meal.type === pickerContext.type;
        const matchesSearch = meal.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
      })
    : [];

  const getDisplaySlots = (
    dayName: string,
    type: "is meal" | "is snack",
  ): SelectedMeal[] => {
    // If we already have selections for this day/type, show them (covers newly added)
    const selectedForDay = selectedMeals.filter(
      (sm) => sm.day === dayName && sm.type === type,
    );
    if (selectedForDay.length > 0) {
      return selectedForDay;
    }

    // Otherwise fall back to existing subscription slots
    const dayData = details?.subscription_days?.find((d) => d.day === dayName);
    return (dayData?.subscription_meals || [])
      .filter((m) => m.type === type)
      .map((m) => ({
        day: dayName,
        mealId: m.meal_id,
        type,
        subscriptionMealId: m.id,
      }));
  };

  const handleUpdateMeals = async () => {
    try {
      setUpdating(true);

      // Update all selected slots (meals and snacks) across all days
      for (const meal of selectedMeals) {
        const subscriptionDayId = details?.subscription_days?.find(
          (d) => d.day === meal.day,
        )?.id;

        await updateSubscriptionMeal({
          user_id: details?.user_id || 0,
          subscription_day_id: subscriptionDayId,
          day: subscriptionDayId === undefined ? meal.day : undefined,
          meal_id: meal.mealId,
          type: meal.type,
          subscription_meal_id: meal.subscriptionMealId,
        });
      }

      Alert.alert("Success", "Meals updated successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (e) {
      Alert.alert("Update failed", "Failed to update meals. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#344225" />
          <Text style={styles.loadingText}>Loading meals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#344225" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Meals</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#D64545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              if (subscriptionId) loadData(Number(subscriptionId));
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#344225" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Meals</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {details?.subscription_days?.map((day, dayIndex) => {
            const dayName = day.day;
            const mealsForDay = getDisplaySlots(dayName, "is meal");
            const snacksForDay = getDisplaySlots(dayName, "is snack");

            return (
              <View key={dayIndex} style={styles.dayCard}>
                <Text style={styles.dayTitle}>
                  {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                </Text>

                <View>
                  <Text style={styles.categoryTitle}>Meals</Text>

                  {mealsForDay.length > 0 ? (
                    mealsForDay.map((slot, mealIndex) => {
                      const mealDetails = allMeals.find((m) => m.id === slot.mealId);
                      const hasSelection = Boolean(mealDetails);

                      return (
                        <View key={`${dayName}-meal-${mealIndex}`} style={styles.mealSlot}>
                          <View style={styles.mealHeader}>
                            <Text style={styles.slotLabel}>Meal {mealIndex + 1}</Text>
                            <Ionicons
                              name={hasSelection ? "checkmark-circle" : "radio-button-off"}
                              size={24}
                              color={hasSelection ? "#4CAF50" : "#CCCCCC"}
                            />
                          </View>

                          {mealDetails && (
                            <View
                              style={[
                                styles.mealOption,
                                hasSelection && styles.mealOptionSelected,
                              ]}
                            >
                              <Image
                                source={{
                                  uri: mealDetails.image_url || mealDetails.image_thumb_url,
                                }}
                                style={styles.mealImage}
                              />
                              <View style={styles.mealInfo}>
                                <Text style={styles.mealName} numberOfLines={2}>
                                  {mealDetails.title}
                                </Text>
                                <Text style={styles.mealCalories}>
                                  {mealDetails.calories} kcal • P: {mealDetails.protein_g}g • C: {mealDetails.carbs_g}g
                                </Text>

                                <TouchableOpacity
                                  style={styles.changeButton}
                                  onPress={() =>
                                    openMealPicker(dayName, "is meal", slot.subscriptionMealId)
                                  }
                                >
                                  <Ionicons name="create-outline" size={16} color="#344225" />
                                  <Text style={styles.changeButtonText}>Change meal</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptySlotRow}>
                      <Text style={styles.emptySlotText}>No meals added for this day</Text>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => openMealPicker(dayName, "is meal")}
                      >
                        <Ionicons name="add" size={18} color="#344225" />
                        <Text style={styles.addButtonText}>Add meal</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.snackSection}>
                  <Text style={styles.categoryTitle}>Snacks</Text>

                  {snacksForDay.length > 0 ? (
                    snacksForDay.map((slot, snackIndex) => {
                      const snackDetails = allMeals.find((m) => m.id === slot.mealId);
                      const hasSelection = Boolean(snackDetails);

                      return (
                        <View key={`${dayName}-snack-${snackIndex}`} style={styles.mealSlot}>
                          <View style={styles.mealHeader}>
                            <Text style={styles.slotLabel}>Snack {snackIndex + 1}</Text>
                            <Ionicons
                              name={hasSelection ? "checkmark-circle" : "radio-button-off"}
                              size={24}
                              color={hasSelection ? "#4CAF50" : "#CCCCCC"}
                            />
                          </View>

                          {snackDetails && (
                            <View
                              style={[
                                styles.mealOption,
                                hasSelection && styles.mealOptionSelected,
                              ]}
                            >
                              <Image
                                source={{
                                  uri: snackDetails.image_url || snackDetails.image_thumb_url,
                                }}
                                style={styles.mealImage}
                              />
                              <View style={styles.mealInfo}>
                                <Text style={styles.mealName} numberOfLines={2}>
                                  {snackDetails.title}
                                </Text>
                                <Text style={styles.mealCalories}>
                                  {snackDetails.calories} kcal • P: {snackDetails.protein_g}g • C: {snackDetails.carbs_g}g
                                </Text>

                                <TouchableOpacity
                                  style={styles.changeButton}
                                  onPress={() =>
                                    openMealPicker(dayName, "is snack", slot.subscriptionMealId)
                                  }
                                >
                                  <Ionicons name="create-outline" size={16} color="#344225" />
                                  <Text style={styles.changeButtonText}>Change snack</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptySlotRow}>
                      <Text style={styles.emptySlotText}>No snacks added for this day</Text>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => openMealPicker(dayName, "is snack")}
                      >
                        <Ionicons name="add" size={18} color="#344225" />
                        <Text style={styles.addButtonText}>Add snack</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Meal/Snack Picker */}
        <Modal
          visible={pickerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Choose a {pickerContext?.type === "is meal" ? "meal" : "snack"}
                </Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Ionicons name="close" size={24} color="#344225" />
                </TouchableOpacity>
              </View>

              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search meals"
                placeholderTextColor="#9AA5A0"
                style={styles.searchInput}
              />

              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {filteredMeals.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={styles.modalMeal}
                    onPress={() => handleSelectMeal(meal)}
                  >
                    <Image
                      source={{ uri: meal.image_url || meal.image_thumb_url }}
                      style={styles.modalMealImage}
                    />
                    <View style={styles.modalMealInfo}>
                      <Text style={styles.modalMealTitle} numberOfLines={2}>
                        {meal.title}
                      </Text>
                      <Text style={styles.modalMealMeta}>
                        {meal.calories} kcal • P: {meal.protein_g}g • C: {meal.carbs_g}g
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {pickerContext && filteredMeals.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No meals found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Update Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.updateButton,
              updating && styles.updateButtonDisabled,
            ]}
            onPress={handleUpdateMeals}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                <Text style={styles.updateButtonText}>Update Meals</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <BottomTabNav
        activeTab="history"
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#D4E8E0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#344225",
    textAlign: "center",
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 160,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7F75",
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#D64545",
    marginTop: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#344225",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  dayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7F75",
    marginBottom: 12,
    marginTop: 12,
  },
  snackSection: {
    marginTop: 20,
  },
  mealSlot: {
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
  },
  mealOption: {
    flexDirection: "row",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "#E6EFE9",
  },
  mealOptionSelected: {
    borderColor: "#4CAF50",
    backgroundColor: "#F1F8F4",
  },
  mealImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
    justifyContent: "center",
  },
  mealName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344225",
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 12,
    fontWeight: "400",
    color: "#6B7F75",
  },
  emptySlotRow: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E6EFE9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptySlotText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7F75",
    flex: 1,
    marginRight: 10,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6EFE9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#344225",
  },
  changeButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  changeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#344225",
    marginLeft: 6,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: "#D4E8E0",
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#344225",
    paddingVertical: 16,
    borderRadius: 12,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#344225",
  },
  searchInput: {
    backgroundColor: "#F4F6F5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#344225",
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 500,
  },
  modalMeal: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F0",
  },
  modalMealImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  modalMealInfo: {
    flex: 1,
    marginLeft: 12,
  },
  modalMealTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#344225",
    marginBottom: 4,
  },
  modalMealMeta: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7F75",
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7F75",
  },
});
