/** IAM role slugs granted to ShuleTrip government console users (must match ShuleTrip GOVERNMENT_ROLES env). */
export const SHULE_TRIP_OFFICIAL_ROLE_SLUGS = [
  'intake_reviewer',
  'education_reviewer',
  'transport_reviewer',
  'checkpoint_inspector',
  'final_approval_officer',
  'monitoring_officer',
  'national_administrator',
  'district_education_officer',
  'sector_education_inspector',
] as const;

export type ShuleTripOfficialRoleSlug = (typeof SHULE_TRIP_OFFICIAL_ROLE_SLUGS)[number];

export const SHULE_TRIP_ROLE_LABELS: Record<string, string> = {
  intake_reviewer: 'Intake / administrative reviewer',
  education_reviewer: 'Education / local authority reviewer',
  transport_reviewer: 'Transport & road-safety reviewer',
  checkpoint_inspector: 'Checkpoint / traffic inspector',
  final_approval_officer: 'Final approval officer',
  monitoring_officer: 'Monitoring officer (read-only)',
  national_administrator: 'National administrator',
  district_education_officer: 'District education officer',
  sector_education_inspector: 'Sector education inspector',
};
