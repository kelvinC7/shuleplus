/** ShulePlus standardized school staff positions → ID role abbreviation */

export type StaffPositionEntry = {
  title: string;
  code: string;
  category: string;
};

export const STAFF_POSITION_CATALOG: StaffPositionEntry[] = [
  { category: 'School leadership and management', title: 'Head Teacher / School Manager', code: 'HT' },
  { category: 'School leadership and management', title: 'Deputy Head Teacher – Academics', code: 'DHA' },
  { category: 'School leadership and management', title: 'Deputy Head Teacher – Administration', code: 'DHA2' },
  { category: 'School leadership and management', title: 'Director of Studies', code: 'DOS' },
  { category: 'School leadership and management', title: 'Director of Discipline', code: 'DOD' },
  { category: 'School leadership and management', title: 'School Representative', code: 'SR' },
  { category: 'School leadership and management', title: 'Academic Coordinator', code: 'AC' },
  { category: 'School leadership and management', title: 'Department Head', code: 'DH' },

  { category: 'Teaching and academic staff', title: 'Teacher', code: 'TR' },
  { category: 'Teaching and academic staff', title: 'Senior Teacher', code: 'STR' },
  { category: 'Teaching and academic staff', title: 'Assistant Teacher', code: 'ATR' },
  { category: 'Teaching and academic staff', title: 'Nursery Teacher', code: 'NTR' },
  { category: 'Teaching and academic staff', title: 'Special Needs Education Teacher', code: 'SNE' },
  { category: 'Teaching and academic staff', title: 'Teaching Assistant', code: 'TA' },
  { category: 'Teaching and academic staff', title: 'Substitute Teacher', code: 'SUB' },
  { category: 'Teaching and academic staff', title: 'Librarian', code: 'LIB' },
  { category: 'Teaching and academic staff', title: 'Laboratory Technician', code: 'LT' },
  { category: 'Teaching and academic staff', title: 'ICT Teacher / Computer Teacher', code: 'ICT' },
  { category: 'Teaching and academic staff', title: 'School Counsellor', code: 'COU' },
  { category: 'Teaching and academic staff', title: 'School Matron', code: 'MAT' },

  { category: 'Finance and administration', title: 'Chief Accountant', code: 'CA' },
  { category: 'Finance and administration', title: 'Accountant', code: 'ACC' },
  { category: 'Finance and administration', title: 'Bursar / School Fees Officer', code: 'BUR' },
  { category: 'Finance and administration', title: 'Finance Officer', code: 'FO' },
  { category: 'Finance and administration', title: 'Cashier', code: 'CSH' },
  { category: 'Finance and administration', title: 'Human Resources Officer', code: 'HRO' },
  { category: 'Finance and administration', title: 'HR Assistant', code: 'HRA' },
  { category: 'Finance and administration', title: 'Administrative Officer', code: 'AO' },
  { category: 'Finance and administration', title: 'Secretary', code: 'SEC' },
  { category: 'Finance and administration', title: 'Receptionist', code: 'REC' },
  { category: 'Finance and administration', title: 'Data Entry Officer', code: 'DEO' },
  { category: 'Finance and administration', title: 'Records Officer', code: 'RO' },
  { category: 'Finance and administration', title: 'Procurement Officer', code: 'PO' },
  { category: 'Finance and administration', title: 'Storekeeper', code: 'STK' },
  { category: 'Finance and administration', title: 'Store Assistant', code: 'STA' },
  { category: 'Finance and administration', title: 'Driver', code: 'DRV' },

  { category: 'Student services, security, and support', title: 'Gate Keeper', code: 'GK' },
  { category: 'Student services, security, and support', title: 'Security Guard', code: 'SG' },
  { category: 'Student services, security, and support', title: 'School Nurse', code: 'NUR' },
  { category: 'Student services, security, and support', title: 'Cleaner', code: 'CLN' },
  { category: 'Student services, security, and support', title: 'Cook', code: 'CK' },
  { category: 'Student services, security, and support', title: 'Kitchen Assistant', code: 'KA' },
  { category: 'Student services, security, and support', title: 'Gardener', code: 'GRD' },
  { category: 'Student services, security, and support', title: 'Maintenance Officer', code: 'MO' },
  { category: 'Student services, security, and support', title: 'Maintenance Assistant', code: 'MA' },
  { category: 'Student services, security, and support', title: 'Transport Coordinator', code: 'TC' },
  { category: 'Student services, security, and support', title: 'Bus Monitor', code: 'BM' },
  { category: 'Student services, security, and support', title: 'Boarding Master', code: 'BOM' },
  { category: 'Student services, security, and support', title: 'Boarding Mistress', code: 'BOM2' },
  { category: 'Student services, security, and support', title: 'Dormitory Supervisor', code: 'DS' },
  { category: 'Student services, security, and support', title: 'Canteen Manager', code: 'CM' },
  { category: 'Student services, security, and support', title: 'Canteen Assistant', code: 'CNA' },

  { category: 'Technical and digital positions', title: 'ICT Officer', code: 'ITO' },
  { category: 'Technical and digital positions', title: 'System Administrator', code: 'SA' },
  { category: 'Technical and digital positions', title: 'IT Support Technician', code: 'ITT' },
  { category: 'Technical and digital positions', title: 'Network Administrator', code: 'NA' },
  { category: 'Technical and digital positions', title: 'Software Developer', code: 'SD' },
  { category: 'Technical and digital positions', title: 'Database Administrator', code: 'DBA' },
  { category: 'Technical and digital positions', title: 'RFID Attendance Officer', code: 'RAO' },
  { category: 'Technical and digital positions', title: 'School Website Administrator', code: 'SWA' },
];

export const TEACHING_POSITION_CATEGORY = 'Teaching and academic staff';

export const RESERVED_POSITION_CODES = new Set(
  STAFF_POSITION_CATALOG.map((p) => p.code.toUpperCase())
);

/** Custom positions: "Job Title · CODE" */
const CUSTOM_POSITION_RE = /^(.+?) · ([A-Z0-9]{2,4})$/;

export function parseCustomPosition(position: string | null | undefined): {
  title: string;
  code: string;
} | null {
  const raw = (position ?? '').trim();
  const m = raw.match(CUSTOM_POSITION_RE);
  if (!m) return null;
  return { title: m[1].trim(), code: m[2].toUpperCase() };
}

export function formatCustomPosition(title: string, code: string): string {
  return `${title.trim()} · ${code.trim().toUpperCase()}`;
}

export function findCatalogEntryByTitle(title: string | null | undefined): StaffPositionEntry | null {
  const t = (title ?? '').trim();
  if (!t) return null;
  return STAFF_POSITION_CATALOG.find((e) => e.title === t) ?? null;
}

export function resolvePositionAbbreviation(opts: {
  position?: string | null;
  roleSlug?: string | null;
  roleName?: string | null;
}): string {
  const custom = parseCustomPosition(opts.position);
  if (custom?.code) return custom.code;

  const catalog = findCatalogEntryByTitle(opts.position);
  if (catalog) return catalog.code;

  const slug = (opts.roleSlug ?? '').trim().toLowerCase();
  if (slug.includes('teacher') || slug === 'teacher-portal') return 'TR';
  if (slug === 'organization_admin') return 'AO';

  return 'OTH';
}

export function normalizeRolePrefix(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'OTH';
}
