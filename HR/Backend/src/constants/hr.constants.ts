export const DEFAULT_DEPARTMENTS = [
  { name: 'Leadership', headName: null },
  { name: 'Teaching Staff', headName: null },
  { name: 'Student Welfare', headName: null },
  { name: 'Administration', headName: null },
  { name: 'Finance', headName: null },
  { name: 'ICT', headName: null },
  { name: 'Laboratory', headName: null },
  { name: 'Library', headName: null },
  { name: 'Boarding', headName: null },
  { name: 'Support Staff', headName: null },
  { name: 'Sports & Clubs', headName: null },
];

export const DEFAULT_CATEGORIES = [
  { name: 'Teaching Staff', description: 'Academic and instructional personnel' },
  { name: 'Administrative Staff', description: 'Office and administrative support' },
  { name: 'Support Staff', description: 'Drivers, security, cleaners' },
  { name: 'Management', description: 'Directors, heads, and managers' },
  { name: 'Temporary Staff', description: 'Short-term and seasonal workers' },
  { name: 'Interns', description: 'Student interns and trainees' },
];

export const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Compassionate Leave',
  'Study Leave',
  'Unpaid Leave',
];

export const STATUTORY_LEAVE_POLICY_DEFAULTS = [
  { leaveType: 'Annual Leave', maxDays: 18, paid: true, carryForward: true, genderRestriction: 'ANY' },
  { leaveType: 'Sick Leave', maxDays: 180, paid: true, carryForward: false, genderRestriction: 'ANY', requiredDocuments: ['Medical Certificate'] },
  { leaveType: 'Maternity Leave', maxDays: 98, paid: true, carryForward: false, genderRestriction: 'FEMALE' },
  { leaveType: 'Paternity Leave', maxDays: 4, paid: true, carryForward: false, genderRestriction: 'MALE' },
  { leaveType: 'Compassionate Leave', maxDays: 5, paid: true, carryForward: false, genderRestriction: 'ANY' },
  { leaveType: 'Public Holiday', maxDays: 0, paid: true, carryForward: false, genderRestriction: 'ANY' },
  { leaveType: 'Authorized Absence', maxDays: 0, paid: false, carryForward: false, genderRestriction: 'ANY' },
] as const;

export const DOCUMENT_CATEGORIES = [
  'cv',
  'application_letter',
  'national_id_copy',
  'degree',
  'contract',
  'passport_copy',
  'certificates',
  'other',
];

export const REQUIRED_DOCUMENTS = ['cv', 'national_id_copy', 'contract'];

export const QUALIFICATION_LEVELS = [
  'A1',
  'A2',
  'Diploma',
  "Bachelor's",
  "Master's",
  'PhD',
  'Professional Cert',
];

/** @deprecated Use allocateHrEmployeeNumber from utils/staff-id.ts */
export function formatEmployeeNumber(_orgId: string, seq: number): string {
  void _orgId;
  const n = Math.max(1, Math.min(999, seq));
  return `01001${String(n).padStart(3, '0')}`;
}

export function yearsOfService(hireDate: Date): number {
  const now = new Date();
  const diff = now.getTime() - hireDate.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

export function contractStatus(
  contractEnd: Date | null,
  ongoing: boolean
): 'Active' | 'Expiring' | 'Expired' {
  if (ongoing || !contractEnd) return 'Active';
  const now = new Date();
  const daysLeft = Math.ceil((contractEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return 'Expired';
  if (daysLeft <= 30) return 'Expiring';
  return 'Active';
}

export function daysLeft(contractEnd: Date | null, ongoing: boolean): number | null {
  if (ongoing || !contractEnd) return null;
  const now = new Date();
  return Math.ceil((contractEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
