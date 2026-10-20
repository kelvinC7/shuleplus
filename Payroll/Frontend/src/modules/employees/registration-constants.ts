export const COUNTRIES = ['Rwanda', 'Uganda', 'Kenya', 'Tanzania', 'Burundi', 'DRC', 'Other'];

export const RWANDA_PROVINCES = [
  'Kigali City', 'Eastern Province', 'Northern Province', 'Southern Province', 'Western Province',
];

export const CITIZENSHIP_STATUSES = ['Citizen', 'Permanent Resident', 'Refugee', 'Foreigner', 'Other'];

export const MARITAL_STATUSES = [
  'Single', 'Married', 'Divorced', 'Widowed', 'Separated', 'Engaged', 'Other',
];

export const COMMUNICATION_PREFS = ['Email', 'SMS', 'WhatsApp', 'Phone Call'];

export const ID_TYPES = [
  'National ID', 'Passport', 'Driving License', 'Refugee ID', 'Voter ID', 'Other',
];

export const RWANDA_BANKS = [
  'Bank of Kigali (BK)', 'I&M Bank Rwanda', 'Equity Bank Rwanda', 'KCB Bank Rwanda',
  'BPR Bank Rwanda', 'Ecobank Rwanda', 'Access Bank Rwanda', 'NCBA Rwanda', 'GTBank Rwanda',
  'Zigama CSS', 'Unguka Bank', 'BRD', 'Other',
];

export const MOBILE_WALLETS = ['MTN Mobile Money', 'Airtel Money', 'Other'];

export const EMPLOYMENT_TYPES = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'TEMPORARY', label: 'Temporary / Casual' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'PROBATION', label: 'Volunteer' },
  { value: 'CONSULTANCY', label: 'Consultant' },
];

export const EMPLOYMENT_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PROBATION', label: 'Onboarding / Probation' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'ON_LEAVE', label: 'Retired / On Leave' },
];

export const EDUCATION_LEVELS = [
  'Primary', 'Secondary', 'Diploma', 'Advanced Diploma', "Bachelor's Degree",
  "Master's Degree", 'PhD', 'Other',
];

export const LANGUAGES = [
  'English', 'French', 'Kinyarwanda', 'Swahili', 'Arabic', 'Chinese', 'Other',
];

export const PAYMENT_FREQUENCIES = ['Monthly', 'Weekly', 'Biweekly', 'Daily'];

export const BENEFITS = [
  'Medical Insurance', 'Pension', 'Transport Allowance', 'Housing Allowance',
  'Meal Allowance', 'Communication Allowance', 'Other',
];

export const KIN_RELATIONS = [
  'Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter', 'Husband', 'Wife', 'Spouse',
  'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Cousin', 'Nephew', 'Niece', 'Guardian',
  'Friend', 'Relative', 'Partner', 'Caregiver', 'Other',
];

export const EMPLOYEE_TAGS = [
  'Full-Time', 'Remote', 'Management', 'Teacher', 'Finance', 'IT', 'Executive', 'Contractor',
];

export const DOCUMENT_FIELDS = [
  { key: 'nationalIdDoc', label: 'National ID', category: 'National ID' },
  { key: 'passportDoc', label: 'Passport', category: 'Passport' },
  { key: 'drivingLicenseDoc', label: 'Driving License', category: 'Driving License' },
  { key: 'cv', label: 'CV / Resume', category: 'CV' },
  { key: 'appointmentLetter', label: 'Appointment Letter', category: 'Appointment Letter' },
  { key: 'contractDoc', label: 'Contract', category: 'Contract' },
  { key: 'academic', label: 'Academic Certificates', category: 'Academic Certificate' },
  { key: 'professionalCert', label: 'Professional Certificates', category: 'Professional Certificate' },
  { key: 'medicalReport', label: 'Medical Report', category: 'Medical Report' },
  { key: 'policeClearance', label: 'Police Clearance', category: 'Police Clearance' },
  { key: 'passportPhoto', label: 'Passport Photo', category: 'Passport Photo' },
  { key: 'recommendationLetter', label: 'Recommendation Letter', category: 'Recommendation Letter' },
] as const;

export type DocumentFieldKey = (typeof DOCUMENT_FIELDS)[number]['key'];
