import { api } from './api';
import type { ValidatedImportRow } from '@/utils/payrollEmployeeImportTemplate';

export interface PayrollStaff {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  dateOfBirth: string | null;
  hireDate: string | null;
  status: string;
  department: string | null;
  position: string | null;
  nationalId: string | null;
  rssbNumber: string | null;
  email: string | null;
  phone: string | null;
  bankName: string | null;
  bankAccount: string | null;
  isActive: boolean;
  isProtected: boolean;
  basicSalary: number;
  hrEmployeeId?: string | null;
  hrProfile?: Record<string, unknown>;
}

export const payrollApi = {
  dashboard: () => api.get('/dashboard'),
  seed: () => api.post('/seed'),
  getTemplate: () => api.get('/templates/active'),
  saveTemplate: (data: Record<string, unknown>) => api.put('/templates/active', data),
  activateTemplate: () => api.post('/templates/activate'),
  deactivateTemplate: () => api.post('/templates/deactivate'),
  previewTemplate: (limit = 500) => api.get('/templates/preview', { params: { limit } }),
  listEmployeeDeductions: (staffId?: string) =>
    api.get('/employee-deductions', { params: staffId ? { staffId } : {} }),
  createEmployeeDeduction: (data: Record<string, unknown>) => api.post('/employee-deductions', data),
  updateEmployeeDeduction: (id: string, data: Record<string, unknown>) => api.patch(`/employee-deductions/${id}`, data),
  deleteEmployeeDeduction: (id: string) => api.delete(`/employee-deductions/${id}`),
  listStaff: (search?: string) => api.get('/staff', { params: search ? { search } : {} }),
  staffDirectory: (params?: Record<string, string | undefined>) =>
    api.get<{ data: PayrollStaff[]; stats: Record<string, number>; pagination: Record<string, number> }>(
      '/staff/directory',
      { params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')) }
    ),
  syncFromHr: () => api.post<{ data: { total: number; created: number; updated: number } }>('/staff/sync-from-hr'),
  listHrDepartments: () => api.get<{ data: { id: string; name: string; code?: string }[] }>('/hr/departments'),
  getStaff: (id: string) => api.get<{ data: PayrollStaff }>(`/staff/${id}`),
  createStaff: (data: Record<string, unknown>) => api.post<{ data: PayrollStaff }>('/staff', data),
  updateStaff: (id: string, data: Record<string, unknown>) =>
    api.put<{ data: PayrollStaff }>(`/staff/${id}`, data),
  deleteStaff: (id: string) => api.delete(`/staff/${id}`),
  bulkDeleteStaff: (ids: string[]) =>
    api.post<{ success: boolean; count: number; skippedProtected: number }>('/staff/bulk-delete', { ids }),
  validateImport: (rows: unknown[]) =>
    api.post<{ rows: ValidatedImportRow[]; stats: Record<string, number> }>('/staff/import/validate', { rows }),
  importStaff: (body: Record<string, unknown>) =>
    api.post<{ data: Record<string, number> }>('/staff/import', body),
  getStaffProfile: (id: string) => api.get(`/staff/${id}/profile`),
  saveStaffProfile: (id: string, data: Record<string, unknown>) => api.put(`/staff/${id}/profile`, data),
  listRuns: (params?: Record<string, string | number>) => api.get('/runs', { params }),
  getRun: (id: string) => api.get(`/runs/${id}`),
  previewRun: (data: Record<string, unknown>) => api.post('/runs/preview', data),
  triggerRun: (data: Record<string, unknown>) => api.post('/runs/trigger', data),
  markPaid: (id: string, data?: Record<string, unknown>) => api.patch(`/runs/${id}/mark-paid`, data ?? {}),
  deleteRun: (id: string) => api.delete(`/runs/${id}`),
  listTerminations: () => api.get('/terminations'),
  createTermination: (data: Record<string, unknown>) => api.post('/terminations', data),
  updateTerminationStatus: (id: string, status: string) => api.patch(`/terminations/${id}/status`, { status }),
  disbursementRules: () => api.get('/disbursement/rules'),
  createDisbursementRule: (data: Record<string, unknown>) => api.post('/disbursement/rules', data),
  paymentRows: (runId: string) => api.get('/disbursement/payments', { params: { runId } }),
  getBranding: () => api.get('/payslip-branding'),
  saveBranding: (data: Record<string, unknown>) => api.put('/payslip-branding', data),
  getSettings: () => api.get('/settings'),
  saveSettings: (data: Record<string, unknown>) => api.put('/settings', data),
  templateHistory: () => api.get('/templates/history'),
  advanceCheck: (staffId: string) => api.get(`/advance-check/${staffId}`),
  applyScheduledDeductions: (runId: string) => api.post('/disbursement/apply-deductions', { runId }),
  auditTrail: (runId?: string) => api.get('/disbursement/audit', { params: runId ? { runId } : {} }),
  myPayroll: () => api.get('/my-payroll'),
};
