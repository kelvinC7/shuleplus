import { api, unwrap } from '@/services/api';
import type {
  AnalyticsData,
  ApiEnvelope,
  AuditLog,
  BudgetOptions,
  CreateBudgetPayload,
  CreateLinePayload,
  CreateUsagePayload,
  DashboardSummary,
  DepartmentAgg,
  LineOptions,
  LinesSummary,
  ManagerOverview,
  SchoolBudget,
  BudgetLine,
  BudgetLineUsage,
  VsActualRow,
} from '@/types';
import type { AcademicSettings } from '@/lib/academic-settings';

export const budgetApi = {
  tenantEnsure: (body?: { organizationName?: string; organizationCode?: string }) =>
    api.post<ApiEnvelope<unknown>>('/tenant/ensure', body ?? {}),

  dashboard: (budgetId?: string) =>
    api.get<ApiEnvelope<DashboardSummary>>('/dashboard', {
      params: budgetId ? { budget_id: budgetId } : undefined,
    }),

  options: () => api.get<ApiEnvelope<BudgetOptions>>('/options'),

  budgets: (status?: string) =>
    api.get<ApiEnvelope<SchoolBudget[]>>('/budgets', {
      params: status ? { status } : undefined,
    }),

  budget: (id: string) => api.get<ApiEnvelope<SchoolBudget>>(`/budgets/${id}`),

  createBudget: (body: CreateBudgetPayload) =>
    api.post<ApiEnvelope<SchoolBudget>>('/budgets', body),

  updateBudget: (id: string, body: Partial<CreateBudgetPayload>) =>
    api.patch<ApiEnvelope<SchoolBudget>>(`/budgets/${id}`, body),

  deleteBudget: (id: string) => api.delete<ApiEnvelope<{ deleted: boolean }>>(`/budgets/${id}`),

  reviewBudget: (id: string, body: { decision: string; notes?: string }) =>
    api.patch<ApiEnvelope<SchoolBudget>>(`/budgets/${id}/review`, body),

  managerOverview: () =>
    api.get<ApiEnvelope<ManagerOverview>>('/budgets/manager-overview'),

  budgetLines: (budgetId?: string) =>
    api.get<ApiEnvelope<BudgetLine[]>>('/budget-lines', {
      params: budgetId ? { budget_id: budgetId } : undefined,
    }),

  budgetLinesSummary: (budgetId?: string) =>
    api.get<ApiEnvelope<LinesSummary>>('/budget-lines/summary', {
      params: budgetId ? { budget_id: budgetId } : undefined,
    }),

  budgetLineOptions: () =>
    api.get<ApiEnvelope<LineOptions>>('/budget-lines/options'),

  createBudgetLine: (body: CreateLinePayload) =>
    api.post<ApiEnvelope<BudgetLine>>('/budget-lines', body),

  updateBudgetLine: (id: string, body: Partial<CreateLinePayload>) =>
    api.patch<ApiEnvelope<BudgetLine>>(`/budget-lines/${id}`, body),

  freezeBudgetLine: (id: string, freeze = true) =>
    api.patch<ApiEnvelope<BudgetLine>>(`/budget-lines/${id}/freeze`, { freeze }),

  createUsage: (body: CreateUsagePayload) =>
    api.post<ApiEnvelope<BudgetLineUsage>>('/budget-line-usage', body),

  listUsage: (params?: { budgetId?: string; budgetLineId?: string }) =>
    api.get<ApiEnvelope<BudgetLineUsage[]>>('/budget-line-usage', {
      params: {
        ...(params?.budgetId ? { budget_id: params.budgetId } : {}),
        ...(params?.budgetLineId ? { budget_line_id: params.budgetLineId } : {}),
      },
    }),

  departments: (budgetId?: string) =>
    api.get<ApiEnvelope<DepartmentAgg[]>>('/departments', {
      params: budgetId ? { budget_id: budgetId } : undefined,
    }),

  vsActual: (budgetId?: string) =>
    api.get<ApiEnvelope<VsActualRow[]>>('/vs-actual', {
      params: budgetId ? { budget_id: budgetId } : undefined,
    }),

  auditLogs: (budgetId?: string) =>
    api.get<ApiEnvelope<AuditLog[]>>('/audit-logs', {
      params: budgetId ? { budget_id: budgetId } : undefined,
    }),

  analytics: (budgetId?: string) =>
    api.get<ApiEnvelope<AnalyticsData>>('/analytics', {
      params: budgetId ? { budget_id: budgetId } : undefined,
    }),

  getAcademicSettings: () => api.get<ApiEnvelope<AcademicSettings>>('/settings/academic'),

  updateAcademicSettings: (body: AcademicSettings) =>
    api.put<ApiEnvelope<AcademicSettings>>('/settings/academic', body),
};

export { unwrap };
