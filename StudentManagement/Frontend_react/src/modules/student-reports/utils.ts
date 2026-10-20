import type { Student, ApiClass } from '@/types';
import type {
  EnrichedStudentRow,
  MissingFieldId,
  ReportFilters,
  ReportKpis,
  SortDir,
  SortField,
} from './types';
import { MISSING_FIELD_DEFS } from './types';

export function calcAge(dob?: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function formatDate(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCurrentEnrollment(student: Student) {
  return student.enrollments.find((e) => e.isCurrent) ?? student.enrollments[0];
}

function getParentInfo(student: Student) {
  const sp = student.studentParents ?? [];
  const father = sp.find((p) => p.role === 'FATHER');
  const mother = sp.find((p) => p.role === 'MOTHER');
  const primary = father ?? mother ?? sp[0];
  if (!primary) return { name: '—', phone: '—' };
  return {
    name: `${primary.parent.firstName} ${primary.parent.lastName}`,
    phone: primary.parent.phone ?? sp.find((p) => p.parent.phone)?.parent.phone ?? '—',
  };
}

export function enrichStudent(student: Student): EnrichedStudentRow {
  const enrollment = getCurrentEnrollment(student);
  const parent = getParentInfo(student);
  const cls = enrollment?.class;
  const className = cls?.name ?? '—';
  const stream = cls?.stream ?? '—';
  const created = student.createdAt ? new Date(student.createdAt) : null;
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  return {
    student,
    fullName: `${student.firstName} ${student.lastName}`.trim(),
    studentCode: student.studentCode ?? student.studentUid,
    sdmCode: student.sdmCode ?? '—',
    gender: student.gender ?? '—',
    age: calcAge(student.dateOfBirth),
    className,
    stream,
    parentName: parent.name,
    phone: parent.phone,
    address: [student.district, student.sector, student.cell, student.village].filter(Boolean).join(', ') || '—',
    enrollmentDate: enrollment?.joiningDate ?? enrollment?.createdAt ?? student.createdAt,
    academicYear: enrollment?.academicYear ?? '—',
    term: enrollment?.term ?? null,
    status: student.status ?? 'ACTIVE',
    isNewAdmission: created ? created >= monthAgo : false,
  };
}

export function applyReportFilters(rows: EnrichedStudentRow[], filters: ReportFilters): EnrichedStudentRow[] {
  let list = [...rows];

  if (filters.preset === 'active') list = list.filter((r) => r.status === 'ACTIVE');
  else if (filters.preset === 'transferred') list = list.filter((r) => r.status === 'TRANSFERRED');
  else if (filters.preset === 'graduated') list = list.filter((r) => r.status === 'GRADUATED');
  else if (filters.preset === 'withdrawn') list = list.filter((r) => r.status === 'WITHDRAWN');
  else if (filters.preset === 'new_admissions') list = list.filter((r) => r.isNewAdmission);

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        r.sdmCode.toLowerCase().includes(q) ||
        r.student.studentUid.toLowerCase().includes(q)
    );
  }

  if (filters.academicYear) list = list.filter((r) => r.academicYear === filters.academicYear);
  if (filters.term) list = list.filter((r) => r.term === filters.term);
  if (filters.classId) {
    list = list.filter((r) => {
      const en = getCurrentEnrollment(r.student);
      return en?.classId === filters.classId;
    });
  }
  if (filters.stream) list = list.filter((r) => r.stream === filters.stream);
  if (filters.gender) list = list.filter((r) => r.gender.toUpperCase() === filters.gender.toUpperCase());
  if (filters.status) list = list.filter((r) => r.status === filters.status);
  if (filters.enrollmentType === 'new') list = list.filter((r) => r.isNewAdmission);
  if (filters.enrollmentType === 'continuing') list = list.filter((r) => !r.isNewAdmission);
  if (filters.district) list = list.filter((r) => (r.student.district ?? '').toLowerCase() === filters.district.toLowerCase());
  if (filters.sector) list = list.filter((r) => (r.student.sector ?? '').toLowerCase() === filters.sector.toLowerCase());

  if (filters.ageMin) {
    const min = Number(filters.ageMin);
    if (!Number.isNaN(min)) list = list.filter((r) => r.age !== null && r.age >= min);
  }
  if (filters.ageMax) {
    const max = Number(filters.ageMax);
    if (!Number.isNaN(max)) list = list.filter((r) => r.age !== null && r.age <= max);
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    list = list.filter((r) => r.enrollmentDate && new Date(r.enrollmentDate) >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    list = list.filter((r) => r.enrollmentDate && new Date(r.enrollmentDate) <= to);
  }

  return list;
}

export function sortReportRows(rows: EnrichedStudentRow[], field: SortField, dir: SortDir): EnrichedStudentRow[] {
  const sorted = [...rows];
  const mul = dir === 'asc' ? 1 : -1;
  sorted.sort((a, b) => {
    switch (field) {
      case 'name':
        return mul * a.fullName.localeCompare(b.fullName);
      case 'studentCode':
        return mul * a.studentCode.localeCompare(b.studentCode);
      case 'age':
        return mul * ((a.age ?? -1) - (b.age ?? -1));
      case 'class':
        return mul * a.className.localeCompare(b.className);
      case 'enrollmentDate':
        return mul * (new Date(a.enrollmentDate ?? 0).getTime() - new Date(b.enrollmentDate ?? 0).getTime());
      case 'status':
        return mul * a.status.localeCompare(b.status);
      case 'gender':
        return mul * a.gender.localeCompare(b.gender);
      default:
        return 0;
    }
  });
  return sorted;
}

export function computeKpis(rows: EnrichedStudentRow[]): ReportKpis {
  return {
    total: rows.length,
    male: rows.filter((r) => r.gender.toUpperCase() === 'MALE').length,
    female: rows.filter((r) => r.gender.toUpperCase() === 'FEMALE').length,
    newStudents: rows.filter((r) => r.isNewAdmission).length,
    active: rows.filter((r) => r.status === 'ACTIVE').length,
    transferred: rows.filter((r) => r.status === 'TRANSFERRED').length,
    graduated: rows.filter((r) => r.status === 'GRADUATED').length,
    withdrawn: rows.filter((r) => r.status === 'WITHDRAWN').length,
    incompleteProfiles: rows.filter((r) => isIncompleteProfile(r)).length,
  };
}

export function getMissingFields(row: EnrichedStudentRow): MissingFieldId[] {
  const s = row.student;
  const missing: MissingFieldId[] = [];
  if (row.parentName === '—') missing.push('parent');
  if (row.phone === '—') missing.push('phone');
  if (!s.dateOfBirth) missing.push('dateOfBirth');
  if (!s.studentPhoto) missing.push('photo');
  if (!s.district) missing.push('address');
  if (!s.sdmCode) missing.push('sdmCode');
  return missing;
}

export function getProfileCompleteness(row: EnrichedStudentRow): number {
  const total = MISSING_FIELD_DEFS.length;
  const missing = getMissingFields(row).length;
  return Math.round(((total - missing) / total) * 100);
}

export function isIncompleteProfile(row: EnrichedStudentRow): boolean {
  return getMissingFields(row).length > 0;
}

export function getUniqueDistricts(students: Student[]): string[] {
  return [...new Set(students.map((s) => s.district).filter(Boolean) as string[])].sort();
}

export function getUniqueSectors(students: Student[], district?: string): string[] {
  let list = students;
  if (district) list = list.filter((s) => s.district === district);
  return [...new Set(list.map((s) => s.sector).filter(Boolean) as string[])].sort();
}

export function getUniqueStreams(classes: ApiClass[]): string[] {
  return [...new Set(classes.map((c) => c.stream).filter(Boolean) as string[])].sort();
}

export function activeFilterChips(filters: ReportFilters, classes: ApiClass[]): { key: keyof ReportFilters; label: string }[] {
  const chips: { key: keyof ReportFilters; label: string }[] = [];
  if (filters.academicYear) chips.push({ key: 'academicYear', label: `Academic Year: ${filters.academicYear}` });
  if (filters.term) chips.push({ key: 'term', label: `Term: ${filters.term}` });
  if (filters.classId) {
    const cls = classes.find((c) => c.id === filters.classId);
    chips.push({ key: 'classId', label: `Class: ${cls ? `${cls.name}${cls.stream ? ` ${cls.stream}` : ''}` : filters.classId}` });
  }
  if (filters.stream) chips.push({ key: 'stream', label: `Stream: ${filters.stream}` });
  if (filters.gender) chips.push({ key: 'gender', label: `Gender: ${filters.gender}` });
  if (filters.status) chips.push({ key: 'status', label: `Status: ${filters.status}` });
  if (filters.district) chips.push({ key: 'district', label: `District: ${filters.district}` });
  if (filters.sector) chips.push({ key: 'sector', label: `Sector: ${filters.sector}` });
  if (filters.dateFrom || filters.dateTo) {
    chips.push({ key: 'dateFrom', label: `Date: ${filters.dateFrom || '…'} – ${filters.dateTo || '…'}` });
  }
  return chips;
}

export function exportRowsToCsv(rows: EnrichedStudentRow[], columns: string[]): string {
  const header = columns.join(',');
  const body = rows
    .map((r) =>
      columns
        .map((col) => {
          const val = getExportValue(r, col);
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  return `${header}\n${body}`;
}

function getExportValue(row: EnrichedStudentRow, col: string): string {
  switch (col) {
    case 'Student Name':
      return row.fullName;
    case 'Student Code':
      return row.studentCode;
    case 'SDMS Code':
      return row.sdmCode;
    case 'Gender':
      return row.gender;
    case 'Date of Birth':
      return formatDate(row.student.dateOfBirth);
    case 'Age':
      return row.age?.toString() ?? '';
    case 'Class':
      return row.className;
    case 'Stream':
      return row.stream;
    case 'Parent':
      return row.parentName;
    case 'Phone':
      return row.phone;
    case 'Address':
      return row.address;
    case 'Enrollment Date':
      return formatDate(row.enrollmentDate);
    case 'Status':
      return row.status;
    default:
      return '';
  }
}

export const EXPORT_COLUMN_LABELS: Record<string, string> = {
  studentCode: 'Student Code',
  sdmCode: 'SDMS Code',
  gender: 'Gender',
  dateOfBirth: 'Date of Birth',
  age: 'Age',
  class: 'Class',
  stream: 'Stream',
  parent: 'Parent',
  phone: 'Phone',
  address: 'Address',
  enrollmentDate: 'Enrollment Date',
  status: 'Status',
};
