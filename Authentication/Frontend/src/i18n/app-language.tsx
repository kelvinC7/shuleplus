'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { pickTranslation, type AppTranslations } from './translations';
import {
  APP_LANGUAGES,
  isAppLang,
  LANG_STORAGE_KEY,
  type AppLang,
} from './types';

type AppLanguageContextValue = {
  lang: AppLang;
  t: AppTranslations;
  setLang: (lang: AppLang) => void;
  ready: boolean;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

function readStoredLang(): AppLang {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isAppLang(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AppLang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLangState(readStoredLang());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang, ready]);

  const setLang = useCallback((next: AppLang) => {
    setLangState(next);
  }, []);

  const value = useMemo<AppLanguageContextValue>(
    () => ({
      lang,
      t: pickTranslation(lang),
      setLang,
      ready,
    }),
    [lang, setLang, ready],
  );

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguage(): AppLanguageContextValue {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) {
    throw new Error('useAppLanguage must be used within AppLanguageProvider');
  }
  return ctx;
}

export { APP_LANGUAGES };
