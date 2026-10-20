import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface ReportCardSettingsPayload {
  verifyBaseUrl?: string | null;
  enableClassTeacherComments?: boolean;
  enableHeadTeacherComments?: boolean;
  defaultHeadTeacherComment?: string | null;
  classTeacherCommentHint?: string | null;
}

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
  reportCard?: ReportCardSettingsPayload;
}

async function iamFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'academic',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { success?: boolean; data?: T };
    return body.data ?? null;
  } catch (err) {
    if (err instanceof AppError) throw err;
    return null;
  }
}

async function iamFetchOrThrow<T>(path: string, init?: RequestInit): Promise<T> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'academic',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new AppError(502, 'IAM is unavailable');
  }
  const body = (await response.json().catch(() => ({}))) as { success?: boolean; data?: T; message?: string };
  if (!response.ok) {
    throw new AppError(response.status, body.message || 'IAM request failed');
  }
  return (body.data ?? body) as T;
}

export async function fetchIamAcademicSettings(
  organizationId: string,
): Promise<AcademicSettings | null> {
  return iamFetch<AcademicSettings>(
    `/internal/organizations/${organizationId}/academic-settings`,
  );
}

export type IamOrgUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string | null;
  position: string | null;
  status: string;
  roles: string[];
  modules: string[];
};

export type InvigilatorAccount = {
  userId: string;
  created: boolean;
  existing: boolean;
  email: string;
  name: string;
};

export async function fetchIamOrgUsers(organizationId: string): Promise<IamOrgUser[]> {
  const data = await iamFetch<IamOrgUser[]>(`/internal/organizations/${organizationId}/users`);
  return data ?? [];
}

export type IamUserBrief = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
};

export async function fetchIamUser(userId: string): Promise<IamUserBrief | null> {
  return iamFetch<IamUserBrief>(`/internal/users/${encodeURIComponent(userId)}`);
}

export function iamUserDisplayName(user: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const fromName = String(user.name ?? '').trim();
  if (fromName) return fromName;
  const parts = [user.firstName, user.lastName].map((p) => String(p ?? '').trim()).filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(user.email ?? '').trim();
}

export async function provisionInvigilatorAccount(
  organizationId: string,
  actorId: string | undefined,
  input: {
    fullName: string;
    email?: string;
    password?: string;
    existingUserId?: string;
    requirePasswordChange?: boolean;
  },
): Promise<InvigilatorAccount> {
  return iamFetchOrThrow<InvigilatorAccount>(
    `/internal/organizations/${organizationId}/invigilator-accounts`,
    {
      method: 'POST',
      body: JSON.stringify({ ...input, actorId: actorId ?? 'academic' }),
    },
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

/** Org admin settings (IAM) with optional request overrides for year/term filters. */
export async function resolveOrgAcademicPeriod(
  organizationId: string,
  opts?: { term?: string; academicYear?: string },
): Promise<{ term: string; academicYear: string; settings: AcademicSettings }> {
  const settings = (await fetchIamAcademicSettings(organizationId)) ?? defaultAcademicSettings();
  const academicYear =
    opts?.academicYear?.trim() ||
    settings.currentAcademicYear?.trim() ||
    settings.academicYears[0]?.trim() ||
    defaultAcademicSettings().currentAcademicYear!;
  const term =
    opts?.term?.trim() ||
    settings.currentTerm?.trim() ||
    settings.terms[0]?.trim() ||
    defaultAcademicSettings().currentTerm!;
  return { term, academicYear, settings };
}

export type IamOrganizationProfile = {
  organizationId: string;
  schoolName?: string;
  organizationCode?: string | null;
  logoUrl?: string | null;
  signatureUrl?: string | null;
  stampUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  schoolMotto?: string | null;
};

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

function browserIamOrigin(): string {
  const configured = env.IAM_PUBLIC_ORIGIN.replace(/\/$/, '');
  if (configured) return configured;
  if (env.NODE_ENV === 'production') return 'https://shuleplus.rw';
  return env.IAM_API_URL.replace(/\/api\/v1\/?$/i, '') || 'http://localhost:3001';
}

function rewriteLoopbackAssetHost(url: string): string {
  let out = url.trim();
  if (!LOCAL_HOST.test(out)) return out;
  if (/:(3001|4001)(\/|$)/.test(out)) {
    return out.replace(LOCAL_HOST, browserIamOrigin());
  }
  return out;
}

export function resolveIamAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let trimmed = rewriteLoopbackAssetHost(url.trim());
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const origin = browserIamOrigin();
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

export async function fetchIamOrganizationProfile(
  organizationId: string,
): Promise<IamOrganizationProfile | null> {
  return iamFetch<IamOrganizationProfile>(`/internal/organizations/${organizationId}/profile`);
}
