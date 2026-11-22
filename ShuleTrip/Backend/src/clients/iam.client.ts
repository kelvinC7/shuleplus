import { env } from '../config/env';

type VerifyAdminResponse = {
  success?: boolean;
  data?: { valid: boolean; admin?: { id: string; email: string; firstName: string | null; lastName: string | null } | null };
};

type OrgProfileResponse = {
  success?: boolean;
  data?: { organizationCode?: string | null; schoolName?: string; email?: string | null };
};

function serviceHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-service-key': env.SERVICE_API_KEY,
    'x-source-service': 'shule-trip',
  };
}

export async function fetchIamOrganizationProfile(organizationId: string) {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const res = await fetch(
      `${base}/internal/organizations/${encodeURIComponent(organizationId)}/profile`,
      {
        headers: serviceHeaders(),
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as OrgProfileResponse;
    return body.data ?? null;
  } catch {
    return null;
  }
}

export type IamShuleTripOfficialLogin = {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  roles: string[];
  modules: string[];
  district?: string;
  sector?: string;
  tripRoleSlug: string;
  canFinalApprove: boolean;
};

export type IamShuleTripOfficialProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl?: string | null;
  roleSlug: string;
  roleLabel: string;
  district?: string | null;
  sector?: string | null;
  authority?: string | null;
  canFinalApprove: boolean;
};

export async function fetchIamShuleTripOfficialProfile(userId: string): Promise<IamShuleTripOfficialProfile | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/internal/shule-trip/officials/${encodeURIComponent(userId)}/profile`, {
      headers: serviceHeaders(),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: IamShuleTripOfficialProfile };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function updateIamUserAvatar(userId: string, avatarUrl: string | null): Promise<boolean> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/internal/users/${encodeURIComponent(userId)}/avatar`, {
      method: 'PATCH',
      headers: serviceHeaders(),
      body: JSON.stringify({ avatarUrl }),
      signal: AbortSignal.timeout(12_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateIamShuleTripOfficialProfile(
  userId: string,
  input: { firstName?: string; lastName?: string; phone?: string | null }
): Promise<IamShuleTripOfficialProfile | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/internal/shule-trip/officials/${encodeURIComponent(userId)}/profile`, {
      method: 'PATCH',
      headers: serviceHeaders(),
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: IamShuleTripOfficialProfile };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function changeIamShuleTripOfficialPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; message?: string }> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/internal/shule-trip/officials/${encodeURIComponent(userId)}/change-password`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
      signal: AbortSignal.timeout(12_000),
    });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.ok) return { ok: true };
    return { ok: false, message: body.message ?? 'Password change failed' };
  } catch {
    return { ok: false, message: 'Cannot reach identity service' };
  }
}

export async function verifyIamShuleTripOfficialLogin(
  identifier: string,
  password: string
): Promise<IamShuleTripOfficialLogin | null> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/internal/shule-trip/official-login`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify({ identifier, password }),
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; data?: IamShuleTripOfficialLogin };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function verifyOrganizationAdminEmail(
  organizationId: string,
  email: string
): Promise<boolean> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const qs = new URLSearchParams({ email: email.trim() });
  try {
    const res = await fetch(`${base}/internal/organizations/${encodeURIComponent(organizationId)}/verify-admin-email?${qs}`, {
      headers: serviceHeaders(),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as VerifyAdminResponse;
    return Boolean(body.data?.valid);
  } catch {
    return false;
  }
}
