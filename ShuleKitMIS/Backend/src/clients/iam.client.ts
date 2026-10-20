import { env } from '../config/env';

export interface IamAcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

const YEAR_PATTERN = /^\d{4}-\d{4}$/;

export function defaultAcademicSettings(): IamAcademicSettings {
  const start = new Date().getFullYear();
  const year = `${start}-${start + 1}`;
  return {
    academicYears: [year],
    terms: ['Term 1', 'Term 2', 'Term 3'],
    currentAcademicYear: year,
    currentTerm: 'Term 1',
  };
}

export function parseAcademicSettings(raw: unknown): IamAcademicSettings {
  const defaults = defaultAcademicSettings();
  if (!raw || typeof raw !== 'object') return defaults;
  const obj = raw as Record<string, unknown>;
  const academicYears = Array.isArray(obj.academicYears)
    ? obj.academicYears.filter((y): y is string => typeof y === 'string' && YEAR_PATTERN.test(y))
    : defaults.academicYears;
  const terms = Array.isArray(obj.terms)
    ? obj.terms.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    : defaults.terms;
  const currentAcademicYear =
    typeof obj.currentAcademicYear === 'string' && YEAR_PATTERN.test(obj.currentAcademicYear)
      ? obj.currentAcademicYear
      : academicYears[0] ?? defaults.currentAcademicYear;
  const currentTerm =
    typeof obj.currentTerm === 'string' && terms.includes(obj.currentTerm)
      ? obj.currentTerm
      : terms[0] ?? defaults.currentTerm;

  return {
    academicYears: academicYears.length ? [...new Set(academicYears)] : defaults.academicYears,
    terms: terms.length ? [...new Set(terms)] : defaults.terms,
    currentAcademicYear,
    currentTerm,
  };
}

export async function fetchIamAcademicSettings(organizationId: string): Promise<IamAcademicSettings> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = `${base}/internal/organizations/${organizationId}/academic-settings`;
  try {
    const response = await fetch(url, {
      headers: {
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'shulekit-mis',
      },
    });
    if (!response.ok) return defaultAcademicSettings();
    const body = (await response.json()) as { success?: boolean; data?: unknown };
    return parseAcademicSettings(body.data);
  } catch {
    return defaultAcademicSettings();
  }
}
