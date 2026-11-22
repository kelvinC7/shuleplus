import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { govApi, refreshAccessToken } from '@/services/api';
import { captureTokenFromUrl, getRefreshToken, getToken } from '@/shared/auth-token';
import { parseJwtPayload, type JwtUser } from '@/shared/jwt';

const GOVERNMENT_ROLES = [
  'super_admin',
  'root_admin',
  'national_administrator',
  'intake_reviewer',
  'education_reviewer',
  'transport_reviewer',
  'checkpoint_inspector',
  'final_approval_officer',
  'monitoring_officer',
  'district_education_officer',
  'sector_education_inspector',
  'organization_admin',
];

function apiErrorMessage(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { message?: string } }; code?: string; message?: string };
  if (ax.response?.data?.message) return ax.response.data.message;
  if (ax.code === 'ERR_NETWORK' || ax.message === 'Network Error') {
    return 'Cannot reach ShuleTrip API. Start the backend on port 3076 and try again.';
  }
  return fallback;
}

export interface GovernmentDashboardSummary {
  jurisdiction: { district?: string; sector?: string } | null;
  kpis: {
    totalApplications: number;
    awaitingReview: number;
    nearingDeparture: number;
    missingDocuments: number;
    safetyIssues: number;
    safetyConcerns?: number;
    correctionsRequired: number;
    approved: number;
    rejected: number;
    activeTrips: number;
    overdueReviews: number;
    pendingValidation?: number;
    educationReview?: number;
    completenessReview?: number;
  };
  pipeline?: Array<{ stageKey: string; label: string; count: number }>;
  workflowQueue?: { intake: number; education: number; transport: number; final: number };
  recentDecisions?: Array<{
    reference: string;
    title: string;
    tripStatus?: string;
    decision: string;
    stageLabel: string;
    decidedAt: string | null;
    reason?: string | null;
    decidedByName?: string | null;
  }>;
}

interface GovernmentAuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: GovernmentDashboardSummary | null;
  user: JwtUser | null;
  reload: () => Promise<void>;
}

const GovernmentAuthContext = createContext<GovernmentAuthContextValue | null>(null);

export function GovernmentAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<GovernmentDashboardSummary | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    const parsed = token ? parseJwtPayload(token) : null;
    setUser(parsed);

    if (!token) {
      setError('Sign in with your authorized government Shule+ account.');
      setReady(true);
      return;
    }

    if (!parsed?.roles?.some((r) => GOVERNMENT_ROLES.includes(r))) {
      setError('This account does not have government console permissions.');
      setReady(true);
      return;
    }

    try {
      const { data } = await govApi.get<{ data: GovernmentDashboardSummary }>('/government/dashboard');
      setSummary(data.data);
      setAuthorized(true);
      setError(null);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403 && getRefreshToken()) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setUser(parseJwtPayload(newToken));
          try {
            const { data } = await govApi.get<{ data: GovernmentDashboardSummary }>('/government/dashboard');
            setSummary(data.data);
            setAuthorized(true);
            setError(null);
            setReady(true);
            return;
          } catch {
            /* fall through */
          }
        }
      }

      setError(apiErrorMessage(err, 'Unable to access ShuleTrip government console'));
      setAuthorized(false);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <GovernmentAuthContext.Provider value={{ ready, authorized, error, summary, user, reload: load }}>
      {children}
    </GovernmentAuthContext.Provider>
  );
}

export function useGovernmentAuth() {
  const ctx = useContext(GovernmentAuthContext);
  if (!ctx) throw new Error('useGovernmentAuth must be used within GovernmentAuthProvider');
  return ctx;
}
