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
import { fetchAcademicSettings } from '@/services/timetable-smart-api';

export interface AcademicSettingsData {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

interface AcademicSettingsContextValue {
  ready: boolean;
  settings: AcademicSettingsData | null;
  term: string;
  academicYear: string;
  setTerm: (term: string) => void;
  setAcademicYear: (year: string) => void;
  reload: () => Promise<void>;
  error: string | null;
}

const AcademicSettingsContext = createContext<AcademicSettingsContextValue | null>(null);

export function AcademicSettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AcademicSettingsData | null>(null);
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const payload = await fetchAcademicSettings();
      setSettings(payload);
      if (payload.currentTerm) setTerm(payload.currentTerm);
      if (payload.currentAcademicYear) setAcademicYear(payload.currentAcademicYear);
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
      term,
      academicYear,
      setTerm,
      setAcademicYear,
      reload: load,
      error,
    }),
    [ready, settings, term, academicYear, load, error]
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
