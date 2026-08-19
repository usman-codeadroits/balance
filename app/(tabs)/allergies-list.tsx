import { getAllergies, updateAllergies } from '@/api/services/allergies';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
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

const ALLERGIES_LIST = [
  { id: 'Milk', labelKey: 'milk', icon: 'water-outline' },
  { id: 'Tree Nuts', labelKey: 'tree_nuts', icon: 'leaf-outline' },
  { id: 'Eggs', labelKey: 'eggs', icon: 'ellipse-outline' },
  { id: 'Peanuts', labelKey: 'peanuts', icon: 'fitness-outline' },
  { id: 'Shellfish', labelKey: 'shellfish', icon: 'fish-outline' },
  { id: 'Soybeans', labelKey: 'soybeans', icon: 'nutrition-outline' },
  { id: 'Wheat', labelKey: 'wheat', icon: 'flower-outline' },
  { id: 'Fish', labelKey: 'fish', icon: 'fish-outline' },
  { id: 'Sesame', labelKey: 'sesame', icon: 'grid-outline' },
] as const;

const KNOWN_IDS = new Set(ALLERGIES_LIST.map((a) => a.id));

export default function AllergiesListScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const insets = useSafeAreaInsets();
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const otherInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadFromProfile();
  }, []);

  const loadFromProfile = async () => {
    try {
      const res = await getAllergies();
      if (res.success && res.data && Array.isArray(res.data.allergies)) {
        const normalized = res.data.allergies.flatMap((item: string) =>
          item === 'Wheat/Fish' ? ['Wheat', 'Fish'] : [item],
        );
        const known = normalized.filter((a) => KNOWN_IDS.has(a));
        const others = normalized.filter((a) => !KNOWN_IDS.has(a));
        setSelectedAllergies(Array.from(new Set(known)));
        if (others.length > 0) {
          setOtherSelected(true);
          setOtherText(others.join(', '));
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleAllergy = (id: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const toggleOther = () => {
    const next = !otherSelected;
    setOtherSelected(next);
    if (next) {
      setTimeout(() => otherInputRef.current?.focus(), 150);
    } else {
      setOtherText('');
    }
  };

  const totalSelected =
    selectedAllergies.length + (otherSelected && otherText.trim() ? 1 : 0);

  const handleUpdate = async () => {
    if (totalSelected === 0) {
      Alert.alert(t('allergies_list.select_at_least_one_title'), t('allergies_list.select_at_least_one_msg'));
      return;
    }

    if (otherSelected && !otherText.trim()) {
      Alert.alert(t('allergies_list.enter_allergy_title'), t('allergies_list.enter_allergy_msg'));
      return;
    }

    const allAllergies = [
      ...selectedAllergies,
      ...(otherSelected && otherText.trim()
        ? otherText
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : []),
    ];

    setSaving(true);
    try {
      await updateAllergies({ has_food_allergies: true, allergies: allAllergies });
      Alert.alert(t('allergies_list.updated_title'), t('allergies_list.updated_msg'), [
        { text: t('common.ok'), onPress: () => router.replace('/(tabs)/profile' as any) },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('allergies_list.save_error'));
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
        <Text style={styles.headerTitle}>{t('allergies_list.header_title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#344225" />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.description, isArabic && styles.rtlText]}>
              {t('allergies_list.description')}
            </Text>
            <Text style={[styles.selectionHint, isArabic && styles.rtlText]}>
              {totalSelected === 0 ? t('allergies_list.none_selected') : t('allergies_list.selected_count', { count: totalSelected })}
            </Text>

            <View style={styles.listContainer}>
              {ALLERGIES_LIST.map((allergy) => {
                const selected = selectedAllergies.includes(allergy.id);
                return (
                  <TouchableOpacity
                    key={allergy.id}
                    style={[styles.allergyItem, isArabic && styles.rtlRow, selected && styles.allergyItemSelected]}
                    onPress={() => toggleAllergy(allergy.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.itemIconWrap, selected && styles.itemIconWrapSelected]}>
                      <Ionicons
                        name={allergy.icon as any}
                        size={18}
                        color={selected ? '#FAD979' : '#344225'}
                      />
                    </View>
                    <Text style={[styles.allergyText, isArabic && styles.rtlText, selected && styles.allergyTextSelected]}>
                      {t(`allergies_list.${allergy.labelKey}`)}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color="#FAD979" style={isArabic ? styles.checkIconRTL : styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Other option */}
              <TouchableOpacity
                style={[styles.allergyItem, isArabic && styles.rtlRow, otherSelected && styles.allergyItemSelected]}
                onPress={toggleOther}
                activeOpacity={0.8}
              >
                <View style={[styles.itemIconWrap, otherSelected && styles.itemIconWrapSelected]}>
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={otherSelected ? '#FAD979' : '#344225'}
                  />
                </View>
                <Text style={[styles.allergyText, isArabic && styles.rtlText, otherSelected && styles.allergyTextSelected]}>
                  {t('allergies_list.other')}
                </Text>
                {otherSelected && (
                  <Ionicons name="checkmark-circle" size={20} color="#FAD979" style={isArabic ? styles.checkIconRTL : styles.checkIcon} />
                )}
              </TouchableOpacity>

              {/* Inline text input, shown only when Other is selected */}
              {otherSelected && (
                <View style={styles.otherInputWrap}>
                  <TextInput
                    ref={otherInputRef}
                    style={[styles.otherInput, isArabic && styles.rtlText]}
                    placeholder={t('allergies_list.other_placeholder')}
                    placeholderTextColor="#8AADA0"
                    value={otherText}
                    onChangeText={setOtherText}
                    returnKeyType="done"
                    maxLength={500}
                    textAlign={isArabic ? 'right' : 'left'}
                  />
                  <Text style={[styles.otherInputHint, isArabic && styles.rtlText]}>
                    {t('allergies_list.other_hint')}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
            <TouchableOpacity
              style={[styles.updateButton, saving && styles.updateButtonDisabled]}
              onPress={handleUpdate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#344225" />
              ) : (
                <Text style={styles.updateButtonText}>{t('allergies_list.save_allergies')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
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
  description: {
    fontSize: 14,
    color: '#6B7F75',
    lineHeight: 20,
    marginBottom: 8,
  },
  selectionHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#344225',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    gap: 10,
  },
  allergyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  allergyItemSelected: {
    backgroundColor: '#344225',
    borderColor: '#344225',
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  allergyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#344225',
    flex: 1,
  },
  allergyTextSelected: {
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  checkIconRTL: {
    marginRight: 'auto',
  },
  otherInputWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#344225',
  },
  otherInput: {
    fontSize: 14,
    color: '#344225',
    paddingVertical: 4,
  },
  otherInputHint: {
    fontSize: 11,
    color: '#9DB8AC',
    marginTop: 6,
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
  updateButton: {
    backgroundColor: '#FAD979',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#344225',
  },
});
