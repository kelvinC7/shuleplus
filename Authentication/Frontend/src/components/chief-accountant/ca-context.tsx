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
  fetchCaAcademicContext,
  fetchCaOrganizations,
  type CaOrganization,
} from '@/lib/chief-accountant-api';

export type OrgScope = 'all' | string;

function currentFinancialPeriodLabel() {
  const d = new Date();
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

type CaContextValue = {
  organizations: CaOrganization[];
  loading: boolean;
  academicLoading: boolean;
  orgScope: OrgScope;
  setOrgScope: (scope: OrgScope) => void;
  selectedOrganization: CaOrganization | null;
  academicYears: string[];
  terms: string[];
  academicYear: string;
  setAcademicYear: (y: string) => void;
  term: string;
  setTerm: (t: string) => void;
  financialPeriod: string;
  setFinancialPeriod: (p: string) => void;
  refreshOrganizations: () => Promise<void>;
};

const CaContext = createContext<CaContextValue | null>(null);

export function CaProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<CaOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicLoading, setAcademicLoading] = useState(true);
  const [orgScope, setOrgScope] = useState<OrgScope>('all');
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [financialPeriod, setFinancialPeriod] = useState(currentFinancialPeriodLabel);

  const refreshAcademic = useCallback(async () => {
    setAcademicLoading(true);
    try {
      const orgId = orgScope === 'all' ? undefined : orgScope;
      const ctx = await fetchCaAcademicContext(orgId);
      setAcademicYears(ctx.academicYears);
      setTerms(ctx.terms);
      setAcademicYear(ctx.currentAcademicYear);
      setTerm(ctx.currentTerm);
    } finally {
      setAcademicLoading(false);
    }
  }, [orgScope]);

  const refreshOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchCaOrganizations();
      setOrganizations(list);
      if (orgScope !== 'all' && !list.some((s) => s.id === orgScope)) {
        setOrgScope('all');
      }
    } finally {
      setLoading(false);
    }
  }, [orgScope]);

  useEffect(() => {
    void refreshAcademic();
  }, [refreshAcademic]);

  useEffect(() => {
    if (!academicLoading) void refreshOrganizations();
  }, [refreshOrganizations, academicLoading]);

  const selectedOrganization = useMemo(
    () => (orgScope === 'all' ? null : organizations.find((s) => s.id === orgScope) ?? null),
    [orgScope, organizations]
  );

  const value = useMemo(
    () => ({
      organizations,
      loading,
      academicLoading,
      orgScope,
      setOrgScope,
      selectedOrganization,
      academicYears,
      terms,
      academicYear,
      setAcademicYear,
      term,
      setTerm,
      financialPeriod,
      setFinancialPeriod,
      refreshOrganizations,
    }),
    [
      organizations,
      loading,
      academicLoading,
      orgScope,
      selectedOrganization,
      academicYears,
      terms,
      academicYear,
      term,
      financialPeriod,
      refreshOrganizations,
    ]
  );

  return <CaContext.Provider value={value}>{children}</CaContext.Provider>;
}

export function useCaContext() {
  const ctx = useContext(CaContext);
  if (!ctx) throw new Error('useCaContext must be used within CaProvider');
  return ctx;
}
