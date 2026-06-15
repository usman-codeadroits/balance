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

export default function TermsAndConditionsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Please read these Terms and Conditions carefully before using Balance. These terms govern your use of our meal plan subscription service, app, and all related features.
        </Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.body}>
          By downloading, installing, or using the Balance application, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the app. We reserve the right to modify these terms at any time, and continued use of the app constitutes acceptance of any changes.
        </Text>

        <Text style={styles.sectionTitle}>2. Eligibility</Text>
        <Text style={styles.body}>
          You must be at least 16 years of age to use Balance. By using our services, you confirm that you meet this age requirement. Users under 18 must have parental or guardian consent. We reserve the right to suspend or terminate accounts that do not meet eligibility requirements.
        </Text>

        <Text style={styles.sectionTitle}>3. Subscription & Payments</Text>
        <Text style={styles.body}>
          Balance offers meal plan subscriptions billed on a recurring basis. By subscribing, you authorise us to charge your selected payment method for the applicable subscription fee. Subscription fees are non-refundable except as required by law or as explicitly stated in our refund policy. Auto-renewal is enabled by default and can be cancelled before the next billing cycle.
        </Text>

        <Text style={styles.sectionTitle}>4. Meal Plans & Delivery</Text>
        <Text style={styles.body}>
          Meal plans are prepared fresh and delivered according to the schedule you select. Delivery times are estimates and may vary due to circumstances beyond our control. It is your responsibility to ensure someone is available at the delivery address or that a safe delivery arrangement is in place. We are not liable for spoilage of meals left unattended for extended periods.
        </Text>

        <Text style={styles.sectionTitle}>5. Allergies & Dietary Information</Text>
        <Text style={styles.body}>
          You are responsible for accurately providing your allergy and dietary preference information. While we take every precaution, our kitchen handles common allergens including milk, eggs, wheat, nuts, shellfish, soy, fish, and sesame. We cannot guarantee a completely allergen-free environment. If you have severe or life-threatening allergies, please consult a medical professional before using our service.
        </Text>

        <Text style={styles.sectionTitle}>6. Meal Modifications & Pauses</Text>
        <Text style={styles.body}>
          You may pause your subscription or request delivery changes subject to our cut-off times. Requests made after the daily cut-off time will be processed for the following applicable delivery day. We reserve the right to substitute ingredients of equal or greater quality when the originally planned ingredient is unavailable.
        </Text>

        <Text style={styles.sectionTitle}>7. Cancellation Policy</Text>
        <Text style={styles.body}>
          You may cancel your subscription at any time. Cancellations take effect at the end of the current billing period. No partial refunds are given for unused days within a billing period unless you cancel within 24 hours of the initial subscription purchase. To cancel, contact us via the app or WhatsApp support.
        </Text>

        <Text style={styles.sectionTitle}>8. User Conduct</Text>
        <Text style={styles.body}>
          You agree not to:{'\n\n'}
          • Use the app for any unlawful purpose{'\n'}
          • Attempt to gain unauthorised access to our systems{'\n'}
          • Provide false or misleading information{'\n'}
          • Harass, abuse, or harm other users or staff{'\n'}
          • Reverse engineer or attempt to extract source code from the app{'\n\n'}
          Violation of these rules may result in immediate account termination.
        </Text>

        <Text style={styles.sectionTitle}>9. Intellectual Property</Text>
        <Text style={styles.body}>
          All content in the Balance app, including but not limited to recipes, images, text, logos, and software, is the exclusive property of Balance and protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
        </Text>

        <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
        <Text style={styles.body}>
          To the maximum extent permitted by law, Balance shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability to you for any claim shall not exceed the amount you paid us in the three months preceding the claim.
        </Text>

        <Text style={styles.sectionTitle}>11. Health Disclaimer</Text>
        <Text style={styles.body}>
          Balance is a food delivery and meal planning service and is not a medical service. The nutritional information provided is for guidance only and is not a substitute for professional medical or nutritional advice. Consult a qualified healthcare provider before making significant dietary changes, especially if you have a medical condition.
        </Text>

        <Text style={styles.sectionTitle}>12. Governing Law</Text>
        <Text style={styles.body}>
          These Terms and Conditions are governed by and construed in accordance with the laws of Pakistan. Any dispute arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Pakistan.
        </Text>

        <Text style={styles.sectionTitle}>13. Contact</Text>
        <Text style={styles.body}>
          For questions about these Terms and Conditions, please contact us via WhatsApp at +965 9001 2820 or use the Contact Us section in the app.
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
