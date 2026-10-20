export interface FeeLineItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  mandatory: boolean;
}

export interface FeePolicyFormData {
  policyName: string;
  policyCode: string;
  academicYear: string;
  effectiveFrom: string;
  effectiveTo: string;
  schoolCategories: string[];
  provinces: string[];
  description: string;
  feeItems: FeeLineItem[];
  currency: string;
  maxTotalFees: number | null;
  complianceNotes: string;
  requiresDistrictReview: boolean;
  requiresProvincialReview: boolean;
  approvalNotes: string;
  published: boolean;
}

export const WIZARD_STEPS = [
  'Policy Details',
  'Academic Scope',
  'Fee Structure',
  'Compliance Rules',
  'Approval Chain',
  'Preview & Publish',
] as const;

export type WizardStepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const initialFormData: FeePolicyFormData = {
  policyName: '',
  policyCode: '',
  academicYear: '',
  effectiveFrom: '',
  effectiveTo: '',
  schoolCategories: [],
  provinces: [],
  description: '',
  feeItems: [],
  currency: 'RWF',
  maxTotalFees: null,
  complianceNotes: '',
  requiresDistrictReview: true,
  requiresProvincialReview: true,
  approvalNotes: '',
  published: false,
};
