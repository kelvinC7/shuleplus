import type { Student } from '@/types';

export type QuickPreset =
  | 'all'
  | 'new_admissions'
  | 'active'
  | 'transferred'
  | 'graduated'
  | 'withdrawn';

export type SortField =
  | 'name'
  | 'studentCode'
  | 'age'
  | 'class'
  | 'enrollmentDate'
  | 'status'
  | 'gender';

export type SortDir = 'asc' | 'desc';

export type ReportColumnId =
  | 'studentCode'
  | 'sdmCode'
  | 'gender'
  | 'dateOfBirth'
  | 'age'
  | 'class'
  | 'stream'
  | 'parent'
  | 'phone'
  | 'address'
  | 'enrollmentDate'
  | 'status';

export interface ReportColumnDef {
  id: ReportColumnId;
  label: string;
  defaultVisible: boolean;
}

export interface ReportFilters {
  search: string;
  academicYear: string;
  term: string;
  classId: string;
  stream: string;
  gender: string;
  status: string;
  enrollmentType: string;
  dateFrom: string;
  dateTo: string;
  ageMin: string;
  ageMax: string;
  district: string;
  sector: string;
  preset: QuickPreset;
}

export interface ReportKpis {
  total: number;
  male: number;
  female: number;
  newStudents: number;
  active: number;
  transferred: number;
  graduated: number;
  withdrawn: number;
  incompleteProfiles: number;
}

export interface EnrichedStudentRow {
  student: Student;
  fullName: string;
  studentCode: string;
  sdmCode: string;
  gender: string;
  age: number | null;
  className: string;
  stream: string;
  parentName: string;
  phone: string;
  address: string;
  enrollmentDate: string | null;
  academicYear: string;
  term: string | null;
  status: string;
  isNewAdmission: boolean;
}

export const REPORT_COLUMNS: ReportColumnDef[] = [
  { id: 'studentCode', label: 'Student Code', defaultVisible: true },
  { id: 'sdmCode', label: 'SDMS Code', defaultVisible: false },
  { id: 'gender', label: 'Gender', defaultVisible: true },
  { id: 'dateOfBirth', label: 'Date of Birth', defaultVisible: false },
  { id: 'age', label: 'Age', defaultVisible: true },
  { id: 'class', label: 'Class', defaultVisible: true },
  { id: 'stream', label: 'Stream', defaultVisible: true },
  { id: 'parent', label: 'Parent', defaultVisible: true },
  { id: 'phone', label: 'Phone', defaultVisible: true },
  { id: 'address', label: 'Address', defaultVisible: false },
  { id: 'enrollmentDate', label: 'Enrollment Date', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
];

export type MissingFieldId =
  | 'parent'
  | 'phone'
  | 'dateOfBirth'
  | 'photo'
  | 'address'
  | 'sdmCode';

export interface MissingFieldDef {
  id: MissingFieldId;
  label: string;
}

export const MISSING_FIELD_DEFS: MissingFieldDef[] = [
  { id: 'parent', label: 'Missing Parent' },
  { id: 'phone', label: 'Missing Phone' },
  { id: 'dateOfBirth', label: 'Missing Date of Birth' },
  { id: 'photo', label: 'Missing Photo' },
  { id: 'address', label: 'Missing Address' },
  { id: 'sdmCode', label: 'Missing SDMS Code' },
];

export const DEFAULT_FILTERS: ReportFilters = {
  search: '',
  academicYear: '',
  term: '',
  classId: '',
  stream: '',
  gender: '',
  status: '',
  enrollmentType: '',
  dateFrom: '',
  dateTo: '',
  ageMin: '',
  ageMax: '',
  district: '',
  sector: '',
  preset: 'all',
};
