import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AllergiesListScreen() {
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [allergiesList, setAllergiesList] = useState<string[]>([
    'Milk',
    'Tree Nuts',
    'Eggs',
    'Peanuts',
    'Shellfish',
    'Soybeans',
    'Wheat/Fish',
    'Sesame',
  ]);

  useEffect(() => {
    loadAllergies();
  }, []);

  const loadAllergies = async () => {
    try {
      const stored = await AsyncStorage.getItem('userAllergies');
      if (stored) {
        setSelectedAllergies(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading allergies:', error);
    }
  };

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies(prev => {
      if (prev.includes(allergy)) {
        return prev.filter(a => a !== allergy);
      } else {
        return [...prev, allergy];
      }
    });
  };

  const handleUpdate = async () => {
    try {
      await AsyncStorage.setItem('userAllergies', JSON.stringify(selectedAllergies));
      router.back();
    } catch (error) {
      console.error('Error saving allergies:', error);
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
          <Text style={styles.headerTitle}>Allergies</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Description */}
          <Text style={styles.description}>
            Let us know about your allergies
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>Select one or more allergies</Text>

          {/* Allergies List */}
          <View style={styles.allergiesContainer}>
            {allergiesList.map((allergy, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.allergyItem,
                  selectedAllergies.includes(allergy) && styles.allergyItemSelected
                ]}
                onPress={() => toggleAllergy(allergy)}
              >
                <Text style={[
                  styles.allergyText,
                  selectedAllergies.includes(allergy) && styles.allergyTextSelected
                ]}>
                  {allergy}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#344225',
    lineHeight: 20,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#344225',
    marginBottom: 16,
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
});
