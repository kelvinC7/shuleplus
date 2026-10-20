'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getStoredSchoolId, setStoredSchoolId } from '@/lib/selected-school-store';
import { fetchSchools, type PrintCardSchool } from '@/services/print-card-api';

export function usePrintCardSchools() {
  const { session } = useAuth();
  const canSelectSchools = session?.canSelectSchools ?? session?.isSuperAdmin ?? false;
  const [schools, setSchools] = useState<PrintCardSchool[]>([]);
  const [selectedSchool, setSelectedSchoolState] = useState<PrintCardSchool | null>(null);
  const [viewAllSchools, setViewAllSchools] = useState(true);
  const [loading, setLoading] = useState(true);

  const setSelectedSchool = useCallback((school: PrintCardSchool | null) => {
    setSelectedSchoolState(school);
    if (school) setStoredSchoolId(school.id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchSchools();
        if (cancelled) return;
        setSchools(rows);
        const storedId = getStoredSchoolId();
        const fromStored = storedId ? rows.find((s) => s.id === storedId) : null;
        const fromSession = rows.find((s) => s.id === session?.organizationId);
        const pick = fromStored ?? (canSelectSchools ? rows[0] : fromSession ?? rows[0]) ?? null;
        setSelectedSchoolState(pick);
        if (pick) setStoredSchoolId(pick.id);
      } catch {
        if (!cancelled) {
          setSchools([]);
          setSelectedSchoolState(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.organizationId, canSelectSchools]);

  return {
    schools,
    selectedSchool,
    setSelectedSchool,
    canSelectSchools,
    viewAllSchools,
    setViewAllSchools,
    loading,
    schoolNameById: (id: string) => schools.find((s) => s.id === id)?.name ?? 'Unknown school',
  };
}
