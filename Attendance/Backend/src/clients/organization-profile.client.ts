import { env } from "../config/env";

export type OrganizationProfileDto = {
  organizationId: string;
  organizationCode: string | null;
  schoolName: string;
  email: string | null;
  phone: string | null;
  poBox: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  ownershipType: string | null;
  schoolCategory: string | null;
  schoolProgram: string | null;
  educationLevels: string[];
  academicYear: string | null;
  curriculum: string | null;
  schoolMotto: string | null;
  description: string | null;
  schoolShift: string | null;
  principalName: string | null;
  deputyHeadName: string | null;
  bursarName: string | null;
  secretaryName: string | null;
  leadershipPhone: string | null;
  leadershipEmail: string | null;
};

function iamInternalBase() {
  return `${env.IAM_API_URL.replace(/\/$/, "")}/internal`;
}

/** Same profile as onboarding / Users & Access (Authentication IAM). */
export async function fetchOrganizationProfile(
  organizationId: string
): Promise<OrganizationProfileDto | null> {
  if (!env.IAM_API_URL) return null;
  try {
    const res = await fetch(
      `${iamInternalBase()}/organizations/${encodeURIComponent(organizationId)}/profile`,
      {
        headers: {
          Accept: "application/json",
          "x-service-key": env.SERVICE_API_KEY,
          "x-organization-id": organizationId,
          "x-source-service": "attendance",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: OrganizationProfileDto };
    return body.data ?? null;
  } catch {
    return null;
  }
}
