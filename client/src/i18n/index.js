import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import en from './locales/en.json';
import de from './locales/de.json';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
];
export const LANGUAGE_STORAGE_KEY = 'pm.lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, de: { translation: de } },
    // English is the default and fallback language.
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      // A stored choice wins, otherwise the browser language is used.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    returnNull: false,
    showSupportNotice: false,
  });

function applyLanguage(lng) {
  const code = (lng || 'en').slice(0, 2);
  dayjs.locale(code);
  document.documentElement.lang = code;
}
applyLanguage(i18n.resolvedLanguage);
i18n.on('languageChanged', applyLanguage);

export default i18n;
