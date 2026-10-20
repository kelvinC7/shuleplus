import { env } from '../config/env';

export interface AcademicSettingsDto {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

function iamInternalBase() {
  const base = (process.env.IAM_API_URL ?? 'http://127.0.0.1:3001/api/v1').replace(/\/$/, '');
  return `${base}/internal`;
}

export function defaultAcademicSettings(): AcademicSettingsDto {
  const start = new Date().getFullYear();
  const year = `${start}-${start + 1}`;
  return {
    academicYears: [year],
    terms: ['Full Academic Year', 'Term 1', 'Term 2', 'Term 3'],
    currentAcademicYear: year,
    currentTerm: 'Term 1',
  };
}

export async function fetchOrganizationAcademicSettings(organizationId: string): Promise<AcademicSettingsDto> {
  try {
    const res = await fetch(`${iamInternalBase()}/organizations/${organizationId}/academic-settings`, {
      headers: {
        Accept: 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
      },
    });
    if (!res.ok) return defaultAcademicSettings();
    const body = (await res.json()) as { data?: AcademicSettingsDto };
    const data = body.data;
    if (!data) return defaultAcademicSettings();
    const terms = [...new Set([...(data.terms ?? []), 'Full Academic Year'])];
    return {
      academicYears: data.academicYears?.length ? data.academicYears : defaultAcademicSettings().academicYears,
      terms,
      currentAcademicYear: data.currentAcademicYear,
      currentTerm: data.currentTerm,
    };
  } catch {
    return defaultAcademicSettings();
  }
}
