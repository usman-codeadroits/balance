import AuthButtonGreen from '@/components/auth/auth-button-green';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const DEFAULT_WEIGHT_KG = 70;
const DEFAULT_HEIGHT_CM = 170;

export default function ProfileSetupScreen() {
  const [weight, setWeight] = useState(String(DEFAULT_WEIGHT_KG));
  const [height, setHeight] = useState(String(DEFAULT_HEIGHT_CM));
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!weight.trim()) {
      alert('Please enter your weight');
      return;
    }
    if (!height.trim()) {
      alert('Please enter your height');
      return;
    }
    if (isNaN(Number(weight)) || Number(weight) <= 0) {
      alert('Please enter a valid weight');
      return;
    }
    if (isNaN(Number(height)) || Number(height) <= 0) {
      alert('Please enter a valid height');
      return;
    }

    setLoading(true);

    try {
      await AsyncStorage.setItem('tempWeight', weight);
      await AsyncStorage.setItem('tempHeight', height);
      router.push('/auth/activity-level' as any);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          <Text style={styles.title}>Your Profile</Text>
        </View>

        {/* Weight Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Tell us your current weight</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setWeight((prev) => (Number(prev) - 1 > 0 ? String(Number(prev) - 1) : prev))}
              >
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="85"
                placeholderTextColor="#8B9D94"
              />
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setWeight((prev) => String(Number(prev || 0) + 1))}
              >
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.unitSelector}>
              <Text style={styles.unitText}>{weightUnit}</Text>
            </View>
          </View>
        </View>

        {/* Height Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>And your height?</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setHeight((prev) => (Number(prev) - 1 > 0 ? String(Number(prev) - 1) : prev))}
              >
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                placeholder="170"
                placeholderTextColor="#8B9D94"
              />
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => setHeight((prev) => String(Number(prev || 0) + 1))}
              >
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.unitSelector}>
              <Text style={styles.unitText}>{heightUnit}</Text>
            </View>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <AuthButtonGreen title={loading ? "Registering..." : "Continue"} onPress={handleContinue} disabled={loading} />
        </View>
      </KeyboardAvoidingView>
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
  },
  inputSection: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#344225',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    backgroundColor: '#344225',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#FAD979',
    fontSize: 20,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#344225',
    paddingVertical: 12,
  },
  unitSelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  unitText: {
    fontSize: 16,
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
