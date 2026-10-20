import { env } from '../config/env';

export interface IamAcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

function defaultSettings(): IamAcademicSettings {
  const y = new Date().getFullYear();
  return {
    academicYears: [`${y}-${y + 1}`],
    terms: ['Term 1', 'Term 2', 'Term 3'],
    currentAcademicYear: `${y}-${y + 1}`,
    currentTerm: 'Term 1',
  };
}

export async function fetchOrganizationAcademicSettings(
  organizationId: string
): Promise<IamAcademicSettings> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const res = await fetch(
      `${base}/internal/organizations/${encodeURIComponent(organizationId)}/academic-settings`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': env.SERVICE_API_KEY,
          'x-source-service': 'parentmis',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return defaultSettings();
    const body = (await res.json()) as { data?: IamAcademicSettings };
    const data = body.data;
    if (!data?.academicYears?.length) return defaultSettings();
    return {
      academicYears: data.academicYears,
      terms: data.terms?.length ? data.terms : defaultSettings().terms,
      currentAcademicYear: data.currentAcademicYear ?? data.academicYears[0] ?? null,
      currentTerm: data.currentTerm ?? data.terms?.[0] ?? null,
    };
  } catch {
    return defaultSettings();
  }
}

export async function resolveSchoolAcademicPeriod(
  organizationId: string,
  opts?: { academicYear?: string; term?: string }
) {
  const settings = await fetchOrganizationAcademicSettings(organizationId);
  const academicYear =
    opts?.academicYear?.trim() ||
    settings.currentAcademicYear?.trim() ||
    settings.academicYears[0]?.trim() ||
    '';
  const term =
    opts?.term?.trim() ||
    settings.currentTerm?.trim() ||
    settings.terms[0]?.trim() ||
    '';
  return { settings, academicYear, term };
}
