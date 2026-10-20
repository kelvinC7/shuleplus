export const EDUCATION_LEVELS = ['NURSERY', 'PRIMARY', 'SECONDARY', 'TVET'] as const;
export const STUDENT_TYPES = [
  { value: 'DAY', label: 'Day Scholars' },
  { value: 'BOARDING', label: 'Boarding Students' },
] as const;
export const OWNERSHIP_OPTIONS = [
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'GOVERNMENT_AIDED', label: 'Government Aided' },
] as const;

export const CLASS_BY_LEVEL: Record<(typeof EDUCATION_LEVELS)[number], string[]> = {
  NURSERY: ['N1', 'N2', 'N3', 'BABY'],
  PRIMARY: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  SECONDARY: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  TVET: ['L1', 'L2', 'L3', 'L4', 'L5', 'Y1', 'Y2', 'Y3'],
};

export const GA_ATTACHMENT_TYPES = [
  'Meeting Minutes',
  'Approval Letter',
  'Signed Documents',
] as const;

export type FeePolicyRecord = {
  id: string;
  academicYear: string;
  term: number;
  educationLevel: string;
  studentType: string;
  ownerships: string[];
  applyToClasses: string[];
  maxTuitionRwf: number;
  status: string;
  effectiveDate?: string | null;
  description?: string | null;
  version?: number;
  name?: string;
  ownership?: string;
  level?: string;
  maxAnnualFeeRwf?: number;
};

export type GaPolicyRecord = {
  id: string;
  levels: string[];
  ownerships: string[];
  studentTypes: string[];
  maxAmountRwf: number;
  requireApproval: boolean;
  maxTimesPerTerm: number;
  allowMultipleCharges: boolean;
  requireAttachment: boolean;
  attachmentTypes: string[];
  description?: string | null;
  status: string;
  effectiveDate?: string | null;
  version?: number;
};

export type PolicyResolveResult = {
  applies: boolean;
  reason?: string;
  academicYear?: string | null;
  term?: number | null;
  educationLevel?: string;
  studentType?: string;
  ownership?: string;
  tuitionMaxRwf?: number | null;
  generalAssemblyMaxRwf?: number | null;
  totalMaxRwf?: number | null;
  limit?: number | null;
  policies?: Array<Record<string, unknown>>;
  status?: string;
  message?: string;
  differenceRwf?: number | null;
  enteredTotalRwf?: number | null;
  requestApproval?: boolean;
  tuitionLineStatus?: string;
  generalAssemblyLineStatus?: string;
};
