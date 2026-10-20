/**
 * Modern staff ID: {ROLE}{DD}{SSS}{NNN} — e.g. TR04001001, ACC04001002
 */

import {
  normalizeRolePrefix,
  resolvePositionAbbreviation,
} from '../constants/staff-positions';

const MODERN_STAFF_ID_RE = /^[A-Z0-9]{2,4}\d{8}$/;

const LEGACY_YEAR_STAFF_ID_RE = /^[A-Z]{2,3}\d{3}\d{3}\d{2}$/i;

const BARE_NUMERIC_STAFF_ID_RE = /^\d{8}$/;

export function normalizeStaffIdInput(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, '').trim().toUpperCase();
}

export function isModernStaffId(value: string | null | undefined): boolean {
  const id = normalizeStaffIdInput(value);
  if (!id) return false;
  return MODERN_STAFF_ID_RE.test(id);
}

export function isLegacyStaffId(value: string | null | undefined): boolean {
  const id = normalizeStaffIdInput(value);
  if (!id) return false;
  if (LEGACY_YEAR_STAFF_ID_RE.test(id)) return true;
  if (BARE_NUMERIC_STAFF_ID_RE.test(id)) return true;
  if (id.startsWith('EMP-')) return true;
  /** National ID / placeholder numbers stored before modern format (e.g. 1199580122663210). */
  if (/^\d{9,}$/.test(id)) return true;
  return false;
}

export function parseOrganizationStaffPrefix(
  organizationCode: string | null | undefined,
  districtCodeFallback?: string | null
): { districtCode: string; schoolCode: string; prefix: string } {
  const digits = (organizationCode ?? '').replace(/\D/g, '');
  if (digits.length >= 5) {
    const districtCode = digits.slice(0, 2).padStart(2, '0');
    const schoolCode = digits.slice(2, 5).padStart(3, '0');
    return { districtCode, schoolCode, prefix: `${districtCode}${schoolCode}` };
  }
  const districtCode = (districtCodeFallback ?? '01').replace(/\D/g, '').padStart(2, '0').slice(-2);
  let schoolCode = '001';
  if (digits.length >= 3) schoolCode = digits.slice(-3).padStart(3, '0');
  else if (digits.length > 0) schoolCode = digits.padStart(3, '0');
  return { districtCode, schoolCode, prefix: `${districtCode}${schoolCode}` };
}

export function extractSchoolCodeDigits(organizationCode: string | null | undefined): string {
  return parseOrganizationStaffPrefix(organizationCode).schoolCode;
}

export function resolveStaffRolePrefix(opts: {
  position?: string | null;
  roleSlug?: string | null;
  roleName?: string | null;
}): string {
  return normalizeRolePrefix(resolvePositionAbbreviation(opts));
}

export function formatModernStaffId(
  rolePrefix: string,
  districtCode: string,
  schoolCode: string,
  sequence: number
): string {
  const role = normalizeRolePrefix(rolePrefix);
  const dd = String(districtCode || '01').replace(/\D/g, '').padStart(2, '0').slice(-2);
  const ss = String(schoolCode || '001').replace(/\D/g, '').padStart(3, '0').slice(-3);
  const seq = Math.max(1, Math.min(999, sequence));
  return `${role}${dd}${ss}${String(seq).padStart(3, '0')}`;
}

export function parseStaffIdTail(value: string | null | undefined): {
  rolePrefix: string | null;
  districtCode: string;
  schoolCode: string;
  sequence: number;
} | null {
  const id = normalizeStaffIdInput(value);
  if (!id) return null;

  const tail = id.match(/(\d{2})(\d{3})(\d{3})$/);
  if (tail && id.length >= 10) {
    const rolePrefix = id.slice(0, id.length - 8) || null;
    return {
      rolePrefix,
      districtCode: tail[1],
      schoolCode: tail[2],
      sequence: parseInt(tail[3], 10),
    };
  }

  if (BARE_NUMERIC_STAFF_ID_RE.test(id)) {
    return {
      rolePrefix: null,
      districtCode: id.slice(0, 2),
      schoolCode: id.slice(2, 5),
      sequence: parseInt(id.slice(5, 8), 10),
    };
  }

  const legacy = id.match(/^([A-Z]{2,4})(\d{3})(\d{3})\d{2}$/);
  if (legacy) {
    return {
      rolePrefix: legacy[1],
      districtCode: '01',
      schoolCode: legacy[2],
      sequence: parseInt(legacy[3], 10),
    };
  }

  return null;
}

/** DD+SSS from a stored staff id, or null if not parseable. */
export function staffIdLocationPrefix(value: string | null | undefined): string | null {
  const parsed = parseStaffIdTail(value);
  if (!parsed) return null;
  return `${parsed.districtCode}${parsed.schoolCode}`;
}

export function staffIdMatchesOrganization(
  value: string | null | undefined,
  organizationCode: string | null | undefined,
  districtCodeFallback?: string | null
): boolean {
  const { prefix } = parseOrganizationStaffPrefix(organizationCode, districtCodeFallback);
  const loc = staffIdLocationPrefix(value);
  return loc !== null && loc === prefix;
}

export function nextSequenceFromExistingIds(
  existingIds: Array<string | null | undefined>,
  districtCode: string,
  schoolCode: string
): number {
  const { prefix: schoolPrefix } = parseOrganizationStaffPrefix(`${districtCode}${schoolCode}`);
  let maxSeq = 0;

  for (const raw of existingIds) {
    const parsed = parseStaffIdTail(raw);
    if (!parsed) continue;
    const loc = `${parsed.districtCode}${parsed.schoolCode}`;
    if (loc !== schoolPrefix) continue;
    maxSeq = Math.max(maxSeq, parsed.sequence);
  }

  return maxSeq + 1;
}

export function formatStaffCodeDisplay(value: string | null | undefined): string {
  const id = normalizeStaffIdInput(value);
  const parsed = parseStaffIdTail(id);
  if (parsed?.rolePrefix) {
    return `${parsed.rolePrefix} ${parsed.districtCode} ${parsed.schoolCode} ${String(parsed.sequence).padStart(3, '0')}`;
  }
  if (BARE_NUMERIC_STAFF_ID_RE.test(id)) {
    return `${id.slice(0, 2)} ${id.slice(2, 5)} ${id.slice(5, 8)}`;
  }
  return (value ?? '').trim() || id;
}

/** Keep DD+SSS+NNN; swap role prefix when position changes (e.g. TR → HT). */
export function realignStaffIdRolePrefix(
  existingId: string | null | undefined,
  opts: {
    position?: string | null;
    roleSlug?: string | null;
    roleName?: string | null;
  }
): string | null {
  const current = normalizeStaffIdInput(existingId);
  if (!current || !isModernStaffId(current)) return null;
  const parsed = parseStaffIdTail(current);
  if (!parsed) return null;

  const newPrefix = resolveStaffRolePrefix(opts);
  if (normalizeRolePrefix(parsed.rolePrefix ?? '') === newPrefix) return current;

  return formatModernStaffId(
    newPrefix,
    parsed.districtCode,
    parsed.schoolCode,
    parsed.sequence
  );
}

export function staffDisplayCode(user: {
  id: string;
  employeeId: string | null;
  email: string;
}): string {
  if (user.employeeId?.trim()) {
    return normalizeStaffIdInput(user.employeeId);
  }
  const local = user.email.split('@')[0]?.trim();
  if (local) return local.toUpperCase();
  return `U${user.id.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}
