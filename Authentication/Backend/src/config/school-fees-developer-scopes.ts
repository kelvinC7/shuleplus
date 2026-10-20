/**
 * SchoolFeesPortal API scopes — mirrors SchoolFeesPortal/Backend routes.
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

export const SCHOOL_FEES_SCOPES: DeveloperScopeDef[] = [
  {
    key: 'fees.read',
    label: 'Read Fees & Dashboard',
    endpoints: [
      { method: 'GET', path: '/health', summary: 'Service health' },
      { method: 'GET', path: '/public/student-fees', summary: 'Public student fee structure' },
      { method: 'GET', path: '/public/loans/types', summary: 'Loan product types' },
      { method: 'GET', path: '/dashboard', summary: 'Fees dashboard' },
      { method: 'GET', path: '/organization/branding', summary: 'Organization branding' },
      { method: 'GET', path: '/analytics', summary: 'Fees analytics' },
      { method: 'GET', path: '/reports', summary: 'Fees reports' },
      { method: 'GET', path: '/structures/summary', summary: 'Structures summary' },
      { method: 'GET', path: '/structures/academic-context', summary: 'Academic context for structures' },
      { method: 'GET', path: '/structures/babyeyi-items', summary: 'Babyeyi fee items import' },
      { method: 'GET', path: '/structures/export', summary: 'Export fee structures' },
      { method: 'GET', path: '/structures', summary: 'List fee structures' },
      { method: 'GET', path: '/structures/{id}', summary: 'Get fee structure' },
      { method: 'GET', path: '/categories', summary: 'List fee categories' },
      { method: 'GET', path: '/bills', summary: 'List bills' },
      { method: 'GET', path: '/payments', summary: 'List payments' },
      { method: 'GET', path: '/collections/fee-collection', summary: 'Fee collection overview' },
      { method: 'GET', path: '/collections/fee-collection/export', summary: 'Export fee collection' },
      { method: 'GET', path: '/collections/fee-collection/lookup', summary: 'Fee collection lookup' },
      { method: 'GET', path: '/collections/fee-collection/student-account', summary: 'Student fee account' },
      { method: 'GET', path: '/collections/command-center', summary: 'Collections command center' },
      { method: 'GET', path: '/collections/insights', summary: 'Collections insights' },
      { method: 'GET', path: '/students/{studentId}/financial-profile', summary: 'Student financial profile' },
      { method: 'GET', path: '/installments', summary: 'List installments' },
      { method: 'GET', path: '/installments/plans/{id}', summary: 'Get installment plan' },
      { method: 'GET', path: '/scholarships', summary: 'List scholarships' },
      { method: 'GET', path: '/sponsors', summary: 'List sponsors' },
      { method: 'GET', path: '/receipts/verify/{receiptNumber}', summary: 'Verify receipt' },
      { method: 'GET', path: '/receipts/{id}/pdf', summary: 'Receipt PDF' },
      { method: 'GET', path: '/receipts/{id}', summary: 'Get receipt' },
      { method: 'GET', path: '/receipts', summary: 'List receipts' },
      { method: 'GET', path: '/outstanding', summary: 'Outstanding balances' },
      { method: 'GET', path: '/reminders/dashboard', summary: 'Reminders dashboard' },
      { method: 'GET', path: '/reminders/classes', summary: 'Reminder classes' },
      { method: 'GET', path: '/reminders/recipients', summary: 'Reminder recipients' },
      { method: 'GET', path: '/reminders/triggers', summary: 'Reminder trigger types' },
      { method: 'GET', path: '/reminders/automations', summary: 'List reminder automations' },
      { method: 'GET', path: '/reminders/templates', summary: 'List reminder templates' },
      { method: 'GET', path: '/reminders/history', summary: 'Reminder history' },
      { method: 'GET', path: '/reminders/analytics', summary: 'Reminder analytics' },
      { method: 'GET', path: '/notifications', summary: 'List notifications' },
      { method: 'GET', path: '/approvals', summary: 'List approvals' },
      { method: 'GET', path: '/audit-logs', summary: 'Audit logs' },
      { method: 'GET', path: '/examination-eligibility', summary: 'Exam eligibility preview' },
      { method: 'GET', path: '/examination-eligibility/classes', summary: 'Exam eligibility classes' },
      { method: 'GET', path: '/service/parent-fees-summary', summary: 'Parent fees summary (service)' },
      { method: 'GET', path: '/service/parent-fees-transactions', summary: 'Parent fees transactions (service)' },
      { method: 'GET', path: '/service/examination-eligibility', summary: 'Exam eligibility lookup (service)' },
    ],
  },
  {
    key: 'payment.read',
    label: 'Read Payments & Receipts',
    endpoints: [
      { method: 'GET', path: '/public/payments/{reference}/status', summary: 'Public payment status' },
      { method: 'GET', path: '/public/receipts/{receiptNumber}', summary: 'Public receipt' },
      { method: 'GET', path: '/public/loans/{applicationNumber}/status', summary: 'Loan application status' },
    ],
  },
  {
    key: 'payment.create',
    label: 'Initiate Payments & Loans',
    endpoints: [
      { method: 'POST', path: '/public/payments/initiate', summary: 'Initiate public payment' },
      { method: 'POST', path: '/public/loans/applications', summary: 'Submit loan application' },
      { method: 'POST', path: '/bills', summary: 'Create bill' },
      { method: 'POST', path: '/payments', summary: 'Record payment' },
      { method: 'POST', path: '/collections/fee-collection/payments', summary: 'Record collection payment' },
    ],
  },
  {
    key: 'fees.write',
    label: 'Manage Fee Structures & Collections',
    endpoints: [
      { method: 'POST', path: '/structures', summary: 'Create fee structure' },
      { method: 'PUT', path: '/structures/{id}', summary: 'Update fee structure' },
      { method: 'DELETE', path: '/structures/{id}', summary: 'Delete fee structure' },
      { method: 'POST', path: '/structures/{id}/duplicate', summary: 'Duplicate fee structure' },
      { method: 'POST', path: '/installments/plans', summary: 'Create installment plan' },
      { method: 'POST', path: '/scholarships', summary: 'Create scholarship' },
      { method: 'POST', path: '/scholarships/preview-impact', summary: 'Preview scholarship impact' },
      { method: 'POST', path: '/scholarships/{id}/approve', summary: 'Approve scholarship' },
      { method: 'POST', path: '/scholarships/{id}/reject', summary: 'Reject scholarship' },
      { method: 'POST', path: '/reminders/automations', summary: 'Create reminder automation' },
      { method: 'PUT', path: '/reminders/automations/{id}', summary: 'Update reminder automation' },
      { method: 'PATCH', path: '/reminders/automations/{id}/status', summary: 'Set automation status' },
      { method: 'POST', path: '/reminders/automations/{id}/run', summary: 'Run reminder automation' },
      { method: 'DELETE', path: '/reminders/automations/{id}', summary: 'Delete reminder automation' },
      { method: 'POST', path: '/reminders/templates', summary: 'Create reminder template' },
      { method: 'POST', path: '/reminders/preview', summary: 'Preview reminder' },
      { method: 'POST', path: '/reminders/test', summary: 'Send test reminder' },
      { method: 'POST', path: '/reminders/send-now', summary: 'Send reminder now' },
      { method: 'POST', path: '/reminders/process', summary: 'Process reminders' },
      { method: 'POST', path: '/examination-eligibility/exception', summary: 'Exam eligibility exception' },
      { method: 'POST', path: '/examination-eligibility/publish', summary: 'Publish exam eligibility' },
      { method: 'POST', path: '/examination-eligibility/notify', summary: 'Notify exam eligibility' },
      { method: 'POST', path: '/tenant/create', summary: 'Create tenant (service)' },
      { method: 'POST', path: '/tenant/ensure', summary: 'Ensure tenant exists' },
    ],
  },
  {
    key: 'payment.refund',
    label: 'Void Receipts',
    endpoints: [
      { method: 'POST', path: '/receipts/{id}/void', summary: 'Void receipt' },
      { method: 'POST', path: '/receipts/{id}/send', summary: 'Send receipt' },
    ],
  },
];

export function schoolFeesPermissionConfig() {
  return {
    label: 'Payments & Fees',
    permissions: SCHOOL_FEES_SCOPES.map(({ key, label, endpoints }) => ({
      key,
      label,
      endpoints,
    })),
  };
}
