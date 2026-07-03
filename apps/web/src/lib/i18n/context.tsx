'use client';

import { createContext, useContext, type ReactNode } from 'react';
import en, { type Translations } from './locales/en';

const I18nContext = createContext<Translations>(en);

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nContext.Provider value={en}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}
