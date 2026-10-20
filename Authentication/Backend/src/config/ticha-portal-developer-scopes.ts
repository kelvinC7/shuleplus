/**
 * TichaPortal BFF — TichaAvance teacher routes (proxied to KaziAvance via /kazi/*).
 * Use when integrating the same paths the teacher portal UI calls.
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

export const TICHA_PORTAL_SCOPES: DeveloperScopeDef[] = [
  {
    key: 'ticha.read',
    label: 'Read TichaPortal / TichaAvance (BFF)',
    endpoints: [
      { method: 'GET', path: '/api/health', summary: 'BFF health' },
      { method: 'GET', path: '/kazi/api/employee/dashboard', summary: 'Teacher dashboard (Kazi proxy)' },
      { method: 'GET', path: '/kazi/api/employee/salary-history', summary: 'Salary history (Kazi proxy)' },
      { method: 'GET', path: '/kazi/api/employee/advance-history', summary: 'Advance history (Kazi proxy)' },
      { method: 'GET', path: '/kazi/api/employee/workflow', summary: 'Approval workflow (Kazi proxy)' },
      { method: 'GET', path: '/kazi/api/advance/catalog', summary: 'Cashout catalog (Kazi proxy)' },
      { method: 'GET', path: '/kazi/api/advance/deals', summary: 'Deals catalog (Kazi proxy)' },
      { method: 'GET', path: '/kazi/api/advance/requests/{id}/receipt', summary: 'Advance receipt (Kazi proxy)' },
      { method: 'GET', path: '/teacher-portal/staff/payroll/my', summary: 'Teacher payslip summary (Payroll+HR)' },
    ],
  },
  {
    key: 'ticha.write',
    label: 'Submit TichaAvance Requests (BFF)',
    endpoints: [
      { method: 'POST', path: '/kazi/api/advance/calculator', summary: 'Repayment calculator (Kazi proxy)' },
      { method: 'POST', path: '/kazi/api/advance/requests', summary: 'Submit advance request (Kazi proxy)' },
      { method: 'PATCH', path: '/kazi/api/advance/requests/{id}', summary: 'Update pending request (Kazi proxy)' },
      { method: 'DELETE', path: '/kazi/api/advance/requests/{id}', summary: 'Cancel request (Kazi proxy)' },
    ],
  },
];

export function tichaPortalPermissionConfig() {
  return {
    label: 'TichaPortal (TichaAvance BFF)',
    permissions: TICHA_PORTAL_SCOPES.map(({ key, label, endpoints }) => ({
      key,
      label,
      endpoints,
    })),
  };
}
