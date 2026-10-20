import { organizationToForm, resolvePublicAssetUrl } from '@/lib/organization-registration';

export type OrgProfileFormState = {
  organizationName: string;
  organizationCode: string;
  establishedDate: string;
  description: string;
  schoolCategory: string;
  schoolProgram: string;
  educationLevels: string[];
  aLevelCombinations: string[];
  tvetTrades: string[];
  logoUrl: string;
  signatureUrl: string;
  stampUrl: string;
  phone: string;
  email: string;
  website: string;
  postalAddress: string;
  provinceId: string;
  provinceName: string;
  districtId: string;
  districtName: string;
  sectorId: string;
  sectorName: string;
  cellId: string;
  cellName: string;
  villageId: string;
  villageName: string;
  organizationHead: string;
  headPhone: string;
  headEmail: string;
};

export const EMPTY_ORG_PROFILE_FORM: OrgProfileFormState = {
  organizationName: '',
  organizationCode: '',
  establishedDate: '',
  description: '',
  schoolCategory: '',
  schoolProgram: '',
  educationLevels: [],
  aLevelCombinations: [],
  tvetTrades: [],
  logoUrl: '',
  signatureUrl: '',
  stampUrl: '',
  phone: '',
  email: '',
  website: '',
  postalAddress: '',
  provinceId: '',
  provinceName: '',
  districtId: '',
  districtName: '',
  sectorId: '',
  sectorName: '',
  cellId: '',
  cellName: '',
  villageId: '',
  villageName: '',
  organizationHead: '',
  headPhone: '',
  headEmail: '',
};

function locName(org: Record<string, unknown>, key: string): string {
  const ref = org[key] as { name?: string } | null | undefined;
  return ref?.name?.trim() ?? '';
}

export function orgProfileFormFromOrganization(org: Record<string, unknown>): OrgProfileFormState {
  const base = organizationToForm(org);
  const payload = (org.registrationPayload ?? {}) as Record<string, unknown>;

  return {
    organizationName: base.organizationName,
    organizationCode: String(org.organizationCode ?? ''),
    establishedDate: base.establishedDate,
    description: base.description || String(org.description ?? ''),
    schoolCategory: base.schoolCategory,
    schoolProgram: base.schoolProgram,
    educationLevels: base.educationLevels,
    aLevelCombinations: base.aLevelCombinations,
    tvetTrades: base.tvetTrades,
    logoUrl: base.logoUrl,
    signatureUrl: base.signatureUrl,
    stampUrl: base.stampUrl,
    phone: base.phone,
    email: base.email,
    website: base.website,
    postalAddress: base.postalAddress || String(org.poBox ?? payload.postalAddress ?? ''),
    provinceId: base.provinceId,
    provinceName: locName(org, 'province'),
    districtId: base.districtId,
    districtName: locName(org, 'district'),
    sectorId: base.sectorId,
    sectorName: locName(org, 'sector'),
    cellId: base.cellId,
    cellName: locName(org, 'cell'),
    villageId: base.villageId,
    villageName: locName(org, 'village'),
    organizationHead: base.organizationHead,
    headPhone: base.headPhone,
    headEmail: base.headEmail || String((org.adminUser as { email?: string } | null)?.email ?? ''),
  };
}

export function orgProfileFormToPayload(form: OrgProfileFormState): Record<string, unknown> {
  return {
    organizationType: 'SCHOOL',
    organizationName: form.organizationName.trim(),
    establishedDate: form.establishedDate || undefined,
    description: form.description.trim() || undefined,
    schoolCategory: form.schoolCategory,
    category: form.schoolCategory,
    schoolProgram: form.schoolProgram,
    educationLevels: form.educationLevels,
    aLevelCombinations: form.educationLevels.includes('A-Level') ? form.aLevelCombinations : [],
    tvetTrades: form.educationLevels.includes('TVET') ? form.tvetTrades : [],
    logoUrl: form.logoUrl ? resolvePublicAssetUrl(form.logoUrl) : undefined,
    signatureUrl: form.signatureUrl ? resolvePublicAssetUrl(form.signatureUrl) : undefined,
    stampUrl: form.stampUrl ? resolvePublicAssetUrl(form.stampUrl) : undefined,
    phone: form.phone.trim(),
    email: form.email.trim(),
    website: form.website.trim() || undefined,
    postalAddress: form.postalAddress.trim() || undefined,
    provinceId: form.provinceId,
    districtId: form.districtId,
    sectorId: form.sectorId || undefined,
    cellId: form.cellId || undefined,
    villageId: form.villageId || undefined,
    country: 'Rwanda',
    organizationHead: form.organizationHead.trim(),
    headPhone: form.headPhone.trim() || undefined,
    headEmail: form.headEmail.trim(),
  };
}

export const ORG_PROFILE_STEPS = [
  { id: 1, label: 'Location' },
  { id: 2, label: 'School' },
  { id: 3, label: 'Contact' },
  { id: 4, label: 'Leadership' },
  { id: 5, label: 'Review' },
] as const;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^(\+?250|0)?[7][0-9]{8}$/;

export function isValidEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string) {
  const digits = value.replace(/[\s\-()]/g, '');
  return (
    PHONE_RE.test(digits) ||
    (/^\+?[0-9]{9,15}$/.test(digits) && digits.replace(/\D/g, '').length >= 9)
  );
}

export function isCompleteDate(value: string) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
