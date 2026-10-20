'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SiteLang, SiteText } from '@/lib/site-i18n';
import { LANG_STORAGE_KEY, pickSiteText } from '@/lib/site-i18n';

type LanguageContextValue = {
  lang: SiteLang;
  setLang: (lang: SiteLang) => void;
  t: SiteText;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): SiteLang {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored === 'rw' || stored === 'en' || stored === 'fr') return stored;
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SiteLang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLangState(readStoredLang());
    setReady(true);
  }, []);

  const setLang = useCallback((next: SiteLang) => {
    setLangState(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
    document.documentElement.lang = next === 'rw' ? 'rw' : next;
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang === 'rw' ? 'rw' : lang;
  }, [lang, ready]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: pickSiteText(lang),
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useSiteLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useSiteLanguage must be used within LanguageProvider');
  return ctx;
}
