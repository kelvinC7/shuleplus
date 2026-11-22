export interface SignatoryInfo {
  name: string;
  title: string;
  signatureUrl?: string;
}

export interface ProcurementReceiptSettings {
  verifier: SignatoryInfo;
  approver: SignatoryInfo;
  supplier: SignatoryInfo;
}

export interface OrgSchoolProfile {
  organizationId: string;
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
  stampUrl?: string | null;
  signatureUrl?: string | null;
  principalName?: string | null;
}
