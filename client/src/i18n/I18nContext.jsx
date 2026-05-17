import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LOCALE_STORAGE_KEY, readStoredLocale, translate } from './strings';

/** @typedef {'en' | 'uk'} Locale */

/** @type {React.Context<{ locale: Locale, setLocale: (l: Locale) => void, t: (key: string, vars?: Record<string, string | number>) => string } | null>} */
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => readStoredLocale());

  const setLocale = useCallback((next) => {
    const l = next === 'uk' ? 'uk' : 'en';
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key, vars) => translate(locale, key, vars),
    [locale],
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'uk' ? 'uk' : 'en';
    }
  }, [locale]);

  /** Other browser tabs update `localStorage`; `storage` fires here so locale stays in sync app-wide. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onStorage = (e) => {
      if (e.key !== LOCALE_STORAGE_KEY || e.storageArea !== localStorage) return;
      const l = e.newValue === 'uk' ? 'uk' : 'en';
      setLocaleState((prev) => (prev === l ? prev : l));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
