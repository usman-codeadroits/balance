import { getSubscriptionPlans, type MealPlan } from '@/api';
import AuthButtonGreen from '@/components/auth/auth-button-green';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ActiveSubscription {
  id: string;
  plan: any;
  duration: any;
  days: number[];
  startDate: string;
  endDate: string;
  status: 'Active' | 'Completed' | 'Cancelled';
}

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState<boolean>(true);
  const [hasPersonalizedPlan, setHasPersonalizedPlan] = useState<boolean>(false);

  useEffect(() => {
    console.log('Selected plan:', selectedPlan);
  }, [selectedPlan]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't clear personalized plan cache - it should persist across navigation
    // clearPersonalizedPlanCache();
    checkActiveSubscription();
    fetchSubscriptionPlans();
    checkPersonalizedPlan();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkPersonalizedPlan();
    }, [])
  );

  const clearPersonalizedPlanCache = async () => {
    try {
      // Clear personalized plan cache to ensure fresh start for new users
      await AsyncStorage.multiRemove([
        'hasPersonalizedPlan',
        'personalizedProtein',
        'personalizedCarbs',
        'personalizedMealsPerDay',
        'personalizedSnacksPerDay',
      ]);
    } catch (error) {
      console.error('Error clearing personalized plan cache:', error);
    }
  };

  const checkPersonalizedPlan = async () => {
    try {
      const personalizedPlan = await AsyncStorage.getItem('hasPersonalizedPlan');
      setHasPersonalizedPlan(personalizedPlan === 'true');
    } catch (error) {
      console.error('Error checking personalized plan:', error);
      setHasPersonalizedPlan(false);
    }
  };

  const checkActiveSubscription = async () => {
    try {
      setCheckingSubscription(true);
      const activeSubData = await AsyncStorage.getItem('activeSubscription');
      if (activeSubData) {
        const subscription: ActiveSubscription = JSON.parse(activeSubData);
        // Check if subscription is still active
        const endDate = new Date(subscription.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (subscription.status === 'Active' && endDate >= today) {
          setActiveSubscription(subscription);
        } else {
          // Subscription expired, remove from active
          await AsyncStorage.removeItem('activeSubscription');
          setActiveSubscription(null);
        }
      } else {
        setActiveSubscription(null);
      }
    } catch (error) {
      console.error('Error checking active subscription:', error);
      setActiveSubscription(null);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const plans = await getSubscriptionPlans();
      setMealPlans(plans);
    } catch (err) {
      console.error('Error fetching subscription plans:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription plans. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async () => {
    // Check if user has active subscription
    if (activeSubscription) {
      const endDate = new Date(activeSubscription.endDate);
      const formattedEndDate = endDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      Alert.alert(
        'Active Subscription Exists',
        `You already have an active subscription that ends on ${formattedEndDate}. Please wait until your current subscription ends before creating a new one.`,
        [
          {
            text: 'View Subscription',
            onPress: () => router.push('/(tabs)/' as any),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    if (!selectedPlan) {
      alert('Please select a plan');
      return;
    }
    
    try {
      // Find the selected plan object
      const plan = mealPlans.find(p => String(p.id) === String(selectedPlan));
      if (!plan) {
        console.error('Plan not found in mealPlans. Selected plan ID:', selectedPlan);
        alert('Plan not found. Please try again.');
        return;
      }
      
      // Always use the actual API plan ID, even for personalized plans
      // The personalized status is tracked separately via hasPersonalizedPlan
      const planToSave = {
        ...plan,
        // Ensure ID is always a valid number (not a string like 'personalized')
        id: typeof plan.id === 'string' ? parseInt(plan.id, 10) : plan.id,
        // If user has personalized plan, update the title but keep the real ID
        title: hasPersonalizedPlan ? 'Personalized plan' : plan.title,
      };
      
      // Validate the plan ID before saving
      if (!planToSave.id || isNaN(Number(planToSave.id)) || Number(planToSave.id) <= 0) {
        console.error('Invalid plan ID after processing:', planToSave.id, 'Original plan:', plan);
        alert('Invalid plan ID. Please try selecting the plan again.');
        return;
      }
      
      console.log('Saving plan to AsyncStorage:', JSON.stringify(planToSave, null, 2));
      await AsyncStorage.setItem('selectedPlan', JSON.stringify(planToSave));
      router.push('/auth/plan-page' as any);
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan. Please try again.');
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '';
    }
  };

  // Get meal and snack counts from selected plan (for future use if needed)
  // const selectedPlanData = mealPlans.find(p => p.id === selectedPlan);
  // const mealCount = selectedPlanData?.meal_count || 0;
  // const snackCount = selectedPlanData?.snack_count || 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Fixed Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Select a Subscription Plan</Text>
        </View>

        {/* Scrollable Plans */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Subscription Warning */}
          {!checkingSubscription && activeSubscription && (
            <View style={styles.activeSubscriptionCard}>
              <View style={styles.activeSubscriptionHeader}>
                <Ionicons name="information-circle" size={24} color="#344225" />
                <Text style={styles.activeSubscriptionTitle}>Active Subscription Found</Text>
              </View>
              <Text style={styles.activeSubscriptionText}>
                You currently have an active subscription that ends on {formatDate(activeSubscription.endDate)}.
              </Text>
              <Text style={styles.activeSubscriptionSubtext}>
                Please wait until your current subscription ends before creating a new one.
              </Text>
              <TouchableOpacity 
                style={styles.viewSubscriptionButton}
                onPress={() => router.push('/(tabs)/' as any)}
              >
                <Text style={styles.viewSubscriptionButtonText}>View Active Subscription</Text>
              </TouchableOpacity>
            </View>
          )}

          {loading || checkingSubscription ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>Loading subscription plans...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchSubscriptionPlans}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
            {/* API Plans */}
            {mealPlans.map((plan) => (
            <View 
              key={plan.id} 
              style={[
                styles.planCard,
                activeSubscription && styles.planCardDisabled
              ]}
            >
              <View style={styles.planContentRow}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
              </View>
              <Text style={styles.planDescription}>
                Choose {plan.meal_count} meal{plan.meal_count > 1 ? 's' : ''} + {plan.snack_count} snack{plan.snack_count > 1 ? 's' : ''} /day
              </Text>
              <TouchableOpacity 
                style={[
                  styles.chooseButton,
                  String(selectedPlan) === String(plan.id) && styles.chooseButtonSelected,
                  activeSubscription && styles.chooseButtonDisabled,
                ]}
                onPress={() => {
                  if (activeSubscription) {
                    Alert.alert(
                      'Active Subscription',
                      'You already have an active subscription. Please wait until it ends before selecting a new plan.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  const newSelectedPlan = String(plan.id);
                  console.log('Button clicked for plan:', plan.id, 'Setting selected to:', newSelectedPlan);
                  setSelectedPlan(newSelectedPlan);
                }}
                activeOpacity={activeSubscription ? 1 : 0.7}
                disabled={!!activeSubscription}
              >
                <Text style={[
                  styles.chooseButtonText,
                  String(selectedPlan) === String(plan.id) && styles.chooseButtonTextSelected,
                  activeSubscription && styles.chooseButtonTextDisabled,
                ]}>
                  {String(selectedPlan) === String(plan.id) ? 'Selected' : 'Select Plan'}
                </Text>
              </TouchableOpacity>
            </View>
            ))}
            {/* Personalized Plan Card */}
            {
              <View style={styles.personalizedPlanCard}>
                <View style={styles.personalizedPlanContentRow}>
                  <View style={styles.personalizedPlanTextContainer}>
                    <Text style={styles.personalizedPlanTitle}>Personalized plan</Text>
                    <Text style={styles.personalizedPlanDescription}>
                      {hasPersonalizedPlan
                        ? 'Use your tailored macros and meals'
                        : 'Made for fitness-focused individuals'}
                    </Text>
                  </View>
                  <Image
                    source={require('@/assets/images/plan.png')}
                    style={styles.personalizedPlanIcon}
                    resizeMode="contain"
                  />
                </View>
                <TouchableOpacity 
                  style={[
                    styles.chooseButton,
                    activeSubscription && styles.chooseButtonDisabled,
                  ]}
                  onPress={() => {
                    if (activeSubscription) {
                      Alert.alert(
                        'Active Subscription',
                        'You already have an active subscription. Please wait until it ends before selecting a new plan.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    router.push('/auth/build-plan' as any);
                  }}
                  activeOpacity={activeSubscription ? 1 : 0.7}
                  disabled={!!activeSubscription}
                >
                  <Text style={[
                    styles.chooseButtonText,
                    activeSubscription && styles.chooseButtonTextDisabled,
                  ]}>
                    {hasPersonalizedPlan ? 'Use My Fit Plan' : 'Build My Fit Plan'}
                  </Text>
                </TouchableOpacity>
              </View>
            }
            {/* Empty state - only show if no plans and no personalized card */}
            {mealPlans.length === 0 && hasPersonalizedPlan && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No subscription plans available</Text>
              </View>
            )}
            </>
          )}
        </ScrollView>

       

        {/* Fixed Bottom Section */}
        <View style={styles.bottomSection}>
          <AuthButtonGreen 
            title={activeSubscription ? "Active Subscription Exists" : "Continue"} 
            onPress={handleSelectPlan}
            disabled={!!activeSubscription}
          />
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => router.push('/(tabs)/' as any)}
          >
            <Ionicons name="home" size={26} color="#FFFFFF" />
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => router.push('/(tabs)/order-history' as any)}
          >
            <Ionicons name="time" size={26} color="#FFFFFF" />
            <Text style={styles.navLabel}>Meals History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Ionicons name="calendar" size={26} color="#FFFFFF" />
            <Text style={styles.navLabel}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => router.push('/(tabs)/profile' as any)}
          >
            <Ionicons name="person" size={26} color="#FFFFFF" />
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
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
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 35,
    fontWeight: '700',
    color: '#344225',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  planCard: {
    backgroundColor: '#FAD979',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  planCardSelected: {
    borderWidth: 3,
    borderColor: '#344225',
  },
  planContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#344225',
  },
  planPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#344225',
  },
  planDescription: {
    fontSize: 13,
    color: '#344225',
    marginBottom: 12,
  },
  chooseButton: {
    backgroundColor: '#344225',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  chooseButtonSelected: {
    backgroundColor: '#FAD979',
    borderWidth: 2,
    borderColor: '#344225',
  },
  chooseButtonText: {
    color: '#FAD979',
    fontSize: 14,
    fontWeight: '600',
  },
  chooseButtonTextSelected: {
     color: '#344225',
     fontWeight: 'bold',
     
  },
  countDisplayContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  countLabel: {
    fontSize: 14,
    color: '#344225',
    fontWeight: '500',
  },
  countValue: {
    fontSize: 16,
    color: '#344225',
    fontWeight: '700',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#344225',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#344225',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FAD979',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#344225',
    textAlign: 'center',
  },
  activeSubscriptionCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FAD979',
  },
  activeSubscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  activeSubscriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#344225',
  },
  activeSubscriptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#344225',
    marginBottom: 8,
    lineHeight: 20,
  },
  activeSubscriptionSubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7F75',
    marginBottom: 16,
    lineHeight: 18,
  },
  viewSubscriptionButton: {
    backgroundColor: '#344225',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewSubscriptionButtonText: {
    color: '#FAD979',
    fontSize: 14,
    fontWeight: '600',
  },
  planCardDisabled: {
    opacity: 0.6,
  },
  chooseButtonDisabled: {
    backgroundColor: '#8B9D94',
    opacity: 0.6,
  },
  chooseButtonTextDisabled: {
    color: '#C5D4CC',
  },
  personalizedPlanCard: {
    backgroundColor: '#FAD979',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  personalizedPlanContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  personalizedPlanTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  personalizedPlanTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#344225',
    marginBottom: 4,
  },
  personalizedPlanDescription: {
    fontSize: 13,
    color: '#344225',
  },
  personalizedPlanIcon: {
    width: 60,
    height: 60,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#344225',
    borderRadius: 24,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 4,
  },
});
