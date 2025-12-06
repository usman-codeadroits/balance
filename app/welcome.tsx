import AuthButton from '@/components/auth/auth-button';
import { router } from 'expo-router';
import React from 'react';
import { Image, ImageBackground, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

const WelcomeScreen = () => {
  const handleNext = () => {
    router.replace('/(tabs)/');
  };

  return (
    <ImageBackground
      source={require('@/assets/images/meal.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Image
            source={require('@/assets/images/authlogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.textContainer}>
            <Text style={styles.welcome}>Welcome to</Text>
            <Text style={styles.brand}>Balance</Text>
            <Text style={styles.subtitle}>
              You&apos;re all set! Tap below to explore personalized meals, plans, and more.
            </Text>
          </View>
        </View>

        <View style={styles.buttonWrapper}>
          <AuthButton title="Next" onPress={handleNext} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 32,
  },
  textContainer: {
    alignItems: 'center',
    gap: 6,
  },
  welcome: {
    fontSize: 20,
    color: '#FAD979',
    fontWeight: '600',
  },
  brand: {
    fontSize: 34,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    color: '#E6F0EB',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
});

export default WelcomeScreen;


