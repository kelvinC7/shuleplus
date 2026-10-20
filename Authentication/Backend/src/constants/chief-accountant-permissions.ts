export type ChiefAccountantPermissionProfile = {
  schoolFees: 'view' | 'reconcile' | 'adjust' | 'administer';
  expenses: 'view' | 'prepare' | 'approve' | 'administer';
  payroll: 'summary' | 'review' | 'approve' | 'detailed';
  accounting: 'view' | 'post' | 'administer';
  budget: 'view' | 'prepare' | 'approve' | 'administer';
  reports: 'view' | 'export' | 'schedule';
  approvals: 'view' | 'action';
};

export const DEFAULT_CHIEF_ACCOUNTANT_PERMISSIONS: ChiefAccountantPermissionProfile = {
  schoolFees: 'reconcile',
  expenses: 'prepare',
  payroll: 'review',
  accounting: 'view',
  budget: 'view',
  reports: 'export',
  approvals: 'action',
};

export const CHIEF_ACCOUNTANT_PERMISSION_OPTIONS: Record<
  keyof ChiefAccountantPermissionProfile,
  readonly string[]
> = {
  schoolFees: ['view', 'reconcile', 'adjust', 'administer'],
  expenses: ['view', 'prepare', 'approve', 'administer'],
  payroll: ['summary', 'review', 'approve', 'detailed'],
  accounting: ['view', 'post', 'administer'],
  budget: ['view', 'prepare', 'approve', 'administer'],
  reports: ['view', 'export', 'schedule'],
  approvals: ['view', 'action'],
};

export function pickChiefAccountantPermissions(
  input: unknown
): Partial<ChiefAccountantPermissionProfile> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: Partial<ChiefAccountantPermissionProfile> = {};
  for (const key of Object.keys(CHIEF_ACCOUNTANT_PERMISSION_OPTIONS) as Array<
    keyof ChiefAccountantPermissionProfile
  >) {
    const raw = (input as Record<string, unknown>)[key];
    if (typeof raw !== 'string') continue;
    if (CHIEF_ACCOUNTANT_PERMISSION_OPTIONS[key].includes(raw)) {
      (out as Record<string, ChiefAccountantPermissionProfile[typeof key]>)[key] =
        raw as ChiefAccountantPermissionProfile[typeof key];
    }
  }
  return out;
}

export function mergeChiefAccountantPermissions(
  profile: unknown,
  assignment: unknown
): ChiefAccountantPermissionProfile & { moduleScope?: unknown } {
  const base = { ...DEFAULT_CHIEF_ACCOUNTANT_PERMISSIONS };
  const fromProfile =
    profile && typeof profile === 'object' && !Array.isArray(profile)
      ? (profile as Partial<ChiefAccountantPermissionProfile>)
      : {};
  const fromAssignment =
    assignment && typeof assignment === 'object' && !Array.isArray(assignment)
      ? (assignment as Partial<ChiefAccountantPermissionProfile>)
      : {};
  const merged = { ...base, ...fromProfile, ...fromAssignment };
  const assignRecord =
    assignment && typeof assignment === 'object' && !Array.isArray(assignment)
      ? (assignment as Record<string, unknown>)
      : {};
  if (assignRecord.moduleScope !== undefined) {
    (merged as Record<string, unknown>).moduleScope = assignRecord.moduleScope;
  }
  return merged;
}
