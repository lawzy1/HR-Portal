import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { englishValues, translate, type Locale, type TranslationKey } from '../i18n/messages';

type Params = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Params) => string;
  value: (source: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem('tl-hr-locale') === 'en' ? 'en' : 'vi');

  useEffect(() => {
    localStorage.setItem('tl-hr-locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const contextValue = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key, params = {}) => translate(locale, key, params),
    value: (source) => locale === 'en' ? englishValues[source] ?? source : source,
  }), [locale]);

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
