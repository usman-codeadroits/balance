import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          At Balance, we are committed to protecting your personal information. This policy explains what data we collect, why we collect it, and how we keep it safe.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.body}>
          We collect personal information you provide when creating an account, including your name, email address, phone number, date of birth, gender, height, and weight. We also collect health-related preferences such as dietary goals, activity level, food allergies, and food dislikes to personalise your meal plan.
        </Text>

        <Text style={styles.sectionTitle}>2. Food & Dietary Data</Text>
        <Text style={styles.body}>
          Your food allergies, dietary preferences, dislikes, and nutritional goals are stored securely and used solely to customise your meal plans. We never sell or share this sensitive health data with third parties. You may update or delete this information at any time from your profile settings.
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Data</Text>
        <Text style={styles.body}>
          Your personal and dietary data is used to:{'\n\n'}
          • Build and personalise your meal plan{'\n'}
          • Process your subscription and orders{'\n'}
          • Send you delivery and order notifications{'\n'}
          • Improve our services and recommendation accuracy{'\n'}
          • Respond to your support requests
        </Text>

        <Text style={styles.sectionTitle}>4. Data Storage & Security</Text>
        <Text style={styles.body}>
          All personal data is stored on secure, encrypted servers. We implement industry-standard security practices including SSL/TLS encryption for data in transit and AES-256 encryption for data at rest. Access to your data is restricted to authorised personnel only.
        </Text>

        <Text style={styles.sectionTitle}>5. Sharing of Information</Text>
        <Text style={styles.body}>
          We do not sell, trade, or transfer your personal information to outside parties except as necessary to operate our service (e.g. delivery partners receiving your delivery address). Any third party we work with is contractually bound to keep your information confidential.
        </Text>

        <Text style={styles.sectionTitle}>6. Cookies & Analytics</Text>
        <Text style={styles.body}>
          We may use analytics tools to understand how users interact with our app. These tools collect anonymised usage data and do not identify you personally. You can opt out of analytics tracking in your device settings.
        </Text>

        <Text style={styles.sectionTitle}>7. Your Rights</Text>
        <Text style={styles.body}>
          You have the right to:{'\n\n'}
          • Access the personal data we hold about you{'\n'}
          • Request correction of inaccurate data{'\n'}
          • Request deletion of your data{'\n'}
          • Withdraw consent for data processing{'\n'}
          • Lodge a complaint with a data protection authority{'\n\n'}
          To exercise any of these rights, please contact us via the Contact Us page.
        </Text>

        <Text style={styles.sectionTitle}>8. Data Retention</Text>
        <Text style={styles.body}>
          We retain your personal data for as long as your account is active or as needed to provide our services. If you close your account, we will delete your personal data within 30 days, except where we are legally required to retain it.
        </Text>

        <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
        <Text style={styles.body}>
          Our service is not directed to individuals under the age of 16. We do not knowingly collect personal data from children. If you believe we have inadvertently collected information from a child, please contact us immediately.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.body}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes via the app or by email. Continued use of the app after changes constitutes acceptance of the revised policy.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.body}>
          If you have any questions or concerns about this Privacy Policy or how we handle your data, please reach out to us via WhatsApp at +965 9001 2820 or through the Contact Us page in the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    fontWeight: '700',
    color: '#344225',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  intro: {
    fontSize: 14,
    color: '#4A6040',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 8,
    marginTop: 8,
  },
  body: {
    fontSize: 14,
    color: '#5A7C65',
    lineHeight: 22,
    marginBottom: 20,
  },
});
