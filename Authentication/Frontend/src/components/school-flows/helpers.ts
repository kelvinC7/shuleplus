import type { LookupStudent } from '@/LandingPage/services/portal-api';
import type { School } from '@/lib/school-flows/types';
import type { HandoffStudent } from './request-loan-modal';

export const STUDENT_LOOKUP_NOT_FOUND =
  'Student not found. Check the code and try again.';

/** Reject students who belong to a different school than the flow modal context. */
export function assertStudentBelongsToSchool(
  studentOrgId: string | undefined | null,
  schoolId: string,
): void {
  if (!studentOrgId?.trim() || studentOrgId.trim() !== schoolId.trim()) {
    throw new Error(STUDENT_LOOKUP_NOT_FOUND);
  }
}

function uploadsPathFromUrl(url: string): string | null {
  const match = url.match(/\/uploads\/[^\s?#]+/i);
  return match ? match[0] : null;
}

/** Browser-loadable student photo on shuleplus.rw (apex proxies `/uploads/`). */
export function normalizeStudentPhotoUrl(photoUrl?: string | null): string | null {
  const trimmed = (photoUrl ?? '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  const uploadPath = uploadsPathFromUrl(trimmed);
  if (uploadPath) return uploadPath;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const origin = (
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
  ).replace(/\/api\/v1\/?$/, '');
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export function lookupToSchool(student: LookupStudent): School {
  const name = student.schoolName || 'School';
  return {
    id: student.organizationId,
    name,
    initials: name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'SC',
    desc: '',
    district: student.district ?? '',
    province: student.province ?? '',
    sector: student.sector ?? null,
    type: '',
    category: '',
    verified: true,
    organizationCode: student.organizationCode ?? null,
    curricula: [],
    levels: [],
    mode: '',
    gender: 'Mixed',
    feesPerTerm: null,
    combinations: [],
    educationLevels: [],
    aLevelCombinations: [],
    tvetTrades: [],
  };
}

export function lookupToHandoffStudent(student: LookupStudent): HandoffStudent {
  return {
    id: student.id,
    fullName: student.fullName,
    firstName: student.firstName,
    lastName: student.lastName,
    className: student.className,
    classLabel: student.classLabel,
    schoolName: student.schoolName,
    organizationId: student.organizationId,
    academicYear: student.academicYear,
    term: student.term,
    shuleCode: student.shuleCode ?? student.studentUid,
    studentCode: student.studentCode ?? student.studentUid,
    photoUrl: student.photoUrl,
    parents: student.parents,
  };
}
