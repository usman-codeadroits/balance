import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: Country[] = [
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', dialCode: '+965' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', dialCode: '+971' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', dialCode: '+973' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', dialCode: '+968' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', dialCode: '+962' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', dialCode: '+961' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', dialCode: '+20' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dialCode: '+92' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
];

interface CountryPickerProps {
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
  isArabic?: boolean;
}

export default function CountryPicker({ selectedCountry, onSelectCountry, isArabic = false }: CountryPickerProps) {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectCountry = (country: Country) => {
    onSelectCountry(country);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, isArabic && styles.pickerButtonRTL]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.flag} allowFontScaling={false}>{selectedCountry.flag}</Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isArabic && styles.rtlRow]}>
              <Text style={[styles.modalTitle, isArabic && styles.rtlText]}>{t('country_picker.select_country')}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    isArabic && styles.rtlRow,
                    item.code === selectedCountry.code && styles.selectedCountryItem,
                  ]}
                  onPress={() => handleSelectCountry(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryFlag} allowFontScaling={false}>{item.flag}</Text>
                  <Text style={[styles.countryName, isArabic && styles.rtlText]}>{t(`country_picker.countries.${item.code}`)}</Text>
                  <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  pickerButtonRTL: {
    flexDirection: 'row-reverse',
    paddingRight: 0,
    paddingLeft: 8,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
  },
  flag: {
    fontSize: 24,
    marginRight: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dropdownIcon: {
    fontSize: 10,
    color: '#6B7F75',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3A35',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7F75',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedCountryItem: {
    backgroundColor: '#F5F5F5',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#2D3A35',
  },
  countryDialCode: {
    fontSize: 14,
    color: '#6B7F75',
  },
});

export { COUNTRIES };

