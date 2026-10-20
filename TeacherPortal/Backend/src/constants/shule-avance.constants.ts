export type ShuleAvanceCatalogTypeName = 'cashout' | 'service';
export type ShuleAvanceRequestTypeName = 'cashout' | 'service';
export type ShuleAvanceRequestStatusName =
  | 'pending_accountant'
  | 'sent_to_manager'
  | 'approved'
  | 'rejected_by_accountant'
  | 'rejected_by_manager';

export const DEFAULT_CATALOG_ITEMS: Array<{
  slug: string;
  name: string;
  type: ShuleAvanceCatalogTypeName;
  description: string;
  icon: string;
  sortOrder: number;
}> = [
  {
    slug: 'general',
    name: 'General Cashout',
    type: 'cashout',
    description: 'Instant salary advance to mobile money',
    icon: 'wallet',
    sortOrder: 0,
  },
  {
    slug: 'cash_power',
    name: 'Cash Power',
    type: 'service',
    description: 'Electricity bill payment',
    icon: 'zap',
    sortOrder: 1,
  },
  {
    slug: 'airtime_data',
    name: 'Airtime & Data',
    type: 'service',
    description: 'Mobile airtime and data bundles',
    icon: 'smartphone',
    sortOrder: 2,
  },
  {
    slug: 'water',
    name: 'Water Bill',
    type: 'service',
    description: 'Water utility payment',
    icon: 'droplets',
    sortOrder: 3,
  },
  {
    slug: 'groceries',
    name: 'Groceries',
    type: 'service',
    description: 'Essential groceries support',
    icon: 'shopping-bag',
    sortOrder: 4,
  },
];

export const AUTO_APPROVAL_PERCENT = 10;
export const REPAYMENT_TERM_MIN = 1;
export const REPAYMENT_TERM_MAX = 18;

export const PENDING_STATUSES = [
  'pending_accountant',
  'sent_to_manager',
] as const;

export const APPLICANT_ROLES = [
  'teacher',
  'hod',
  'dos',
  'accountant',
  'librarian',
  'storekeeper',
  'secretary',
  'hr',
  'organization_admin',
  'organization_member',
] as const;

export const FINANCE_ROLES = ['organization_admin', 'accountant', 'finance'] as const;
export const MANAGER_ROLES = [
  'organization_admin',
  'school_manager',
  'manager',
  'dos',
] as const;

export const APPROVER_ROLES = ['manager', 'accountant'] as const;
