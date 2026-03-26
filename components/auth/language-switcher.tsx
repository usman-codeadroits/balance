import { changeLanguage } from '@/constants/i18n';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface LanguageSwitcherProps {
    light?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ light = false }) => {
    const { i18n } = useTranslation();
    const currentLanguage = i18n.language;
    const isArabic = currentLanguage === 'ar';

    const toggleLanguage = async () => {
        const nextLang = isArabic ? 'en' : 'ar';
        await changeLanguage(nextLang);
    };

    return (
        <TouchableOpacity
            style={[styles.container, light && styles.containerLight]}
            onPress={toggleLanguage}
            activeOpacity={0.7}
        >
            <Text style={[styles.text, light && styles.textLight]}>
                {isArabic ? 'English' : 'العربية'}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        alignSelf: 'flex-end',
    },
    containerLight: {
        backgroundColor: 'rgba(52, 66, 37, 0.1)',
        borderColor: 'rgba(52, 66, 37, 0.2)',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    textLight: {
        color: '#344225',
    },
});
