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

export const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

  if (!savedLanguage) {
    const deviceLanguage = Localization.getLocales()[0].languageCode;
    savedLanguage = deviceLanguage === 'ar' ? 'ar' : 'en';
  }

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
  const isRTL = savedLanguage === 'ar';
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
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);

    const isRTL = lang === 'ar';
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  } catch (error) {
    // Intentionally no console logging in production builds.
  }
};

export default i18n;
