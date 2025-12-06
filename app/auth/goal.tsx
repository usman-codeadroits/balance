import AuthButtonGreen from '@/components/auth/auth-button-green';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Goal = 'eat-healthy' | 'lose-weight' | 'gain-weight' | 'build-muscle' | 'maintain-weight' | null;

const goals = [
  { id: 'eat-healthy' as Goal, title: 'Eat healthy', subtitle: 'Want to intake healthier diet' },
  { id: 'lose-weight' as Goal, title: 'Lose weight', subtitle: 'Want to shed fat, get fit and feel great' },
  { id: 'gain-weight' as Goal, title: 'Gain Weight', subtitle: 'Want to gain weight in healthy manner' },
  { id: 'build-muscle' as Goal, title: 'Build Muscle', subtitle: 'Your strength, we&apos;re here helping for gains' },
  { id: 'maintain-weight' as Goal, title: 'Maintain Weight', subtitle: 'Stay fit, stay fabulous, own your wellness' },
];

export default function GoalScreen() {
  const [selectedGoal, setSelectedGoal] = useState<Goal>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadGoal = async () => {
      const storedGoal = await AsyncStorage.getItem('tempGoal');
      if (storedGoal) {
        setSelectedGoal(storedGoal as Goal);
      }
    };
    loadGoal();
  }, []);

  const handleContinue = async () => {
    if (!selectedGoal) {
      alert('Please select your goal');
      return;
    }

    setLoading(true);
    try {
      await AsyncStorage.setItem('tempGoal', selectedGoal);
      router.push('/auth/profile-setup');
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
            <Text style={styles.title}>What&apos;s your goal?</Text>
          </View>

          {/* Goal Options */}
          <View style={styles.optionsContainer}>
            {goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.optionCard,
                  selectedGoal === goal.id && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedGoal(goal.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{goal.title}</Text>
                  <Text style={styles.optionSubtitle}>{goal.subtitle}</Text>
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
