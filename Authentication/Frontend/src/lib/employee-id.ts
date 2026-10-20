import { normalizeRolePrefix, resolvePositionAbbreviation } from '@/lib/staff-positions';

const MODERN_STAFF_ID_RE = /^[A-Z0-9]{2,4}\d{8}$/;

function normalizeStaffIdInput(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, '').trim().toUpperCase();
}

/** Swap role letters when position changes; keep school + sequence digits (last 8). */
export function realignEmployeeIdForPosition(
  employeeId: string,
  position: string,
  roleSlug?: string | null,
): string {
  const id = normalizeStaffIdInput(employeeId);
  if (!MODERN_STAFF_ID_RE.test(id)) {
    return employeeId.trim();
  }

  const tail = id.slice(-8);
  const prefix = normalizeRolePrefix(
    resolvePositionAbbreviation({ position, roleSlug: roleSlug ?? undefined }),
  );
  return `${prefix}${tail}`;
}
