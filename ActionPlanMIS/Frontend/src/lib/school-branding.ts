import type { OrganizationProfile } from '@/types';
import type { SchoolBranding } from '@/lib/export-action-plan-pdf';

function iamAssetOrigin() {
  const apiBase =
    process.env.NEXT_PUBLIC_IAM_API_URL ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '/api/v1') ??
    'http://localhost:3001/api/v1';
  return apiBase.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3001';
}

/** Resolve `/uploads/...` from Authentication into a browser-loadable URL for PDF rendering. */
export function resolveSchoolAssetUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const origin = iamAssetOrigin();
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export function locationLine(profile?: OrganizationProfile | null) {
  return [profile?.district, profile?.sector, profile?.province].filter(Boolean).join(' · ');
}

export function schoolBrandingFromProfile(
  profile: OrganizationProfile | null | undefined,
  fallbackName: string,
  generatedBy?: string
): SchoolBranding {
  const schoolName = profile?.schoolName?.trim() || fallbackName;
  return {
    schoolName,
    schoolLocation: locationLine(profile) || profile?.address || 'Rwanda',
    logoSrc: resolveSchoolAssetUrl(profile?.logoUrl),
    generatedBy,
    motto: profile?.schoolMotto ?? undefined,
    organizationCode: profile?.organizationCode ?? null,
    email: profile?.email ?? null,
    phone: profile?.phone ?? null,
    poBox: profile?.poBox ?? null,
    website: profile?.website ?? null,
    address: profile?.address ?? null,
    province: profile?.province ?? null,
    district: profile?.district ?? null,
    sector: profile?.sector ?? null,
    cell: profile?.cell ?? null,
    village: profile?.village ?? null,
    principalName: profile?.principalName ?? null,
    schoolCategory: profile?.schoolCategory ?? null,
    schoolProgram: profile?.schoolProgram ?? null,
    ownershipType: profile?.ownershipType ?? null,
    curriculum: profile?.curriculum ?? null,
  };
}
