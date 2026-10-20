import { env } from '../config/env';

export interface IamSchoolProfile {
  organizationId: string;
  organizationCode?: string | null;
  schoolName: string;
  email?: string | null;
  phone?: string | null;
  poBox?: string | null;
  website?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  principalName?: string | null;
  academicSettings?: {
    academicYears: string[];
    terms: string[];
    currentAcademicYear: string | null;
    currentTerm: string | null;
  };
}

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

async function iamFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'procurement-mis',
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

export async function fetchIamSchoolProfile(
  organizationId: string,
): Promise<IamSchoolProfile | null> {
  return iamFetch<IamSchoolProfile>(`/internal/organizations/${organizationId}/profile`);
}

export async function fetchIamAcademicSettings(
  organizationId: string,
): Promise<AcademicSettings | null> {
  return iamFetch<AcademicSettings>(
    `/internal/organizations/${organizationId}/academic-settings`,
  );
}

export async function updateIamAcademicSettings(
  organizationId: string,
  settings: AcademicSettings,
): Promise<AcademicSettings | null> {
  return iamFetch<AcademicSettings>(
    `/internal/organizations/${organizationId}/academic-settings`,
    { method: 'PUT', body: JSON.stringify(settings) },
  );
}

export interface IamUserBrief {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function fetchIamUser(userId: string): Promise<IamUserBrief | null> {
  return iamFetch<IamUserBrief>(`/internal/users/${userId}`);
}
