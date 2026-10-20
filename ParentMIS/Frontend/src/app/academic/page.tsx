'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { MarksPortal, type MarksPortalData } from '@/components/academics/marks-portal';
import { useAuth } from '@/contexts/auth-context';
import type { SchoolAcademicSettings } from '@/types';
import { api } from '@/services/api';

function AcademicInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'schedule' ? 'schedule' : tabParam === 'reports' ? 'reports' : 'marks';
  const { activeStudentId, linkedStudents, summary } = useAuth();
  const schoolDefaults: SchoolAcademicSettings | undefined = summary?.schoolAcademic;
  const code = linkedStudents.find((s) => s.id === activeStudentId)?.shuleCode;

  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [data, setData] = useState<MarksPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryPath = useMemo(() => {
    const params = new URLSearchParams();
    if (activeStudentId) params.set('studentId', activeStudentId);
    if (code) params.set('studentCode', code);
    if (academicYear) params.set('academicYear', academicYear);
    if (term) params.set('term', term);
    return `/academics?${params.toString()}`;
  }, [activeStudentId, code, academicYear, term]);

  const load = useCallback(async () => {
    if (!activeStudentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: MarksPortalData }>(queryPath);
      const payload = res.data.data ?? (res.data as unknown as MarksPortalData);
      setData(payload);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to load marks.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [queryPath, activeStudentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (academicYear || term) return;
    if (schoolDefaults?.currentAcademicYear) setAcademicYear(schoolDefaults.currentAcademicYear);
    if (schoolDefaults?.currentTerm) setTerm(schoolDefaults.currentTerm);
  }, [schoolDefaults, academicYear, term]);

  useEffect(() => {
    if (!data) return;
    if (!academicYear && data.filters.academicYear) setAcademicYear(data.filters.academicYear);
    if (!term && data.filters.term) setTerm(data.filters.term);
  }, [data, academicYear, term]);

  return (
    <MarksPortal
      data={data}
      loading={loading}
      error={error}
      defaultTab={defaultTab === 'schedule' ? 'schedule' : defaultTab === 'reports' ? 'reports' : 'marks'}
      activeStudentId={activeStudentId ?? ''}
      academicYear={academicYear || data?.filters.academicYear || ''}
      term={term || data?.filters.term || ''}
      onAcademicYearChange={(y) => {
        setAcademicYear(y);
        setTerm('');
      }}
      onTermChange={setTerm}
    />
  );
}

export default function AcademicPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted">Loading marks…</div>}>
      <AcademicInner />
    </Suspense>
  );
}
