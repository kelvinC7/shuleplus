import { api } from './api';
import type {
  ContractRow,
  DashboardSummary,
  Department,
  DepartmentStats,
  Employee,
  EmployeeDocument,
  EmploymentCategory,
  LeaveRequest,
  Qualification,
} from '@/types';
import type { LeaveFilters, LeaveKpis, LeavePolicy, LeaveRequestRow } from '@/types/leave';

import type { ValidatedImportRow } from '@/utils/hrEmployeeImportTemplate';

export const hrApi = {
  dashboard: () => api.get<{ data: DashboardSummary }>('/dashboard'),

  directory: (params?: Record<string, string | undefined>) =>
    api.get<{ data: Employee[]; stats: Record<string, number>; pagination: Record<string, number> }>(
      '/directory',
      { params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')) }
    ),

  getEmployee: (id: string) => api.get<{ data: Employee }>(`/employees/${id}`),
  createEmployee: (data: Record<string, unknown>) => api.post<{ data: Employee }>('/employees', data),
  updateEmployee: (id: string, data: Record<string, unknown>) =>
    api.put<{ data: Employee }>(`/employees/${id}`, data),
  deleteEmployee: (id: string) => api.delete(`/employees/${id}`),
  bulkDeleteEmployees: (ids: string[]) =>
    api.post<{ success: boolean; count: number; skippedProtected: number }>('/employees/bulk-delete', { ids }),
  deleteAllDeletable: () =>
    api.post<{ success: boolean; deleted: number; keptProtected: number }>('/employees/delete-all-deletable'),
  seedSamples: () => api.post<{ success: boolean; data: { seeded: boolean; count: number } }>('/employees/seed-samples'),
  validateImport: (rows: unknown[]) =>
    api.post<{ rows: ValidatedImportRow[]; stats: Record<string, number> }>('/employees/import/validate', { rows }),
  importEmployees: (body: Record<string, unknown>) =>
    api.post<{ data: Record<string, number> }>('/employees/import', body),

  contracts: () =>
    api.get<{ data: ContractRow[]; stats: { total: number; expiring: number; expired: number } }>(
      '/contracts'
    ),

  organization: () => api.get('/organization'),

  departments: (params?: Record<string, string | undefined>) =>
    api.get<{ data: Department[] }>('/departments', {
      params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')),
    }),
  departmentStats: () => api.get<{ data: DepartmentStats }>('/departments/stats'),
  getDepartment: (id: string) => api.get<{ data: Department }>(`/departments/${id}`),
  createDepartment: (data: Record<string, unknown>) => api.post<{ data: Department }>('/departments', data),
  updateDepartment: (id: string, data: Record<string, unknown>) =>
    api.put<{ data: Department }>(`/departments/${id}`, data),
  bulkDepartmentStatus: (ids: string[], status: string) =>
    api.post<{ data: { updated: number } }>('/departments/bulk-status', { ids, status }),
  duplicateDepartment: (id: string) => api.post<{ data: Department }>(`/departments/${id}/duplicate`),
  deleteDepartment: (id: string) => api.delete(`/departments/${id}`),
  seedDepartments: () => api.post<{ data: Department[] }>('/departments/seed-defaults'),

  categories: () =>
    api.get<{ categories: EmploymentCategory[]; totalStaff: number }>('/categories'),
  createCategory: (data: Record<string, unknown>) => api.post('/categories', data),
  updateCategory: (id: string, data: Record<string, unknown>) => api.put(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
  seedCategories: () => api.post('/categories/seed-defaults'),

  leave: (params?: Record<string, string | undefined>) =>
    api.get<{ data: LeaveRequest[]; stats: Record<string, number>; pagination: Record<string, number> }>(
      '/leave',
      { params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')) }
    ),
  leaveKpis: () => api.get<{ success: boolean; data: LeaveKpis }>('/leave/kpis'),
  leaveCharts: () =>
    api.get<{
      success: boolean;
      data: {
        utilization: { month: string; used: number; entitled: number }[];
        byMonth: { month: string; requests: number }[];
        byDepartment: { department: string; count: number }[];
        byType: { type: string; count: number }[];
        trend: { month: string; approved: number; rejected: number }[];
      };
    }>('/leave/charts'),
  leaveRequests: (filters?: Partial<LeaveFilters>) =>
    api.get<{ success: boolean; data: LeaveRequestRow[] }>('/leave/requests', {
      params: Object.fromEntries(
        Object.entries(filters ?? {}).filter(([, v]) => v != null && v !== '')
      ),
    }),
  getLeaveRequest: (id: string) =>
    api.get<{ success: boolean; data: Record<string, unknown> }>(`/leave/${id}`),
  createLeave: (data: Record<string, unknown>) => api.post('/leave', data),
  createLeaveRequest: (data: Record<string, unknown>) => api.post('/leave', data),
  updateLeaveRequest: (id: string, data: Record<string, unknown>) => api.put(`/leave/${id}`, data),
  updateLeaveStatus: (id: string, status: 'APPROVED' | 'REJECTED') =>
    api.patch(`/leave/${id}/status`, { status }),
  approveLeave: (id: string) => api.post(`/leave/${id}/approve`),
  rejectLeave: (id: string, reason?: string) => api.post(`/leave/${id}/reject`, { reason }),
  cancelLeave: (id: string) => api.post(`/leave/${id}/cancel`),
  leaveEmployeeLookup: (q?: string) =>
    api.get<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        employeeId: string;
        department: string;
        position: string;
        branch: string;
        manager: string;
        gender: string;
        yearsOfService: number;
      }>;
    }>('/leave/employees', { params: q ? { q } : undefined }),
  leaveBalance: (employeeId: string, leaveType: string) =>
    api.get<{
      success: boolean;
      data: { balance: number; opening: number; earned: number; carryForward: number };
    }>(`/leave/balance/${employeeId}`, { params: { leaveType } }),
  publicHolidays: (start: string, end: string) =>
    api.get<{ success: boolean; data: string[] }>('/leave/holidays', { params: { start, end } }),
  leavePolicies: () => api.get<{ success: boolean; data: LeavePolicy[] }>('/leave/policies'),
  createLeavePolicy: (payload: Omit<LeavePolicy, 'id'>) => api.post('/leave/policies', payload),
  updateLeavePolicy: (id: string, payload: Partial<LeavePolicy>) => api.put(`/leave/policies/${id}`, payload),
  deleteLeavePolicy: (id: string) => api.delete(`/leave/policies/${id}`),

  documents: (params?: Record<string, string | undefined>) =>
    api.get('/documents', {
      params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')),
    }),
  createDocument: (data: Record<string, unknown>) => api.post('/documents', data),
  uploadDocument: (employeeId: string, category: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('employeeId', employeeId);
    form.append('category', category);
    return api.post<{ success: boolean; data: EmployeeDocument }>('/documents/upload', form);
  },
  downloadDocument: (id: string) =>
    api.get<Blob>(`/documents/${id}/file`, { responseType: 'blob' }),

  qualifications: (params?: Record<string, string | undefined>) =>
    api.get<{ data: Qualification[]; stats: Record<string, number>; levelDistribution: Record<string, number> }>(
      '/qualifications',
      { params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')) }
    ),
  verifyQualification: (id: string) => api.patch(`/qualifications/${id}/verify`),

  constants: () => api.get<{ data: { leaveTypes: string[]; qualificationLevels: string[] } }>('/constants'),
};
