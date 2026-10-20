export const WIZARD_ORG_TYPES = [
  'SCHOOL',
  'BUSINESS',
  'FACTORY',
  'CHURCH',
  'HOSPITAL',
  'NGO',
  'TVET',
  'SACCO',
  'COOPERATIVE',
  'GOVERNMENT_INSTITUTION',
  'HOTEL',
] as const;

export type WizardOrgType = (typeof WIZARD_ORG_TYPES)[number];

export const WIZARD_STEPS = [
  'Organization Type',
  'Location',
  'Organization Details',
  'Contact Information',
  'Leadership',
  'System Access',
  'Review & Submit',
] as const;

export const LEADERSHIP_LABELS: Record<WizardOrgType, string> = {
  SCHOOL: 'Head Teacher',
  TVET: 'Principal',
  HOSPITAL: 'Director',
  FACTORY: 'General Manager',
  CHURCH: 'Pastor / Bishop',
  NGO: 'Executive Director',
  BUSINESS: 'CEO',
  SACCO: 'Managing Director',
  COOPERATIVE: 'Chairperson',
  GOVERNMENT_INSTITUTION: 'Director General',
  HOTEL: 'General Manager',
};

export const EDUCATION_LEVELS = ['Nursery', 'Primary', 'O-Level', 'A-Level', 'TVET'] as const;

export const SCHOOL_CATEGORIES = ['Public', 'Private', 'Government-Aided'] as const;
export const SCHOOL_PROGRAMS = ['Day', 'Boarding', 'Mixed'] as const;

export interface LocationRef {
  id: string;
  name: string;
  code?: string;
}

export interface RegistrationFormState {
  organizationType: WizardOrgType;
  organizationName: string;
  category: string;
  logoUrl: string;
  signatureUrl: string;
  stampUrl: string;
  country: string;
  provinceId: string;
  districtId: string;
  sectorId: string;
  cellId: string;
  villageId: string;
  organizationCodePreview: string;
  establishedDate: string;
  description: string;
  website: string;
  phone: string;
  email: string;
  postalAddress: string;
  organizationHead: string;
  headPosition: string;
  headPhone: string;
  headEmail: string;
  deputyHead: string;
  schoolManager: string;
  bursar: string;
  secretary: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminUsername: string;
  tempPassword: string;
  preferredLanguage: string;
  timezone: string;
  requirePasswordChange: boolean;
  subscriptionTier: string;
  schoolCategory: string;
  schoolProgram: string;
  educationLevels: string[];
  aLevelCombinations: string[];
  tvetTrades: string[];
  curriculum: string;
  academicYear: string;
  schoolShift: string;
  hospitalType: string;
  bedsCapacity: string;
  departments: string[];
  emergencyServices: boolean;
  laboratory: boolean;
  pharmacy: boolean;
  operatingHours: string;
  industry: string;
  productionType: string;
  factorySize: string;
  employeeCapacity: string;
  workingShifts: string[];
  environmentalLicense: string;
  denomination: string;
  branch: string;
  diocese: string;
  serviceDays: string[];
  capacity: string;
  youthMinistry: boolean;
  choir: boolean;
  businessSector: string;
  businessSize: string;
  taxCategory: string;
}

export const DEFAULT_REGISTRATION_FORM: RegistrationFormState = {
  organizationType: 'SCHOOL',
  organizationName: '',
  category: '',
  logoUrl: '',
  signatureUrl: '',
  stampUrl: '',
  country: 'Rwanda',
  provinceId: '',
  districtId: '',
  sectorId: '',
  cellId: '',
  villageId: '',
  organizationCodePreview: '',
  establishedDate: '',
  description: '',
  website: '',
  phone: '',
  email: '',
  postalAddress: '',
  organizationHead: '',
  headPosition: '',
  headPhone: '',
  headEmail: '',
  deputyHead: '',
  schoolManager: '',
  bursar: '',
  secretary: '',
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  adminUsername: '',
  tempPassword: '',
  preferredLanguage: 'English',
  timezone: 'Africa/Kigali',
  requirePasswordChange: true,
  subscriptionTier: 'Standard',
  schoolCategory: '',
  schoolProgram: '',
  educationLevels: [],
  aLevelCombinations: [],
  tvetTrades: [],
  curriculum: '',
  academicYear: '',
  schoolShift: '',
  hospitalType: '',
  bedsCapacity: '',
  departments: [],
  emergencyServices: false,
  laboratory: false,
  pharmacy: false,
  operatingHours: '',
  industry: '',
  productionType: '',
  factorySize: '',
  employeeCapacity: '',
  workingShifts: [],
  environmentalLicense: '',
  denomination: '',
  branch: '',
  diocese: '',
  serviceDays: [],
  capacity: '',
  youthMinistry: false,
  choir: false,
  businessSector: '',
  businessSize: '',
  taxCategory: '',
};

export function formatOrgTypeLabel(type: WizardOrgType): string {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/** Auth API origin for static files (e.g. http://localhost:3001). */
export function getAuthAssetOrigin(): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';
  return apiBase.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3001';
}

