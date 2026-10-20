import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface AcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export interface GateOfficerAccountResult {
  userId: string;
  created: boolean;
  email: string;
}

export function defaultAcademicSettings(): AcademicSettings {
  const y = new Date().getFullYear();
  const year = `${y}-${y + 1}`;
  return {
    academicYears: [year],
    terms: ['Term 1', 'Term 2', 'Term 3'],
    currentAcademicYear: year,
    currentTerm: 'Term 1',
  };
}

async function iamRequest<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; message?: string }> {
  const base = (env.IAM_API_URL ?? '').replace(/\/$/, '');
  if (!base) return { ok: false, status: 503, data: null, message: 'IAM API not configured' };

  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'student-discipline',
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json()) as { success?: boolean; data?: T; message?: string };
    if (!response.ok) {
      return { ok: false, status: response.status, data: null, message: body.message ?? 'IAM request failed' };
    }
    return { ok: true, status: response.status, data: body.data ?? null };
  } catch {
    return { ok: false, status: 503, data: null, message: 'Unable to reach IAM service' };
  }
}

export async function fetchIamAcademicSettings(organizationId: string): Promise<AcademicSettings | null> {
  const result = await iamRequest<AcademicSettings>(
    `/internal/organizations/${organizationId}/academic-settings`
  );
  return result.data;
}

export async function provisionGateOfficerAccount(
  organizationId: string,
  actorId: string,
  input: {
    fullName: string;
    email: string;
    password: string;
    existingUserId?: string;
  }
): Promise<GateOfficerAccountResult | null> {
  const result = await iamRequest<GateOfficerAccountResult>(
    `/internal/organizations/${organizationId}/gate-officer-accounts`,
    {
      method: 'POST',
      body: JSON.stringify({
        actorId,
        fullName: input.fullName,
        email: input.email,
        password: input.password,
        existingUserId: input.existingUserId,
        requirePasswordChange: true,
      }),
    }
  );
  if (!result.ok) {
    throw new AppError(result.status >= 400 && result.status < 600 ? result.status : 502, result.message ?? 'Failed to create gate officer login account');
  }
  return result.data;
}
