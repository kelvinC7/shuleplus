import { env } from '../config/env';

export interface IamSchoolProfile {
  organizationId: string;
  organizationCode?: string | null;
  schoolName: string;
  email?: string | null;
  phone?: string | null;
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
  schoolMotto?: string | null;
  description?: string | null;
  schoolCategory?: string | null;
  schoolProgram?: string | null;
  educationLevels?: string[];
  leaders?: Array<{
    name: string;
    role: string;
    phone?: string;
    email?: string;
  }>;
  academicSettings?: IamAcademicSettings;
}

export interface IamAcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export async function fetchIamAcademicSettings(organizationId: string): Promise<IamAcademicSettings | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = `${base}/internal/organizations/${organizationId}/academic-settings`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'mini-website',
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { success?: boolean; data?: IamAcademicSettings };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchIamSchoolProfile(organizationId: string): Promise<IamSchoolProfile | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = `${base}/internal/organizations/${organizationId}/profile`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'mini-website',
      },
    });
    if (!response.ok) {
      console.warn(`[IAM] school profile fetch failed: HTTP ${response.status}`);
      return null;
    }
    const body = (await response.json()) as { success?: boolean; data?: IamSchoolProfile };
    return body.data ?? null;
  } catch (err) {
    console.warn('[IAM] school profile fetch error:', err);
    return null;
  }
}
