import type { LicensedModule } from '@/lib/org-admin-api';
import type { CaFinanceModuleKey } from '@/lib/chief-accountant-permission-ui';

export type CaModuleActivity = {
  id: string;
  label: string;
  description?: string;
};

export type CaOrgModuleDefinition = {
  slug: string;
  permissionKey: CaFinanceModuleKey;
  label: string;
  /** Chief Accountant portal path (same auth app) */
  workspacePath: string;
  /** Optional external product module URL slug hint */
  productHint?: string;
  levelOptions: { value: string; label: string }[];
  activities: CaModuleActivity[];
};

/** Maps org-licensed module slugs to Chief Accountant finance capabilities. */
export const CA_ORG_MODULE_DEFINITIONS: CaOrgModuleDefinition[] = [
  {
    slug: 'school-fees',
    permissionKey: 'schoolFees',
    label: 'School Fees',
    workspacePath: '/chief-accountant/finance/school-fees/dashboard',
    productHint: 'School Fees Portal',
    levelOptions: [
      { value: 'view', label: 'View only' },
      { value: 'reconcile', label: 'Reconcile & export' },
      { value: 'adjust', label: 'Adjust balances' },
      { value: 'administer', label: 'Full manage' },
    ],
    activities: [
      { id: 'dashboard', label: 'Fees dashboard' },
      { id: 'structures', label: 'Fee structures' },
      { id: 'student_accounts', label: 'Student fee accounts' },
      { id: 'invoices', label: 'Invoices & bills' },
      { id: 'transactions', label: 'Payment transactions' },
      { id: 'reconciliation', label: 'Fee reconciliation' },
      { id: 'export', label: 'Export & print reports' },
    ],
  },
];

/** Built-in CA workspace areas (not separate org product licenses). */
export const CA_PLATFORM_FINANCE_AREAS: CaOrgModuleDefinition[] = [
  {
    slug: 'ca-expenses',
    permissionKey: 'expenses',
    label: 'Expenses & payments',
    workspacePath: '/chief-accountant/expenses',
    levelOptions: [
      { value: 'view', label: 'View' },
      { value: 'prepare', label: 'Prepare' },
      { value: 'approve', label: 'Approve' },
      { value: 'administer', label: 'Administer' },
    ],
    activities: [
      { id: 'register', label: 'Expense register' },
      { id: 'payment_requests', label: 'Payment requests' },
    ],
  },
  {
    slug: 'ca-payroll',
    permissionKey: 'payroll',
    label: 'Payroll',
    workspacePath: '/chief-accountant/payroll',
    levelOptions: [
      { value: 'summary', label: 'Summary' },
      { value: 'review', label: 'Review' },
      { value: 'approve', label: 'Approve' },
      { value: 'detailed', label: 'Detailed' },
    ],
    activities: [{ id: 'payroll_review', label: 'Payroll review' }],
  },
  {
    slug: 'ca-accounting',
    permissionKey: 'accounting',
    label: 'Accounting',
    workspacePath: '/chief-accountant/accounting/chart-of-accounts',
    levelOptions: [
      { value: 'view', label: 'View' },
      { value: 'post', label: 'Post entries' },
      { value: 'administer', label: 'Administer' },
    ],
    activities: [
      { id: 'chart', label: 'Chart of accounts' },
      { id: 'journal', label: 'Journal' },
      { id: 'ledger', label: 'General ledger' },
    ],
  },
  {
    slug: 'ca-budget',
    permissionKey: 'budget',
    label: 'Budget & reports',
    workspacePath: '/chief-accountant/budget',
    levelOptions: [
      { value: 'view', label: 'View' },
      { value: 'prepare', label: 'Prepare' },
      { value: 'approve', label: 'Approve' },
      { value: 'administer', label: 'Administer' },
    ],
    activities: [
      { id: 'budget', label: 'Budget utilization' },
      { id: 'reports', label: 'Financial reports' },
    ],
  },
  {
    slug: 'ca-approvals',
    permissionKey: 'approvals',
    label: 'Approvals',
    workspacePath: '/chief-accountant/approvals',
    levelOptions: [
      { value: 'view', label: 'View queue' },
      { value: 'action', label: 'Take action' },
    ],
    activities: [{ id: 'approval_center', label: 'Approval center' }],
  },
];

export type CaModuleScopeEntry = {
  enabled: boolean;
  level: string;
  activities: string[];
};

export type CaModuleScope = Record<string, CaModuleScopeEntry>;

export function licensedCaProductModules(licensed: LicensedModule[]): CaOrgModuleDefinition[] {
  const slugs = new Set(licensed.map((m) => m.slug));
  return CA_ORG_MODULE_DEFINITIONS.filter((d) => slugs.has(d.slug));
}

export function parseModuleScope(raw: unknown): CaModuleScope {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as CaModuleScope;
}

export function buildPermissionsFromScope(
  scope: CaModuleScope,
  definitions: CaOrgModuleDefinition[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const def of definitions) {
    const entry = scope[def.slug];
    if (entry?.enabled && entry.level) {
      out[def.permissionKey] = entry.level;
    } else {
      out[def.permissionKey] = 'view';
    }
  }
  return out;
}

export function defaultScopeForDefinitions(definitions: CaOrgModuleDefinition[]): CaModuleScope {
  const scope: CaModuleScope = {};
  for (const def of definitions) {
    scope[def.slug] = {
      enabled: def.slug === 'school-fees',
      level: def.levelOptions[1]?.value ?? def.levelOptions[0]?.value ?? 'view',
      activities: def.activities.map((a) => a.id),
    };
  }
  return scope;
}

export function mergeScopeFromRow(
  permissions: Record<string, string>,
  definitions: CaOrgModuleDefinition[]
): CaModuleScope {
  const moduleScope = parseModuleScope((permissions as Record<string, unknown>).moduleScope);
  const base = defaultScopeForDefinitions(definitions);
  for (const def of definitions) {
    const saved = moduleScope[def.slug];
    if (saved) {
      base[def.slug] = {
        enabled: saved.enabled,
        level: saved.level || permissions[def.permissionKey] || base[def.slug].level,
        activities: saved.activities?.length ? saved.activities : base[def.slug].activities,
      };
    } else if (permissions[def.permissionKey]) {
      base[def.slug].enabled = true;
      base[def.slug].level = permissions[def.permissionKey];
    }
  }
  return base;
}
