export interface AdmissionDocumentDef {
  id: string;
  name: string;
  required: boolean;
  /** Show only for transfer students */
  transferOnly?: boolean;
  /** Show only for specific levels */
  levels?: string[];
}

export const DEFAULT_ADMISSION_DOCUMENTS: AdmissionDocumentDef[] = [
  { id: 'birth_certificate', name: 'Birth certificate', required: true },
  { id: 'report_card', name: 'Previous school report card', required: true },
  {
    id: 'transfer_certificate',
    name: 'Transfer certificate',
    required: true,
    transferOnly: true,
  },
  { id: 'passport_photo', name: 'Passport photo', required: true },
  { id: 'guardian_id', name: 'National ID / Guardian ID', required: false },
  { id: 'health_card', name: 'Vaccination / health card', required: false },
];

export const ADMISSION_LEVELS = [
  'Nursery',
  'Primary',
  'O-Level',
  'A-Level',
  'TVET',
  'University',
] as const;

export const CLASSES_BY_LEVEL: Record<string, string[]> = {
  Nursery: ['Baby Class', 'Middle Class', 'Top Class'],
  Primary: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  'O-Level': ['S1', 'S2', 'S3'],
  'A-Level': ['S4', 'S5', 'S6'],
  TVET: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'],
  University: ['Year 1', 'Year 2', 'Year 3', 'Year 4'],
};

export const ADMISSION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  DOCUMENTS_VERIFICATION: 'Documents Verification',
  ASSESSMENT_INTERVIEW: 'Assessment / Interview',
  ADMISSION_APPROVED: 'Admission Approved',
  FEE_PAYMENT: 'Fee Payment',
  ENROLLED: 'Enrolled',
  REJECTED: 'Rejected',
};

export const ADMISSION_STATUS_FLOW = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'DOCUMENTS_VERIFICATION',
  'ASSESSMENT_INTERVIEW',
  'ADMISSION_APPROVED',
  'FEE_PAYMENT',
  'ENROLLED',
] as const;
