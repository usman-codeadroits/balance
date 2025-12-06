import AuthButtonGreen from '@/components/auth/auth-button-green';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ActivityLevel = 'sedentary' | 'lightly-active' | 'very-active' | 'highly-active' | null;

const activityLevels = [
  { 
    id: 'sedentary' as ActivityLevel, 
    title: 'Sedentary', 
    subtitle: 'You spend most of the day sitting (e.g. desk job, little to no exercise)' 
  },
  { 
    id: 'lightly-active' as ActivityLevel, 
    title: 'Lightly Active', 
    subtitle: 'You spend a good part of the day on your feet (e.g. teacher, salesperson)' 
  },
  { 
    id: 'very-active' as ActivityLevel, 
    title: 'Very active', 
    subtitle: 'You spend most of the day do you (normally strenuous) activity' 
  },
  { 
    id: 'highly-active' as ActivityLevel, 
    title: 'Highly active', 
    subtitle: 'Physically demanding job or intense exercise or (e.g. construction work, fitness trainer)' 
  },
];

export default function ActivityLevelScreen() {
  const [selectedLevel, setSelectedLevel] = useState<ActivityLevel>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLevel = async () => {
      const storedLevel = await AsyncStorage.getItem('tempActivityLevel');
      if (storedLevel) {
        setSelectedLevel(storedLevel as ActivityLevel);
      }
    };
    loadLevel();
  }, []);

  const handleContinue = async () => {
    if (!selectedLevel) {
      alert('Please select your activity level');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem('tempActivityLevel', selectedLevel);
      router.push('/auth/allergies' as any);
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

          {/* Title */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>How active are you?</Text>
          </View>

          {/* Activity Level Options */}
          <View style={styles.optionsContainer}>
            {activityLevels.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.optionCard,
                  selectedLevel === level.id && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedLevel(level.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{level.title}</Text>
                  <Text style={styles.optionSubtitle}>{level.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

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
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#344225',
    backgroundColor: '#F0F7F4',
  },
  optionContent: {
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#344225',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6B7F75',
    lineHeight: 18,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
});
