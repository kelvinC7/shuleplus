import { attendanceApi } from '@/services/attendance-api';
import type { AttendancePdfMeta } from '@/utils/export-attendance-pdf';
import { resolvePublicAssetUrl } from '@/utils/resolve-public-asset';

export type SchoolOrganizationProfile = {
  organizationId: string;
  organizationCode: string | null;
  schoolName: string;
  email: string | null;
  phone: string | null;
  poBox: string | null;
  website: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  logoUrl: string | null;
  principalName: string | null;
  schoolMotto: string | null;
};

export async function fetchSchoolOrganizationProfile(): Promise<SchoolOrganizationProfile | null> {
  try {
    const { data } = await attendanceApi.organizationProfile();
    return data.data ?? null;
  } catch {
    return null;
  }
}

export function schoolInfoLines(profile: SchoolOrganizationProfile | null): string[] {
  if (!profile) return [];
  const lines: string[] = [];
  if (profile.organizationCode) lines.push(`School code: ${profile.organizationCode}`);
  const loc = [profile.sector, profile.district, profile.province].filter(Boolean).join(', ');
  if (profile.address) lines.push(profile.address);
  else if (loc) lines.push(loc);
  if (profile.poBox) lines.push(`P.O. Box ${profile.poBox}`);
  if (profile.phone) lines.push(`Tel: ${profile.phone}`);
  if (profile.email) lines.push(profile.email);
  if (profile.principalName) lines.push(`Head: ${profile.principalName}`);
  if (profile.schoolMotto) lines.push(`"${profile.schoolMotto}"`);
  return lines;
}

export function buildSchoolPdfBranding(
  profile: SchoolOrganizationProfile | null,
  attendanceDateLabel: string,
  extras: Pick<AttendancePdfMeta, 'title' | 'subtitle' | 'audienceLabel'>
): AttendancePdfMeta {
  const schoolName = profile?.schoolName?.trim() || 'School';
  return {
    schoolName,
    logoUrl: profile?.logoUrl ? resolvePublicAssetUrl(profile.logoUrl) : null,
    organizationCode: profile?.organizationCode ?? null,
    schoolInfoLines: schoolInfoLines(profile),
    attendanceDateLabel,
    ...extras,
  };
}
