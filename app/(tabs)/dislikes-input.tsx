import { getDislikes, updateDislikes } from '@/api/services/dislikes';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const EXAMPLES = [
  'example_spicy_food',
  'example_coriander',
  'example_mushrooms',
  'example_raw_onion',
  'example_lamb',
  'example_sushi',
] as const;

export default function DislikesInputScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
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
      Alert.alert(t('dislikes_input.empty_title'), t('dislikes_input.empty_msg'));
      return;
    }
    setSaving(true);
    try {
      const dislikesArray = dislikesText
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      await updateDislikes(dislikesArray);
      Alert.alert(t('dislikes_input.saved_title'), t('dislikes_input.saved_msg'), [
        { text: t('common.ok'), onPress: () => router.replace('/(tabs)/profile' as any) },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('dislikes_input.save_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isArabic && styles.rtlRow, { paddingTop: Platform.OS === 'ios' ? 6 : Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <Ionicons name={isArabic ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dislikes_input.header_title')}</Text>
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
            <View style={[styles.infoCard, isArabic && styles.rtlRow]}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="information-circle-outline" size={22} color="#344225" />
              </View>
              <Text style={[styles.infoText, isArabic && styles.rtlText]}>
                {t('dislikes_input.info_text')}
              </Text>
            </View>

            <Text style={[styles.fieldLabel, isArabic && styles.rtlText]}>{t('dislikes_input.field_label')}</Text>
            <TextInput
              style={[styles.textArea, isArabic && styles.rtlText]}
              placeholder={t('dislikes_input.placeholder')}
              placeholderTextColor="#8AADA0"
              value={dislikesText}
              onChangeText={setDislikesText}
              multiline
              textAlignVertical="top"
              maxLength={1000}
              textAlign={isArabic ? 'right' : 'left'}
            />
            <Text style={[styles.charCount, isArabic && { textAlign: 'left' }]}>{dislikesText.length}/1000</Text>

            <View style={styles.examplesSection}>
              <Text style={[styles.examplesTitle, isArabic && styles.rtlText]}>{t('dislikes_input.examples_title')}</Text>
              <View style={[styles.examplesRow, isArabic && styles.rtlRow]}>
                {EXAMPLES.map((exKey) => {
                  const ex = t(`dislikes_input.${exKey}`);
                  return (
                    <TouchableOpacity
                      key={exKey}
                      style={[styles.exampleChip, isArabic && styles.rtlRow]}
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
                  );
                })}
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
                <Text style={styles.saveButtonText}>{t('dislikes_input.save_dislikes')}</Text>
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
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
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
