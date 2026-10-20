export const NESA_LIMITS: Record<string, Record<string, number>> = {
  P1: { 'Term 1': 8500, 'Term 2': 8500, 'Term 3': 8500 },
  P2: { 'Term 1': 8500, 'Term 2': 8500, 'Term 3': 8500 },
  P3: { 'Term 1': 8500, 'Term 2': 8500, 'Term 3': 8500 },
  P4: { 'Term 1': 8500, 'Term 2': 8500, 'Term 3': 8500 },
  P5: { 'Term 1': 8500, 'Term 2': 8500, 'Term 3': 8500 },
  P6: { 'Term 1': 8500, 'Term 2': 8500, 'Term 3': 8500 },
  S1: { 'Term 1': 12000, 'Term 2': 12000, 'Term 3': 12000 },
  S2: { 'Term 1': 12000, 'Term 2': 12000, 'Term 3': 12000 },
  S3: { 'Term 1': 12000, 'Term 2': 12000, 'Term 3': 12000 },
  S4: { 'Term 1': 12000, 'Term 2': 12000, 'Term 3': 12000 },
  S5: { 'Term 1': 12000, 'Term 2': 12000, 'Term 3': 12000 },
  S6: { 'Term 1': 12000, 'Term 2': 12000, 'Term 3': 12000 },
};

export const DEFAULT_REQUIREMENTS = [
  { name: 'Exercise books', description: '12 ruled exercise books', quantity: '12' },
  { name: 'Pens', description: 'Blue and black ballpoint pens', quantity: '6' },
  { name: 'Mathematical set', description: 'Geometry set with compass', quantity: '1' },
  { name: 'School uniform', description: 'Complete school uniform set', quantity: '2' },
  { name: 'Sports shoes', description: 'White canvas sports shoes', quantity: '1' },
  { name: 'Calculator', description: 'Scientific calculator (S-level)', quantity: '1' },
];

export const DEFAULT_CLASSES = [
  { label: 'P1', educationLevel: 'Primary' },
  { label: 'P2', educationLevel: 'Primary' },
  { label: 'P3', educationLevel: 'Primary' },
  { label: 'P4', educationLevel: 'Primary' },
  { label: 'P5', educationLevel: 'Primary' },
  { label: 'P6', educationLevel: 'Primary' },
  { label: 'S1', educationLevel: 'Secondary' },
  { label: 'S2', educationLevel: 'Secondary' },
  { label: 'S3', educationLevel: 'Secondary' },
  { label: 'S4', educationLevel: 'Secondary' },
  { label: 'S5', educationLevel: 'Secondary' },
  { label: 'S6', educationLevel: 'Secondary' },
];

export const SYSTEM_TEMPLATES = [
  { name: 'Primary School Standard', category: 'Primary', schoolType: 'Government' },
  { name: 'Secondary Boarding', category: 'Secondary', schoolType: 'Boarding' },
  { name: 'TVET Program', category: 'TVET', schoolType: 'TVET' },
  { name: 'Private School Premium', category: 'Private', schoolType: 'Private' },
  { name: 'Government Aided Mixed', category: 'Government Aided', schoolType: 'Government Aided' },
  { name: 'International Curriculum', category: 'International', schoolType: 'International' },
];

export function mapOwnershipToFeeScope(ownership: string): {
  feeScope: 'public' | 'private' | 'aided';
  schoolKind: string;
} {
  const normalized = ownership.toLowerCase().replace(/[-_\s]/g, '');
  if (normalized.includes('private') && !normalized.includes('aided')) {
    return { feeScope: 'private', schoolKind: 'private' };
  }
  if (normalized.includes('aided')) {
    return { feeScope: 'aided', schoolKind: 'government_aided' };
  }
  return { feeScope: 'public', schoolKind: 'government' };
}

/**
 * Bank-payable total — only "babyeyi" channel fees are collected via bank/on the
 * document's payment instructions. Legacy rows with no pay_channel are treated as
 * "babyeyi" so pre-existing circulars keep summing the same way they always did.
 */
export function calcTotalFee(
  payments: Array<{ amount?: number | string; pay_channel?: string }>
): number {
  return payments
    .filter((p) => (p.pay_channel ?? 'babyeyi') === 'babyeyi')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/** Sum of fee lines marked "Paid to School Account" (pay_channel === 'school'). */
export function calcSchoolPaymentsTotal(
  payments: Array<{ amount?: number | string; pay_channel?: string }>
): number {
  return payments
    .filter((p) => p.pay_channel === 'school')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/** Sum of requirement line costs marked "Paid to School Account" (pay_channel === 'school'). */
export function calcSchoolRequirementsTotal(
  requirements: Array<{ cost?: number | string; pay_channel?: string }>
): number {
  return requirements
    .filter((r) => r.pay_channel === 'school')
    .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
}

/** "Total Paid at School Account" — fees + requirements paid at the school office, not via bank. */
export function calcPaidAtSchoolTotal(
  payments: Array<{ amount?: number | string; pay_channel?: string }>,
  requirements: Array<{ cost?: number | string; pay_channel?: string }>
): number {
  return calcSchoolPaymentsTotal(payments) + calcSchoolRequirementsTotal(requirements);
}
