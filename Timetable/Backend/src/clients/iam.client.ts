import { env } from '../config/env';

export interface TermDateRange {
  start: string;
  end: string;
}

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  termDates?: Record<string, TermDateRange>;
}

async function iamRequest<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const url = `${base}${path}`;
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'timetable',
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      data?: T;
      message?: string;
    };
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: body.message ?? `Authentication API ${response.status}`,
      };
    }
    if (body.data == null) {
      return { ok: false, status: response.status, message: 'Empty response from Authentication' };
    }
    return { ok: true, data: body.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, message: `Cannot reach Authentication: ${message}` };
  }
}

async function iamFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const result = await iamRequest<T>(path, init);
  return result.ok ? result.data : null;
}

export async function fetchIamAcademicSettings(organizationId: string): Promise<AcademicSettings> {
  const result = await iamRequest<AcademicSettings>(
    `/internal/organizations/${organizationId}/academic-settings`
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateIamAcademicSettings(
  organizationId: string,
  settings: AcademicSettings
): Promise<AcademicSettings> {
  const result = await iamRequest<AcademicSettings>(
    `/internal/organizations/${organizationId}/academic-settings`,
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    }
  );
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export interface TeacherAccountRecord {
  userId: string;
  email: string;
  phone: string | null;
  employeeId?: string | null;
  status: string;
  lastLoginAt: string | null;
  mustChangePassword?: boolean;
}

export async function checkTeacherIdentifier(
  organizationId: string,
  body: { email?: string; phone?: string; excludeUserId?: string }
): Promise<{ available: boolean; field?: string; message?: string } | null> {
  return iamFetch(`/internal/organizations/${organizationId}/teacher-accounts/check`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getTeacherAccount(
  organizationId: string,
  userId: string
): Promise<TeacherAccountRecord | null> {
  return iamFetch<TeacherAccountRecord>(
    `/internal/organizations/${organizationId}/teacher-accounts/${encodeURIComponent(userId)}`
  );
}

export async function provisionTeacherAccount(
  organizationId: string,
  body: Record<string, unknown>
): Promise<{
  userId: string;
  created: boolean;
  email?: string;
  phone?: string | null;
  employeeId?: string | null;
} | null> {
  return iamFetch(`/internal/organizations/${organizationId}/teacher-accounts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function resetTeacherAccountPassword(
  organizationId: string,
  userId: string,
  body: Record<string, unknown>
): Promise<{ userId: string; tempPassword?: string } | null> {
  return iamFetch(
    `/internal/organizations/${organizationId}/teacher-accounts/${encodeURIComponent(userId)}/reset-password`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

export async function setTeacherAccountStatus(
  organizationId: string,
  userId: string,
  body: Record<string, unknown>
): Promise<{ id: string; status: string } | null> {
  return iamFetch(
    `/internal/organizations/${organizationId}/teacher-accounts/${encodeURIComponent(userId)}/status`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

export function defaultAcademicSettings(): AcademicSettings {
  const y = new Date().getFullYear();
  return {
    academicYears: [`${y}-${y + 1}`],
    terms: ['Term 1', 'Term 2', 'Term 3'],
    currentAcademicYear: `${y}-${y + 1}`,
    currentTerm: 'Term 1',
  };
}

export interface IamOrganizationProfile {
  organizationId: string;
  organizationCode: string | null;
  schoolName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
  logoUrl?: string | null;
  schoolMotto?: string | null;
  website?: string | null;
}

export async function fetchIamOrganizationProfile(
  organizationId: string
): Promise<IamOrganizationProfile | null> {
  return iamFetch<IamOrganizationProfile>(
    `/internal/organizations/${organizationId}/profile`
  );
}
