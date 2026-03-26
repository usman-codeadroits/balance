import { getUserById, updateUser } from '@/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function MyInformationScreen() {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
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

    const areas = address.area || address.areas || address.city || address.region || '';
    const blockNumber = address.block_number || address.blockNumber || address.block || '';
    const street = address.street || '';
    const avenue = address.avenue || address.ave || '';
    const houseBuliding = address.house_building || address.houseBuliding || address.house || address.building || '';
    const floorApartment = address.floor_apartment || address.floorApartment || address.apartment || '';
    const remarks = address.remarks || address.notes || '';

    return {
      areas,
      blockNumber,
      street,
      avenue,
      houseBuliding,
      floorApartment,
      remarks,
    };
  };

  const applyAddressToState = (address: any) => {
    if (!address) return;
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
          setFullName(userData.name || '');
          setEmail(userData.email || '');
          setMobileNumber(userData.mobile || userData.phone || '');

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
          console.error('Error fetching from API, falling back to local storage:', apiError);
        }
      }
      
      // Fallback to local storage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setFullName(userData.name || '');
        setEmail(userData.email || '');
        setMobileNumber(userData.mobile || userData.phone || '');
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
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      
      if (userId) {
        // Update user via API
        try {
          await updateUser(parseInt(userId), {
            name: fullName,
            email: email,
            mobile: mobileNumber,
            phone: mobileNumber,
          });
        } catch (apiError) {
          console.error('Error updating user via API:', apiError);
        }
      }
      
      // Save updated data to AsyncStorage
      const userData = {
        name: fullName,
        email: email,
        mobile: mobileNumber,
        phone: mobileNumber,
      };
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      const addressData = {
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
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to update information');
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
            placeholder="Full Name"
            placeholderTextColor="#6B7F75"
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={styles.input}
            placeholder="Mobile number"
            placeholderTextColor="#6B7F75"
            value={mobileNumber}
            onChangeText={setMobileNumber}
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
