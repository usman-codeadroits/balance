import type { Duration } from '@/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AddAddressScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [areas, setAreas] = useState('');
  const [blockNumber, setBlockNumber] = useState('');
  const [street, setStreet] = useState('');
  const [houseBuliding, setHouseBuliding] = useState('');
  const [floorApartment, setFloorApartment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [addressCategory, setAddressCategory] = useState<'home' | 'office'>('home');
  const [isPrimary, setIsPrimary] = useState(true);
  const [deliveryTime, setDeliveryTime] = useState<'4pm-8pm' | '8pm-12am'>('4pm-8pm');
  const [loading, setLoading] = useState(false);

  // Pre-fill with dummy data
  useEffect(() => {
    setFirstName('John');
    setLastName('Doe');
    setAreas('Kuwait City');
    setBlockNumber('5');
    setStreet('Salmiya Street');
    setHouseBuliding('Building 123');
    setFloorApartment('Floor 2, Apt 201');
    setPhoneNumber('12345678');
    setRemarks('Please ring the doorbell');
  }, []);

  const handleCheckout = async () => {
    // Validate all required fields
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'Please enter your first name');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter your last name');
      return;
    }
    if (!areas.trim()) {
      Alert.alert('Validation Error', 'Please enter your area');
      return;
    }
    if (!blockNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your block number');
      return;
    }
    if (!street.trim()) {
      Alert.alert('Validation Error', 'Please enter your street');
      return;
    }
    if (!houseBuliding.trim()) {
      Alert.alert('Validation Error', 'Please enter your house/building');
      return;
    }
    if (!floorApartment.trim()) {
      Alert.alert('Validation Error', 'Please enter your floor/apartment');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return;
    }
    // Validate phone number format (basic validation)
    if (phoneNumber.length < 8) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const planData = await AsyncStorage.getItem('selectedPlan');
      const durationData = await AsyncStorage.getItem('selectedDuration');
      const daysData = await AsyncStorage.getItem('selectedDays');
      const dateData = await AsyncStorage.getItem('startDate');
      const mealsData = await AsyncStorage.getItem('selectedDayMeals');

      if (!planData || !durationData || !daysData || !dateData || !mealsData) {
        Alert.alert('Error', 'Subscription data not found. Please start over.');
        return;
      }

      const selectedPlan = JSON.parse(planData);
      const selectedDuration: Duration = JSON.parse(durationData);
      const selectedDays: number[] = JSON.parse(daysData);
      const startDate = dateData;
      const dayMeals = JSON.parse(mealsData);

      if (!selectedPlan || !selectedPlan.id) {
        Alert.alert('Error', 'Subscription plan data is invalid. Please select a plan again.');
        return;
      }

      const start = new Date(startDate);
      const endDate = new Date(start);
      endDate.setDate(start.getDate() + selectedDuration.no_of_weeks * 7);

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'User not found. Please login again.');
        router.replace('/auth');
        return;
      }

      const pricePerDay = selectedPlan.pricePerDay || 0;
      const selectedDaysCount = selectedDays.length;
      const planPrice = pricePerDay * selectedDaysCount * selectedDuration.no_of_weeks;
      const vat = planPrice * 0.1;
      const totalPrice = planPrice + vat;

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const selectedDaysString = selectedDays.map(dayIndex => dayNames[dayIndex]).join(',');

      const mealsArray: { day: string; meal_id: number; type: 'is meal' | 'is snack' }[] = [];
      Object.keys(dayMeals).forEach(dayIndexStr => {
        const dayIndex = parseInt(dayIndexStr, 10);
        const dayName = dayNames[dayIndex];
        const dayMealData = dayMeals[dayIndex];

        if (dayMealData?.meals) {
          dayMealData.meals.forEach((meal: any) => {
            if (meal?.id) {
              mealsArray.push({
                day: dayName,
                meal_id: parseInt(meal.id, 10),
                type: 'is meal',
              });
            }
          });
        }

        if (dayMealData?.snacks) {
          dayMealData.snacks.forEach((snack: any) => {
            if (snack?.id) {
              mealsArray.push({
                day: dayName,
                meal_id: parseInt(snack.id, 10),
                type: 'is snack',
              });
            }
          });
        }
      });

      const formattedStartDate = new Date(startDate).toISOString().split('T')[0];

      let planId: number;
      if (typeof selectedPlan.id === 'string') {
        const parsedId = parseInt(selectedPlan.id, 10);
        if (Number.isNaN(parsedId) || parsedId <= 0) {
          Alert.alert('Error', 'Invalid subscription plan ID. Please select a plan again.');
          return;
        }
        planId = parsedId;
      } else if (typeof selectedPlan.id === 'number') {
        planId = selectedPlan.id;
      } else {
        Alert.alert('Error', 'Invalid subscription plan ID format. Please select a plan again.');
        return;
      }

      const hasPersonalizedPlan = await AsyncStorage.getItem('hasPersonalizedPlan');
      const personalizedProtein = await AsyncStorage.getItem('personalizedProtein');
      const personalizedCarbs = await AsyncStorage.getItem('personalizedCarbs');

      const isPersonalized = hasPersonalizedPlan === 'true';
      const protein = isPersonalized && personalizedProtein ? parseFloat(personalizedProtein) : 0;
      const carbs = isPersonalized && personalizedCarbs ? parseFloat(personalizedCarbs) : 0;

      const preferredDeliverySlot = deliveryTime === '4pm-8pm'
        ? 'four_pm_to_eight_pm'
        : 'eight_pm_to_twelve_am';

      const checkoutPayload = {
        user_id: parseInt(userId, 10),
        subcrption_plans_id: planId,
        duration_id: Number(selectedDuration.id),
        selected_days: selectedDaysString,
        start_date: formattedStartDate,
        price: Math.round(totalPrice),
        payment: 'pending' as const,
        status: 'active' as const,
        is_personalized: isPersonalized,
        protein,
        carbs,
        meals: mealsArray,
        address: {
          first_name: firstName,
          last_name: lastName,
          area: areas,
          block_number: blockNumber,
          street,
          house_building: houseBuliding,
          floor_apartment: floorApartment,
          phone_number: phoneNumber,
          remarks,
          category: addressCategory,
          is_primary: isPrimary,
          preferred_delivery_slot: preferredDeliverySlot,
        },
        amount: Math.round(totalPrice),
        currency: selectedPlan.currency || 'KWD',
      };

      const checkoutDraft = {
        payload: checkoutPayload,
        summary: {
          plan: selectedPlan,
          duration: selectedDuration,
          days: selectedDays,
          startDate,
          endDate: endDate.toISOString(),
          dayMeals,
          address: checkoutPayload.address,
          planPrice,
          vat,
          totalPrice,
        },
      };

      await AsyncStorage.setItem('pendingCheckoutData', JSON.stringify(checkoutDraft));

      Alert.alert(
        'Almost there',
        'Enter your card details to confirm the subscription.',
        [
          {
            text: 'Continue',
            onPress: () => router.push('/auth/payment' as any),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Error preparing checkout:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to prepare checkout. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.placeholder} />
        </View>

        {/* Title - Static */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Add Address</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Inputs */}
          <TextInput
            style={styles.input}
            placeholder="First name"
            placeholderTextColor="#6B7F75"
            value={firstName}
            onChangeText={setFirstName}
          />

          <TextInput
            style={styles.input}
            placeholder="Last name"
            placeholderTextColor="#6B7F75"
            value={lastName}
            onChangeText={setLastName}
          />

          <TextInput
            style={styles.input}
            placeholder="Areas"
            placeholderTextColor="#6B7F75"
            value={areas}
            onChangeText={setAreas}
          />

          <TextInput
            style={styles.input}
            placeholder="Block Number"
            placeholderTextColor="#6B7F75"
            value={blockNumber}
            onChangeText={setBlockNumber}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Street"
            placeholderTextColor="#6B7F75"
            value={street}
            onChangeText={setStreet}
          />

          <TextInput
            style={styles.input}
            placeholder="House/Buliding"
            placeholderTextColor="#6B7F75"
            value={houseBuliding}
            onChangeText={setHouseBuliding}
          />

          <TextInput
            style={styles.input}
            placeholder="Floor/Apartment"
            placeholderTextColor="#6B7F75"
            value={floorApartment}
            onChangeText={setFloorApartment}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor="#6B7F75"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Remarks"
            placeholderTextColor="#6B7F75"
            value={remarks}
            onChangeText={setRemarks}
            multiline
          />

          {/* Address Category */}
          <Text style={styles.sectionLabel}>Address Category</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setAddressCategory('home')}
            >
              <View style={styles.radioOuter}>
                {addressCategory === 'home' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setAddressCategory('office')}
            >
              <View style={styles.radioOuter}>
                {addressCategory === 'office' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Office</Text>
            </TouchableOpacity>
          </View>

          {/* Save as Primary Address */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Save as primary address</Text>
            <Switch
              value={isPrimary}
              onValueChange={setIsPrimary}
              trackColor={{ false: '#D4E8E0', true: '#7A9B7E' }}
              thumbColor={isPrimary ? '#344225' : '#f4f3f4'}
            />
          </View>

          {/* Delivery Time */}
          <Text style={styles.sectionLabel}>Select your preferred delivery time</Text>
          <View style={styles.timeButtonGroup}>
            <TouchableOpacity
              style={[
                styles.timeButton,
                deliveryTime === '4pm-8pm' && styles.timeButtonActiveYellow,
              ]}
              onPress={() => setDeliveryTime('4pm-8pm')}
            >
              <Text
                style={[
                  styles.timeButtonText,
                  deliveryTime === '4pm-8pm' && styles.timeButtonTextActive,
                ]}
              >
                4pm to 8pm
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.timeButton,
                deliveryTime === '8pm-12am' && styles.timeButtonActiveGreen,
              ]}
              onPress={() => setDeliveryTime('8pm-12am')}
            >
              <Text
                style={[
                  styles.timeButtonTextGreen,
                  deliveryTime === '8pm-12am' && styles.timeButtonTextActiveWhite,
                ]}
              >
                8pm to 12am
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Checkout Button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]} 
            onPress={handleCheckout}
            disabled={loading}
          >
            <Text style={styles.checkoutButtonText}>
              {loading ? 'Processing...' : 'Check out'}
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: '5%',
    paddingTop: 40,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#344225',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: '5%',
    paddingBottom: 120,
  },
  titleContainer: {
    paddingHorizontal: '5%',
    paddingBottom: 20,
    backgroundColor: '#D4E8E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#344225',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#344225',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#B8D5C5',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344225',
    marginTop: 8,
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#344225',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#344225',
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#344225',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#344225',
  },
  timeButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B8D5C5',
  },
  timeButtonActiveYellow: {
    backgroundColor: '#FAD979',
    borderColor: '#FAD979',
  },
  timeButtonActiveGreen: {
    backgroundColor: '#344225',
    borderColor: '#344225',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344225',
  },
  timeButtonTextGreen: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344225',
  },
  timeButtonTextActive: {
    color: '#344225',
  },
  timeButtonTextActiveWhite: {
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D4E8E0',
    paddingHorizontal: '5%',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  checkoutButton: {
    backgroundColor: '#344225',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
});
