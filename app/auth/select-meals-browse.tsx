import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getMeals, type Meal, type Duration, updateSubscriptionMeal } from '@/api';

type MealItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
};

type DayMeals = {
  meals: (MealItem | null)[];
  snacks: (MealItem | null)[];
};

export default function SelectMealsScreen() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [hasPersonalizedPlan, setHasPersonalizedPlan] = useState<boolean>(false);
  const params = useLocalSearchParams();
  const type = (params.type as string) || 'meal'; // 'meal' or 'snack'
  const dayIndex = params.dayIndex ? parseInt(params.dayIndex as string) : null;
  const mealIndex = params.mealIndex ? parseInt(params.mealIndex as string) : null;
  const subscriptionMealId = params.subscriptionMealId ? parseInt(params.subscriptionMealId as string) : undefined;

  useEffect(() => {
    loadPlanData();
    fetchMeals();
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

  const loadPlanData = async () => {
    try {
      const planData = await AsyncStorage.getItem('selectedPlan');
      if (planData) {
        setSelectedPlan(JSON.parse(planData));
      }
      
      // Load selected duration and days
      const durationData = await AsyncStorage.getItem('selectedDuration');
      if (durationData) {
        setSelectedDuration(JSON.parse(durationData));
      }
      
      const daysData = await AsyncStorage.getItem('selectedDays');
      if (daysData) {
        setSelectedDays(JSON.parse(daysData));
      }
    } catch (error) {
      console.error('Error loading plan:', error);
    }
  };

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const mealsData = await getMeals();
      setMeals(mealsData);
    } catch (error) {
      console.error('Error fetching meals:', error);
      Alert.alert('Error', 'Failed to load meals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter meals/snacks based on type FIRST
  const filteredByType = meals.filter((meal) => {
    if (type === 'meal') {
      return meal.type === 'is meal';
    } else {
      return meal.type === 'is snack';
    }
  });

  // Get unique categories from filtered items only
  const categories = Array.from(
    new Map(
      filteredByType.map((meal) => [meal.category_id, meal.category])
    ).values()
  );

  // Filter by category
  const filteredByCategory = selectedCategory
    ? filteredByType.filter((meal) => meal.category_id === selectedCategory)
    : filteredByType;

  // Filter by search query
  const filteredItems = filteredByCategory.filter((meal) =>
    meal.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Convert API meal to MealItem format
  const convertMealToItem = (meal: Meal): MealItem => ({
    id: meal.id.toString(),
    name: meal.title,
    calories: meal.calories,
    protein: meal.protein_g,
    carbs: meal.carbs_g,
    fat: meal.fat_g,
    imageUrl: meal.image_url || meal.image_thumb_url,
  });

  const handleAddItem = async (meal: Meal) => {
    if (dayIndex === null || mealIndex === null) {
      Alert.alert('Error', 'Invalid selection parameters');
      return;
    }

    const item = convertMealToItem(meal);

    // Check if we're in update mode
    const activeSubscriptionData = await AsyncStorage.getItem('activeSubscription');
    const subscriptionMealsDataStr = await AsyncStorage.getItem('subscriptionMealsData');
    const subscriptionDaysDataStr = await AsyncStorage.getItem('subscriptionDaysData');
    const userSubscriptionIdStr = await AsyncStorage.getItem('userSubscriptionId');
    
    if (activeSubscriptionData && subscriptionMealsDataStr && subscriptionDaysDataStr && userSubscriptionIdStr) {
      // Update mode: Call API to update/create meal
      try {
        const subscriptionMeals = JSON.parse(subscriptionMealsDataStr);
        const subscriptionDays = JSON.parse(subscriptionDaysDataStr);
        const userId = await AsyncStorage.getItem('userId');
        
        if (!userId) {
          Alert.alert('Error', 'User not found. Please login again.');
          return;
        }
        
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayIndex];
        
        const mealType = type === 'meal' ? 'is meal' : 'is snack';
        
        const updateRequest: any = {
          user_id: parseInt(userId),
          day: dayName,
          meal_id: meal.id,
          type: mealType,
        };
        
        // If subscription_meal_id is provided (from params), use it for update
        // Otherwise, omit it to create new meal
        if (subscriptionMealId !== undefined && subscriptionMealId > 0) {
          updateRequest.subscription_meal_id = subscriptionMealId;
        }
        
        const response = await updateSubscriptionMeal(updateRequest);
        
        // Update subscription meals data in AsyncStorage with the response
        if (response.data?.subscription_meal) {
          const updatedMeal = response.data.subscription_meal;
          const updatedMeals = [...subscriptionMeals];
          
          if (subscriptionMealId !== undefined && subscriptionMealId > 0) {
            // Update existing meal
            const index = updatedMeals.findIndex((m: any) => m.id === subscriptionMealId);
            if (index !== -1) {
              updatedMeals[index] = updatedMeal;
            }
          } else {
            // Add new meal
            updatedMeals.push(updatedMeal);
          }
          
          await AsyncStorage.setItem('subscriptionMealsData', JSON.stringify(updatedMeals));
        }
        
        // Update local storage
        const savedMeals = await AsyncStorage.getItem('selectedDayMeals');
        let dayMeals: { [key: number]: DayMeals } = {};
        
        if (savedMeals) {
          dayMeals = JSON.parse(savedMeals);
        }
        
        if (!dayMeals[dayIndex]) {
          const planData = await AsyncStorage.getItem('selectedPlan');
          const activeSub = JSON.parse(activeSubscriptionData);
          const plan = activeSub.plan || { meal_count: 0, snack_count: 0 };
          dayMeals[dayIndex] = {
            meals: new Array(plan.meal_count || 0).fill(null),
            snacks: new Array(plan.snack_count || 0).fill(null),
          };
        }
        
        // Store subscription meal ID with the meal item
        const mealItem = {
          ...item,
          subscriptionMealId: response.data?.subscription_meal?.id,
        };
        
        if (type === 'meal') {
          dayMeals[dayIndex].meals[mealIndex] = mealItem;
        } else {
          dayMeals[dayIndex].snacks[mealIndex] = mealItem;
        }
        
        await AsyncStorage.setItem('selectedDayMeals', JSON.stringify(dayMeals));
        
        Alert.alert('Success', 'Meal updated successfully!');
        router.back();
      } catch (error) {
        console.error('Error updating meal:', error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update meal');
      }
      return;
    }

    // New subscription flow: Save to AsyncStorage
    try {
      const savedMeals = await AsyncStorage.getItem('selectedDayMeals');
      let dayMeals: { [key: number]: DayMeals } = {};
      
      if (savedMeals) {
        dayMeals = JSON.parse(savedMeals);
      }
      
      if (!dayMeals[dayIndex]) {
        const planData = await AsyncStorage.getItem('selectedPlan');
        const plan = planData ? JSON.parse(planData) : { meal_count: 0, snack_count: 0 };
        dayMeals[dayIndex] = {
          meals: new Array(plan.meal_count || 0).fill(null),
          snacks: new Array(plan.snack_count || 0).fill(null),
        };
      }
      
      if (type === 'meal') {
        dayMeals[dayIndex].meals[mealIndex] = item;
      } else {
        dayMeals[dayIndex].snacks[mealIndex] = item;
      }
      
      await AsyncStorage.setItem('selectedDayMeals', JSON.stringify(dayMeals));
      
      // Navigate back
      router.back();
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', 'Failed to save selection');
    }
  };

  const getPlanSummaryText = () => {
    if (!selectedPlan) return '';
    const mealCount = selectedPlan.meal_count || 0;
    const snackCount = selectedPlan.snack_count || 0;
    const daysCount = selectedDays.length || 6;
    return `${daysCount} day meal, ${mealCount} Meal${mealCount > 1 ? 's' : ''}, ${snackCount} snack${snackCount > 1 ? 's' : ''}, ${daysCount} days/ week`;
  };

  const calculateTotalPrice = (): number => {
    if (!selectedPlan || !selectedDuration) return 0;
    
    const pricePerDay = selectedPlan.pricePerDay || 0;
    const selectedDaysCount = selectedDays.length;
    
    // Total price for the entire duration: price per day * selected days per week * number of weeks
    const totalPrice = pricePerDay * selectedDaysCount * selectedDuration.no_of_weeks;
    
    return totalPrice;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select {type === 'snack' ? 'Snacks' : 'Meals'}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#6B7F75"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Ionicons name="search" size={20} color="#6B7F75" style={styles.searchIcon} />
        </View>

        {/* Category Filter */}
        {categories.length > 0 && (
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              <TouchableOpacity
                style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === category.id && styles.categoryChipTextActive]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Card */}
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
            <View style={styles.summaryFooter}>
              <Text style={styles.summaryTotal}>Total</Text>
              <Text style={styles.summaryPrice}>KWD {calculateTotalPrice().toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.continueButton} onPress={() => router.back()}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>Loading {type === 'snack' ? 'snacks' : 'meals'}...</Text>
            </View>
          ) : (
            <>
              {/* Items Grid */}
              {filteredItems.length > 0 ? (
                <View style={styles.itemsGrid}>
                  {filteredItems.map((meal) => {
                    const item = convertMealToItem(meal);
                    return (
                      <View key={meal.id} style={styles.itemCard}>
                        {!hasPersonalizedPlan && (
                          <View style={styles.caloriesBadge}>
                            <Text style={styles.caloriesText}>{item.calories} kcal</Text>
                          </View>
                        )}
                        {item.imageUrl ? (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.itemImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={require('@/assets/images/meal.jpg')}
                            style={styles.itemImage}
                            resizeMode="cover"
                          />
                        )}
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {!hasPersonalizedPlan && (
                            <>
                              <View style={styles.nutritionRow}>
                                <View style={styles.nutritionItem}>
                                  <View style={[styles.nutritionDot, { backgroundColor: '#4A90E2' }]} />
                                  <Text style={styles.nutritionText}>Cal {item.calories}</Text>
                                </View>
                                <View style={styles.nutritionItem}>
                                  <View style={[styles.nutritionDot, { backgroundColor: '#D0021B' }]} />
                                  <Text style={styles.nutritionText}>Protein {item.protein}g</Text>
                                </View>
                              </View>
                              <View style={styles.nutritionRow}>
                                <View style={styles.nutritionItem}>
                                  <View style={[styles.nutritionDot, { backgroundColor: '#7ED321' }]} />
                                  <Text style={styles.nutritionText}>Carbs {item.carbs}g</Text>
                                </View>
                                <View style={styles.nutritionItem}>
                                  <View style={[styles.nutritionDot, { backgroundColor: '#F5A623' }]} />
                                  <Text style={styles.nutritionText}>Fat {item.fat}g</Text>
                                </View>
                              </View>
                            </>
                          )}
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => handleAddItem(meal)}
                          >
                            <Text style={styles.addButtonText}>Add +</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No {type === 'snack' ? 'snacks' : 'meals'} found
                  </Text>
                </View>
              )}
            </>
          )}
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
    paddingBottom: 16,
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
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: '5%',
    marginBottom: 12,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 45,
    fontSize: 14,
    color: '#344225',
  },
  searchIcon: {
    position: 'absolute',
    right: '8%',
    top: 12,
  },
  categoryContainer: {
    paddingHorizontal: '5%',
    marginBottom: 16,
  },
  categoryScroll: {
    paddingRight: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#344225',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#344225',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#344225',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
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
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#D4E8E0',
  },
  summaryIcon: {
    width: 80,
    height: 80,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTotal: {
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#344225',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7F75',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  caloriesBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#C62828',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1,
  },
  caloriesText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemImage: {
    width: '100%',
    height: 120,
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344225',
    marginBottom: 8,
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nutritionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nutritionText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#344225',
  },
  addButton: {
    backgroundColor: '#344225',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
