/**
 * KaziAvance (TichaAvance) API scopes — employee advances + org-admin approval.
 * Upstream paths include /api prefix (KaziAvance mounts routes at /api/*).
 */

export interface DeveloperScopeEndpoint {
  method: string;
  path: string;
  summary: string;
}

export interface DeveloperScopeDef {
  key: string;
  label: string;
  endpoints: DeveloperScopeEndpoint[];
}

export const KAZIAVANCE_SCOPES: DeveloperScopeDef[] = [
  {
    key: 'kazi.read',
    label: 'Read TichaAvance / Kazi Data',
    endpoints: [
      { method: 'GET', path: '/health', summary: 'Service health' },
      { method: 'GET', path: '/api/employee/dashboard', summary: 'Employee financial dashboard' },
      { method: 'GET', path: '/api/employee/salary-history', summary: 'Employee salary history' },
      { method: 'GET', path: '/api/employee/advance-history', summary: 'Employee advance history' },
      { method: 'GET', path: '/api/employee/workflow', summary: 'Advance approval workflow timeline' },
      { method: 'GET', path: '/api/advance/catalog', summary: 'Cashout catalog & deals' },
      { method: 'GET', path: '/api/advance/deals', summary: 'Active deals catalog' },
      { method: 'GET', path: '/api/advance/requests/{id}/receipt', summary: 'Advance receipt (employee)' },
      { method: 'GET', path: '/api/org-admin/dashboard', summary: 'Org admin dashboard' },
      { method: 'GET', path: '/api/org-admin/employees', summary: 'List employees' },
      { method: 'GET', path: '/api/org-admin/employees/lookup', summary: 'Search staff by id, code, email, phone' },
      { method: 'GET', path: '/api/org-admin/employees/{id}', summary: 'Get employee' },
      { method: 'GET', path: '/api/org-admin/employees/{id}/profile', summary: 'Employee profile' },
      { method: 'GET', path: '/api/org-admin/requests', summary: 'List advance requests' },
      { method: 'GET', path: '/api/org-admin/requests/workspace', summary: 'Requests workspace' },
      { method: 'GET', path: '/api/org-admin/requests/{id}', summary: 'Request detail' },
      { method: 'GET', path: '/api/org-admin/requests/{id}/receipt', summary: 'Request receipt (admin)' },
      { method: 'GET', path: '/api/org-admin/active-advances', summary: 'Active advances' },
      { method: 'GET', path: '/api/org-admin/repayments', summary: 'Repayment schedule' },
      { method: 'GET', path: '/api/org-admin/repayments/workspace', summary: 'Repayments workspace' },
      { method: 'GET', path: '/api/org-admin/policies', summary: 'Advance policies' },
      { method: 'GET', path: '/api/org-admin/audit-logs', summary: 'Audit logs' },
      { method: 'GET', path: '/api/org-admin/notifications', summary: 'Notifications' },
      { method: 'GET', path: '/api/org-admin/reports/workspace', summary: 'Reports workspace' },
    ],
  },
  {
    key: 'kazi.write',
    label: 'Submit & Manage Advance Requests',
    endpoints: [
      { method: 'POST', path: '/api/advance/calculator', summary: 'Repayment calculator' },
      { method: 'POST', path: '/api/advance/requests', summary: 'Submit advance request (teacher)' },
      { method: 'PATCH', path: '/api/advance/requests/{id}', summary: 'Update pending request' },
      { method: 'DELETE', path: '/api/advance/requests/{id}', summary: 'Cancel pending request' },
      { method: 'POST', path: '/api/org-admin/requests', summary: 'Create manual request (admin)' },
      { method: 'POST', path: '/api/org-admin/employees', summary: 'Create employee' },
      { method: 'PATCH', path: '/api/org-admin/employees/{id}', summary: 'Update employee' },
      { method: 'PATCH', path: '/api/org-admin/employees/{id}/phone', summary: 'Update employee phone' },
      { method: 'PATCH', path: '/api/org-admin/employees/{id}/salary', summary: 'Update employee salary' },
      { method: 'PATCH', path: '/api/org-admin/employees/{id}/eligibility', summary: 'Update eligibility' },
      {
        method: 'POST',
        path: '/api/org-admin/employees/{id}/advance-setup',
        summary: 'Set salary + enable TichaAvance in one step',
      },
      { method: 'POST', path: '/api/org-admin/employees/sync-directory', summary: 'Sync staff directory' },
      { method: 'POST', path: '/api/org-admin/employees/sync-payroll', summary: 'Sync salaries from Payroll' },
      { method: 'POST', path: '/api/org-admin/employees/{id}/fetch-payroll-salary', summary: 'Fetch one salary from Payroll' },
      { method: 'PUT', path: '/api/org-admin/policies', summary: 'Update advance policies' },
      { method: 'POST', path: '/api/tenant/create', summary: 'Create tenant (service)' },
    ],
  },
  {
    key: 'kazi.approve',
    label: 'Approve, Reject & Disburse Advances',
    endpoints: [
      {
        method: 'PATCH',
        path: '/api/org-admin/requests/{id}',
        summary: 'Approve / reject / review / disburse request',
      },
      { method: 'POST', path: '/api/org-admin/employees/{id}/login', summary: 'Create employee portal login' },
      { method: 'POST', path: '/api/org-admin/employees/{id}/reset-password', summary: 'Reset employee password' },
      { method: 'POST', path: '/api/org-admin/employees/{id}/disable-login', summary: 'Disable employee login' },
      { method: 'POST', path: '/api/org-admin/employees/{id}/enable-login', summary: 'Enable employee login' },
    ],
  },
];

export function kaziAvancePermissionConfig() {
  return {
    label: 'KaziAvance (TichaAvance)',
    permissions: KAZIAVANCE_SCOPES.map(({ key, label, endpoints }) => ({
      key,
      label,
      endpoints,
    })),
  };
}
