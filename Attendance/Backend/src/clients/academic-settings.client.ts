import { env } from "../config/env";

export interface TermDateRange {
  start: string;
  end: string;
}

export interface AcademicContext {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  termDates?: Record<string, TermDateRange>;
}

function iamInternalBase() {
  return `${env.IAM_API_URL.replace(/\/$/, "")}/internal`;
}

export async function fetchAcademicContext(organizationId: string): Promise<AcademicContext> {
  const defaults: AcademicContext = {
    academicYears: [`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`],
    terms: ["Term 1", "Term 2", "Term 3"],
    currentAcademicYear: null,
    currentTerm: null,
  };

  if (!env.IAM_API_URL) return defaults;

  try {
    const res = await fetch(
      `${iamInternalBase()}/organizations/${encodeURIComponent(organizationId)}/academic-settings`,
      {
        headers: {
          "x-service-key": env.SERVICE_API_KEY,
          "x-organization-id": organizationId,
        },
      }
    );
    if (!res.ok) return defaults;
    const json = (await res.json()) as { success?: boolean; data?: AcademicContext };
    return json.data ?? defaults;
  } catch {
    return defaults;
  }
}
