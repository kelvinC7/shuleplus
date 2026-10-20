export const CA_FINANCE_MODULES = [
  {
    key: 'schoolFees',
    label: 'School fees',
    options: ['view', 'reconcile', 'adjust', 'administer'],
  },
  {
    key: 'expenses',
    label: 'Expenses',
    options: ['view', 'prepare', 'approve', 'administer'],
  },
  {
    key: 'payroll',
    label: 'Payroll',
    options: ['summary', 'review', 'approve', 'detailed'],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    options: ['view', 'post', 'administer'],
  },
  {
    key: 'budget',
    label: 'Budget',
    options: ['view', 'prepare', 'approve', 'administer'],
  },
  {
    key: 'reports',
    label: 'Reports',
    options: ['view', 'export', 'schedule'],
  },
  {
    key: 'approvals',
    label: 'Approvals',
    options: ['view', 'action'],
  },
] as const;

export type CaFinanceModuleKey = (typeof CA_FINANCE_MODULES)[number]['key'];

export type CaFinancePermissions = Partial<Record<CaFinanceModuleKey, string>>;
