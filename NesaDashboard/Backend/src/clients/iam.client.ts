import { env } from '../config/env';

export interface IamSchoolListItem {
  id: string;
  organizationCode: string | null;
  name: string;
  type: string;
  category?: string | null;
  status: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
  ownershipType?: string | null;
  schoolCategory?: string | null;
  schoolProgram?: string | null;
  educationLevels?: string[];
  principalName?: string | null;
  createdAt?: string;
}

export interface IamSchoolProfile {
  organizationId: string;
  organizationCode?: string | null;
  schoolName: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  ownershipType?: string;
  schoolCategory?: string | null;
  schoolProgram?: string | null;
  educationLevels?: unknown;
  academicYear?: string | null;
  curriculum?: string | null;
  schoolMotto?: string | null;
  schoolShift?: string | null;
  principalName?: string | null;
  deputyHeadName?: string | null;
  bursarName?: string | null;
  secretaryName?: string | null;
  leadershipPhone?: string | null;
  leadershipEmail?: string | null;
  leaders?: Array<{ name: string; role: string; phone?: string; email?: string }>;
}

function headers() {
  return {
    'x-service-key': env.SERVICE_API_KEY,
    'x-source-service': 'nesa-dashboard',
  };
}

export async function fetchRegisteredSchools(params: Record<string, string | undefined> = {}) {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const url = `${base}/internal/organizations${qs.toString() ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(`IAM schools list failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { data?: IamSchoolListItem[] };
  return body.data ?? [];
}

export async function fetchSchoolProfile(organizationId: string) {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = `${base}/internal/organizations/${organizationId}/profile`;
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`IAM school profile failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { data?: IamSchoolProfile };
  return body.data ?? null;
}
