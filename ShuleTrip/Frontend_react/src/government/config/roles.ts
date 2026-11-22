/** ShuleTrip government personas · map IAM role slugs to console experience. */
export type GovPersonaSlug =
  | 'super_admin'
  | 'national_administrator'
  | 'intake_reviewer'
  | 'education_reviewer'
  | 'transport_reviewer'
  | 'checkpoint_inspector'
  | 'final_approval_officer'
  | 'monitoring_officer'
  | 'district_education_officer'
  | 'sector_education_inspector'
  | 'organization_admin';

export interface GovRoleDefinition {
  slug: GovPersonaSlug;
  label: string;
  summary: string;
  defaultPermissions: string[];
}

export const GOV_ROLE_CATALOG: GovRoleDefinition[] = [
  {
    slug: 'intake_reviewer',
    label: 'Intake / administrative reviewer',
    summary: 'Validate completeness, documents, and route ready applications.',
    defaultPermissions: ['dashboard.view', 'applications.view', 'applications.request_corrections', 'documents.view'],
  },
  {
    slug: 'education_reviewer',
    label: 'Education / local authority reviewer',
    summary: 'Review purpose, manifest, staff, and education policy fit.',
    defaultPermissions: ['dashboard.view', 'applications.view', 'applications.review', 'documents.view', 'documents.verify'],
  },
  {
    slug: 'transport_reviewer',
    label: 'Transport & road-safety reviewer',
    summary: 'Verify vehicle, driver, insurance, capacity, and route evidence.',
    defaultPermissions: ['dashboard.view', 'applications.view', 'safety.verify', 'documents.view', 'documents.verify'],
  },
  {
    slug: 'checkpoint_inspector',
    label: 'Checkpoint / traffic inspector',
    summary: 'Scan trip pass, complete checklist, record travel recommendation.',
    defaultPermissions: ['dashboard.view', 'checkpoint.inspect', 'applications.view'],
  },
  {
    slug: 'final_approval_officer',
    label: 'Final approval officer',
    summary: 'Issue authorization after all mandatory stages are satisfied.',
    defaultPermissions: ['dashboard.view', 'applications.view', 'decisions.approve', 'decisions.reject', 'decisions.conditions'],
  },
  {
    slug: 'monitoring_officer',
    label: 'Monitoring officer (read-only)',
    summary: 'Observe authorized trips, incidents, and reports without changing decisions.',
    defaultPermissions: ['dashboard.view', 'monitoring.view', 'reports.view'],
  },
  {
    slug: 'national_administrator',
    label: 'National government administrator',
    summary: 'National scope oversight, assignments, and escalations.',
    defaultPermissions: ['dashboard.view', 'applications.view', 'applications.assign', 'reports.view', 'audit.view'],
  },
  {
    slug: 'district_education_officer',
    label: 'District education officer',
    summary: 'District-scoped education and application decisions.',
    defaultPermissions: ['dashboard.view', 'applications.view', 'applications.review', 'decisions.approve'],
  },
  {
    slug: 'sector_education_inspector',
    label: 'Sector education inspector',
    summary: 'Sector-scoped reviews and monitoring.',
    defaultPermissions: ['dashboard.view', 'applications.view', 'applications.review', 'monitoring.view'],
  },
  {
    slug: 'super_admin',
    label: 'Super Admin',
    summary: 'Manage government users, roles, workflow configuration, and security.',
    defaultPermissions: ['admin.all'],
  },
];

const IAM_ALIASES: Record<string, GovPersonaSlug> = {
  district_education_officer: 'district_education_officer',
  sector_education_inspector: 'sector_education_inspector',
  organization_admin: 'national_administrator',
  super_admin: 'super_admin',
  intake_reviewer: 'intake_reviewer',
  education_reviewer: 'education_reviewer',
  transport_reviewer: 'transport_reviewer',
  checkpoint_inspector: 'checkpoint_inspector',
  final_approval_officer: 'final_approval_officer',
  monitoring_officer: 'monitoring_officer',
  national_administrator: 'national_administrator',
};

export function resolveGovPersonas(iamRoles: string[]): GovPersonaSlug[] {
  const set = new Set<GovPersonaSlug>();
  for (const r of iamRoles) {
    const mapped = IAM_ALIASES[r];
    if (mapped) set.add(mapped);
  }
  if (set.size === 0 && iamRoles.some((r) => GOV_ROLE_CATALOG.some((c) => c.slug === r))) {
    iamRoles.forEach((r) => set.add(r as GovPersonaSlug));
  }
  return [...set];
}

export function primaryGovPersona(personas: GovPersonaSlug[]): GovPersonaSlug {
  const priority: GovPersonaSlug[] = [
    'super_admin',
    'final_approval_officer',
    'national_administrator',
    'intake_reviewer',
    'education_reviewer',
    'transport_reviewer',
    'checkpoint_inspector',
    'district_education_officer',
    'sector_education_inspector',
    'monitoring_officer',
  ];
  for (const p of priority) {
    if (personas.includes(p)) return p;
  }
  return personas[0] ?? 'monitoring_officer';
}

export function roleDefinition(slug: GovPersonaSlug): GovRoleDefinition {
  return GOV_ROLE_CATALOG.find((r) => r.slug === slug) ?? GOV_ROLE_CATALOG.find((r) => r.slug === 'monitoring_officer')!;
}

/** Nav hrefs visible to each persona (super_admin sees all). */
export const NAV_ACCESS: Record<string, GovPersonaSlug[] | 'all'> = {
  '/government/overview': 'all',
  '/government/intake': ['super_admin', 'intake_reviewer', 'national_administrator', 'district_education_officer'],
  '/government/review-queue': 'all',
  '/government/applications': 'all',
  '/government/pending': ['super_admin', 'final_approval_officer', 'national_administrator', 'district_education_officer'],
  '/government/education-review': ['super_admin', 'education_reviewer', 'district_education_officer', 'sector_education_inspector', 'national_administrator'],
  '/government/safety': ['super_admin', 'transport_reviewer', 'national_administrator'],
  '/government/checkpoint': ['super_admin', 'checkpoint_inspector', 'transport_reviewer'],
  '/government/final-approval': ['super_admin', 'final_approval_officer', 'national_administrator', 'district_education_officer'],
  '/government/approved': 'all',
  '/government/monitoring': 'all',
  '/government/incidents': 'all',
  '/government/documents': 'all',
  '/government/reports': 'all',
  '/government/schools': ['super_admin', 'national_administrator', 'district_education_officer'],
  '/government/policies': ['super_admin', 'national_administrator'],
  '/government/audit': ['super_admin', 'national_administrator', 'final_approval_officer'],
  '/government/settings': 'all',
  '/government/admin/overview': ['super_admin'],
  '/government/admin/users': ['super_admin'],
  '/government/admin/roles': ['super_admin'],
  '/government/admin/authorities': ['super_admin'],
  '/government/admin/workflow': ['super_admin'],
  '/government/admin/security': ['super_admin'],
};

export function canAccessHref(
  href: string,
  personas: GovPersonaSlug[],
  user?: { canFinalApprove?: boolean } | null
): boolean {
  if (personas.includes('super_admin')) return true;
  if (href === '/government/final-approval') {
    if (user?.canFinalApprove) return true;
    if (personas.includes('national_administrator')) return true;
    return personas.includes('final_approval_officer');
  }
  const rule = NAV_ACCESS[href];
  if (!rule || rule === 'all') return true;
  return rule.some((p) => personas.includes(p));
}
