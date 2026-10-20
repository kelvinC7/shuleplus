import { useCallback, useEffect, useState } from 'react';
import { api, fetchAcademicSettings } from '@/services/api';
import type { AcademicSettings } from '@/types';

interface ChartData {
  studentsByClass: { label: string; value: number; male: number; female: number }[];
  studentsByCategory: { label: string; value: number }[];
}

export function useDashboardCharts() {
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAcademicSettings()
      .then((s) => {
        setSettings(s);
        setAcademicYear(s.currentAcademicYear ?? s.academicYears[0] ?? '');
      })
      .catch(() => setSettings(null));
  }, []);

  const fetchCharts = useCallback(async (year: string) => {
    if (!year) return;
    setLoading(true);
    try {
      const { data } = await api.get('/dashboard', { params: { academicYear: year } });
      setChartData({
        studentsByClass: data.data.studentsByClass ?? [],
        studentsByCategory: data.data.studentsByCategory ?? [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (academicYear) void fetchCharts(academicYear);
  }, [academicYear, fetchCharts]);

  return {
    settings,
    academicYear,
    setAcademicYear,
    chartData,
    loading,
    years: settings?.academicYears ?? [],
  };
}

function formatYear(year: string): string {
  return year.replace(/-/g, '–');
}

export { formatYear as formatAcademicYear };
