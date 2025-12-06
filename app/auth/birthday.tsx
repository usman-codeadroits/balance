import AuthButtonGreen from '@/components/auth/auth-button-green';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= 1900; i--) {
    years.push(i);
  }
  return years;
};

const generateDays = (month: number, year: number) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
};

export default function BirthdayScreen() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(2000);

  const years = generateYears();
  const days = generateDays(selectedMonth, selectedYear);

  const handleContinue = async () => {
    if (!selectedDay) {
      alert('Please select your birthday');
      return;
    }
    
    // Store birthday temporarily
    const birthdayString = `${selectedDay}/${months[selectedMonth]}/${selectedYear}`;
    await AsyncStorage.setItem('tempBirthday', birthdayString);
    
    // Navigate to gender screen
    router.push('/auth/gender');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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
          <Text style={styles.title}>When is your birthday?</Text>
        </View>

        {/* Birthday Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={
              selectedDay
                ? `${selectedDay}/${months[selectedMonth]}/${selectedYear}`
                : ''
            }
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#8B9D94"
            editable={false}
          />
        </View>

        {/* Date Picker */}
        <View style={styles.pickerSection}>
          <ScrollView
            style={styles.pickerColumn}
            showsVerticalScrollIndicator={false}
          >
            {days.map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.pickerItem,
                  selectedDay === day && styles.pickerItemSelected,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    selectedDay === day && styles.pickerTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.pickerColumn}
            showsVerticalScrollIndicator={false}
          >
            {months.map((month, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pickerItem,
                  selectedMonth === index && styles.pickerItemSelected,
                ]}
                onPress={() => setSelectedMonth(index)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    selectedMonth === index && styles.pickerTextSelected,
                  ]}
                >
                  {month}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            style={styles.pickerColumn}
            showsVerticalScrollIndicator={false}
          >
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.pickerItem,
                  selectedYear === year && styles.pickerItemSelected,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    selectedYear === year && styles.pickerTextSelected,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Section */}
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
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#344225',
  },
  pickerSection: {
    flexDirection: 'row',
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  pickerItem: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  pickerItemSelected: {
    backgroundColor: '#FAD979',
  },
  pickerText: {
    fontSize: 14,
    color: '#6B7F75',
  },
  pickerTextSelected: {
    color: '#344225',
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 30,
  },
});
