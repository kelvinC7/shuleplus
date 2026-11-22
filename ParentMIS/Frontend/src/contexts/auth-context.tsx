'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/services/api';
import { captureTokenFromUrl, getParentSession, getToken, storeParentSession } from '@/shared/auth-token';
import { parseJwtPayload } from '@/shared/jwt';
import type { DashboardData, JwtUser, LinkedStudent, PortalFeatures, StudentInfo } from '@/types';
import {
  inferPortalFeaturesFromSession,
  isShuleTripOnlyPortal,
  SHULE_TRIP_ONLY_FEATURES,
  type PortalFeatures as PmPortalFeatures,
} from '@/lib/portal-features';
import { parentAuthJson, type StatusData } from '@/lib/parent-auth-api';

function summaryFromSession(): DashboardData | null {
  const session = getParentSession();
  const first = session?.students?.[0];
  if (!session || !first) return null;
  const name = first.name || [first.firstName, first.lastName].filter(Boolean).join(' ') || 'Student';
  const [firstName, ...rest] = name.split(' ');
  return {
    student: {
      id: first.id,
      firstName: first.firstName || firstName,
      lastName: first.lastName || rest.join(' '),
      fullName: name,
      class: first.className ?? '',
      stream: '',
      shuleCode: first.studentCode ?? '',
      cardNumber: '',
      classTeacher: '',
      house: '',
      transportRoute: '',
      admissionDate: '',
      isBoarding: false,
      avatarUrl: first.photo ?? null,
    },
    linkedStudents: session.students.map((s, i) => ({
      id: s.id,
      fullName: s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student',
      firstName: s.firstName ?? '',
      lastName: s.lastName ?? '',
      shuleCode: s.studentCode ?? '',
      className: s.className ?? '',
      stream: '',
      avatarUrl: s.photo ?? null,
      relationship: s.role ?? 'GUARDIAN',
      isPrimary: i === 0,
    })),
    attendance: {
      todayStatus: 'NONE',
      checkInTime: null,
      checkOutTime: null,
      monthlyPresent: 0,
      monthlyAbsent: 0,
      monthlyLate: 0,
      monthlyExcused: 0,
      attendanceRate: 0,
    },
    academics: {
      currentGPA: 0,
      classRank: 0,
      totalStudents: 0,
      term: '',
      academicYear: '',
      topSubjects: [],
      upcomingExams: [],
      disciplineScore: 0,
    },
    fees: {
      totalBilled: 0,
      totalPaid: 0,
      outstanding: 0,
      overdue: 0,
      currency: 'RWF',
      currentTerm: '',
      feeStatements: [],
      recentPayments: [],
    },
    wallet: {
      balance: 0,
      currency: 'RWF',
      cardNumber: '',
      lastTopUp: null,
      lastTopUpAmount: null,
      recentTransactions: [],
    },
    recentActivities: [],
    portalFeatures: session.portalFeatures ?? SHULE_TRIP_ONLY_FEATURES,
  };
}

async function refreshPortalFeaturesFromStatus(phone: string): Promise<PmPortalFeatures | null> {
  try {
    const data = await parentAuthJson<StatusData>(
      `/public/parents/auth/status?phone=${encodeURIComponent(phone.trim())}`
    );
    return data.portalFeatures ?? null;
  } catch {
    return null;
  }
}

function persistPortalFeatures(features: PmPortalFeatures) {
  const session = getParentSession();
  if (session) {
    storeParentSession({ ...session, portalFeatures: features });
  }
}

const ACTIVE_STUDENT_KEY = 'pm-active-student';

interface AuthContextValue {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  summary: DashboardData | null;
  user: JwtUser | null;
  parentName: string | null;
  isOrgAdmin: boolean;
  activeStudentId: string | null;
  linkedStudents: LinkedStudent[];
  studentParams: Record<string, string>;
  portalFeatures: PortalFeatures;
  shuleTripOnly: boolean;
  setActiveStudent: (id: string) => void;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [portalFeaturesState, setPortalFeaturesState] = useState<PmPortalFeatures | null>(null);

  const parentSession = typeof window !== 'undefined' ? getParentSession() : null;
  const portalFeatures =
    portalFeaturesState ??
    summary?.portalFeatures ??
    inferPortalFeaturesFromSession(parentSession);
  const shuleTripOnly = isShuleTripOnlyPortal(portalFeatures);

  const parentName = parentSession
    ? `${parentSession.parent.firstName} ${parentSession.parent.lastName}`.trim()
    : null;

  const linkedStudents = (() => {
    if (summary?.linkedStudents?.length) {
      return summary.linkedStudents;
    }
    if (!parentSession?.students?.length) return [];
    return parentSession.students.map((s, i) => ({
      id: s.id,
      fullName: s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student',
      firstName: s.firstName ?? '',
      lastName: s.lastName ?? '',
      shuleCode: s.studentCode ?? '',
      className: s.className ?? '',
      stream: '',
      avatarUrl: s.photo ?? null,
      relationship: s.role ?? 'GUARDIAN',
      isPrimary: i === 0,
    }));
  })();

