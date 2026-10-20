"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultAcademicSettings,
  parseAcademicSettings,
  type AcademicSettings,
} from "@/lib/academic-settings";
import { fetchAcademicSettings } from "@/services/academic-settings-api";

interface AcademicPeriodContextValue {
  settings: AcademicSettings;
  loading: boolean;
  year: string;
  term: string;
  refresh: () => Promise<void>;
}

const AcademicPeriodContext = createContext<AcademicPeriodContextValue | null>(
  null,
);

export function AcademicPeriodProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AcademicSettings>(
    defaultAcademicSettings(),
  );
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("");
  const [term, setTerm] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = parseAcademicSettings(await fetchAcademicSettings());
      setSettings(data);
      setYear(data.currentAcademicYear ?? data.academicYears[0] ?? "");
      setTerm(data.currentTerm ?? data.terms[0] ?? "");
    } catch {
      const fallback = defaultAcademicSettings();
      setSettings(fallback);
      setYear(fallback.currentAcademicYear ?? "");
      setTerm(fallback.currentTerm ?? "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ settings, loading, year, term, refresh }),
    [settings, loading, year, term, refresh],
  );

  return (
    <AcademicPeriodContext.Provider value={value}>
      {children}
    </AcademicPeriodContext.Provider>
  );
}

export function useAcademicPeriod() {
  const ctx = useContext(AcademicPeriodContext);
  if (!ctx) {
    throw new Error(
      "useAcademicPeriod must be used within AcademicPeriodProvider",
    );
  }
  return ctx;
}
