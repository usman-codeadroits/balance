import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SplashScreen() {
  const [showSecondScreen, setShowSecondScreen] = useState(false);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // After 5 seconds, show second screen with logo and button
    const timer = setTimeout(() => {
      setShowSecondScreen(true);
      
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 600,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 5000);

    return () => clearTimeout(timer);
  }, [logoOpacity, buttonOpacity]);

  const handleNext = () => {
    router.push('/auth');
  };

  // First screen - only "Balance" text
  if (!showSecondScreen) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Image
            source={require('@/assets/images/balance-text.png')}
            style={styles.balanceTextLarge}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }

  // Second screen - logo, "Balance" text, and Next button
  return (
    <View style={styles.container}>
      {/* Logo at top */}
      <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
        <Image
          source={require('@/assets/images/balance-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Balance text in center */}
      <View style={styles.centerContent}>
        <Image
          source={require('@/assets/images/balance-text.png')}
          style={styles.balanceText}
          resizeMode="contain"
        />
      </View>

      {/* Next button at bottom */}
      <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAD979',
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 60,
    height: 60,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceTextLarge: {
    width: 220,
    height: 70,
  },
  balanceText: {
    width: 180,
    height: 50,
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: '#344225',
    paddingVertical: 16,
    paddingHorizontal: 120,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FAD979',
    fontSize: 16,
    fontWeight: '600',
  },
});
