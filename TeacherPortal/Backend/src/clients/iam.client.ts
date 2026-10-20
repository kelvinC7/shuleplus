import { env } from '../config/env';

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export function defaultAcademicSettings(): AcademicSettings {
  const y = new Date().getFullYear();
  return {
    academicYears: [`${y}-${y + 1}`],
    terms: ['Term 1', 'Term 2', 'Term 3'],
    currentAcademicYear: `${y}-${y + 1}`,
    currentTerm: 'Term 1',
  };
}

async function iamFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'teacher-portal',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { success?: boolean; data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchIamAcademicSettings(
  organizationId: string
): Promise<AcademicSettings | null> {
  return iamFetch<AcademicSettings>(`/internal/organizations/${organizationId}/academic-settings`);
}