  const fetchDashboard = useCallback(async (studentId?: string, studentCode?: string, lockTo?: LinkedStudent) => {
    const params = new URLSearchParams();
    if (studentId) params.set('studentId', studentId);
    if (studentCode) params.set('studentCode', studentCode);
    const query = params.toString();
    const path = query ? `/dashboard?${query}` : '/dashboard';
    const { data } = await api.get(path);
    const next = data.data as DashboardData;
    const sameChild =
      !lockTo ||
      next.student?.id === lockTo.id ||
      Boolean(lockTo.shuleCode && next.student?.shuleCode === lockTo.shuleCode);
    setSummary((prev) => {
      if (sameChild || !prev) return next;
      return { ...next, student: prev.student };
    });
    if (next.portalFeatures) {
      setPortalFeaturesState(next.portalFeatures);
      persistPortalFeatures(next.portalFeatures);
    }
    setAuthorized(true);
    setError(null);
    return next;
  }, []);

  async function load() {
    captureTokenFromUrl();
    const token = getToken();
    setUser(token ? parseJwtPayload(token) : null);

    if (!token) {
      setError('Missing access token. Open this module from your organization dashboard.');
      setReady(true);
      return;
    }

    const stored =
      typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_STUDENT_KEY) : null;

    try {
      const phoneForStatus =
        parentSession?.parent.phone?.trim() ||
        (token ? parseJwtPayload(token)?.phone?.trim() : undefined);
      if (phoneForStatus) {
        const fresh = await refreshPortalFeaturesFromStatus(phoneForStatus);
        if (fresh) {
          setPortalFeaturesState(fresh);
          persistPortalFeatures(fresh);
        }
      }

      const sessionChild = parentSession?.students.find((s) => s.id === stored);
      const data = await fetchDashboard(stored ?? undefined, sessionChild?.studentCode ?? undefined);
      const primaryId = data.student?.id ?? null;
      const linkedOk = (id: string | null) =>
        Boolean(id && data.linkedStudents?.some((s) => s.id === id || s.shuleCode === id));
      const matched =
        stored &&
        linkedOk(stored) &&
        (data.student?.id === stored ||
          (sessionChild?.studentCode && data.student?.shuleCode === sessionChild.studentCode) ||
          data.linkedStudents?.some(
            (s) => s.id === stored || (sessionChild?.studentCode && s.shuleCode === sessionChild.studentCode)
          ));
      if (stored && !linkedOk(stored) && typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_STUDENT_KEY);
      }
      setActiveStudentId(matched ? data.student?.id || stored : primaryId);
    } catch (err: unknown) {
      const fallback = summaryFromSession();
      if (fallback) {
        if (fallback.portalFeatures) {
          setPortalFeaturesState(fallback.portalFeatures);
        }
        setSummary(fallback);
        setAuthorized(true);
        setActiveStudentId(fallback.student.id);
        setError(null);
      } else {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Unable to access Parent Portal. Please check your network connection and try again.';
        setError(message);
        setAuthorized(false);
      }
    } finally {
      setReady(true);
    }
  }

  function applyChildToSummary(child: LinkedStudent) {
    const next: StudentInfo = {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      fullName: child.fullName,
      class: child.className,
      stream: child.stream,
      shuleCode: child.shuleCode,
      cardNumber: '',
      classTeacher: '',
      house: '',
      transportRoute: '',
      admissionDate: '',
      isBoarding: false,
      avatarUrl: child.avatarUrl,
    };
    setSummary((prev) => (prev ? { ...prev, student: next } : prev));
  }

  function setActiveStudent(id: string) {
    const child = linkedStudents.find((s) => s.id === id);
    if (!child) return;
    if (typeof window !== 'undefined') window.localStorage.setItem(ACTIVE_STUDENT_KEY, id);
    setActiveStudentId(id);
    applyChildToSummary(child);
    fetchDashboard(id, child.shuleCode, child)
      .then((data) => {
        if (data.student?.id && data.student.id !== id && data.student.shuleCode === child.shuleCode) {
          setActiveStudentId(data.student.id);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(ACTIVE_STUDENT_KEY, data.student.id);
          }
        }
      })
      .catch(() => {
        /* keep the optimistic child if the API is still syncing */
      });
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ready,
        authorized,
        error,
        summary,
        user,
        parentName,
        isOrgAdmin: user?.roles?.includes('organization_admin') ?? false,
        activeStudentId,
        linkedStudents,
        studentParams: {
          ...(activeStudentId ? { studentId: activeStudentId } : {}),
          ...(linkedStudents.find((s) => s.id === activeStudentId)?.shuleCode
            ? { studentCode: linkedStudents.find((s) => s.id === activeStudentId)!.shuleCode }
            : {}),
        },
        portalFeatures,
        shuleTripOnly,
        setActiveStudent,
        reload: load,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
