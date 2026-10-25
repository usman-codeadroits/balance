import React from 'react';
import { useTranslation } from 'react-i18next';
import * as RN from 'react-native';

// Only Kuwait numbers are supported for OTP
export const KUWAIT_DIAL_CODE = '+965';
export const KUWAIT_PHONE_LENGTH = 8;

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  isArabic?: boolean;
}

export default function PhoneInput({
  value,
  onChangeText,
  placeholder = 'Phone number',
  isArabic = false,
}: PhoneInputProps) {
  const { t } = useTranslation();

  return (
    <RN.View style={styles.container}>
      <RN.Text style={[styles.label, isArabic && styles.labelRTL]}>{t('auth.mobile')}</RN.Text>
      <RN.View style={[styles.inputWrapper, isArabic && styles.inputWrapperRTL]}>
        <RN.View style={[styles.countryBox, isArabic && styles.countryBoxRTL]}>
          <RN.Text style={styles.flag} allowFontScaling={false}>🇰🇼</RN.Text>
          <RN.Text style={styles.dialCode}>{KUWAIT_DIAL_CODE}</RN.Text>
        </RN.View>
        <RN.View style={styles.separator} />
        <RN.TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, KUWAIT_PHONE_LENGTH))}
          placeholder={placeholder}
          placeholderTextColor="#8B9D94"
          keyboardType="phone-pad"
          maxLength={KUWAIT_PHONE_LENGTH}
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
  countryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryBoxRTL: {
    flexDirection: 'row-reverse',
  },
  flag: {
    fontSize: 24,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dialCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3A35',
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
