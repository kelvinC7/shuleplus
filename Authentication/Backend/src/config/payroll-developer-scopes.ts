/**
 * Payroll module API scopes — mirrors Payroll/Backend routes.
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

export const PAYROLL_SCOPES: DeveloperScopeDef[] = [
  {
    key: 'payroll.read',
    label: 'Read Payroll & Staff',
    endpoints: [
      { method: 'GET', path: '/health', summary: 'Service health' },
      { method: 'GET', path: '/dashboard', summary: 'Payroll dashboard' },
      { method: 'GET', path: '/settings', summary: 'Payroll settings' },
      { method: 'GET', path: '/templates/active', summary: 'Active payslip template' },
      { method: 'GET', path: '/templates/preview', summary: 'Preview payslip template' },
      { method: 'GET', path: '/templates/history', summary: 'Template history' },
      { method: 'GET', path: '/staff/directory', summary: 'Staff directory' },
      { method: 'GET', path: '/staff', summary: 'List payroll staff' },
      { method: 'GET', path: '/staff/{id}', summary: 'Get staff member' },
      { method: 'GET', path: '/staff/{id}/profile', summary: 'Staff payroll profile' },
      { method: 'GET', path: '/hr/departments', summary: 'HR departments' },
      { method: 'GET', path: '/employee-deductions', summary: 'List employee deductions' },
      { method: 'GET', path: '/advance-check/{staffId}', summary: 'Active salary advances for staff' },
      { method: 'GET', path: '/runs', summary: 'List payroll runs' },
      { method: 'GET', path: '/runs/{id}', summary: 'Get payroll run detail' },
      { method: 'GET', path: '/terminations', summary: 'List terminations' },
      { method: 'GET', path: '/disbursement/rules', summary: 'Disbursement rules' },
      { method: 'GET', path: '/disbursement/payments', summary: 'Bank disbursement rows for run' },
      { method: 'GET', path: '/disbursement/audit', summary: 'Disbursement audit trail' },
      { method: 'GET', path: '/payslip-branding', summary: 'Payslip branding' },
      { method: 'GET', path: '/my-payroll', summary: 'Self-service payslip history' },
    ],
  },
  {
    key: 'payroll.process',
    label: 'Process Payroll & Disbursement',
    endpoints: [
      { method: 'POST', path: '/seed', summary: 'Seed demo payroll data' },
      { method: 'PUT', path: '/settings', summary: 'Update payroll settings' },
      { method: 'PUT', path: '/templates/active', summary: 'Save payslip template' },
      { method: 'POST', path: '/templates/activate', summary: 'Activate template' },
      { method: 'POST', path: '/templates/deactivate', summary: 'Deactivate template' },
      { method: 'POST', path: '/staff', summary: 'Create payroll staff' },
      { method: 'PUT', path: '/staff/{id}', summary: 'Update staff' },
      { method: 'PUT', path: '/staff/{id}/profile', summary: 'Update staff profile' },
      { method: 'DELETE', path: '/staff/{id}', summary: 'Delete staff' },
      { method: 'POST', path: '/staff/bulk-delete', summary: 'Bulk delete staff' },
      { method: 'POST', path: '/staff/import/validate', summary: 'Validate staff import' },
      { method: 'POST', path: '/staff/import', summary: 'Import staff CSV' },
      { method: 'POST', path: '/staff/sync-from-hr', summary: 'Sync all staff from HR' },
      { method: 'POST', path: '/employee-deductions', summary: 'Create deduction' },
      { method: 'PATCH', path: '/employee-deductions/{id}', summary: 'Update deduction' },
      { method: 'DELETE', path: '/employee-deductions/{id}', summary: 'Delete deduction' },
      { method: 'POST', path: '/runs/preview', summary: 'Preview payroll run' },
      { method: 'POST', path: '/runs/trigger', summary: 'Trigger payroll run' },
      { method: 'PATCH', path: '/runs/{id}/mark-paid', summary: 'Mark run paid (pushes Kazi deductions)' },
      { method: 'DELETE', path: '/runs/{id}', summary: 'Delete payroll run' },
      { method: 'POST', path: '/terminations', summary: 'Create termination record' },
      { method: 'PATCH', path: '/terminations/{id}/status', summary: 'Update termination status' },
      { method: 'POST', path: '/disbursement/rules', summary: 'Create disbursement rule' },
      { method: 'POST', path: '/disbursement/apply-deductions', summary: 'Apply scheduled deductions on run' },
      { method: 'PUT', path: '/payslip-branding', summary: 'Update payslip branding' },
      { method: 'POST', path: '/tenant/create', summary: 'Create tenant (service)' },
    ],
  },
];

export function payrollPermissionConfig() {
  return {
    label: 'Payroll',
    permissions: PAYROLL_SCOPES.map(({ key, label, endpoints }) => ({
      key,
      label,
      endpoints,
    })),
  };
}
