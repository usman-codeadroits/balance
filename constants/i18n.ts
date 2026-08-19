import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ar from '../assets/locales/ar.json';
import en from '../assets/locales/en.json';

const RESOURCES = {
  en: { translation: en },
  ar: { translation: ar },
};

const LANGUAGE_KEY = 'appLanguage';

export const isArabicLanguage = (language?: string | null) =>
  (language ?? '').toLowerCase().startsWith('ar');

const normalizeLanguage = (language?: string | null): 'en' | 'ar' =>
  isArabicLanguage(language) ? 'ar' : 'en';

export const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  if (!savedLanguage) {
    const deviceLanguage = Localization.getLocales()[0].languageCode;
    savedLanguage = deviceLanguage === 'ar' ? 'ar' : 'en';
  }

  savedLanguage = normalizeLanguage(savedLanguage);

  await i18n
    .use(initReactI18next)
    .init({
      resources: RESOURCES,
      lng: savedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });

  // Ensure RTL is correctly set based on the current language
    const isRTL = isArabicLanguage(savedLanguage);
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    // Note: We don't reload here during init to avoid infinite loops,
    // though usually init happens before the UI is fully rendered.
  }

  return i18n;
};

export const changeLanguage = async (lang: 'en' | 'ar') => {
  try {
    const normalized = normalizeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, normalized);
    await i18n.changeLanguage(normalized);

    const isRTL = isArabicLanguage(normalized);
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  } catch (error) {
    // Intentionally no console logging in production builds.
  }
};

export default i18n;
