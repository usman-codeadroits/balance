import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Subscription {
  id: string;
  plan: any;
  duration: any;
  days: number[];
  startDate: string;
  endDate: string;
  dayMeals: any;
  address: any;
  planPrice: number;
  vat: number;
  totalPrice: number;
  status: 'Active' | 'Completed' | 'Cancelled';
  createdAt: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | string;
}

export default function HomeScreen() {
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    // Disable gesture navigation (swipe back) on this screen
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // Prevent default behavior of leaving the screen
      e.preventDefault();
    });

    navigation.setOptions({
      gestureEnabled: false,
    });

    return unsubscribe;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      // Reload subscription data when screen comes into focus
      loadActiveSubscription();
      
      // Prevent back navigation on home screen (hardware back button)
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Prevent going back - only allow navigation through bottom tabs
        return true;
      });

      return () => backHandler.remove();
    }, []) // Empty dependency array is fine - we want to reload every time screen is focused
  );

  const loadActiveSubscription = async () => {
    try {
      setLoading(true);
      
      // Load active subscription from local storage (set during login/registration)
      // The subscription is fetched and stored when user logs in via check-user API
      // We don't call the API here because it requires OTP, which the user doesn't have on the home screen
      const activeSubData = await AsyncStorage.getItem('activeSubscription');
      if (activeSubData) {
        const subscription: Subscription = JSON.parse(activeSubData);
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
      console.error('Error loading active subscription:', error);
      setActiveSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return '';
    }
  };

  const getPlanSummaryText = () => {
    if (!activeSubscription) return '';
    const plan = activeSubscription.plan;
    // Handle both old format (with meal_count, snack_count) and new format (just title)
    if (plan?.title) {
      const daysCount = Array.isArray(activeSubscription.days) 
        ? activeSubscription.days.length 
        : (typeof activeSubscription.days === 'string' ? activeSubscription.days.split(',').length : 0);
      const duration = activeSubscription.duration?.title || '';
      
      if (plan.meal_count !== undefined && plan.snack_count !== undefined) {
        // Old format with meal/snack counts
        return `${plan.title}, ${plan.meal_count} Meal${plan.meal_count > 1 ? 's' : ''}, ${plan.snack_count} snack${plan.snack_count > 1 ? 's' : ''}, ${daysCount} days/ week`;
      } else {
        // New format from check-user API
        return `${plan.title}${duration ? ` - ${duration}` : ''}, ${daysCount} days/ week`;
      }
    }
    return 'Active Subscription';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>Loading subscription...</Text>
            </View>
          ) : activeSubscription ? (
            <>
              {/* Active Subscription Card */}
              <View style={styles.subscriptionCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Active Subscription</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{activeSubscription.status}</Text>
                  </View>
                </View>
                
                <Text style={styles.planSummary}>{getPlanSummaryText()}</Text>
                
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#344225" />
                    <Text style={styles.detailLabel}>Start Date</Text>
                    <Text style={styles.detailValue}>{formatDate(activeSubscription.startDate)}</Text>
                  </View>
                  
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar" size={16} color="#344225" />
                    <Text style={styles.detailLabel}>End Date</Text>
                    <Text style={styles.detailValue}>{formatDate(activeSubscription.endDate)}</Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total Price</Text>
                  <Text style={styles.priceValue}>KWD {activeSubscription.totalPrice.toFixed(2)}</Text>
                </View>

              {activeSubscription.paymentStatus === 'pending' && (
                <TouchableOpacity
                  style={styles.payNowButton}
                  onPress={() => router.push('/auth/payment')}
                >
                  <Text style={styles.payNowButtonText}>Pay Now</Text>
                </TouchableOpacity>
              )}
              </View>

              {/* Quick Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/(tabs)/order-history')}
                >
                  <Ionicons name="time-outline" size={24} color="#344225" />
                  <Text style={styles.actionText}>View History</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/auth/selected-meals')}
                >
                  <Ionicons name="restaurant-outline" size={24} color="#344225" />
                  <Text style={styles.actionText}>Update Meals</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/auth/subscription')}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#344225" />
                  <Text style={styles.actionText}>New Subscription</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="restaurant-outline" size={80} color="#B8D5C5" />
              </View>
              <Text style={styles.emptyTitle}>No Active Subscription</Text>
              <Text style={styles.emptySubtitle}>Get started with a meal plan</Text>
              <Text style={styles.emptyText}>
                Choose from our variety of meal plans and start your healthy journey today. 
                Select your preferred meals and snacks, and we'll deliver them right to your door.
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => router.push('/auth/subscription')}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.createButtonText}>Purchase Subscription</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => {
            // Reload subscription when home button is clicked
            loadActiveSubscription();
            router.push('/(tabs)/');
          }}
        >
          <Ionicons name="home" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/(tabs)/order-history')}
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
          onPress={() => router.push('/(tabs)/profile')}
        >
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
    paddingHorizontal: '5%',
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#344225',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: '5%',
    paddingBottom: 120,
  },
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#344225',
  },
  statusBadge: {
    backgroundColor: '#7A9B7E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planSummary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#344225',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7F75',
    marginTop: 4,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344225',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#D4E8E0',
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#344225',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#344225',
  },
  payNowButton: {
    marginTop: 16,
    backgroundColor: '#FAD979',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payNowButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344225',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#344225',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F0F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7F75',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6B7F75',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7F75',
    marginTop: 12,
  },
  createButton: {
    backgroundColor: '#344225',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
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
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 4,
  },
});
