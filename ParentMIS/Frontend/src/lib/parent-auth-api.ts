export const PARENTMIS_API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3048/api';

/** Legacy Student Management host — used only for public find-child / fees lookup, not login. */
export const STUDENT_MGMT_API =
  process.env.NEXT_PUBLIC_STUDENT_MGMT_API_URL?.replace(/\/$/, '') || 'http://localhost:3052/api';

export const PIN_LENGTH = 5;

export type ParentAuthStep = 'phone' | 'verify-email' | 'set-pin' | 'confirm-pin' | 'login';

export type StatusData = {
  phone: string | null;
  hasPassword: boolean;
  hasPin?: boolean;
  needsPinSetup?: boolean;
  displayName: string;
  portalFeatures?: import('@/lib/portal-features').PortalFeatures;
  students: { id: string; name: string; studentCode: string | null; role: string; className?: string | null }[];
};

export async function parentAuthJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${PARENTMIS_API}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      'Cannot reach Parent Portal. Ensure ParentMIS backend is running (default http://localhost:3048/api) and refresh.'
    );
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || body?.error || `Request failed (${res.status})`);
  }
  return body.data as T;
}

/** @deprecated Use parentAuthJson for PIN login — auth is served by ParentMIS. */
export async function smJson<T>(path: string, init?: RequestInit): Promise<T> {
  return parentAuthJson<T>(path, init);
}

export function needsPinSetup(data: StatusData) {
  if (typeof data.needsPinSetup === 'boolean') return data.needsPinSetup;
  if (typeof data.hasPin === 'boolean') return !data.hasPin;
  return !data.hasPassword;
}

export const PARENT_PORTAL_SCHOOL =
  process.env.NEXT_PUBLIC_PARENT_PORTAL_SCHOOL_NAME?.trim() || 'Your school';

export const PARENT_HELP_PHONE =
  process.env.NEXT_PUBLIC_PARENT_HELP_PHONE?.trim() || '+250 793 903 847';
