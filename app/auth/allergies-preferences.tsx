import { finalizeOnboarding } from '@/app/auth/utils/finalize-onboarding';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DEFAULT_ALLERGIES = [
  'Milk',
  'Tree Nuts',
  'Eggs',
  'Peanuts',
  'Shellfish',
  'Soybeans',
  'Wheat/Fish',
  'Sesame',
];

export default function AllergiesPreferencesScreen() {
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSelections = async () => {
      const stored = await AsyncStorage.getItem('tempAllergiesSelection');
      if (stored) {
        try {
          setSelectedAllergies(JSON.parse(stored));
        } catch {
          setSelectedAllergies([]);
        }
      }
    };
    loadSelections();
  }, []);

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(item => item !== allergy)
        : [...prev, allergy]
    );
  };

  const handleUpdate = async () => {
    if (!selectedAllergies.length) {
      Alert.alert('Almost there', 'Please select at least one allergy or go back if you have none.');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem('tempAllergiesSelection', JSON.stringify(selectedAllergies));
      await AsyncStorage.setItem('userAllergies', JSON.stringify(selectedAllergies));
      await finalizeOnboarding({ hasAllergies: true, allergies: selectedAllergies });
      router.replace('/welcome' as any);
    } catch (error) {
      console.error('Error saving allergies:', error);
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Allergies</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.description}>Let us know about your allergies</Text>
          <Text style={styles.subtitle}>Select one or more allergies</Text>

          <View style={styles.allergiesContainer}>
            {DEFAULT_ALLERGIES.map(allergy => (
              <TouchableOpacity
                key={allergy}
                style={[
                  styles.allergyItem,
                  selectedAllergies.includes(allergy) && styles.allergyItemSelected,
                ]}
                onPress={() => toggleAllergy(allergy)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.allergyText,
                    selectedAllergies.includes(allergy) && styles.allergyTextSelected,
                  ]}
                >
                  {allergy}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.updateButton, loading && styles.updateButtonDisabled]} onPress={handleUpdate} disabled={loading}>
            <Text style={styles.updateButtonText}>{loading ? 'Saving...' : 'Continue'}</Text>
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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#344225',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#344225',
  },
  placeholder: {
    width: 36,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  description: {
    fontSize: 14,
    color: '#344225',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#344225',
    marginBottom: 24,
  },
  allergiesContainer: {
    gap: 12,
  },
  allergyItem: {
    backgroundColor: '#E8F0ED',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  allergyItemSelected: {
    backgroundColor: '#344225',
    borderColor: '#344225',
  },
  allergyText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#344225',
  },
  allergyTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D4E8E0',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  updateButton: {
    backgroundColor: '#344225',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