/** Turn `/uploads/...` (or absolute) into a browser-loadable URL for previews. */
export function resolvePublicAssetUrl(url: string | null | undefined): string {
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
  const origin = getAuthAssetOrigin();
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export function formToPayload(form: RegistrationFormState): Record<string, unknown> {
  const isSchool = form.organizationType === 'SCHOOL' || form.organizationType === 'TVET';
  return {
    ...form,
    logoUrl: form.logoUrl || undefined,
    signatureUrl: isSchool && form.signatureUrl ? form.signatureUrl : undefined,
    stampUrl: isSchool && form.stampUrl ? form.stampUrl : undefined,
  };
}

/** Map a loaded organization (with profiles) into the shared wizard form. */
export function organizationToForm(org: Record<string, unknown>): RegistrationFormState {
  const school = (org.schoolProfile ?? {}) as Record<string, unknown>;
  const hospital = (org.hospitalProfile ?? {}) as Record<string, unknown>;
  const factory = (org.factoryProfile ?? {}) as Record<string, unknown>;
  const church = (org.churchProfile ?? {}) as Record<string, unknown>;
  const company = (org.companyProfile ?? {}) as Record<string, unknown>;
  const admin = (org.adminUser ?? {}) as Record<string, unknown>;
  const payload = (org.registrationPayload ?? {}) as Record<string, unknown>;

  const asStringArray = (value: unknown) =>
    Array.isArray(value) ? value.map((v) => String(v)) : [];

  const orgType = String(org.type ?? 'SCHOOL') as WizardOrgType;

  return {
    ...DEFAULT_REGISTRATION_FORM,
    organizationType: WIZARD_ORG_TYPES.includes(orgType) ? orgType : 'SCHOOL',
    organizationName: String(org.name ?? ''),
    category: String(org.category ?? ''),
    logoUrl: resolvePublicAssetUrl(String(org.logoUrl ?? '')),
    signatureUrl: resolvePublicAssetUrl(String(org.signatureUrl ?? '')),
    stampUrl: resolvePublicAssetUrl(String(org.stampUrl ?? '')),
    country: String(org.country ?? 'Rwanda'),
    provinceId: String(org.provinceId ?? ''),
    districtId: String(org.districtId ?? ''),
    sectorId: String(org.sectorId ?? ''),
    cellId: String(org.cellId ?? ''),
    villageId: String(org.villageId ?? ''),
    organizationCodePreview: String(org.organizationCode ?? ''),
    establishedDate: org.establishedDate
      ? String(org.establishedDate).slice(0, 10)
      : '',
    description: String(org.description ?? ''),
    website: String(org.website ?? ''),
    phone: String(org.phone ?? ''),
    email: String(org.email ?? ''),
    postalAddress: String(payload.postalAddress ?? ''),
    organizationHead: String(school.principalName ?? payload.organizationHead ?? ''),
    headPosition: String(
      payload.headPosition ||
        LEADERSHIP_LABELS[WIZARD_ORG_TYPES.includes(orgType) ? orgType : 'SCHOOL'] ||
        ''
    ),
    headPhone: String(school.leadershipPhone ?? admin.phone ?? payload.headPhone ?? ''),
    headEmail: String(school.leadershipEmail ?? payload.headEmail ?? ''),
    deputyHead: String(school.deputyHeadName ?? payload.deputyHead ?? ''),
    schoolManager: String(payload.schoolManager ?? ''),
    bursar: String(school.bursarName ?? payload.bursar ?? ''),
    secretary: String(school.secretaryName ?? payload.secretary ?? ''),
    adminName: [admin.firstName, admin.lastName].filter(Boolean).join(' ') || String(payload.adminName ?? ''),
    adminEmail: String(admin.email ?? ''),
    adminPhone: String(admin.phone ?? payload.adminPhone ?? ''),
    adminUsername: String(payload.adminUsername ?? ''),
    tempPassword: '',
    preferredLanguage: String(payload.preferredLanguage ?? 'English'),
    timezone: String(payload.timezone ?? 'Africa/Kigali'),
    requirePasswordChange: Boolean(admin.mustChangePassword ?? true),
    subscriptionTier: String(org.subscriptionTier ?? 'Standard'),
    schoolCategory: String(school.schoolCategory ?? ''),
    schoolProgram: String(school.schoolProgram ?? ''),
    educationLevels: asStringArray(school.educationLevels),
    aLevelCombinations: asStringArray(school.aLevelCombinations),
    tvetTrades: asStringArray(school.tvetTrades),
    curriculum: String(school.curriculum ?? ''),
    academicYear: String(school.academicYear ?? ''),
    schoolShift: String(school.schoolShift ?? ''),
    hospitalType: String(hospital.hospitalType ?? ''),
    bedsCapacity: hospital.bedsCapacity != null ? String(hospital.bedsCapacity) : '',
    departments: asStringArray(hospital.departments?.length ? hospital.departments : company.departments),
    emergencyServices: Boolean(hospital.emergencyServices),
    laboratory: Boolean(hospital.laboratory),
    pharmacy: Boolean(hospital.pharmacy),
    operatingHours: String(hospital.operatingHours ?? ''),
    industry: String(factory.industry ?? company.industry ?? ''),
    productionType: String(factory.productionType ?? ''),
    factorySize: String(factory.factorySize ?? ''),
    employeeCapacity: factory.employeeCapacity != null ? String(factory.employeeCapacity) : '',
    workingShifts: asStringArray(factory.workingShifts),
    environmentalLicense: String(factory.environmentalLicense ?? ''),
    denomination: String(church.denomination ?? ''),
    branch: String(church.branch ?? ''),
    diocese: String(church.diocese ?? ''),
    serviceDays: asStringArray(church.serviceDays),
    capacity: church.capacity != null ? String(church.capacity) : '',
    youthMinistry: Boolean(church.youthMinistry),
    choir: Boolean(church.choir),
    businessSector: String(company.businessSector ?? ''),
    businessSize: String(company.businessSize ?? ''),
    taxCategory: String(company.taxCategory ?? ''),
  };
}
