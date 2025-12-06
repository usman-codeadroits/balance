import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChangeLanguageScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'arabic'>('english');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem('appLanguage');
      if (stored) {
        setSelectedLanguage(stored as 'english' | 'arabic');
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const handleLanguageSelect = async (language: 'english' | 'arabic') => {
    try {
      setSelectedLanguage(language);
      await AsyncStorage.setItem('appLanguage', language);
    } catch (error) {
      console.error('Error saving language:', error);
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
          <Text style={styles.headerTitle}>Change Language</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.languageIcon}>
              <View style={[styles.iconPart, styles.iconPartTop]} />
              <View style={[styles.iconPart, styles.iconPartBottom]} />
            </View>
          </View>

          {/* Language Options */}
          <TouchableOpacity
            style={[
              styles.languageButton,
              selectedLanguage === 'english' && styles.languageButtonActive
            ]}
            onPress={() => handleLanguageSelect('english')}
          >
            <Text style={[
              styles.languageButtonText,
              selectedLanguage === 'english' && styles.languageButtonTextActive
            ]}>
              English
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageButton,
              selectedLanguage === 'arabic' && styles.languageButtonActive
            ]}
            onPress={() => handleLanguageSelect('arabic')}
          >
            <Text style={[
              styles.languageButtonText,
              selectedLanguage === 'arabic' && styles.languageButtonTextActive
            ]}>
              العربية
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  languageIcon: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPart: {
    width: 60,
    height: 30,
    backgroundColor: '#344225',
    position: 'absolute',
  },
  iconPartTop: {
    top: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    transform: [{ rotate: '15deg' }],
  },
  iconPartBottom: {
    bottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    transform: [{ rotate: '-15deg' }],
  },
  languageButton: {
    backgroundColor: '#E8F0ED',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  languageButtonActive: {
    backgroundColor: '#344225',
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#344225',
  },
  languageButtonTextActive: {
    color: '#FFFFFF',
  },
});
