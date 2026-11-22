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
  country?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
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
  const url = `${base}${path}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'procurement-mis',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      console.warn(
        `[iam] ${init?.method ?? 'GET'} ${url} failed: ${response.status} ${response.statusText}`,
      );
      return null;
    }
    const body = (await response.json()) as { success?: boolean; data?: T };
    return body.data ?? null;
  } catch (error) {
    console.warn(
      `[iam] ${init?.method ?? 'GET'} ${url} unreachable: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
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

export interface IamModuleVisibility {
  accessLevel: 'USER' | 'HEAD';
  dataScope: string;
  canViewAll: boolean;
}

/** Resolve the caller's own module access level using their bearer token. */
export async function fetchModuleVisibility(
  accessToken: string,
  moduleSlug: string = env.MODULE_SLUG,
): Promise<IamModuleVisibility | null> {
  return iamFetch<IamModuleVisibility>(`/iam/me/modules/${moduleSlug}/visibility`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
