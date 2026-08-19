import { changeLanguage } from '@/constants/i18n';
import { isArabicLanguage } from '@/constants/i18n';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const LanguageSwitcherSegmented = () => {
    const { i18n } = useTranslation();
    const currentLanguage = i18n.language;
    const isArabic = isArabicLanguage(currentLanguage);

    const setLanguage = async (lang: 'en' | 'ar') => {
        if (currentLanguage === lang) return;
        await changeLanguage(lang);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.segment, !isArabic && styles.activeSegment]}
                onPress={() => setLanguage('en')}
                activeOpacity={0.7}
            >
                <Text style={[styles.text, !isArabic && styles.activeText]}>
                    English
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.segment, isArabic && styles.activeSegment]}
                onPress={() => setLanguage('ar')}
                activeOpacity={0.7}
            >
                <Text style={[styles.text, isArabic && styles.activeText]}>
                    العربية
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FAD979',
        borderRadius: 25,
        padding: 4,
        width: 180,
    },
    segment: {
        flex: 1,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 15,
    },
    activeSegment: {
        backgroundColor: '#344225',
    },
    text: {
        color: '#344225',
        fontSize: 14,
        fontWeight: '600',
    },
    activeText: {
        color: '#FAD979',
    },
});
