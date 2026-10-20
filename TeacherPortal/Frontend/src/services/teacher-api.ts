import { api } from './api';
import type {
  DashboardSummary,
  PayrollSummary,
  ShuleAvanceApprover,
  ShuleAvanceCatalog,
  ShuleAvanceEligibility,
  ShuleAvanceRequest,
  AvanceAccess,
  TeacherAccountProfile,
} from '@/types';

export async function fetchDashboard(): Promise<DashboardSummary> {
  const { data } = await api.get('/dashboard');
  return data.data;
}

export async function fetchEligibility(): Promise<ShuleAvanceEligibility> {
  const { data } = await api.get('/salary-advance/applicant/eligibility');
  return data.data;
}

export async function fetchAvanceAccess(): Promise<AvanceAccess> {
  const { data } = await api.get('/salary-advance/me/access');
  return data.data;
}

export async function fetchApprovers(): Promise<ShuleAvanceApprover[]> {
  const { data } = await api.get('/salary-advance/approvers');
  return data.data;
}

export async function addApprover(body: {
  userId: string;
  email?: string;
  displayName?: string;
  role: 'manager' | 'accountant';
}) {
  const { data } = await api.post('/salary-advance/approvers', body);
  return data.data as ShuleAvanceApprover;
}

export async function removeApprover(id: string) {
  const { data } = await api.delete(`/salary-advance/approvers/${id}`);
  return data;
}

export async function fetchCatalog(): Promise<ShuleAvanceCatalog> {
  const { data } = await api.get('/salary-advance/catalog');
  return data.data;
}

export async function fetchMyRequests(): Promise<ShuleAvanceRequest[]> {
  const { data } = await api.get('/salary-advance/applicant/my-requests');
  return data.data;
}

export async function fetchMyPayroll(): Promise<PayrollSummary> {
  const { data } = await api.get('/staff/payroll/my');
  return data.data;
}

export async function fetchAccountProfile(): Promise<TeacherAccountProfile> {
  const { data } = await api.get('/account/me');
  return data.data;
}

export async function createAdvanceRequest(body: {
  request_type: 'cashout' | 'service';
  amount_rwf: number;
  repayment_term_months: number;
  reason?: string;
  cashout_category_slug?: string;
  service_category?: string;
  service_payload?: Record<string, unknown>;
}) {
  const { data } = await api.post('/salary-advance/applicant/requests', body);
  return data;
}

export async function cancelAdvanceRequest(id: string) {
  const { data } = await api.delete(`/salary-advance/applicant/requests/${id}`);
  return data;
}

export async function fetchFinanceRequests() {
  const { data } = await api.get('/salary-advance/finance/requests');
  return data.data as ShuleAvanceRequest[];
}

export async function fetchManagerPending() {
  const { data } = await api.get('/salary-advance/manager/pending-requests');
  return data.data as ShuleAvanceRequest[];
}

export async function financeSendToManager(id: string, note?: string) {
  const { data } = await api.patch(`/salary-advance/finance/requests/${id}/send-to-manager`, { note });
  return data;
}

export async function financeReject(id: string, note?: string) {
  const { data } = await api.patch(`/salary-advance/finance/requests/${id}/reject`, { note });
  return data;
}

export async function managerDecision(id: string, decision: 'approve' | 'reject', manager_note?: string) {
  const { data } = await api.patch(`/salary-advance/manager/requests/${id}/decision`, {
    decision,
    manager_note,
  });
  return data;
}
