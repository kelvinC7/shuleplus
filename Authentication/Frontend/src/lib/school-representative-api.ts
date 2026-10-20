import { api } from './api';

export type RepSchool = {
  id: string;
  name: string;
  slug: string;
  organizationCode: string | null;
  status: string;
  logoUrl: string | null;
  district: string | null;
  sector: string | null;
  managerName: string | null;
  managerPhone: string | null;
  licensedModules: number;
  students: number;
  staff: number;
  access: string;
  lastActivity: string;
  metricsSource: string;
  performance?: {
    attendance: number;
    academic: number;
    schoolFees: number;
  };
};

export type RepAcademicContext = {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string;
  currentTerm: string;
};

export type RepChiefAccountantRow = {
  assignmentId: string;
  userId: string;
  organizationId: string;
  status: string;
  permissions: Record<string, string>;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    lastLoginAt: string | null;
  };
};

export async function fetchRepChiefAccountants(organizationId: string) {
  const { data } = await api.get('/iam/representative/chief-accountants', {
    params: { organizationId },
  });
  return data.data as RepChiefAccountantRow[];
}

export async function revokeRepChiefAccountant(organizationId: string, userId: string) {
  const { data } = await api.delete(`/iam/representative/chief-accountants/${userId}`, {
    params: { organizationId },
  });
  return data.data;
}

export async function fetchRepAcademicContext(organizationId?: string) {
  const { data } = await api.get('/iam/representative/academic-context', {
    params: organizationId && organizationId !== 'all' ? { organizationId } : {},
  });
  return data.data as RepAcademicContext;
}

export async function fetchRepSession() {
  const { data } = await api.get('/iam/representative/session');
  return data.data as {
    permissions: Record<string, string>;
    accessMode: string;
    enforceMfa: boolean;
    assignedSchoolCount: number;
    schools: RepSchool[];
  };
}

export async function fetchRepSchools(params?: {
  search?: string;
  status?: string;
  academicYear?: string;
  term?: string;
  includePerformance?: boolean;
}) {
  const { data } = await api.get('/iam/representative/schools', {
    params: {
      ...params,
      includePerformance: params?.includePerformance ? 'true' : undefined,
    },
  });
  return data.data as RepSchool[];
}

export async function fetchRepOverview(params: {
  organizationId?: string;
  academicYear?: string;
  term?: string;
}) {
  const { data } = await api.get('/iam/representative/overview', { params });
  return data.data;
}

export async function fetchRepAcademics(organizationId?: string) {
  const { data } = await api.get('/iam/representative/academics', {
    params: organizationId ? { organizationId } : {},
  });
  return data.data;
}

export async function fetchRepFinancePayroll(organizationId?: string) {
  const { data } = await api.get('/iam/representative/finance-payroll', {
    params: organizationId ? { organizationId } : {},
  });
  return data.data;
}

export async function fetchRepAttendance(organizationId?: string) {
  const { data } = await api.get('/iam/representative/attendance', {
    params: organizationId ? { organizationId } : {},
  });
  return data.data;
}

export async function fetchRepStudents(params?: {
  organizationId?: string;
  search?: string;
  className?: string;
  status?: string;
}) {
  const { data } = await api.get('/iam/representative/students', { params });
  return data.data;
}

export async function fetchRepStaff(params?: {
  organizationId?: string;
  search?: string;
  department?: string;
  status?: string;
}) {
  const { data } = await api.get('/iam/representative/staff', { params });
  return data.data;
}

