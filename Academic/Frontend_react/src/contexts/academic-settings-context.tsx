import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { getAcademicSettings, type AcademicSettings } from '@/services/api';

interface AcademicSettingsContextValue {
  settings: AcademicSettings | null;
  /** True once org academic settings have been loaded from IAM (via Academic API). */
  ready: boolean;
  loading: boolean;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
}

const AcademicSettingsContext = createContext<AcademicSettingsContextValue>({
  settings: null,
  ready: false,
  loading: true,
  refresh: async () => {},
});

export function useAcademicSettings() {
  return useContext(AcademicSettingsContext);
}

/** Current year/term from Organization Admin settings, with local overrides. */
export function useOrgAcademicPeriod() {
  const { settings, ready } = useAcademicSettings();
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!ready || !settings || seeded) return;
    setAcademicYear(settings.currentAcademicYear || settings.academicYears[0] || '');
    setTerm(settings.currentTerm || settings.terms[0] || '');
    setSeeded(true);
  }, [ready, settings, seeded]);

  return {
    settings,
    ready,
    academicYear,
    term,
    setAcademicYear,
    setTerm,
  };
}

export function AcademicSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await getAcademicSettings();
      setSettings(data);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const value = useMemo(
    () => ({ settings, ready, loading, refresh: fetchSettings }),
    [settings, ready, loading, fetchSettings]
  );

  return (
    <AcademicSettingsContext.Provider value={value}>
      {children}
    </AcademicSettingsContext.Provider>
  );
}
