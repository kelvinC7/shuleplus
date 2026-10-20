import { resolveAssetUrl } from './api';

export const STUDENT_LOOKUP_NOT_FOUND =
  'Student not found. Check the code and try again.';

/** Reject students who belong to a different school than the directory card/modal context. */
export function assertStudentBelongsToSchool(
  studentOrgId: string | undefined | null,
  schoolId: string,
): void {
  if (!studentOrgId?.trim() || studentOrgId.trim() !== schoolId.trim()) {
    throw new Error(STUDENT_LOOKUP_NOT_FOUND);
  }
}

/** Browser-loadable student photo — rewrites localhost / SM API hosts to `/uploads/...`. */
export function normalizeStudentPhotoUrl(photoUrl?: string | null): string | null {
  const resolved = resolveAssetUrl(photoUrl);
  return resolved || null;
}
