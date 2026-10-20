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
import { timetableApi, type AcademicSettingsData } from '@/services/timetable-api';
import { currentAcademicYear } from '@/types';

interface AcademicSettingsContextValue {
  ready: boolean;
  settings: AcademicSettingsData | null;
  source: 'organization-admin' | 'fallback' | null;
  warning: string | null;
  term: string;
  academicYear: string;
  setTerm: (term: string) => void;
  setAcademicYear: (year: string) => void;
  reload: () => Promise<void>;
  save: (patch: Partial<AcademicSettingsData>) => Promise<AcademicSettingsData>;
}

const AcademicSettingsContext = createContext<AcademicSettingsContextValue | null>(null);

export function AcademicSettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<AcademicSettingsData | null>(null);
  const [source, setSource] = useState<'organization-admin' | 'fallback' | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [term, setTermState] = useState('Term 1');
  const [academicYear, setAcademicYearState] = useState(currentAcademicYear());

  const applySettings = useCallback((data: AcademicSettingsData) => {
    setSettings(data);
    const nextTerm =
      data.currentTerm && data.terms.includes(data.currentTerm)
        ? data.currentTerm
        : data.terms[0] ?? 'Term 1';
    const nextYear =
      data.currentAcademicYear && data.academicYears.includes(data.currentAcademicYear)
        ? data.currentAcademicYear
        : data.academicYears[0] ?? currentAcademicYear();
    setTermState(nextTerm);
    setAcademicYearState(nextYear);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await timetableApi.academicSettingsGet();
      applySettings(res.data.data);
      const metaSource = res.data.meta?.source === 'fallback' ? 'fallback' : 'organization-admin';
      setSource(metaSource);
      setWarning(res.data.meta?.warning ?? null);
    } catch {
      setSettings(null);
      setSource('fallback');
      setWarning('Could not load Organization Admin academic settings');
    } finally {
      setReady(true);
    }
  }, [applySettings]);

  useEffect(() => {
    void load();
  }, [load]);

  const setTerm = useCallback(
    (next: string) => {
      setTermState(next);
    },
    []
  );

  const setAcademicYear = useCallback((next: string) => {
    setAcademicYearState(next);
  }, []);

  const save = useCallback(
    async (patch: Partial<AcademicSettingsData>) => {
      const res = await timetableApi.academicSettingsPut(patch);
      applySettings(res.data.data);
      setSource('organization-admin');
      setWarning(null);
      return res.data.data;
    },
    [applySettings]
  );

  const value = useMemo(
    () => ({
      ready,
      settings,
      source,
      warning,
      term,
      academicYear,
      setTerm,
      setAcademicYear,
      reload: load,
      save,
    }),
    [ready, settings, source, warning, term, academicYear, setTerm, setAcademicYear, load, save]
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
