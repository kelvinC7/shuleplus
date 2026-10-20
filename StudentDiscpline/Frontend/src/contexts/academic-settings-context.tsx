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
import { disciplineApi } from '@/services/discipline-api';

export interface AcademicSettingsData {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

function fallbackYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

interface AcademicSettingsContextValue {
  ready: boolean;
  settings: AcademicSettingsData | null;
  academicYear: string;
  term: string;
  setAcademicYear: (year: string) => void;
  setTerm: (term: string) => void;
  reload: () => Promise<void>;
  error: string | null;
}

const AcademicSettingsContext = createContext<AcademicSettingsContextValue | null>(null);

export function AcademicSettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AcademicSettingsData | null>(null);
  const [academicYear, setAcademicYear] = useState(fallbackYear());
  const [term, setTerm] = useState('Term 1');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await disciplineApi.academicSettings();
      const payload = data.data;
      setSettings(payload);
      if (payload.currentAcademicYear) setAcademicYear(payload.currentAcademicYear);
      if (payload.currentTerm) setTerm(payload.currentTerm);
    } catch (err: unknown) {
      setSettings(null);
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not load academic settings from your organization'
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(
    () => ({
      ready,
      settings,
      academicYear,
      term,
      setAcademicYear,
      setTerm,
      reload: load,
      error,
    }),
    [ready, settings, academicYear, term, load, error]
  );

  return (
    <AcademicSettingsContext.Provider value={value}>{children}</AcademicSettingsContext.Provider>
  );
}

export function useAcademicSettings() {
  const ctx = useContext(AcademicSettingsContext);
  if (!ctx) throw new Error('useAcademicSettings must be used within AcademicSettingsProvider');
  return ctx;
}
