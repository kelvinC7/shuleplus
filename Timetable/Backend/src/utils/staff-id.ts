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

  return null;
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
