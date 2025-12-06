import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuItems = [
    { id: 1, title: 'My Information', icon: 'chevron-forward', route: '/my-information' },
    { id: 2, title: 'Allergies', icon: 'chevron-forward', route: '/allergies-preference' },
    { id: 3, title: 'Dislikes', icon: 'chevron-forward', route: null },
    { id: 4, title: 'Order history', icon: 'chevron-forward', route: '/order-history' },
    { id: 5, title: 'About Us', icon: 'chevron-forward', route: null },
    { id: 6, title: 'Terms & Conditions', icon: 'chevron-forward', route: null },
    { id: 7, title: 'Privacy Policy', icon: 'chevron-forward', route: null },
    { id: 8, title: 'Contact Us', icon: 'chevron-forward', route: '/contact-us' },
    { id: 9, title: 'Change Language', icon: 'chevron-forward', route: '/change-language' },
  ];

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              // Clear all user data
              await AsyncStorage.multiRemove([
                'userId',
                'userData',
                'authToken',
                'activeSubscription',
                'subscriptions',
                'tempPhoneNumber',
                'tempCountryCode',
                'tempEmail',
                'tempName',
                'tempBirthday',
                'tempGender',
                'tempWeight',
                'tempHeight',
                'otpVerifiedPhone',
                'selectedPlan',
                'selectedDuration',
                'selectedDays',
                'startDate',
                'selectedDayMeals',
              ]);
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
              // Navigate to auth screen (login / sign up)
              router.replace('/auth');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>My Profile</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.menuItem}
                onPress={() => item.route && router.push(item.route as any)}
              >
                <Text style={styles.menuText}>{item.title}</Text>
                <Ionicons name={item.icon as any} size={20} color="#344225" />
              </TouchableOpacity>
            ))}
            
            {/* Logout Button */}
            <TouchableOpacity 
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
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
    paddingBottom: 100,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    backgroundColor: '#E8F0ED',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#344225',
  },
  logoutItem: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#D4E8E0',
    paddingTop: 18,
  },
  logoutText: {
    color: '#FF6B6B',
    fontWeight: '600',
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
