import { getDislikes, updateDislikes } from '@/api/services/dislikes';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DislikesInputScreen() {
  const insets = useSafeAreaInsets();
  const [dislikesText, setDislikesText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, []);

  const loadFromStorage = async () => {
    try {
      const res = await getDislikes();
      if (res.success && res.data && res.data.dislikes.length > 0) {
        setDislikesText(res.data.dislikes.join(', '));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!dislikesText.trim()) {
      Alert.alert('Empty', 'Please enter at least one food or ingredient you dislike, or go back and choose "No".');
      return;
    }
    setSaving(true);
    try {
      const dislikesArray = dislikesText
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      await updateDislikes(dislikesArray);
      Alert.alert('Saved', 'Your dislikes have been saved.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/profile' as any) },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save dislikes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Dislikes</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#344225" />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="information-circle-outline" size={22} color="#344225" />
              </View>
              <Text style={styles.infoText}>
                Enter foods, ingredients, or cuisines you prefer to avoid. You can type anything — e.g. "spicy food, coriander, lamb, sushi".
              </Text>
            </View>

            <Text style={styles.fieldLabel}>What do you dislike?</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. spicy food, coriander, mushrooms, lamb, raw onion..."
              placeholderTextColor="#8AADA0"
              value={dislikesText}
              onChangeText={setDislikesText}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{dislikesText.length}/1000</Text>

            <View style={styles.examplesSection}>
              <Text style={styles.examplesTitle}>Examples</Text>
              <View style={styles.examplesRow}>
                {['Spicy food', 'Coriander', 'Mushrooms', 'Raw onion', 'Lamb', 'Sushi'].map((ex) => (
                  <TouchableOpacity
                    key={ex}
                    style={styles.exampleChip}
                    onPress={() => {
                      const current = dislikesText.trim();
                      const already = current.toLowerCase().includes(ex.toLowerCase());
                      if (!already) {
                        setDislikesText(current ? `${current}, ${ex}` : ex);
                      }
                    }}
                  >
                    <Ionicons name="add" size={13} color="#344225" />
                    <Text style={styles.exampleChipText}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#344225" />
              ) : (
                <Text style={styles.saveButtonText}>Save Dislikes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8E0',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  infoIconWrap: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#5A7C65',
    lineHeight: 19,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B8F7A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    backgroundColor: '#C8DDD6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#344225',
    minHeight: 160,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: '#9DB8AC',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 24,
  },
  examplesSection: {
    marginBottom: 8,
  },
  examplesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B8F7A',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  examplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#C8DDD6',
  },
  exampleChipText: {
    fontSize: 13,
    color: '#344225',
    fontWeight: '500',
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
  saveButton: {
    backgroundColor: '#FAD979',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#344225',
  },
});
