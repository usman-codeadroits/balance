import type { Duration } from '@/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type MealItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  subscriptionMealId?: number; // Store subscription meal ID for updates
};

type DayMeals = {
  meals: (MealItem | null)[];
  snacks: (MealItem | null)[];
};

export default function SelectedMealsScreen() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [dayMeals, setDayMeals] = useState<{ [key: number]: DayMeals }>({});
  const [hasPersonalizedPlan, setHasPersonalizedPlan] = useState<boolean>(false);
  const [isUpdateMode, setIsUpdateMode] = useState<boolean>(false);
  const [subscriptionMealsData, setSubscriptionMealsData] = useState<any[]>([]);
  const [subscriptionDaysData, setSubscriptionDaysData] = useState<any[]>([]);
  const [userSubscriptionId, setUserSubscriptionId] = useState<string | null>(null);
  const [subscriptionMealIds, setSubscriptionMealIds] = useState<{ [key: string]: number }>({}); // Key: "dayIndex-mealIndex-type"
  const [updatingMeal, setUpdatingMeal] = useState<string | null>(null); // Track which meal is being updated

  useEffect(() => {
    loadData();
    checkPersonalizedPlan();
  }, []);

  const checkPersonalizedPlan = async () => {
    try {
      const personalizedPlan = await AsyncStorage.getItem('hasPersonalizedPlan');
      setHasPersonalizedPlan(personalizedPlan === 'true');
    } catch (error) {
      console.error('Error checking personalized plan:', error);
    }
  };

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Check if we're in update mode (active subscription exists)
      const activeSubscriptionData = await AsyncStorage.getItem('activeSubscription');
      const subscriptionMealsDataStr = await AsyncStorage.getItem('subscriptionMealsData');
      const subscriptionDaysDataStr = await AsyncStorage.getItem('subscriptionDaysData');
      const userSubscriptionIdStr = await AsyncStorage.getItem('userSubscriptionId');
      
      if (activeSubscriptionData && subscriptionMealsDataStr && subscriptionDaysDataStr && userSubscriptionIdStr) {
        // We're in update mode
        setIsUpdateMode(true);
        const activeSubscription = JSON.parse(activeSubscriptionData);
        const mealsData = JSON.parse(subscriptionMealsDataStr);
        const daysData = JSON.parse(subscriptionDaysDataStr);
        
        setSubscriptionMealsData(mealsData);
        setSubscriptionDaysData(daysData);
        setUserSubscriptionId(userSubscriptionIdStr);
        
        // Load plan from active subscription
        setSelectedPlan(activeSubscription.plan);
        setSelectedDuration(activeSubscription.duration);
        setSelectedDays(activeSubscription.days);
        
        // Build meal IDs map and load existing meals
        const mealIdsMap: { [key: string]: number } = {};
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const initialDayMeals: { [key: number]: DayMeals } = {};
        const mealCount = activeSubscription.plan?.meal_count ?? activeSubscription.plan?.mealCount ?? 0;
        const snackCount = activeSubscription.plan?.snack_count ?? activeSubscription.plan?.snackCount ?? 0;
        
        // Initialize all days with empty arrays
        activeSubscription.days.forEach((dayIndex: number) => {
          initialDayMeals[dayIndex] = {
            meals: new Array(mealCount).fill(null),
            snacks: new Array(snackCount).fill(null),
          };
        });
        
        // Map subscription meals to day meals
        mealsData.forEach((meal: any) => {
          const dayName = meal.day?.toLowerCase();
          const dayIndex = dayNames.indexOf(dayName);
          
          if (dayIndex !== -1 && activeSubscription.days.includes(dayIndex)) {
            const mealType = meal.type === 'is meal' ? 'meals' : 'snacks';
            const mealIndex = mealType === 'meals' 
              ? initialDayMeals[dayIndex].meals.findIndex(m => m === null)
              : initialDayMeals[dayIndex].snacks.findIndex(s => s === null);
            
            if (mealIndex !== -1) {
              initialDayMeals[dayIndex][mealType][mealIndex] = {
                id: meal.meal?.id?.toString() || meal.meal_id?.toString() || '',
                name: meal.meal?.title || '',
                calories: meal.meal?.calories || 0,
                protein: meal.meal?.protein_g || 0,
                carbs: meal.meal?.carbs_g || 0,
                fat: meal.meal?.fat_g || 0,
                imageUrl: meal.meal?.image_url || meal.meal?.image_thumb_url,
                subscriptionMealId: meal.id, // Store subscription meal ID with the meal
              };
              
              // Store subscription meal ID for updates
              const key = `${dayIndex}-${mealIndex}-${mealType}`;
              mealIdsMap[key] = meal.id;
            }
          }
        });
        
        setSubscriptionMealIds(mealIdsMap);
        setDayMeals(initialDayMeals);
        return;
      }
      
      // Normal flow (new subscription)
      setIsUpdateMode(false);
      const planData = await AsyncStorage.getItem('selectedPlan');
      if (planData) {
        let plan = JSON.parse(planData);
        
        // If plan doesn't have meal_count/snack_count, try to fetch from API
        if ((!plan.meal_count && !plan.mealCount) || (!plan.snack_count && !plan.snackCount)) {
          try {
            const { getSubscriptionPlans } = await import('@/api');
            const plans = await getSubscriptionPlans();
            const matchingPlan = plans.find(p => 
              p.id.toString() === plan.id?.toString() || 
              p.title === plan.title
            );
            if (matchingPlan) {
              plan = {
                ...plan,
                meal_count: matchingPlan.meal_count,
                snack_count: matchingPlan.snack_count,
                pricePerDay: matchingPlan.pricePerDay || plan.pricePerDay,
              };
            }
          } catch (e) {
            console.error('Error fetching plan from API:', e);
          }
        }
        
        setSelectedPlan(plan);
        
        // Load selected duration
        const durationData = await AsyncStorage.getItem('selectedDuration');
        if (durationData) {
          setSelectedDuration(JSON.parse(durationData));
        }
        
        // Initialize day meals structure
        const daysData = await AsyncStorage.getItem('selectedDays');
        if (daysData) {
          const days = JSON.parse(daysData);
          setSelectedDays(days);
          
          // Load existing meal selections if available (from current session)
          const savedMeals = await AsyncStorage.getItem('selectedDayMeals');
          let existingMeals: { [key: number]: DayMeals } = {};
          
          if (savedMeals) {
            try {
              existingMeals = JSON.parse(savedMeals);
            } catch (e) {
              console.error('Error parsing saved meals:', e);
              // Clear corrupted data
              await AsyncStorage.removeItem('selectedDayMeals');
            }
          }
          
          // Initialize structure - use existing data if valid, otherwise start fresh
          const initialDayMeals: { [key: number]: DayMeals } = {};
          const mealCount = plan.meal_count ?? plan.mealCount ?? 0;
          const snackCount = plan.snack_count ?? plan.snackCount ?? 0;
          
          days.forEach((dayIndex: number) => {
            // Check if existing data matches current plan structure
            if (existingMeals[dayIndex] && 
                existingMeals[dayIndex].meals?.length === mealCount &&
                existingMeals[dayIndex].snacks?.length === snackCount) {
              // Use existing valid data
              initialDayMeals[dayIndex] = existingMeals[dayIndex];
            } else {
              // Start fresh with empty meals/snacks, but preserve any existing meals
              const existingDayData = existingMeals[dayIndex];
              initialDayMeals[dayIndex] = {
                meals: existingDayData?.meals?.slice(0, mealCount) || new Array(mealCount).fill(null),
                snacks: existingDayData?.snacks?.slice(0, snackCount) || new Array(snackCount).fill(null),
              };
              // Pad arrays if needed
              while (initialDayMeals[dayIndex].meals.length < mealCount) {
                initialDayMeals[dayIndex].meals.push(null);
              }
              while (initialDayMeals[dayIndex].snacks.length < snackCount) {
                initialDayMeals[dayIndex].snacks.push(null);
              }
            }
          });
          setDayMeals(initialDayMeals);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getDayName = (dayIndex: number) => {
    return dayNames[dayIndex];
  };

  const toggleDay = (dayIndex: number) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };

  const handleMealBoxClick = (dayIndex: number, mealIndex: number) => {
    const meal = dayMeals[dayIndex]?.meals[mealIndex];
    router.push({
      pathname: '/auth/select-meals-browse',
      params: {
        dayIndex: dayIndex.toString(),
        mealIndex: mealIndex.toString(),
        type: 'meal',
        subscriptionMealId: meal?.subscriptionMealId?.toString() || '',
      },
    } as any);
  };

  const handleSnackBoxClick = (dayIndex: number, snackIndex: number) => {
    const snack = dayMeals[dayIndex]?.snacks[snackIndex];
    router.push({
      pathname: '/auth/select-meals-browse',
      params: {
        dayIndex: dayIndex.toString(),
        mealIndex: snackIndex.toString(),
        type: 'snack',
        subscriptionMealId: snack?.subscriptionMealId?.toString() || '',
      },
    } as any);
  };


  const handleContinue = async () => {
    // If in update mode, just go back (meals are updated via API when selected)
    if (isUpdateMode) {
      Alert.alert('Success', 'Meals updated successfully!');
      router.back();
      return;
    }

    // For new subscription checkout: Only require Day 1 meal
    // Day 1 is the first day in selectedDays array (sorted)
    const mealCount = selectedPlan?.meal_count || 0;
    const snackCount = selectedPlan?.snack_count || 0;
    
    // Get the first selected day (Day 1)
    const firstDayIndex = selectedDays.length > 0 ? selectedDays[0] : null;
    
    if (firstDayIndex === null) {
      Alert.alert('Validation Error', 'Please select at least one day');
      return;
    }
    
    const firstDayData = dayMeals[firstDayIndex];
    if (!firstDayData) {
      Alert.alert('Validation Error', `Please select at least one meal for ${getDayName(firstDayIndex)} (Day 1)`);
      return;
    }
    
    // Check if at least one meal or snack is selected for Day 1
    const hasMeal = firstDayData.meals.some(meal => meal !== null);
    const hasSnack = firstDayData.snacks.some(snack => snack !== null);
    
    if (!hasMeal && !hasSnack) {
      Alert.alert('Validation Error', `Please select at least one meal or snack for ${getDayName(firstDayIndex)} (Day 1)`);
      return;
    }

    // Save selected meals to AsyncStorage (can have empty days for remaining days)
    AsyncStorage.setItem('selectedDayMeals', JSON.stringify(dayMeals))
      .then(() => {
        router.push('/auth/checkout' as any);
      })
      .catch((error) => {
        console.error('Error saving meals:', error);
        Alert.alert('Error', 'Failed to save meal selections');
      });
  };

  const getPlanSummaryText = () => {
    if (!selectedPlan) return '';
    const mealCount = selectedPlan.meal_count ?? selectedPlan.mealCount ?? 0;
    const snackCount = selectedPlan.snack_count ?? selectedPlan.snackCount ?? 0;
    const daysCount = selectedDays.length || 0;
    // Format: "2 day meal, 2 Meals, 3 snacks, 6 days/ week"
    return `${daysCount} day meal, ${mealCount} Meal${mealCount > 1 ? 's' : ''}, ${snackCount} snack${snackCount > 1 ? 's' : ''}, ${daysCount} days/ week`;
  };

  const calculateTotalPrice = (): number => {
    if (!selectedPlan || !selectedDuration) return 0;
    
    const pricePerDay = selectedPlan.pricePerDay || selectedPlan.price || 0;
    const selectedDaysCount = selectedDays.length || 0;
    const noOfWeeks = selectedDuration.no_of_weeks || selectedDuration.weeks || 0;
    
    // Total price for the entire duration: price per day * selected days per week * number of weeks
    const totalPrice = pricePerDay * selectedDaysCount * noOfWeeks;
    
    // Return 0 if calculation results in NaN
    return isNaN(totalPrice) ? 0 : totalPrice;
  };

  const calculateTotalCalories = (dayIndex: number) => {
    const dayData = dayMeals[dayIndex];
    if (!dayData) return 0;
    
    let total = 0;
    dayData.meals.forEach((meal) => {
      if (meal) total += meal.calories;
    });
    dayData.snacks.forEach((snack) => {
      if (snack) total += snack.calories;
    });
    return total;
  };

  const mealCount = selectedPlan?.meal_count ?? selectedPlan?.mealCount ?? 0;
  const snackCount = selectedPlan?.snack_count ?? selectedPlan?.snackCount ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isUpdateMode ? 'Update Meals' : 'Select Meals'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Plan Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryTitle}>Your plan, your rules</Text>
                <Text style={styles.summarySubtitle}>{getPlanSummaryText()}</Text>
              </View>
              <Image
                source={require('@/assets/images/bag.png')}
                style={styles.summaryIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryDetails}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryPrice}>KWD {calculateTotalPrice().toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.continueButtonText}>
                {isUpdateMode ? 'Done' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Day Selection List */}
          <View style={styles.mealsContainer}>
            {selectedDays.map((dayIndex) => {
              const dayName = getDayName(dayIndex);
              const isExpanded = expandedDay === dayIndex;
              const dayData = dayMeals[dayIndex] || {
                meals: new Array(mealCount).fill(null),
                snacks: new Array(snackCount).fill(null),
              };

              return (
                <View key={dayIndex}>
                  <TouchableOpacity
                    style={styles.mealCard}
                    activeOpacity={0.7}
                    onPress={() => toggleDay(dayIndex)}
                  >
                    <Text style={styles.mealLabel}>Select {dayName} meal</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.dropdownContent}>
                      {/* Nutrition Bar - Only show for non-personalized plans */}
                      {!hasPersonalizedPlan && (
                        <View style={styles.nutritionBar}>
                          <View style={styles.nutritionItem}>
                            <View style={[styles.nutritionDot, { backgroundColor: '#4A90E2' }]} />
                            <Text style={styles.nutritionText}>Cal {calculateTotalCalories(dayIndex)}</Text>
                          </View>
                          <View style={styles.nutritionItem}>
                            <View style={[styles.nutritionDot, { backgroundColor: '#7ED321' }]} />
                            <Text style={styles.nutritionText}>Carbs 40g</Text>
                          </View>
                          <View style={styles.nutritionItem}>
                            <View style={[styles.nutritionDot, { backgroundColor: '#D0021B' }]} />
                            <Text style={styles.nutritionText}>Prote 150g</Text>
                          </View>
                          <View style={styles.nutritionItem}>
                            <View style={[styles.nutritionDot, { backgroundColor: '#F5A623' }]} />
                            <Text style={styles.nutritionText}>Fat 20g</Text>
                          </View>
                        </View>
                      )}

                      {/* Meal Boxes */}
                      {Array.from({ length: mealCount }).map((_, mealIndex) => {
                        const meal = dayData?.meals?.[mealIndex] || null;
                        const mealNumber = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][mealIndex] || `${mealIndex + 1}`;
                        return (
                          <TouchableOpacity
                            key={`meal-${mealIndex}`}
                            style={styles.mealBox}
                            onPress={() => handleMealBoxClick(dayIndex, mealIndex)}
                          >
                            {meal ? (
                              <View style={styles.mealBoxContent}>
                                <Image
                                  source={meal.imageUrl ? { uri: meal.imageUrl } : require('@/assets/images/meal.jpg')}
                                  style={styles.mealBoxImage}
                                  resizeMode="cover"
                                />
                                <View style={styles.mealBoxInfo}>
                                  <Text style={styles.mealBoxName}>{meal.name}</Text>
                                  {!hasPersonalizedPlan && (
                                    <View style={styles.mealBoxNutrition}>
                                      <Text style={styles.mealBoxNutritionText}>Cal {meal.calories}</Text>
                                      <Text style={styles.mealBoxNutritionText}>Protein {meal.protein}g</Text>
                                      <Text style={styles.mealBoxNutritionText}>Carbs {meal.carbs}g</Text>
                                      <Text style={styles.mealBoxNutritionText}>Fat {meal.fat}g</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            ) : (
                              <View style={styles.mealBoxEmpty}>
                                <Text style={styles.mealBoxTitle}>Select {mealNumber} meal</Text>
                                <Text style={styles.mealBoxPlaceholder}>Tap to select meal</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}

                      {/* Snack Boxes */}
                      {Array.from({ length: snackCount }).map((_, snackIndex) => {
                        const snack = dayData?.snacks[snackIndex];
                        const snackNumber = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][snackIndex] || `${snackIndex + 1}`;
                        return (
                          <TouchableOpacity
                            key={`snack-${snackIndex}`}
                            style={styles.mealBox}
                            onPress={() => handleSnackBoxClick(dayIndex, snackIndex)}
                          >
                            {snack ? (
                              <View style={styles.mealBoxContent}>
                                <Image
                                  source={snack.imageUrl ? { uri: snack.imageUrl } : require('@/assets/images/meal.jpg')}
                                  style={styles.mealBoxImage}
                                  resizeMode="cover"
                                />
                                <View style={styles.mealBoxInfo}>
                                  <Text style={styles.mealBoxName}>{snack.name}</Text>
                                  {!hasPersonalizedPlan && (
                                    <View style={styles.mealBoxNutrition}>
                                      <Text style={styles.mealBoxNutritionText}>Cal {snack.calories}</Text>
                                      <Text style={styles.mealBoxNutritionText}>Protein {snack.protein}g</Text>
                                      <Text style={styles.mealBoxNutritionText}>Carbs {snack.carbs}g</Text>
                                      <Text style={styles.mealBoxNutritionText}>Fat {snack.fat}g</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            ) : (
                              <View style={styles.mealBoxEmpty}>
                                <Text style={styles.mealBoxTitle}>Select {snackNumber} snack</Text>
                                <Text style={styles.mealBoxPlaceholder}>Tap to select snack</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="time" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>Macros History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="calendar" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8E0',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '5%',
    paddingTop: 40,
    paddingBottom: 20,
  },
  placeholder: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#344225',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#344225',
    flex: 1,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: '5%',
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: '#344225',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#D4E8E0',
  },
  summaryIcon: {
    width: 80,
    height: 80,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#5A7C65',
    marginBottom: 16,
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#FAD979',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#344225',
    fontSize: 15,
    fontWeight: '600',
  },
  mealsContainer: {
    gap: 16,
  },
  mealCard: {
    backgroundColor: '#344225',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
  },
  mealLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  dropdownContent: {
    backgroundColor: '#5A7C65',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -12,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 18,
  },
  nutritionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#344225',
    alignItems: 'center',
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nutritionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nutritionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  mealBox: {
    backgroundColor: '#344225',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 80,
    justifyContent: 'center',
  },
  mealBoxContent: {
    flexDirection: 'row',
    gap: 12,
  },
  mealBoxImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  mealBoxInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  mealBoxName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  mealBoxNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealBoxNutritionText: {
    fontSize: 10,
    color: '#D4E8E0',
  },
  mealBoxEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mealBoxPlaceholder: {
    fontSize: 13,
    color: '#D4E8E0',
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#344225',
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
});
 