import AuthButtonGreen from '@/components/auth/auth-button-green';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Gender = 'male' | 'female' | null;

export default function GenderScreen() {
  const [selectedGender, setSelectedGender] = useState<Gender>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadGender = async () => {
      const storedGender = await AsyncStorage.getItem('tempGender');
      if (storedGender === 'male' || storedGender === 'female') {
        setSelectedGender(storedGender);
      }
    };
    loadGender();
  }, []);

  const handleContinue = async () => {
    if (!selectedGender) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }

    setLoading(true);

    try {
      // Store gender in AsyncStorage
      await AsyncStorage.setItem('tempGender', selectedGender);

      // Navigate to goal screen
      router.push('/auth/goal');
    } catch (error) {
      console.error('Error saving gender:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save information. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/balance-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>What&apos;s your Gender?</Text>
          <Text style={styles.subtitle}>
            This will help us to personalize your weight loss journey
          </Text>
        </View>

        {/* Gender Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedGender === 'male' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedGender('male')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionEmoji}>👨</Text>
            <Text style={styles.optionText}>Male</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedGender === 'female' && styles.optionCardSelected,
            ]}
            onPress={() => setSelectedGender('female')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionEmoji}>👩</Text>
            <Text style={styles.optionText}>Female</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <AuthButtonGreen title={loading ? "Saving..." : "Continue"} onPress={handleContinue} disabled={loading} />
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
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
  },
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#344225',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7F75',
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#344225',
    backgroundColor: '#F0F7F4',
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#344225',
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 30,
  },
});
