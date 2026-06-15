import { getAllergies, updateAllergies } from '@/api/services/allergies';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  { id: 'Milk', label: 'Milk', icon: 'water-outline' },
  { id: 'Tree Nuts', label: 'Tree Nuts', icon: 'leaf-outline' },
  { id: 'Eggs', label: 'Eggs', icon: 'ellipse-outline' },
  { id: 'Peanuts', label: 'Peanuts', icon: 'fitness-outline' },
  { id: 'Shellfish', label: 'Shellfish', icon: 'fish-outline' },
  { id: 'Soybeans', label: 'Soybeans', icon: 'nutrition-outline' },
  { id: 'Wheat', label: 'Wheat', icon: 'flower-outline' },
  { id: 'Fish', label: 'Fish', icon: 'fish-outline' },
  { id: 'Sesame', label: 'Sesame', icon: 'grid-outline' },
] as const;

const KNOWN_IDS = new Set(ALLERGIES_LIST.map((a) => a.id));

export default function AllergiesListScreen() {
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
      Alert.alert('Select at least one', 'Please select at least one allergy, or go back and choose "No".');
      return;
    }

    if (otherSelected && !otherText.trim()) {
      Alert.alert('Enter your allergy', 'Please type your allergy in the "Other" field, or deselect it.');
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
      Alert.alert('Updated', 'Your allergies have been saved.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/profile' as any) },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save allergies. Please try again.');
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
        <Text style={styles.headerTitle}>Select Allergies</Text>
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
            <Text style={styles.description}>
              Select all foods you are allergic to. We will make sure your meals are free of these ingredients.
            </Text>
            <Text style={styles.selectionHint}>
              {totalSelected === 0 ? 'No allergies selected' : `${totalSelected} selected`}
            </Text>

            <View style={styles.listContainer}>
              {ALLERGIES_LIST.map((allergy) => {
                const selected = selectedAllergies.includes(allergy.id);
                return (
                  <TouchableOpacity
                    key={allergy.id}
                    style={[styles.allergyItem, selected && styles.allergyItemSelected]}
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
                    <Text style={[styles.allergyText, selected && styles.allergyTextSelected]}>
                      {allergy.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color="#FAD979" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Other option */}
              <TouchableOpacity
                style={[styles.allergyItem, otherSelected && styles.allergyItemSelected]}
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
                <Text style={[styles.allergyText, otherSelected && styles.allergyTextSelected]}>
                  Other
                </Text>
                {otherSelected && (
                  <Ionicons name="checkmark-circle" size={20} color="#FAD979" style={styles.checkIcon} />
                )}
              </TouchableOpacity>

              {/* Inline text input, shown only when Other is selected */}
              {otherSelected && (
                <View style={styles.otherInputWrap}>
                  <TextInput
                    ref={otherInputRef}
                    style={styles.otherInput}
                    placeholder="e.g. Soy sauce, Mango, Mustard..."
                    placeholderTextColor="#8AADA0"
                    value={otherText}
                    onChangeText={setOtherText}
                    returnKeyType="done"
                    maxLength={500}
                  />
                  <Text style={styles.otherInputHint}>
                    Separate multiple items with a comma
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
                <Text style={styles.updateButtonText}>Save Allergies</Text>
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
