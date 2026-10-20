import { useEffect, useState } from 'react';
import { fetchAcademicSettings } from '@/services/api';
import type { AcademicSettings } from '@/types';

export function useAcademicYearFilter() {
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAcademicSettings()
      .then((s) => {
        setSettings(s);
        setAcademicYear(s.currentAcademicYear ?? s.academicYears[0] ?? '');
      })
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  return {
    settings,
    academicYear,
    setAcademicYear,
    years: settings?.academicYears ?? [],
    loading,
  };
}
