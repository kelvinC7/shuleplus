import * as XLSX from 'xlsx';

export const EMPLOYEE_IMPORT_TEMPLATE_HEADERS = [
  'First Name', 'Middle Name', 'Last Name', 'Gender', 'Date of Birth',
  'Phone', 'Email', 'National ID', 'RSSB Number', 'TIN Number',
  'Current Province', 'Current District', 'Current Sector', 'Current Cell', 'Current Village',
  'Department', 'Position Code', 'Contract Type', 'Start Date', 'End Date',
  'Basic Salary', 'Payment Method', 'Bank Name', 'Bank Account Number',
  'Mobile Money Number', 'Next of Kin Name', 'Next of Kin Relationship', 'Next of Kin Phone',
  'Qualification Level', 'Institution', 'Graduation Year', 'Grade',
];

export const MINIMAL_IMPORT_HEADERS = [
  'RSSB Number', 'National ID', 'First Name', 'Last Name', 'Gender',
  'Basic Salary', 'Allowance Each (T/H/Others)', 'Transport Allowance (T/A)',
  'Housing Allowance (H/A)', 'Others Allowance', 'Payment Method', 'Bank Name', 'Bank Account Number',
];

const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'first_name'],
  middleName: ['middle name', 'middlename', 'middle_name'],
  lastName: ['last name', 'lastname', 'last_name', 'surname'],
  gender: ['gender', 'sex'],
  dateOfBirth: ['date of birth', 'dob', 'birth date'],
  phone: ['phone', 'phone number', 'mobile', 'telephone'],
  email: ['email', 'email address'],
  nationalId: ['national id', 'national id number', 'nid', 'id number'],
  rssbNumber: ['rssb number', 'rssb', 'rssb no'],
  department: ['department', 'dept'],
  position: ['position', 'position code', 'job title', 'role'],
  contractType: ['contract type', 'employment type'],
  hireDate: ['start date', 'hire date', 'join date'],
  contractEnd: ['end date', 'contract end'],
  basicSalary: ['basic salary', 'salary', 'basic pay'],
  bankName: ['bank name', 'bank'],
  bankAccountNumber: ['bank account number', 'account number', 'bank account'],
  paymentMethod: ['payment method', 'pay method'],
  transportAllowance: ['transport allowance (t/a)', 'transport allowance', 't/a'],
  housingAllowance: ['housing allowance (h/a)', 'housing allowance', 'h/a'],
  othersAllowance: ['others allowance', 'other allowance'],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapHeader(header: string): string | null {
  const n = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(n) || field.toLowerCase() === n) return field;
  }
  return null;
}

export interface ParsedImportRow {
  rowNumber: number;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  rssbNumber?: string;
  department?: string;
  position?: string;
  contractType?: string;
  hireDate?: string;
  contractEnd?: string;
  basicSalary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  paymentMethod?: string;
  transportAllowance?: number;
  housingAllowance?: number;
  othersAllowance?: number;
  raw: Record<string, string>;
}

export function detectImportProfile(headers: string[]): 'minimal' | 'full' {
  const normalized = headers.map(normalizeHeader);
  const minimalHits = MINIMAL_IMPORT_HEADERS.filter((h) =>
    normalized.some((n) => normalizeHeader(h) === n || mapHeader(h) !== null)
  ).length;
  return minimalHits >= 4 && headers.length <= 15 ? 'minimal' : 'full';
}

export function parseImportFile(buffer: ArrayBuffer): {
  rows: ParsedImportRow[];
  matchedHeaders: string[];
  profile: 'minimal' | 'full';
  rawHeaders: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (!json.length) {
    return { rows: [], matchedHeaders: [], profile: 'full', rawHeaders: [] };
  }

  const rawHeaders = Object.keys(json[0]);
  const profile = detectImportProfile(rawHeaders);
  const matchedHeaders = rawHeaders.filter((h) => mapHeader(h) !== null);

  const rows: ParsedImportRow[] = json.map((record, index) => {
    const raw: Record<string, string> = {};
    const row: ParsedImportRow = { rowNumber: index + 2, raw };

    for (const [header, value] of Object.entries(record)) {
      raw[header] = String(value ?? '').trim();
      const field = mapHeader(header);
      if (!field) continue;
      if (field === 'basicSalary' || field.includes('Allowance')) {
        const num = Number(String(value).replace(/,/g, ''));
        (row as unknown as Record<string, unknown>)[field] = Number.isFinite(num) ? num : undefined;
      } else {
        (row as unknown as Record<string, unknown>)[field] = String(value ?? '').trim() || undefined;
      }
    }
    return row;
  });

  return { rows, matchedHeaders, profile, rawHeaders };
}

export function downloadTemplate(type: 'full' | 'minimal') {
  const headers = type === 'minimal' ? MINIMAL_IMPORT_HEADERS : EMPLOYEE_IMPORT_TEMPLATE_HEADERS;
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type === 'minimal' ? 'Minimal' : 'Employees');
  if (type === 'full') {
    const instructions = XLSX.utils.aoa_to_sheet([
      ['HR Employee Import Template'],
      ['Required for new rows: First Name, Last Name, Gender'],
      ['Strongly expected: National ID or RSSB Number'],
      ['Existing employees match by National ID, RSSB, email, or phone and will update on import.'],
    ]);
    XLSX.utils.book_append_sheet(wb, instructions, 'Instructions');
  }
  XLSX.writeFile(wb, type === 'minimal' ? 'hr-employee-import-minimal.xlsx' : 'hr-employee-import-full.xlsx');
}

export function downloadFailedRows(rows: Record<string, unknown>[], filename = 'hr-import-failed.xlsx') {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Failed');
  XLSX.writeFile(wb, filename);
}

export type ImportRowStatus = 'ready' | 'incomplete' | 'duplicate' | 'willUpdate';

export interface ValidatedImportRow extends ParsedImportRow {
  status: ImportRowStatus;
  missing: string[];
  optionalMissing: string[];
  duplicateOf?: number | null;
  existingId?: string | null;
}
