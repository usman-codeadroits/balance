import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthButtonGreen from '@/components/auth/auth-button-green';

const proteinOptions = [
  { value: '290', label: '290 g', percentage: '35 %' },
  { value: '295', label: '295 g', percentage: '36 %' },
  { value: '300', label: '300 g', percentage: '36 %' },
  { value: '305', label: '305 g', percentage: '37 %' },
  { value: '310', label: '310 g', percentage: '38 %' },
  { value: '315', label: '315 g', percentage: '38 %' },
  { value: '320', label: '320 g', percentage: '39 %' },
  { value: '325', label: '325 g', percentage: '38 %' },
  { value: '330', label: '330 g', percentage: '40 %' },
];

const carbsOptions = [
  { value: '250', label: '250 g', percentage: '30 %' },
  { value: '255', label: '255 g', percentage: '31 %' },
  { value: '260', label: '260 g', percentage: '32 %' },
  { value: '265', label: '265 g', percentage: '33 %' },
  { value: '270', label: '270 g', percentage: '34 %' },
  { value: '275', label: '275 g', percentage: '33 %' },
  { value: '280', label: '280 g', percentage: '34 %' },
  { value: '285', label: '285 g', percentage: '35 %' },
  { value: '290', label: '290 g', percentage: '36 %' },
  { value: '295', label: '295 g', percentage: '37 %' },
  { value: '300', label: '300 g', percentage: '38 %' },
  { value: '305', label: '305 g', percentage: '38 %' },
];

export default function BuildPlanScreen() {
  const [selectedProtein, setSelectedProtein] = useState<string | null>(null);
  const [selectedCarbs, setSelectedCarbs] = useState<string | null>(null);
  const [showProteinDropdown, setShowProteinDropdown] = useState(false);
  const [showCarbsDropdown, setShowCarbsDropdown] = useState(false);

  const handleContinue = async () => {
    if (!selectedProtein || !selectedCarbs) {
      alert('Please select both protein and carbs');
      return;
    }

    try {
      // Save personalized plan selection
      await AsyncStorage.setItem('hasPersonalizedPlan', 'true');
      await AsyncStorage.setItem('personalizedProtein', selectedProtein);
      await AsyncStorage.setItem('personalizedCarbs', selectedCarbs);
      
      // Return to subscription screen to select meals per day
      router.back();
    } catch (error) {
      console.error('Error saving personalized plan:', error);
      alert('Failed to save plan. Please try again.');
    }
  };

  const getProteinLabel = () => {
    const option = proteinOptions.find(opt => opt.value === selectedProtein);
    return option ? option.label : 'Select your Protein';
  };

  const getCarbsLabel = () => {
    const option = carbsOptions.find(opt => opt.value === selectedCarbs);
    return option ? option.label : 'Select your Carbs';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Your plan, your rules</Text>
            <Text style={styles.subtitle}>You need 1 meal & 1 snack to match your macros</Text>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Select Protein Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select your Protein</Text>
            <Text style={styles.sectionDescription}>
              Protein helps with muscle growth and recovery, select the target that suits you
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setShowProteinDropdown(!showProteinDropdown);
                setShowCarbsDropdown(false);
              }}
            >
              <Text style={[styles.dropdownText, !selectedProtein && styles.dropdownPlaceholder]}>
                {getProteinLabel()}
              </Text>
              <Ionicons 
                name={showProteinDropdown ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#344225" 
              />
            </TouchableOpacity>
            {showProteinDropdown && (
              <View style={styles.dropdownCard}>
                {proteinOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownRow,
                      selectedProtein === option.value && styles.dropdownRowSelected,
                      index === proteinOptions.length - 1 && styles.dropdownRowLast,
                    ]}
                    onPress={() => {
                      setSelectedProtein(option.value);
                      setShowProteinDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownRowText,
                      selectedProtein === option.value && styles.dropdownRowTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.dropdownRowText,
                      styles.dropdownRowPercentage,
                      selectedProtein === option.value && styles.dropdownRowTextSelected,
                    ]}>
                      {option.percentage}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Select Carbs Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select your Carbs</Text>
            <Text style={styles.sectionDescription}>
              Carbs are necessary for energy and workout fuel, select your daily target
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => {
                setShowCarbsDropdown(!showCarbsDropdown);
                setShowProteinDropdown(false);
              }}
            >
              <Text style={[styles.dropdownText, !selectedCarbs && styles.dropdownPlaceholder]}>
                {getCarbsLabel()}
              </Text>
              <Ionicons 
                name={showCarbsDropdown ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#344225" 
              />
            </TouchableOpacity>
            {showCarbsDropdown && (
              <View style={styles.dropdownCard}>
                {carbsOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownRow,
                      selectedCarbs === option.value && styles.dropdownRowSelected,
                      index === carbsOptions.length - 1 && styles.dropdownRowLast,
                    ]}
                    onPress={() => {
                      setSelectedCarbs(option.value);
                      setShowCarbsDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownRowText,
                      selectedCarbs === option.value && styles.dropdownRowTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.dropdownRowText,
                      styles.dropdownRowPercentage,
                      selectedCarbs === option.value && styles.dropdownRowTextSelected,
                    ]}>
                      {option.percentage}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.noteText}>Note: Estimated Carbs</Text>
          </View>
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={styles.bottomSection}>
          <AuthButtonGreen title="Continue" onPress={handleContinue} />
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
  headerSection: {
    paddingHorizontal: '5%',
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#344225',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7F75',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: '5%',
    paddingBottom: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7F75',
    marginBottom: 16,
    lineHeight: 20,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B8D5C5',
  },
  dropdownText: {
    fontSize: 14,
    color: '#344225',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: '#6B7F75',
    fontWeight: '400',
  },
  dropdownCard: {
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D0D0D0',
  },
  dropdownRowLast: {
    borderBottomWidth: 0,
  },
  dropdownRowSelected: {
    backgroundColor: '#D4E8E0',
  },
  dropdownRowText: {
    fontSize: 14,
    color: '#4A4A4A',
    fontWeight: '400',
  },
  dropdownRowPercentage: {
    textAlign: 'right',
  },
  dropdownRowTextSelected: {
    fontWeight: '600',
    color: '#344225',
  },
  noteText: {
    fontSize: 12,
    color: '#6B7F75',
    marginTop: 8,
    fontStyle: 'italic',
  },
  bottomSection: {
    paddingHorizontal: '5%',
    paddingBottom: 30,
  },
});
