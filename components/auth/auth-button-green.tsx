import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface AuthButtonGreenProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function AuthButtonGreen({ title, onPress, disabled = false }: AuthButtonGreenProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#344225',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#8B9D94',
    opacity: 0.6,
  },
  buttonText: {
    color: '#D4E8E0',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#C5D4CC',
  },
});
