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
import {
  fetchRepAcademicContext,
  fetchRepSchools,
  type RepSchool,
} from '@/lib/school-representative-api';

export type SchoolScope = 'all' | string;

type RepContextValue = {
  schools: RepSchool[];
  loading: boolean;
  academicLoading: boolean;
  schoolScope: SchoolScope;
  setSchoolScope: (scope: SchoolScope) => void;
  selectedSchool: RepSchool | null;
  academicYears: string[];
  terms: string[];
  academicYear: string;
  setAcademicYear: (y: string) => void;
  term: string;
  setTerm: (t: string) => void;
  refreshSchools: () => Promise<void>;
  refreshAcademicContext: () => Promise<void>;
};

const RepContext = createContext<RepContextValue | null>(null);

export function RepProvider({ children }: { children: ReactNode }) {
  const [schools, setSchools] = useState<RepSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [schoolScope, setSchoolScope] = useState<SchoolScope>('all');
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');

  const refreshAcademicContext = useCallback(async () => {
    setAcademicLoading(true);
    try {
      const orgId = schoolScope === 'all' ? undefined : schoolScope;
      const ctx = await fetchRepAcademicContext(orgId);
      setAcademicYears(ctx.academicYears);
      setTerms(ctx.terms);
      setAcademicYear(ctx.currentAcademicYear);
      setTerm(ctx.currentTerm);
    } finally {
      setAcademicLoading(false);
    }
  }, [schoolScope]);

  const refreshSchools = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchRepSchools({
        academicYear: academicYear || undefined,
        term: term || undefined,
        includePerformance: Boolean(academicYear && term),
      });
      setSchools(list);
      if (schoolScope !== 'all' && !list.some((s) => s.id === schoolScope)) {
        setSchoolScope('all');
      }
    } finally {
      setLoading(false);
    }
  }, [schoolScope, academicYear, term]);

  useEffect(() => {
    void refreshAcademicContext();
  }, [refreshAcademicContext]);

  useEffect(() => {
    if (!academicLoading) {
      void refreshSchools();
    }
  }, [refreshSchools, academicLoading]);

  const selectedSchool = useMemo(
    () => (schoolScope === 'all' ? null : schools.find((s) => s.id === schoolScope) ?? null),
    [schoolScope, schools]
  );

  const value = useMemo(
    () => ({
      schools,
      loading,
      academicLoading,
      schoolScope,
      setSchoolScope,
      selectedSchool,
      academicYears,
      terms,
      academicYear,
      setAcademicYear,
      term,
      setTerm,
      refreshSchools,
      refreshAcademicContext,
    }),
    [
      schools,
      loading,
      academicLoading,
      schoolScope,
      selectedSchool,
      academicYears,
      terms,
      academicYear,
      term,
      refreshSchools,
      refreshAcademicContext,
    ]
  );

  return <RepContext.Provider value={value}>{children}</RepContext.Provider>;
}

export function useRepContext() {
  const ctx = useContext(RepContext);
  if (!ctx) throw new Error('useRepContext must be used within RepProvider');
  return ctx;
}
