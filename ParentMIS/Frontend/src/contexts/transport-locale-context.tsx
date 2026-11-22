'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/services/api';
import { normalizeTransportLocale, transportT, type TransportLocale } from '@/lib/transport-i18n';

type Ctx = {
  locale: TransportLocale;
  setLocale: (next: TransportLocale) => void;
  t: (key: string) => string;
  prefsLoaded: boolean;
};

const TransportLocaleContext = createContext<Ctx | null>(null);

export function TransportLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<TransportLocale>('en');
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    void api
      .get('/notification-preferences')
      .then(({ data: res }) => {
        const row = res.data as { preferredLanguage?: string };
        setLocaleState(normalizeTransportLocale(row?.preferredLanguage));
      })
      .catch(() => undefined)
      .finally(() => setPrefsLoaded(true));
  }, []);

  const setLocale = useCallback((next: TransportLocale) => {
    setLocaleState(next);
    void api.patch('/notification-preferences', { preferredLanguage: next }).catch(() => undefined);
  }, []);

  const t = useCallback((key: string) => transportT(locale, key), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t, prefsLoaded }), [locale, setLocale, t, prefsLoaded]);

  return <TransportLocaleContext.Provider value={value}>{children}</TransportLocaleContext.Provider>;
}

export function useTransportLocale() {
  const ctx = useContext(TransportLocaleContext);
  if (!ctx) {
    return {
      locale: 'en' as TransportLocale,
      setLocale: () => undefined,
      t: (key: string) => transportT('en', key),
      prefsLoaded: true,
    };
  }
  return ctx;
}
