'use client';

import { createContext, useContext, useMemo } from 'react';
import type { FlowLang } from './flow-language';

type LanguageContextValue = {
  lang: FlowLang;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** QR / portal flows default to English; user can still pick Kinyarwanda or French in step 1. */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({ lang: 'en' as FlowLang }), []);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useSiteLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useSiteLanguage must be used within LanguageProvider');
  return ctx;
}