export async function fetchRepGateAttendance(params?: {
  organizationId?: string;
  date?: string;
  personKind?: string;
  shift?: string;
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get('/iam/representative/attendance/gate', { params });
  return data.data;
}

export async function fetchRepSchoolFeesFilterOptions(organizationId?: string) {
  const { data } = await api.get('/iam/representative/finance/school-fees/filter-options', {
    params: organizationId && organizationId !== 'all' ? { organizationId } : {},
  });
  return data.data as {
    academicYears: string[];
    terms: string[];
    classes: string[];
    feeCategories: Array<{ code: string; name: string }>;
    paymentMethods: string[];
  };
}

export async function fetchRepSchoolFeesOverview(params?: Record<string, string | undefined>) {
  const { data } = await api.get('/iam/representative/finance/school-fees', { params });
  return data.data;
}

export async function fetchRepSchoolFeesAnalytics(params?: Record<string, string | undefined>) {
  const { data } = await api.get('/iam/representative/finance/school-fees/analytics', { params });
  return data.data as {
    currency: string;
    metricsSource: string;
    summary: {
      students: number;
      paid: number;
      partial: number;
      unpaid: number;
      overdue: number;
      expected: number;
      collected: number;
      outstanding: number;
      collectionRate: number;
    };
    byClass: Array<{
      className: string;
      schoolName?: string;
      students: number;
      paid: number;
      partial: number;
      unpaid: number;
      overdue: number;
      expected: number;
      collected: number;
      outstanding: number;
      collectionRate: number;
    }>;
    chartStatusByClass: Array<{
      className: string;
      Paid: number;
      Partial: number;
      Unpaid: number;
      Overdue: number;
    }>;
    chartCollectionByClass: Array<{
      className: string;
      expected: number;
      collected: number;
      outstanding: number;
    }>;
    integrationNotes?: Array<{ schoolName: string; detail: string }>;
  };
}

export async function fetchRepSchoolFeesTransactions(params?: Record<string, string | number | undefined>) {
  const { data } = await api.get('/iam/representative/finance/school-fees/transactions', { params });
  return data.data;
}

export async function fetchRepSchoolFeesBalances(params?: Record<string, string | number | undefined>) {
  const { data } = await api.get('/iam/representative/finance/school-fees/balances', { params });
  return data.data;
}

export async function fetchRepAttendanceMetrics(params?: {
  organizationId?: string;
  period?: string;
  department?: string;
  personKind?: string;
}) {
  const { data } = await api.get('/iam/representative/attendance/metrics', { params });
  return data.data;
}

export async function fetchRepAlerts(organizationId?: string) {
  const { data } = await api.get('/iam/representative/alerts', {
    params: organizationId ? { organizationId } : {},
  });
  return data.data;
}

export async function fetchRepFollowUps() {
  const { data } = await api.get('/iam/representative/follow-ups');
  return data.data;
}

export async function createRepFollowUp(body: {
  organizationId: string;
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
}) {
  const { data } = await api.post('/iam/representative/follow-ups', body);
  return data.data;
}

export async function updateRepFollowUp(
  id: string,
  body: { status?: string; resolutionNotes?: string }
) {
  const { data } = await api.patch(`/iam/representative/follow-ups/${id}`, body);
  return data.data;
}

// SuperAdmin
export async function fetchRepresentativesAdmin() {
  const { data } = await api.get('/super-admin/representatives');
  return data.data;
}

export async function fetchAssignableSchools(search?: string) {
  const { data } = await api.get('/super-admin/representatives/assignable-schools', {
    params: search ? { search } : {},
  });
  return data.data;
}

export async function createRepresentativeAdmin(body: Record<string, unknown>) {
  const { data } = await api.post('/super-admin/representatives', body);
  return data.data;
}

export async function updateRepresentativeAdmin(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/super-admin/representatives/${id}`, body);
  return data.data;
}

export async function setRepresentativeAssignments(
  id: string,
  body: { organizationIds: string[]; expiresAt?: string }
) {
  const { data } = await api.put(`/super-admin/representatives/${id}/assignments`, body);
  return data.data;
}

export async function deleteRepresentativeAdmin(id: string) {
  const { data } = await api.delete(`/super-admin/representatives/${id}`);
  return data.data;
}

export async function resetRepresentativePasswordAdmin(
  id: string,
  body: {
    password?: string;
    sendCredentialsEmail?: boolean;
    requirePasswordChange?: boolean;
  }
) {
  const { data } = await api.post(`/super-admin/representatives/${id}/reset-password`, body);
  return data.data as { tempPassword?: string; emailed?: boolean };
}
