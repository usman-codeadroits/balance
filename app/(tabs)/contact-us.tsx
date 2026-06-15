import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WHATSAPP_NUMBER = '96595516810';

export default function ContactUsScreen() {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSendMessage = async () => {
    if (!fullName.trim() || !subject.trim() || !message.trim()) {
      Alert.alert('Missing information', 'Please fill in all fields');
      return;
    }

    const text = `Name: ${fullName.trim()}\nSubject: ${subject.trim()}\n\n${message.trim()}`;
    const encoded = encodeURIComponent(text);
    const url = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;
    const fallback = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;

    const supported = await Linking.canOpenURL(url);
    try {
      await Linking.openURL(supported ? url : fallback);
    } catch {
      Alert.alert('WhatsApp not found', 'Please install WhatsApp or contact us directly at +965 9551 6810');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* WhatsApp info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>WhatsApp Support</Text>
            <Text style={styles.infoSubtitle}>+965 9001 2820</Text>
            <Text style={styles.infoHint}>Fill the form below to send us a message directly on WhatsApp</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.formLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor="#8AADA0"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.formLabel}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="What is this about?"
          placeholderTextColor="#8AADA0"
          value={subject}
          onChangeText={setSubject}
        />

        <Text style={styles.formLabel}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Write your message here..."
          placeholderTextColor="#8AADA0"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
          <Text style={styles.sendButtonText}>Send via WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8E0',
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 20,
  },
  infoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#344225',
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25D366',
    marginBottom: 4,
  },
  infoHint: {
    fontSize: 12,
    color: '#6B7F75',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#C8DDD6',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B8F7A',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#C8DDD6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 14,
    color: '#344225',
    marginBottom: 16,
  },
  textArea: {
    height: 140,
    paddingTop: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#D4E8E0',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sendButton: {
    backgroundColor: '#344225',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
