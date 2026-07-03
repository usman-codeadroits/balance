import { getUserById, updateUser } from '@/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function MyInformationScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [block, setBlock] = useState('');
  const [street, setStreet] = useState('');
  const [avenue, setAvenue] = useState('');
  const [house, setHouse] = useState('');
  const [area, setArea] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const normalizeAddress = (address: any) => {
    if (!address || typeof address !== 'object') return null;

    return {
      firstName: address.first_name || address.firstName || '',
      lastName: address.last_name || address.lastName || '',
      phoneNumber: address.phone_number || address.phoneNumber || address.phone || '',
      areas: address.area || address.areas || address.city || address.region || '',
      blockNumber: address.block_number || address.blockNumber || address.block || '',
      street: address.street || '',
      avenue: address.avenue || address.ave || '',
      houseBuliding: address.house_building || address.houseBuliding || address.house || address.building || '',
      floorApartment: address.floor_apartment || address.floorApartment || address.apartment || '',
      remarks: address.remarks || address.notes || '',
    };
  };

  const applyAddressToState = (address: any) => {
    if (!address) return;
    if (address.firstName) setFirstName(address.firstName);
    if (address.lastName) setLastName(address.lastName);
    if (address.phoneNumber) setPhoneNumber(address.phoneNumber);
    setAddress(address.areas || '');
    setBlock(address.blockNumber || '');
    setStreet(address.street || '');
    setAvenue(address.avenue || '');
    setHouse(address.houseBuliding || '');
    setArea(address.floorApartment || '');
    setAdditionalInstructions(address.remarks || '');
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get user ID
      const userId = await AsyncStorage.getItem('userId');
      
      if (userId) {
        // Try to fetch from API first
        try {
          const userData = await getUserById(parseInt(userId));

          // Populate form with API data
          const nameParts = (userData.name || '').trim().split(' ');
          setFirstName(nameParts[0] || '');
          setLastName(nameParts.slice(1).join(' ') || '');
          setPhoneNumber(userData.mobile ? String(userData.mobile) : '');

          // Capture address if provided by API response
          const address = normalizeAddress(
            userData.address ||
            (Array.isArray(userData.addresses) ? userData.addresses[0] : null)
          );
          if (address) {
            applyAddressToState(address);
            await AsyncStorage.setItem('userAddress', JSON.stringify(address));
          }
          
          // Save to local storage for offline access
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
        } catch (apiError) {
        }
      }
      
      // Fallback to local storage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        const nameParts = (userData.name || '').trim().split(' ');
        if (!firstName) setFirstName(nameParts[0] || '');
        if (!lastName) setLastName(nameParts.slice(1).join(' ') || '');
        if (!phoneNumber) setPhoneNumber(userData.mobile ? String(userData.mobile) : '');
      }
      
      // Load address from local storage (address is separate from user profile)
      const storedAddress = await AsyncStorage.getItem('userAddress');
      if (storedAddress) {
        const addressData = JSON.parse(storedAddress);
        applyAddressToState(addressData);
      }

      // Fallbacks: active subscription or pending checkout drafts may contain the latest address
      if (!address && !block && !street && !avenue && !house && !area) {
        const activeSubStr = await AsyncStorage.getItem('activeSubscription');
        if (activeSubStr) {
          const activeSub = JSON.parse(activeSubStr);
          const activeAddress = normalizeAddress(activeSub.address);
          if (activeAddress) {
            applyAddressToState(activeAddress);
            await AsyncStorage.setItem('userAddress', JSON.stringify(activeAddress));
          }
        }
      }

      if (!address && !block && !street && !avenue && !house && !area) {
        const checkoutDraftStr = await AsyncStorage.getItem('pendingCheckoutData');
        if (checkoutDraftStr) {
          const checkoutDraft = JSON.parse(checkoutDraftStr);
          const draftAddress = normalizeAddress(checkoutDraft?.summary?.address || checkoutDraft?.payload?.address);
          if (draftAddress) {
            applyAddressToState(draftAddress);
            await AsyncStorage.setItem('userAddress', JSON.stringify(draftAddress));
          }
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

      if (userId) {
        try {
          await updateUser(parseInt(userId), {
            name: fullName,
          });
        } catch (apiError) {
        }
      }

      const userData = {
        name: fullName,
        mobile: phoneNumber.trim(),
      };
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      const addressData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        areas: address,
        blockNumber: block,
        street: street,
        avenue: avenue,
        houseBuliding: house,
        floorApartment: area,
        remarks: additionalInstructions,
      };
      await AsyncStorage.setItem('userAddress', JSON.stringify(addressData));

      Alert.alert('Success', 'Your information has been updated successfully');
    } catch (error) {
      Alert.alert('Update failed', 'Failed to update information');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="create-outline" size={20} color="#344225" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="trash-outline" size={20} color="#344225" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#344225" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <>
              {/* Form Inputs */}
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="#6B7F75"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor="#6B7F75"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#6B7F75"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Address"
            placeholderTextColor="#6B7F75"
            value={address}
            onChangeText={setAddress}
          />

          <TextInput
            style={styles.input}
            placeholder="Block"
            placeholderTextColor="#6B7F75"
            value={block}
            onChangeText={setBlock}
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
            placeholder="Avenue"
            placeholderTextColor="#6B7F75"
            value={avenue}
            onChangeText={setAvenue}
          />

          <TextInput
            style={styles.input}
            placeholder="House"
            placeholderTextColor="#6B7F75"
            value={house}
            onChangeText={setHouse}
          />

          <TextInput
            style={styles.input}
            placeholder="Area"
            placeholderTextColor="#6B7F75"
            value={area}
            onChangeText={setArea}
          />

          <TextInput
            style={styles.input}
            placeholder="Additional Instructions"
            placeholderTextColor="#6B7F75"
            value={additionalInstructions}
            onChangeText={setAdditionalInstructions}
            multiline
          />
            </>
          )}
        </ScrollView>

        {/* Update Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
            <Text style={styles.updateButtonText}>Update</Text>
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
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#344225',
    flex: 1,
    textAlign: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: '5%',
    paddingBottom: 120,
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
  updateButton: {
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
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
});
