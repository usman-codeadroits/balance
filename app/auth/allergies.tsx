import { finalizeOnboarding } from '@/app/auth/utils/finalize-onboarding';
import AuthButtonGreen from '@/components/auth/auth-button-green';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AllergiesScreen() {
  const [hasAllergies, setHasAllergies] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPreference = async () => {
      const stored = await AsyncStorage.getItem('tempHasAllergies');
      if (stored) {
        setHasAllergies(JSON.parse(stored));
      }
    };
    loadPreference();
  }, []);

  const handleContinue = async () => {
    if (hasAllergies === null) {
      Alert.alert('Hold on', 'Please select whether you have any food allergies.');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem('tempHasAllergies', JSON.stringify(hasAllergies));

      if (hasAllergies) {
        setLoading(false);
        router.push('/auth/allergies-preferences' as any);
        return;
      }

      await AsyncStorage.setItem('tempAllergiesSelection', JSON.stringify([]));
      await finalizeOnboarding({ hasAllergies: false, allergies: [] });
      router.replace('/welcome' as any);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert(
        'Unable to continue',
        error instanceof Error ? error.message : 'Something went wrong while creating your account.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/balance-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title and Subtitle */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Do you have any food allergies</Text>
            <Text style={styles.subtitle}>We will use this to calculate your daily calorie needs</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Yes Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                hasAllergies === true && styles.optionCardSelected,
              ]}
              onPress={() => setHasAllergies(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>Yes</Text>
              <Text style={styles.emoji}>👍</Text>
            </TouchableOpacity>

            {/* No Option */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                hasAllergies === false && styles.optionCardSelected,
              ]}
              onPress={() => setHasAllergies(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>No</Text>
              <Text style={styles.emoji}>👎</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <AuthButtonGreen title={loading ? "Please wait..." : "Continue"} onPress={handleContinue} disabled={loading} />
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
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
    fontSize: 13,
    color: '#6B7F75',
    lineHeight: 18,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardSelected: {
    borderColor: '#344225',
    backgroundColor: '#F0F7F4',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#344225',
  },
  emoji: {
    fontSize: 32,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
});
