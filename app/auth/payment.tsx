import { checkoutSubscription } from '@/api';
import type { CheckoutRequest } from '@/api/services/subscriptions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

type DurationSummary = {
  id?: number | string;
  title?: string;
  no_of_weeks: number;
};

type CheckoutDraft = {
  payload: CheckoutRequest & {
    address: NonNullable<CheckoutRequest['address']>;
    amount: number;
    currency: string;
  };
  summary: {
    plan: any;
    duration: DurationSummary;
    days: number[];
    startDate: string;
    endDate: string;
    dayMeals: Record<string, any>;
    address: NonNullable<CheckoutRequest['address']>;
    planPrice: number;
    vat: number;
    totalPrice: number;
  };
};

export default function PaymentScreen() {
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'tabby' | 'apple'>('credit');
  const [nameOnCard, setNameOnCard] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [ccvNumber, setCcvNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [draftLoading, setDraftLoading] = useState(true);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem('pendingCheckoutData');
        if (stored) {
          setCheckoutDraft(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load checkout draft:', error);
      } finally {
        setDraftLoading(false);
      }
    };

    loadDraft();
  }, []);

  const sanitizeCardNumber = (value: string) => value.replace(/\s+/g, '');

  const parseExpiry = (value: string) => {
    const [monthRaw, yearRaw] = value.split('/');
    const month = monthRaw?.trim();
    const year = yearRaw?.trim();
    if (!month || !year || month.length !== 2) {
      return null;
    }
    const normalizedYear = year.length === 2 ? `20${year}` : year;
    return { month, year: normalizedYear };
  };

  const persistSubscriptionLocally = async (
    subscriptionData: any,
    paymentStatus: 'paid' | 'pending',
    payload: CheckoutRequest
  ) => {
    if (!checkoutDraft) {
      return;
    }

    const { summary } = checkoutDraft;
    const subscriptionStatus = subscriptionData.status === 'active'
      ? 'Active'
      : subscriptionData.status === 'completed'
        ? 'Completed'
        : subscriptionData.status === 'cancelled'
          ? 'Cancelled'
          : 'Active';

    const subscription = {
      id: subscriptionData.id?.toString() || Date.now().toString(),
      plan: summary.plan,
      duration: summary.duration,
      days: summary.days,
      startDate: summary.startDate,
      endDate: summary.endDate,
      dayMeals: summary.dayMeals,
      address: summary.address,
      planPrice: summary.planPrice,
      vat: summary.vat,
      totalPrice: summary.totalPrice,
      status: subscriptionStatus as 'Active' | 'Completed' | 'Cancelled',
      paymentStatus,
      createdAt: subscriptionData.created_at || new Date().toISOString(),
    };

    if (subscriptionData.id) {
      await AsyncStorage.setItem('userSubscriptionId', subscriptionData.id.toString());
    }

    if (subscriptionData.subscription_meals && Array.isArray(subscriptionData.subscription_meals)) {
      await AsyncStorage.setItem('subscriptionMealsData', JSON.stringify(subscriptionData.subscription_meals));
    }

    if (subscriptionData.subscription_days && Array.isArray(subscriptionData.subscription_days)) {
      await AsyncStorage.setItem('subscriptionDaysData', JSON.stringify(subscriptionData.subscription_days));
    }

    const subscriptionsData = await AsyncStorage.getItem('subscriptions');
    const subscriptions = subscriptionsData ? JSON.parse(subscriptionsData) : [];
    subscriptions.push(subscription);
    await AsyncStorage.setItem('subscriptions', JSON.stringify(subscriptions));
    await AsyncStorage.setItem('activeSubscription', JSON.stringify(subscription));

    if (paymentStatus === 'pending') {
      const updatedDraft: CheckoutDraft = {
        payload: {
          ...payload,
          payment: 'pending',
          user_subscription_id: subscriptionData.id,
        },
        summary,
      };
      await AsyncStorage.setItem('pendingCheckoutData', JSON.stringify(updatedDraft));
    } else {
      await AsyncStorage.removeItem('pendingCheckoutData');
    }

    await AsyncStorage.multiRemove([
      'selectedPlan',
      'selectedDuration',
      'selectedDays',
      'startDate',
      'selectedDayMeals',
    ]);
  };

  const handleCheckoutResponse = async (
    response: any,
    payload: CheckoutRequest,
    attemptedPayment: 'paid' | 'pending'
  ) => {
    const responseBody = response?.data || response;
    const subscriptionData = responseBody?.user_subscription || responseBody;

    if (!subscriptionData) {
      throw new Error('Invalid response from server');
    }

    const paymentStatus = (subscriptionData.payment as string)?.toLowerCase() === 'paid'
      ? 'paid'
      : (subscriptionData.payment as string)?.toLowerCase() === 'pending'
        ? 'pending'
        : attemptedPayment;

    await persistSubscriptionLocally(subscriptionData, paymentStatus as 'paid' | 'pending', payload);

    if (paymentStatus === 'paid') {
      Alert.alert('Success', 'Payment completed successfully.', [
        { text: 'Go to Home', onPress: () => router.replace('/(tabs)/' as any) },
      ]);
    } else {
      Alert.alert(
        'Payment Pending',
        'Your subscription is active but payment is pending. You can complete the payment later from the Home screen.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/' as any) }],
        { cancelable: false }
      );
    }
  };

  const handlePayNow = async () => {
    if (!checkoutDraft) {
      Alert.alert('No subscription', 'Please select a subscription before proceeding to payment.');
      return;
    }

    let expiryDetails: { month: string; year: string } | null = null;

    if (paymentMethod === 'credit') {
      expiryDetails = parseExpiry(expiryDate);
      if (!nameOnCard.trim() || !cardNumber.trim() || !ccvNumber.trim() || !expiryDate.trim()) {
        Alert.alert('Missing details', 'Please fill all card details.');
        return;
      }

      if (!expiryDetails) {
        Alert.alert('Invalid expiry', 'Please use the MM/YY format for expiry date.');
        return;
      }

      if (ccvNumber.length < 3) {
        Alert.alert('Invalid CVV', 'Please enter a valid CVV number.');
        return;
      }

      if (sanitizeCardNumber(cardNumber).length < 12) {
        Alert.alert('Invalid card', 'Please enter a valid card number.');
        return;
      }
    }

    setProcessing(true);
    const attemptPayload: CheckoutRequest = {
      ...checkoutDraft.payload,
      payment: 'paid',
      card_holder_name: paymentMethod === 'credit' ? nameOnCard : undefined,
      card_number: paymentMethod === 'credit' ? sanitizeCardNumber(cardNumber) : undefined,
      card_cvv: paymentMethod === 'credit' ? ccvNumber : undefined,
      card_expiry_month: paymentMethod === 'credit' ? expiryDetails?.month : undefined,
      card_expiry_year: paymentMethod === 'credit' ? expiryDetails?.year : undefined,
      save_card: paymentMethod === 'credit' ? saveCard : undefined,
    };

    try {
      const response = await checkoutSubscription(attemptPayload);
      await handleCheckoutResponse(response, attemptPayload, 'paid');
    } catch (error) {
      console.error('Payment attempt failed, creating pending subscription...', error);
      try {
        const pendingPayload: CheckoutRequest = {
          ...checkoutDraft.payload,
          payment: 'pending',
          card_holder_name: paymentMethod === 'credit' ? nameOnCard : undefined,
          card_number: paymentMethod === 'credit' ? sanitizeCardNumber(cardNumber) : undefined,
          card_cvv: paymentMethod === 'credit' ? ccvNumber : undefined,
          card_expiry_month: paymentMethod === 'credit' ? expiryDetails?.month : undefined,
          card_expiry_year: paymentMethod === 'credit' ? expiryDetails?.year : undefined,
          save_card: paymentMethod === 'credit' ? saveCard : undefined,
        };
        const pendingResponse = await checkoutSubscription(pendingPayload);
        await handleCheckoutResponse(pendingResponse, pendingPayload, 'pending');
      } catch (pendingError) {
        console.error('Failed to create pending subscription:', pendingError);
        Alert.alert(
          'Payment failed',
          pendingError instanceof Error ? pendingError.message : 'Unable to create subscription. Please try again.'
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  const renderShippingInfo = () => {
    if (!checkoutDraft?.summary?.address) {
      return null;
    }

    const address = checkoutDraft.summary.address;
    return (
      <>
        <Text style={styles.shippingName}>
          {address.first_name} {address.last_name}
        </Text>
        <Text style={styles.shippingAddress}>
          {address.area}, Block {address.block_number}, {address.street}
        </Text>
        <Text style={styles.shippingAddress}>
          {address.house_building}, {address.floor_apartment}
        </Text>
        <Text style={styles.shippingPhone}>{address.phone_number}</Text>
      </>
    );
  };

  if (draftLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#344225" />
        <Text style={styles.loadingText}>Preparing checkout...</Text>
      </SafeAreaView>
    );
  }

  if (!checkoutDraft) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No subscription in progress</Text>
        <Text style={styles.emptySubtitle}>Please select a plan to continue.</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => router.replace('/auth/subscription' as any)}>
          <Text style={styles.createButtonText}>Browse Plans</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Checkout</Text>
          <Text style={styles.subtitle}>Complete payment to activate your subscription</Text>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Payment method</Text>

          <TouchableOpacity
            style={styles.paymentOption}
            onPress={() => setPaymentMethod('credit')}
          >
            <View style={styles.paymentLeft}>
              <View style={styles.creditCardIcon}>
                <View style={styles.masterCardCircle} />
                <View style={[styles.masterCardCircle, styles.masterCardCircleOverlay]} />
              </View>
              <Text style={styles.paymentText}>Credit Card</Text>
            </View>
            <View style={styles.radioOuter}>
              {paymentMethod === 'credit' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.paymentOption}
            onPress={() => setPaymentMethod('tabby')}
          >
            <View style={styles.paymentLeft}>
              <View style={styles.tabbyIcon}>
                <Text style={styles.tabbyText}>tabby</Text>
              </View>
              <Text style={styles.paymentText}>Tabby</Text>
            </View>
            <View style={styles.radioOuter}>
              {paymentMethod === 'tabby' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.paymentOption}
            onPress={() => setPaymentMethod('apple')}
          >
            <View style={styles.paymentLeft}>
              <View style={styles.appleIcon}>
                <Ionicons name="logo-apple" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.paymentText}>Apple Pay</Text>
            </View>
            <View style={styles.radioOuter}>
              {paymentMethod === 'apple' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {paymentMethod === 'credit' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Name on card"
                placeholderTextColor="#6B7F75"
                value={nameOnCard}
                onChangeText={setNameOnCard}
              />

              <TextInput
                style={styles.input}
                placeholder="Card number"
                placeholderTextColor="#6B7F75"
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.rowInput]}
                  placeholder="CCV"
                  placeholderTextColor="#6B7F75"
                  value={ccvNumber}
                  onChangeText={setCcvNumber}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <TextInput
                  style={[styles.input, styles.rowInput]}
                  placeholder="Expiry (MM/YY)"
                  placeholderTextColor="#6B7F75"
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.saveCardRow}>
                <Text style={styles.saveCardText}>Save card for future payments</Text>
                <Switch
                  value={saveCard}
                  onValueChange={setSaveCard}
                  trackColor={{ false: '#D4E8E0', true: '#7A9B7E' }}
                  thumbColor={saveCard ? '#344225' : '#f4f3f4'}
                />
              </View>
            </>
          )}

          <View style={styles.shippingSection}>
          <View style={styles.shippingHeader}>
              <Text style={styles.shippingTitle}>Delivery & Address</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>
            {renderShippingInfo()}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                Preferred slot: {checkoutDraft.summary.address.preferred_delivery_slot?.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Plan total</Text>
              <Text style={styles.summaryValue}>
                {checkoutDraft.payload.currency} {checkoutDraft.summary.planPrice.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT (10%)</Text>
              <Text style={styles.summaryValue}>
                {checkoutDraft.payload.currency} {checkoutDraft.summary.vat.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Amount due</Text>
              <Text style={styles.summaryTotalValue}>
                {checkoutDraft.payload.currency} {checkoutDraft.summary.totalPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payButton, (processing || !checkoutDraft) && styles.payButtonDisabled]}
            onPress={handlePayNow}
            disabled={processing || !checkoutDraft}
          >
            <Text style={styles.payButtonText}>{processing ? 'Processing...' : 'Pay now'}</Text>
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
  titleContainer: {
    paddingHorizontal: '5%',
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: '#D4E8E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#344225',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7F75',
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: '5%',
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344225',
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F0ED',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 12,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creditCardIcon: {
    width: 28,
    height: 20,
    position: 'relative',
  },
  masterCardCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EB001B',
    position: 'absolute',
    left: 0,
  },
  masterCardCircleOverlay: {
    backgroundColor: '#F79E1B',
    left: 8,
  },
  tabbyIcon: {
    width: 28,
    height: 20,
    backgroundColor: '#3EDFCF',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabbyText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000000',
  },
  appleIcon: {
    width: 28,
    height: 20,
    backgroundColor: '#000000',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#344225',
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
  input: {
    backgroundColor: '#E8F0ED',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 14,
    color: '#344225',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowInput: {
    flex: 1,
  },
  saveCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  saveCardText: {
    fontSize: 14,
    color: '#344225',
    fontWeight: '500',
  },
  shippingSection: {
    backgroundColor: '#E8F0ED',
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
  },
  shippingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344225',
  },
  editText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7A9B7E',
  },
  shippingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344225',
    marginBottom: 4,
  },
  shippingAddress: {
    fontSize: 13,
    color: '#6B7F75',
  },
  shippingPhone: {
    fontSize: 13,
    color: '#6B7F75',
    marginTop: 6,
  },
  badge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#344225',
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#6B7F75',
    fontSize: 14,
  },
  summaryValue: {
    color: '#344225',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryTotal: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0EAE4',
    paddingTop: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344225',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#344225',
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
  payButton: {
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
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D4E8E0',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7F75',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#D4E8E0',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7F75',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#344225',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
