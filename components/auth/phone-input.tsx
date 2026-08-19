import React from 'react';
import { useTranslation } from 'react-i18next';
import * as RN from 'react-native';
import CountryPicker, { Country } from './country-picker';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
  isArabic?: boolean;
}

export default function PhoneInput({
  value,
  onChangeText,
  placeholder = 'Phone number',
  selectedCountry,
  onSelectCountry,
  isArabic = false,
}: PhoneInputProps) {
  const { t } = useTranslation();

  return (
    <RN.View style={styles.container}>
      <RN.Text style={[styles.label, isArabic && styles.labelRTL]}>{t('auth.mobile')}</RN.Text>
      <RN.View style={[styles.inputWrapper, isArabic && styles.inputWrapperRTL]}>
        <CountryPicker
          selectedCountry={selectedCountry}
          onSelectCountry={onSelectCountry}
          isArabic={isArabic}
        />
        <RN.View style={styles.separator} />
        <RN.TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8B9D94"
          keyboardType="phone-pad"
          textAlign={isArabic ? 'right' : 'left'}
        />
      </RN.View>
    </RN.View>
  );
}

const styles = RN.StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  labelRTL: {
    textAlign: 'right',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputWrapperRTL: {
    flexDirection: 'row-reverse',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D3A35',
    paddingVertical: 12,
  },
});
