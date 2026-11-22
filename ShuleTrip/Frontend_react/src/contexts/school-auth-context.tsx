import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, refreshAccessToken } from '@/services/api';
import { captureTokenFromUrl, getRefreshToken, getToken } from '@/shared/auth-token';
import { parseJwtPayload, type JwtUser } from '@/shared/jwt';
import { classifySchoolAccessFailure, type AccessFailureCode } from '@/shared/access-error';
import { hasShuleTripSchoolAccess } from '@/shared/shule-trip-access';

export interface SchoolRequiredAction {
  tripId: string;
  reference: string;
  title: string;
  kind: string;
  message: string;
  href: string;
  priority: 'high' | 'medium';
}

export type SchoolManifestMode = 'student_management_sync' | 'manual';

export interface SchoolDashboardSummary {
  organizationName: string;
  studentManifestMode?: SchoolManifestMode;
  schoolCode: string | null;
  district: string | null;
  academicYear: string | null;
  kpis: {
    totalTrips: number;
    drafts: number;
    awaitingReview: number;
    pendingApproval: number;
    actionRequired: number;
    approvedTrips: number;
    approvedUpcoming: number;
    corrections: number;
    completed: number;
    rejected: number;
    cancelled: number;
    rejectedOrCancelled: number;
    incompleteConsent: number;
    missingDocuments: number;
  };
  pipeline: Array<{ stageKey: string; label: string; count: number }>;
  upcomingTrips: Array<{
    id: string;
    reference: string;
    title: string;
    destination: string | null;
    departAt: string | null;
    status: string;
    tripLeaderName: string | null;
    daysUntilDeparture: number | null;
  }>;
  requiredActions: SchoolRequiredAction[];
  nextAction: SchoolRequiredAction | null;
  recentDecisions: Array<{
    tripId: string;
    reference: string;
    title: string;
    decision: string;
    stageLabel: string;
    decidedAt: string | null;
    reason: string | null;
  }>;
}

interface SchoolAuthContextValue {
  ready: boolean;
  authorized: boolean;
  failureCode: AccessFailureCode | null;
  summary: SchoolDashboardSummary | null;
  user: JwtUser | null;
  reload: () => Promise<void>;
}

const SchoolAuthContext = createContext<SchoolAuthContextValue | null>(null);

export function SchoolAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [failureCode, setFailureCode] = useState<AccessFailureCode | null>(null);
  const [summary, setSummary] = useState<SchoolDashboardSummary | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    setUser(token ? parseJwtPayload(token) : null);

    if (!token) {
      setFailureCode('missing_token');
      setReady(true);
      return;
    }

    let parsed = parseJwtPayload(token);
    if (parsed && !hasShuleTripSchoolAccess(parsed) && getRefreshToken()) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        setUser(parseJwtPayload(fresh));
        parsed = parseJwtPayload(fresh);
      }
    }
    if (parsed && !hasShuleTripSchoolAccess(parsed)) {
      setFailureCode('module_not_licensed');
      setReady(true);
      return;
    }

    try {
      const { data } = await api.get<{ data: SchoolDashboardSummary }>('/dashboard');
      setSummary(data.data);
      setAuthorized(true);
      setFailureCode(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403 && getRefreshToken()) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setUser(parseJwtPayload(newToken));
          try {
            const { data } = await api.get<{ data: SchoolDashboardSummary }>('/dashboard');
            setSummary(data.data);
            setAuthorized(true);
            setFailureCode(null);
            setReady(true);
            return;
          } catch {
            /* fall through */
          }
        }
      }

      setFailureCode(classifySchoolAccessFailure(err));
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SchoolAuthContext.Provider value={{ ready, authorized, failureCode, summary, user, reload: load }}>
      {children}
    </SchoolAuthContext.Provider>
  );
}

export function useSchoolAuth() {
  const ctx = useContext(SchoolAuthContext);
  if (!ctx) throw new Error('useSchoolAuth must be used within SchoolAuthProvider');
  return ctx;
}
