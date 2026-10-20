import { api } from './api';
import type {
  DashboardSummary,
  OrganizationProfile,
  ActionPlan,
  ActionPlanTask,
  ActionPlanAttachment,
  Milestone,
  Budget,
  BudgetLine,
  Expense,
  PeriodReview,
  Risk,
  Issue,
  Kpi,
  Category,
  Meeting,
  Template,
  TemplateCatalog,
  TemplateRecommendation,
  Notification,
  AuditLog,
  ApPermissionsInfo,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3034/api';
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export function uploadFileUrl(filePath?: string | null): string {
  if (!filePath) return '#';
  if (filePath.startsWith('http')) return filePath;
  return `${API_ORIGIN}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
}

export const apApi = {
  dashboard: () => api.get<{ data: DashboardSummary }>('/dashboard'),
  organizationProfile: () => api.get<{ success: boolean; data: OrganizationProfile }>('/organization/profile'),
  constants: () => api.get<{ data: { planStatuses: string[]; priorities: string[]; expenseCategories: string[]; resourceTypes: string[]; templateTypes: { id: string; name: string; description: string }[] } }>('/constants'),
  permissions: () => api.get<{ success: boolean; data: ApPermissionsInfo }>('/permissions'),

  // Action Plans
  listPlans: (params?: Record<string, string | number | undefined>) =>
    api.get<{ success: boolean; data: ActionPlan[]; pagination: Record<string, number> }>('/plans', {
      params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')),
    }),

  getPlan: (id: string) => api.get<{ success: boolean; data: ActionPlan }>(`/plans/${id}`),
  createPlan: (data: Record<string, unknown>) => api.post<{ success: boolean; data: ActionPlan }>('/plans', data),
  updatePlan: (id: string, data: Record<string, unknown>) => api.put<{ success: boolean; data: ActionPlan }>(`/plans/${id}`, data),
  deletePlan: (id: string) => api.delete(`/plans/${id}`),

  // Approvals
  submitForApproval: (id: string) => api.post(`/plans/${id}/submit`),
  approve: (id: string, level: number, data: { status: string; comments?: string; approverName?: string; digitalSignature?: string }) =>
    api.post(`/plans/${id}/approve/${level}`, data),

  // Tasks
  listTasks: (actionPlanId?: string) =>
    api.get<{ success: boolean; data: ActionPlanTask[] }>('/tasks', { params: { actionPlanId } }),
  createTask: (actionPlanId: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: ActionPlanTask }>(`/plans/${actionPlanId}/tasks`, data),
  updateTask: (id: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean; data: ActionPlanTask }>(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),
  createDependency: (data: { taskId: string; dependsOnId: string; type?: string; lagDays?: number }) =>
    api.post('/tasks/dependencies', data),

  // Comments
  addComment: (actionPlanId: string, data: { content: string; parentId?: string; mentions?: string[] }) =>
    api.post(`/plans/${actionPlanId}/comments`, data),

  // Milestones
  createMilestone: (actionPlanId: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: Milestone }>(`/plans/${actionPlanId}/milestones`, data),
  updateMilestone: (id: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean; data: Milestone }>(`/milestones/${id}`, data),

  // Budget
  budgetLines: () => api.get<{ success: boolean; data: BudgetLine[] }>('/budget-lines'),
  upsertBudget: (actionPlanId: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: Budget }>(`/plans/${actionPlanId}/budget`, data),

  // Expenses
  listExpenses: (actionPlanId: string) =>
    api.get<{ success: boolean; data: Expense[] }>(`/plans/${actionPlanId}/expenses`),
  createExpense: (actionPlanId: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: Expense }>(`/plans/${actionPlanId}/expenses`, data),

  // Evidence / Attachments
  uploadAttachment: (actionPlanId: string, file: File, meta?: { category?: string; taskId?: string }) => {
    const form = new FormData();
    form.append('file', file);
    if (meta?.category) form.append('category', meta.category);
    if (meta?.taskId) form.append('taskId', meta.taskId);
    return api.post<{ success: boolean; data: ActionPlanAttachment }>(
      `/plans/${actionPlanId}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
  verifyAttachment: (id: string) =>
    api.post<{ success: boolean; data: ActionPlanAttachment }>(`/attachments/${id}/verify`),
  deleteAttachment: (id: string) => api.delete(`/attachments/${id}`),

  // Period Reviews
  listReviews: (reviewType?: string) =>
    api.get<{ success: boolean; data: PeriodReview[] }>('/reviews', {
      params: reviewType ? { reviewType } : undefined,
    }),
  createReview: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: PeriodReview }>('/reviews', data),

  // Risks
  createRisk: (actionPlanId: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: Risk }>(`/plans/${actionPlanId}/risks`, data),
  updateRisk: (id: string, data: Record<string, unknown>) =>
    api.put<{ success: boolean; data: Risk }>(`/risks/${id}`, data),

  // Issues
  createIssue: (actionPlanId: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: Issue }>(`/plans/${actionPlanId}/issues`, data),
  resolveIssue: (id: string, resolution: string) =>
    api.put(`/issues/${id}/resolve`, { resolution }),

  // KPIs
  createKpi: (actionPlanId: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: Kpi }>(`/plans/${actionPlanId}/kpis`, data),
  updateKpiValue: (id: string, currentValue: number) =>
    api.put(`/kpis/${id}/value`, { currentValue }),

  // Staff
  listStaff: () => api.get<{ success: boolean; data: import('@/lib/plan-wizard-types').StaffOption[] }>('/staff'),
  getAcademicSettings: () =>
    api.get<{ success: boolean; data: import('@/lib/plan-wizard-types').AcademicSettings }>('/academic-settings'),

  // Categories
  listCategories: () => api.get<{ success: boolean; data: Category[] }>('/categories'),
  createCategory: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: Category }>('/categories', data),
  seedDefaultCategories: () => api.post('/categories/seed-defaults'),

  // Notifications
  listNotifications: () => api.get<{ success: boolean; data: Notification[] }>('/notifications'),
  markNotificationRead: (id: string) => api.put(`/notifications/${id}/read`),
  syncNotifications: () => api.post<{ success: boolean; data: { created: number } }>('/notifications/sync'),

  // Activities
  listActivities: (params?: { entityType?: string; entityId?: string; limit?: number }) =>
    api.get<{ success: boolean; data: AuditLog[] }>('/activities', { params }),

  // Templates
  listTemplates: (params?: { categoryId?: string; ownership?: string; search?: string }) =>
    api.get<{ success: boolean; data: Template[] }>('/templates', { params }),
  getTemplateCatalog: () => api.get<{ success: boolean; data: TemplateCatalog }>('/templates/catalog'),
  getRecommendedTemplates: () => api.get<{ success: boolean; data: TemplateRecommendation[] }>('/templates/recommended'),
  getTemplate: (id: string) => api.get<{ success: boolean; data: Template }>(`/templates/${id}`),
  createTemplate: (data: Record<string, unknown>) => api.post('/templates', data),
  updateTemplate: (id: string, data: Record<string, unknown>) => api.put(`/templates/${id}`, data),
  createTemplateFromPlan: (planId: string, data: Record<string, unknown>) =>
    api.post(`/templates/from-plan/${planId}`, data),
  applyTemplate: (id: string, data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: ActionPlan }>(`/templates/${id}/apply`, data),
  deleteTemplate: (id: string) => api.delete(`/templates/${id}`),
  seedOfficialTemplates: () => api.post('/templates/seed-official'),

  // Meetings
  listMeetings: (actionPlanId?: string) =>
    api.get<{ success: boolean; data: Meeting[] }>('/meetings', { params: { actionPlanId } }),
  createMeeting: (data: Record<string, unknown>) => api.post('/meetings', data),
  addMeetingMinute: (meetingId: string, data: Record<string, unknown>) =>
    api.post(`/meetings/${meetingId}/minutes`, data),

  // Recurring Plans
  createRecurringPlan: (data: Record<string, unknown>) => api.post('/recurring-plans', data),

  // Resources
  createResourceAllocation: (actionPlanId: string, data: Record<string, unknown>) =>
    api.post(`/plans/${actionPlanId}/resources`, data),
};
