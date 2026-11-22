/** Mirrors backend workflow gates — used for school-facing progress UI. */
export const SCHOOL_GOV_PIPELINE = [
  {
    key: 'intake',
    approvalStageKey: 'intake_completeness',
    title: 'Intake & completeness',
    subtitle: 'District intake officer verifies documents and manifest',
  },
  {
    key: 'education',
    approvalStageKey: 'education_authority',
    title: 'Education authority',
    subtitle: 'Purpose, learners, staff, and policy alignment',
  },
  {
    key: 'transport',
    approvalStageKey: 'transport_safety',
    title: 'Transport & road safety',
    subtitle: 'Vehicle, driver, insurance, and route checks',
  },
  {
    key: 'final',
    approvalStageKey: 'final_authorization',
    title: 'Final authorization',
    subtitle: 'Issuance of trip clearance certificate',
  },
] as const;

export type SchoolGovStageKey = (typeof SCHOOL_GOV_PIPELINE)[number]['key'];
