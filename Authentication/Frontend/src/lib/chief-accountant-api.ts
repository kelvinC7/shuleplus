import { api } from './api';

export type CaOrganization = {
  id: string;
  name: string;
  organizationCode: string | null;
  status: string;
  logoUrl: string | null;
  district: string | null;
  financialYear: string | null;
  students: number;
  access: string;
};

export async function fetchCaSession() {
  const { data } = await api.get('/iam/chief-accountant/session');
  return data.data as {
    permissions: Record<string, string>;
    accessLevel: string;
    approvalLimit: number | null;
    enforceMfa: boolean;
    assignedOrganizationCount: number;
    organizations: CaOrganization[];
  };
}

export async function fetchCaOrganizations(params?: { search?: string }) {
  const { data } = await api.get('/iam/chief-accountant/organizations', { params });
  return data.data as CaOrganization[];
}

export async function fetchCaAcademicContext(organizationId?: string) {
  const { data } = await api.get('/iam/chief-accountant/academic-context', {
    params: organizationId && organizationId !== 'all' ? { organizationId } : {},
  });
  return data.data as {
    academicYears: string[];
    terms: string[];
    currentAcademicYear: string;
    currentTerm: string;
  };
}

export async function fetchCaOverview(params?: Record<string, string | undefined>) {
  const { data } = await api.get('/iam/chief-accountant/overview', { params });
  return data.data;
}

export async function fetchCaSchoolFeesOverview(params?: Record<string, string | undefined>) {
  const { data } = await api.get('/iam/chief-accountant/finance/school-fees', { params });
  return data.data;
}

export async function fetchCaSchoolFeesDashboard(params?: Record<string, string | undefined>) {
  const { data } = await api.get('/iam/chief-accountant/finance/school-fees/dashboard', { params });
  return data.data as {
    currency: string;
    summary: {
      expectedFees: number;
      paidFees: number;
      outstandingFees: number;
      overdueFees: number;
      collectionRate: number;
      unreconciledAmount: number;
      studentCounts: {
        paid: number;
        partial: number;
        unpaid: number;
        overdue: number;
        exempted: number;
      };
    };
    collectionTrend: Array<{ date: string; amount: number }>;
    bySchool: Array<{
      organizationId: string;
      name: string;
      expected: number;
      paid: number;
      outstanding: number;
      collectionRate: number;
    }>;
    statusDistribution: Array<{ status: string; count: number; fill: string }>;
    recentPayments: Array<{
      id: string;
      receiptNumber: string | null;
      studentName: string;
      schoolName: string;
      amount: number;
      paidAt: string;
      status: string;
      method: string;
    }>;
    pendingActions: Array<{ id: string; label: string; kind: string }>;
    alerts: Array<{ id: string; title: string; severity: 'info' | 'warning' | 'critical' }>;
    integrationSource: { studentManagement: boolean; schoolFeesPortal: boolean };
  };
}

export async function fetchCaSchoolFeesAnalytics(params?: Record<string, string | undefined>) {
  const { data } = await api.get('/iam/chief-accountant/finance/school-fees/analytics', { params });
  return data.data;
}

export async function fetchCaSchoolFeesFilterOptions(organizationId?: string) {
  const { data } = await api.get('/iam/chief-accountant/finance/school-fees/filter-options', {
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

export async function fetchCaSchoolFeesBalances(params?: Record<string, string | number | undefined>) {
  const { data } = await api.get('/iam/chief-accountant/finance/school-fees/balances', { params });
  return data.data;
}

export async function fetchCaSchoolFeesTransactions(params?: Record<string, string | number | undefined>) {
  const { data } = await api.get('/iam/chief-accountant/finance/school-fees/transactions', { params });
  return data.data;
}

export async function fetchCaSchoolFeesStructures(params?: Record<string, string | undefined>) {
  const { data } = await api.get('/iam/chief-accountant/finance/school-fees/structures', { params });
  return data.data as {
    integrationSource: string;
    items: Array<{
      id: string;
      name: string;
      code: string;
      academicYear: string;
      term: string;
      className: string | null;
      status: string;
      totalAmount: number;
      itemCount: number;
      billsGenerated: number;
      updatedAt: string;
      schoolName?: string;
      hasBabyeyiItems: boolean;
      hasSchoolItems: boolean;
      items: Array<{
        name: string;
        amount: number;
        category: string;
        source: string;
      }>;
    }>;
  };
}

export async function fetchCaSchoolFeesBills(params?: Record<string, string | number | undefined>) {
  const { data } = await api.get('/iam/chief-accountant/finance/school-fees/bills', { params });
  return data.data;
}

export async function fetchChiefAccountantsAdmin() {
  const { data } = await api.get('/super-admin/chief-accountants');
  return data.data;
}

export async function fetchChiefAccountantAssignableSchools(search?: string) {
  const { data } = await api.get('/super-admin/chief-accountants/assignable-schools', {
    params: search ? { search } : {},
  });
  return data.data;
}

export async function createChiefAccountantAdmin(body: Record<string, unknown>) {
  const { data } = await api.post('/super-admin/chief-accountants', body);
  return data.data;
}

export async function updateChiefAccountantAdmin(id: string, body: Record<string, unknown>) {
  const { data } = await api.patch(`/super-admin/chief-accountants/${id}`, body);
  return data.data;
}

export async function setChiefAccountantAssignments(
  id: string,
  body: { organizationIds: string[]; permissions?: Record<string, string>; expiresAt?: string }
) {
  const { data } = await api.put(`/super-admin/chief-accountants/${id}/assignments`, body);
  return data.data;
}

export async function deleteChiefAccountantAdmin(id: string) {
  const { data } = await api.delete(`/super-admin/chief-accountants/${id}`);
  return data.data;
}

export async function resetChiefAccountantPasswordAdmin(
  id: string,
  body?: { password?: string; sendCredentialsEmail?: boolean; requirePasswordChange?: boolean }
) {
  const { data } = await api.post(`/super-admin/chief-accountants/${id}/reset-password`, body ?? {});
  return data.data;
}
