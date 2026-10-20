export type RepresentativePermissionProfile = {
  dashboard: 'view';
  schools: 'view' | 'edit_profile';
  academics: 'view' | 'request_correction';
  attendance: 'view' | 'manage_exceptions';
  payroll: 'aggregated' | 'department' | 'detailed';
  finance: 'summary' | 'reports';
  reports: 'generate' | 'export_sensitive';
  alerts: 'view' | 'assign_close';
  staff: 'directory' | 'details';
  students: 'aggregated' | 'limited_profiles';
};

export const DEFAULT_REP_PERMISSIONS: RepresentativePermissionProfile = {
  dashboard: 'view',
  schools: 'view',
  academics: 'view',
  attendance: 'view',
  payroll: 'aggregated',
  finance: 'summary',
  reports: 'generate',
  alerts: 'view',
  staff: 'directory',
  students: 'aggregated',
};

export function mergeRepPermissions(
  profile: unknown,
  assignment: unknown
): RepresentativePermissionProfile {
  const base = { ...DEFAULT_REP_PERMISSIONS };
  const fromProfile =
    profile && typeof profile === 'object' && !Array.isArray(profile)
      ? (profile as Partial<RepresentativePermissionProfile>)
      : {};
  const fromAssignment =
    assignment && typeof assignment === 'object' && !Array.isArray(assignment)
      ? (assignment as Partial<RepresentativePermissionProfile>)
      : {};
  return { ...base, ...fromProfile, ...fromAssignment };
}
