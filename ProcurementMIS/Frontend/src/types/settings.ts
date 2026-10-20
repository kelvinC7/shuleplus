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
  logoUrl?: string | null;
  stampUrl?: string | null;
  signatureUrl?: string | null;
  principalName?: string | null;
}
