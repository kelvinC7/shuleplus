import { apiFetch } from "@/lib/api";
import type {
  ActiveAdvanceRow,
  AdminDashboardData,
  AdminEmployee,
  AdvanceRequestRow,
  AuditLogRow,
  AuditWorkspace,
  NotificationRow,
  NotificationsWorkspace,
  OrgPolicies,
  RepaymentRow,
  RepaymentsWorkspace,
  ReportsWorkspace,
  EmployeeProfile,
  LoginActionResult,
  RequestsWorkspace,
} from "@/modules/admin/types";

export const adminApi = {
  getDashboard: () => apiFetch<AdminDashboardData>("/api/org-admin/dashboard"),

  getEmployees: (search?: string) =>
    apiFetch<{ data: AdminEmployee[] }>(`/api/org-admin/employees${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  syncDirectory: () =>
    apiFetch<{ sync: { hr: number; timetable: number; iam: number; upserted: number }; data: AdminEmployee[] }>(
      "/api/org-admin/employees/sync-directory",
      { method: "POST" }
    ),

  syncPayrollSalaries: () =>
    apiFetch<{ sync: { updated: number; matched: number }; data: AdminEmployee[] }>(
      "/api/org-admin/employees/sync-payroll",
      { method: "POST" }
    ),

  getEmployee: (id: string) => apiFetch<AdminEmployee>(`/api/org-admin/employees/${id}`),

  getEmployeeProfile: (id: string) => apiFetch<EmployeeProfile>(`/api/org-admin/employees/${id}/profile`),

  createEmployeeLogin: (id: string, body?: { password?: string; sendCredentialsEmail?: boolean }) =>
    apiFetch<LoginActionResult>(`/api/org-admin/employees/${id}/login`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  resetEmployeePassword: (id: string, body?: { password?: string; sendEmail?: boolean }) =>
    apiFetch<LoginActionResult>(`/api/org-admin/employees/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  disableEmployeeLogin: (id: string) =>
    apiFetch<LoginActionResult>(`/api/org-admin/employees/${id}/disable-login`, { method: "POST" }),

  enableEmployeeLogin: (id: string) =>
    apiFetch<LoginActionResult>(`/api/org-admin/employees/${id}/enable-login`, { method: "POST" }),

  createEmployee: (body: {
    fullName: string;
    email: string;
    department: string;
    position: string;
    phone?: string;
    netSalary: number;
    grossSalary?: number;
  }) =>
    apiFetch("/api/org-admin/employees", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateEmployeePhone: (id: string, phone: string | null) =>
    apiFetch(`/api/org-admin/employees/${id}/phone`, {
      method: "PATCH",
      body: JSON.stringify({ phone }),
    }),

  updateEligibility: (id: string, body: Record<string, unknown>) =>
    apiFetch(`/api/org-admin/employees/${id}/eligibility`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateEmployee: (id: string, body: Record<string, unknown>) =>
    apiFetch<AdminEmployee>(`/api/org-admin/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateEmployeeSalary: (
    id: string,
    body: {
      grossSalary: number;
      allowances?: number;
      deductions?: number;
      netSalary?: number;
      effectiveDate?: string;
      reason?: string;
    }
  ) =>
    apiFetch<AdminEmployee>(`/api/org-admin/employees/${id}/salary`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  fetchPayrollSalary: (id: string) =>
    apiFetch<AdminEmployee>(`/api/org-admin/employees/${id}/fetch-payroll-salary`, { method: "POST" }),

  getRequests: (status?: string) =>
    apiFetch<{ data: AdvanceRequestRow[] }>(
      `/api/org-admin/requests${status && status !== "All" ? `?status=${encodeURIComponent(status)}` : ""}`
    ),

  getRequestsWorkspace: () => apiFetch<RequestsWorkspace>("/api/org-admin/requests/workspace"),

  getRequest: (id: string) => apiFetch<AdvanceRequestRow>(`/api/org-admin/requests/${id}`),

  createManualRequest: (body: {
    employeeId: string;
    amount: number;
    months: number;
    purpose: string;
    description?: string;
  }) =>
    apiFetch(`/api/org-admin/requests`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateRequest: (id: string, action: string, body?: { amount?: number; comment?: string }) =>
    apiFetch(`/api/org-admin/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action, ...body }),
    }),

  getActiveAdvances: () => apiFetch<{ data: ActiveAdvanceRow[] }>("/api/org-admin/active-advances"),

  getRepayments: () => apiFetch<{ data: RepaymentRow[] }>("/api/org-admin/repayments"),

  getRepaymentsWorkspace: () => apiFetch<RepaymentsWorkspace>("/api/org-admin/repayments/workspace"),

  getPolicies: () => apiFetch<OrgPolicies>("/api/org-admin/policies"),

  updatePolicies: (body: Partial<OrgPolicies>) =>
    apiFetch<OrgPolicies>("/api/org-admin/policies", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getAuditLogs: (search?: string) =>
    apiFetch<{ data: AuditLogRow[] }>(
      `/api/org-admin/audit-logs${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),

  getAuditWorkspace: () => apiFetch<AuditWorkspace>("/api/org-admin/audit-logs/workspace"),

  getNotifications: () => apiFetch<{ data: NotificationRow[] }>("/api/org-admin/notifications"),

  getNotificationsWorkspace: () =>
    apiFetch<NotificationsWorkspace>("/api/org-admin/notifications/workspace"),

  getReportsWorkspace: () => apiFetch<ReportsWorkspace>("/api/org-admin/reports/workspace"),
};
