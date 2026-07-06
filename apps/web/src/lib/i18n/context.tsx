'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import en, { type Translations } from './locales/en';
import tr from './locales/tr';

type Locale = 'en' | 'tr';

const LOCALE_KEY = 'app-locale';

interface I18nContextValue {
  t: Translations;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  t: en,
  locale: 'en',
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored === 'en' || stored === 'tr') {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_KEY, l);
  }, []);

  const t = locale === 'tr' ? tr : en;

  return <I18nContext.Provider value={{ t, locale, setLocale }}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext).t;
}

export function useLocale() {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}
