import { env } from "../config/env";

export interface IamSchoolProfile {
  organizationId: string;
  organizationCode?: string | null;
  schoolName: string;
  email?: string | null;
  phone?: string | null;
  poBox?: string | null;
  website?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
}

export async function fetchIamSchoolProfile(
  organizationId: string,
): Promise<IamSchoolProfile | null> {
  const base = env.IAM_API_URL.replace(/\/$/, "");
  const url = `${base}/internal/organizations/${organizationId}/profile`;
  try {
    const response = await fetch(url, {
      headers: {
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "school-uniform",
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      success?: boolean;
      data?: IamSchoolProfile;
    };
    return body.data ?? null;
  } catch {
    return null;
  }
}
