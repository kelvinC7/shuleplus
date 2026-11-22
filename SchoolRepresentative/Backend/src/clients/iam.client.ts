import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import type { AuthState } from '../middleware/auth.middleware';

type ServiceJson<T> = { success?: boolean; data?: T; message?: string };

export interface IamSchool {
  id: string;
  name: string;
  slug: string;
  organizationCode: string;
  status: string;
  logoUrl: string | null;
  district: string | null;
  sector: string | null;
  managerName: string | null;
  managerPhone: string | null;
  licensedModules: string[];
  students: number;
  staff: number;
  access: string;
  lastActivity: string;
  metricsSource: string;
  performance?: { attendance: number; academic: number; schoolFees: number };
}

export interface IamOverview {
  filters: { academicYear: string; term: string; organizationId: string };
  summary: {
    assignedSchools: number;
    totalStudents: number;
    totalStaff: number;
    averageAttendance: number;
    openAlerts: number;
  };
  schoolPerformance: Array<{
    organizationId: string;
    name: string;
    academicScore: number;
    passRate: number;
    attendanceRate: number;
  }>;
  financial: Array<{
    organizationId: string;
    name: string;
    feesCollected: number;
    feesOutstanding: number;
    payrollTotal: number;
  }>;
  lastUpdated: string;
  metricsSource: string;
}

export interface IamAttendance {
  summary: { studentRate: number; staffRate: number; lateArrivals: number; rfidEventsToday: number };
  bySchool: Array<{ organizationId: string; name: string; studentRate: number; staffRate: number }>;
  weeklyTrend: Array<{ day: string; student: number; staff: number }>;
  metricsSource: string;
}

export interface IamFeesOverview {
  currency: string;
  summary: {
    totalExpected: number;
    totalCollected: number;
    outstanding: number;
    collectionRate: number;
    studentStatus: { paid: number; partial: number; unpaid: number; overdue: number };
  };
  bySchool?: Array<{
    organizationId: string;
    name: string;
    expected: number;
    collected: number;
    outstanding: number;
    rate: number;
    studentsWithOutstanding?: number;
  }>;
  collectionByCategory: Array<{ category: string; expected: number; collected: number; outstanding: number }>;
  collectionTrend: Array<{ date: string; amount: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  health: string;
  studentsWithOutstanding: number;
  metricsSource: string;
}

export interface IamAcademics {
  summary: { averageMarks: number; passRate: number; examsPending: number; resultsPublished: number };
  bySchool: Array<{
    organizationId: string;
    name: string;
    averageMarks: number;
    passRate: number;
    atRiskStudents: number;
  }>;
  chart: Array<{ name: string; average: number; passRate: number }>;
  metricsSource: string;
}

export interface IamFinancePayroll {
  totals: { feesCollected: number; feesOutstanding: number; payrollTotal: number };
  bySchool: Array<{
    organizationId: string;
    name: string;
    feesCollected: number;
    feesOutstanding: number;
    payrollTotal: number;
    budgetUsedPct: number;
    collectionRate: number;
  }>;
  payrollVisibility: string;
  metricsSource: string;
}

export interface IamStudentRow {
  id: string;
  organizationId: string;
  schoolName: string;
  studentCode: string;
  fullName: string;
  className: string | null;
  attendanceToday: string;
  attendanceRate: number;
}

export interface IamStaffRow {
  id: string;
  organizationId: string;
  schoolName: string;
  employeeCode: string;
  fullName: string;
  department: string;
  role: string;
  attendanceToday: string;
  attendanceRate: number;
}

export interface IamAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  organizationId: string;
  schoolName: string;
  createdAt: string;
}

/** Call an IAM representative endpoint forwarding the user's bearer token. */
export async function iamGet<T>(
  auth: AuthState,
  path: string,
  query?: Record<string, string | undefined>
): Promise<T> {
  const url = new URL(`${env.IAM_API_URL}/iam/representative${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
    });
  } catch {
    throw new AppError(502, 'IAM service is unreachable — start the Authentication backend or use demo mode');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ServiceJson<unknown>;
    if (response.status === 403) {
      throw new AppError(403, body.message ?? 'This account is not assigned as a school representative in IAM');
    }
    throw new AppError(response.status, body.message ?? `IAM request failed (${response.status})`);
  }

  const body = (await response.json()) as ServiceJson<T>;
  return body.data as T;
}
