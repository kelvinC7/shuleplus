export const OWNERSHIPS = ['GOVERNMENT', 'GOVERNMENT_AIDED'] as const;
export type OwnershipCode = (typeof OWNERSHIPS)[number];

export const EDUCATION_LEVELS = ['NURSERY', 'PRIMARY', 'SECONDARY', 'TVET'] as const;
export type EducationLevelCode = (typeof EDUCATION_LEVELS)[number];

export const STUDENT_TYPES = ['DAY', 'BOARDING'] as const;
export type StudentTypeCode = (typeof STUDENT_TYPES)[number];

export const CLASS_OPTIONS: Record<EducationLevelCode, string[]> = {
  NURSERY: ['N1', 'N2', 'N3', 'BABY'],
  PRIMARY: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  SECONDARY: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  TVET: ['L1', 'L2', 'L3', 'L4', 'L5', 'Y1', 'Y2', 'Y3'],
};

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function normalizeOwnership(raw?: string | null): OwnershipCode | 'PRIVATE' | 'UNKNOWN' {
  const v = (raw ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!v) return 'UNKNOWN';
  if (v.includes('private')) return 'PRIVATE';
  if (v.includes('aided') || v.includes('government aided') || v === 'aided') return 'GOVERNMENT_AIDED';
  if (v.includes('government') || v === 'public' || v === 'gov') return 'GOVERNMENT';
  return 'UNKNOWN';
}

export function normalizeStudentCohort(raw?: string | null): 'public' | 'private' {
  const v = (raw ?? 'public').trim().toLowerCase();
  if (v === 'private' || v === 'private students') return 'private';
  return 'public';
}

export function normalizeStudentType(raw?: string | null): StudentTypeCode {
  const v = (raw ?? 'DAY').trim().toLowerCase();
  if (v.includes('board')) return 'BOARDING';
  return 'DAY';
}

export function normalizeEducationLevel(raw?: string | null): EducationLevelCode | null {
  const v = (raw ?? '').trim().toUpperCase();
  if ((EDUCATION_LEVELS as readonly string[]).includes(v)) return v as EducationLevelCode;
  const lower = (raw ?? '').toLowerCase();
  if (lower.includes('nurs') || lower.includes('baby') || /^n\d/i.test(raw ?? '')) return 'NURSERY';
  if (lower.includes('primary') || /^p\d/i.test(raw ?? '')) return 'PRIMARY';
  if (lower.includes('secondary') || /^s\d/i.test(raw ?? '')) return 'SECONDARY';
  // TSS is treated as TVET (same education track)
  if (lower.includes('tvet') || lower.includes('tss') || /^l\d/i.test(raw ?? '') || /^y\d/i.test(raw ?? '')) {
    return 'TVET';
  }
  return null;
}

export function inferLevelFromClass(classLabel?: string | null): EducationLevelCode | null {
  const label = (classLabel ?? '').trim().toUpperCase();
  if (!label) return null;
  if (/^N[1-3]/.test(label) || label === 'BABY' || label.startsWith('BABY') || label.startsWith('N')) {
    return 'NURSERY';
  }
  if (/^P[1-6]/.test(label) || label.startsWith('P')) return 'PRIMARY';
  if (/^S[1-6]/.test(label) || label.startsWith('S')) return 'SECONDARY';
  if (/^L[1-5]/.test(label) || /^Y[1-3]/.test(label)) return 'TVET';
  return null;
}

/** Extract grade token used for policy matching (P5 from "P5 A"). */
export function classToken(classLabel?: string | null): string {
  const label = (classLabel ?? '').trim().toUpperCase();
  const match = label.match(/^(N[1-3]|BABY|P[1-6]|S[1-6]|L[1-5]|Y[1-3])/);
  return match?.[1] ?? label.split(/\s+/)[0] ?? label;
}

/**
 * NESA fee policies apply to:
 * - Government schools (all cohorts)
 * - Government Aided only when cohort is public students
 * Never private schools or Gov-Aided private cohorts.
 */
export function policyApplies(input: {
  ownershipType?: string | null;
  feeTargetStudents?: string | null;
}): boolean {
  const ownership = normalizeOwnership(input.ownershipType);
  if (ownership === 'PRIVATE' || ownership === 'UNKNOWN') return false;
  if (ownership === 'GOVERNMENT') return true;
  return normalizeStudentCohort(input.feeTargetStudents) === 'public';
}
