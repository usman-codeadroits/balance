import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
}

export default function OrderHistoryScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [completedSubscriptions, setCompletedSubscriptions] = useState<Subscription[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadSubscriptions();
    }, [])
  );

  const loadSubscriptions = async () => {
    try {
      const subscriptionsData = await AsyncStorage.getItem('subscriptions');
      if (subscriptionsData) {
        const allSubscriptions: Subscription[] = JSON.parse(subscriptionsData);
        setSubscriptions(allSubscriptions);
        
        // Separate active and completed
        const active = allSubscriptions.filter(sub => {
          const endDate = new Date(sub.endDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return sub.status === 'Active' && endDate >= today;
        });
        
        const completed = allSubscriptions.filter(sub => {
          const endDate = new Date(sub.endDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return sub.status === 'Completed' || (sub.status === 'Active' && endDate < today);
        });
        
        setActiveSubscriptions(active);
        setCompletedSubscriptions(completed);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
      return `${day} ${month} ${year}, ${displayHours}:${displayMinutes}${ampm}`;
    } catch (error) {
      return '';
    }
  };

  const getOrderSummary = (subscription: Subscription): string => {
    const mealCount = subscription.plan?.meal_count || 0;
    const snackCount = subscription.plan?.snack_count || 0;
    const daysCount = subscription.days.length;
    const weeks = subscription.duration?.no_of_weeks || 0;
    return `${mealCount} meal${mealCount > 1 ? 's' : ''} • ${daysCount} day${daysCount > 1 ? 's' : ''} • ${weeks} Week${weeks > 1 ? 's' : ''}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Order History</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Subscriptions */}
          {activeSubscriptions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Active Subscriptions</Text>
              {activeSubscriptions.map((subscription) => (
                <View 
                  key={subscription.id} 
                  style={styles.orderCard}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderTitle}>
                      {getOrderSummary(subscription)}
                    </Text>
                    <Text style={styles.orderPrice}>KWD {subscription.totalPrice.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.orderStatus}>{subscription.status}</Text>
                  <View style={styles.orderFooter}>
                    <Ionicons name="calendar-outline" size={14} color="#344225" />
                    <Text style={styles.orderDate}>{formatDate(subscription.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Recent/Completed Subscriptions */}
          {completedSubscriptions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                {activeSubscriptions.length > 0 ? 'Recent Subscriptions' : 'Order History'}
              </Text>
              {completedSubscriptions.map((subscription) => (
                <View 
                  key={subscription.id} 
                  style={[
                    styles.orderCard,
                    subscription.status === 'Completed' ? styles.orderCardCompleted : styles.orderCardCancelled
                  ]}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderTitle}>
                      {getOrderSummary(subscription)}
                    </Text>
                    <Text style={styles.orderPrice}>KWD {subscription.totalPrice.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.orderStatus}>
                    {subscription.status === 'Cancelled' ? 'Cancelled' : 'Completed'}
                  </Text>
                  <View style={styles.orderFooter}>
                    <Ionicons name="calendar-outline" size={14} color="#344225" />
                    <Text style={styles.orderDate}>{formatDate(subscription.createdAt)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {subscriptions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No subscriptions found</Text>
            </View>
          )}
        </ScrollView>

      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/(tabs)/')}
        >
          <Ionicons name="home" size={26} color="#FFFFFF" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
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
  titleContainer: {
    paddingHorizontal: '5%',
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#D4E8E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#344225',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: '5%',
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#344225',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7F75',
  },
  orderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderCardCompleted: {
    backgroundColor: '#FAD979',
  },
  orderCardCancelled: {
    backgroundColor: '#FAD979',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344225',
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#344225',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#344225',
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderDate: {
    fontSize: 12,
    fontWeight: '400',
    color: '#344225',
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
    textAlign: 'center',
  },
});
