import { env } from "../config/env";

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

async function iamFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const base = env.IAM_API_URL.replace(/\/$/, "");
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "school-budget",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { success?: boolean; data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchIamAcademicSettings(
  organizationId: string
): Promise<AcademicSettings | null> {
  return iamFetch<AcademicSettings>(
    `/internal/organizations/${organizationId}/academic-settings`
  );
}

export async function updateIamAcademicSettings(
  organizationId: string,
  settings: AcademicSettings
): Promise<AcademicSettings | null> {
  return iamFetch<AcademicSettings>(
    `/internal/organizations/${organizationId}/academic-settings`,
    { method: "PUT", body: JSON.stringify(settings) }
  );
}
