import type { ApiClass, Enrollment, Student } from '@/types';

export type SmClassRow = {
  id: string;
  name: string;
  stream?: string | null;
  label?: string | null;
  grade?: { name?: string | null } | null;
  category?: string | null;
};

export type SmStudentRow = {
  id: string;
  studentCode?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  classId?: string | null;
  className?: string | null;
  stream?: string | null;
  rollNumber?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
};

function classLabel(c: SmClassRow | ApiClass) {
  const name = String(c.name ?? '').trim();
  const stream = String(('stream' in c ? c.stream : '') ?? '').trim();
  if ('label' in c && c.label?.trim()) return c.label.trim();
  if (!stream) return name;
  const last = name.split(/[\s·]+/).filter(Boolean).pop()?.toLowerCase();
  if (last === stream.toLowerCase()) return name;
  return `${name} ${stream}`.trim();
}

export function mapSmClass(c: SmClassRow): ApiClass {
  return {
    id: c.id,
    organizationId: '',
    name: c.name,
    stream: c.stream ?? null,
    category: c.grade?.name ?? c.category ?? null,
    gradeId: null,
    grade: c.grade
      ? {
          id: '',
          organizationId: '',
          name: c.grade.name ?? '',
          category: null,
          sortOrder: 0,
          createdAt: '',
          updatedAt: '',
        }
      : null,
    combinationId: null,
    combination: null,
    sortOrder: 0,
    createdAt: '',
    updatedAt: '',
  };
}

export function mapSmStudent(s: SmStudentRow, classes: ApiClass[]): Student {
  const full = String(s.fullName ?? '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  const firstName = s.firstName || parts[0] || 'Student';
  const lastName = s.lastName || parts.slice(1).join(' ') || '';
  const wanted = [s.className, s.stream].filter(Boolean).join(' ').trim();
  const cls =
    (s.classId ? classes.find((c) => c.id === s.classId) : undefined) ||
    classes.find((c) => classLabel(c).toLowerCase() === wanted.toLowerCase()) ||
    classes.find((c) => c.name.toLowerCase() === String(s.className ?? '').trim().toLowerCase());

  const enrollment: Enrollment | null = cls
    ? {
        id: `${s.id}-current`,
        organizationId: '',
        studentId: s.id,
        classId: cls.id,
        academicYear: '',
        status: 'ACTIVE',
        isCurrent: true,
        promotedToClassId: null,
        promotedToYear: null,
        term: null,
        joiningDate: null,
        recordedBy: null,
        createdAt: '',
        updatedAt: '',
        class: cls,
      }
    : null;

  return {
    id: s.id,
    organizationId: '',
    studentUid: s.studentCode || s.id,
    firstName,
    lastName,
    gender: s.gender ?? null,
    dateOfBirth: null,
    nationality: null,
    province: null,
    district: null,
    sector: null,
    cell: null,
    village: null,
    studentCode: s.studentCode ?? null,
    sdmCode: null,
    studentPhoto: s.photoUrl ?? null,
    rfidUid: null,
    fingerprintId: null,
    bloodGroup: null,
    allergies: null,
    formerSchool: null,
    leavingReason: null,
    identityRemarks: null,
    disciplineMarks: null,
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
    enrollments: enrollment ? [enrollment] : [],
    studentParents: s.parentName
      ? [
          {
            id: `${s.id}-parent`,
            organizationId: '',
            studentId: s.id,
            parentId: `${s.id}-parent`,
            role: 'GUARDIAN',
            createdAt: '',
            parent: {
              id: `${s.id}-parent`,
              organizationId: '',
              firstName: s.parentName,
              lastName: '',
              phone: s.parentPhone ?? null,
              email: null,
              nationalId: null,
              occupation: null,
              address: null,
              createdAt: '',
              updatedAt: '',
            },
          },
        ]
      : [],
  };
}
