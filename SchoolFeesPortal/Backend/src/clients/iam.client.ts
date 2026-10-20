import { env } from '../config/env';

export interface IamAcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export async function fetchIamAcademicSettings(
  organizationId: string
): Promise<IamAcademicSettings | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = `${base}/internal/organizations/${organizationId}/academic-settings`;
  try {
    const response = await fetch(url, {
      headers: {
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'school-fees',
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: IamAcademicSettings };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export type IamOrganizationProfile = {
  organizationId: string;
  schoolName: string;
  organizationCode: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  district: string | null;
  province: string | null;
};

export function resolveIamAssetUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const origin = env.IAM_API_URL.replace(/\/api\/v1\/?$/, '');
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export async function fetchIamOrganizationProfile(
  organizationId: string
): Promise<IamOrganizationProfile | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = `${base}/internal/organizations/${organizationId}/profile`;
  try {
    const response = await fetch(url, {
      headers: {
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'school-fees',
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: IamOrganizationProfile };
    return body.data ?? null;
  } catch {
    return null;
  }
}
