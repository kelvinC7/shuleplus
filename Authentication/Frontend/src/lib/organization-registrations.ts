export type RegistrationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OrganizationRegistration {
  id: string;
  organizationCode: string | null;
  organizationName: string;
  organizationType: string;
  status: RegistrationStatus;
  payload: Record<string, unknown>;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function formatOrgType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export function payloadSummary(payload: Record<string, unknown>) {
  return {
    phone: String(payload.phone ?? '—'),
    email: String(payload.email ?? '—'),
    adminName: String(payload.adminName ?? '—'),
    adminEmail: String(payload.adminEmail ?? '—'),
    districtId: String(payload.districtId ?? ''),
    organizationCodePreview: String(payload.organizationCode ?? payload.organizationCodePreview ?? '—'),
  };
}
