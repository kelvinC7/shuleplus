"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { uniformApi } from "@/services/uniform-api";
import type { SchoolUniformSettings } from "@/types";

interface SettingsContextValue {
  settings: SchoolUniformSettings | null;
  loading: boolean;
  reload: () => Promise<void>;
  update: (
    input: Partial<SchoolUniformSettings>,
  ) => Promise<SchoolUniformSettings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SchoolUniformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await uniformApi.settings.get();
      setSettings(data);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(async (input: Partial<SchoolUniformSettings>) => {
    const data = await uniformApi.settings.update(input);
    setSettings(data);
    return data;
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, loading, reload: load, update }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
