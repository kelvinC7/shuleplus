import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAcademicSettings } from '../services/teacherPortalApi';
import { useAuth } from '../context/AuthContext';

function defaultYear() {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

const AcademicContext = createContext(null);

export function AcademicSettingsProvider({ children }) {
  const { teacher } = useAuth();
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(null);
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(defaultYear());

  const load = useCallback(async () => {
    if (!teacher) {
      setReady(true);
      return;
    }
    setReady(false);
    try {
      const payload = await fetchAcademicSettings();
      setSettings(payload);
      if (payload?.currentTerm) setTerm(payload.currentTerm);
      if (payload?.currentAcademicYear) setAcademicYear(payload.currentAcademicYear);
    } catch {
      setSettings(null);
    } finally {
      setReady(true);
    }
  }, [teacher]);

  useEffect(() => {
    load();
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
    }),
    [ready, settings, term, academicYear, load]
  );

  return createElement(AcademicContext.Provider, { value }, children);
}

export default function useTpAcademic() {
  const ctx = useContext(AcademicContext);
  if (!ctx) {
    return {
      ready: true,
      settings: null,
      term: 'Term 1',
      academicYear: defaultYear(),
      setTerm: () => {},
      setAcademicYear: () => {},
      reload: async () => {},
    };
  }
  return ctx;
}
