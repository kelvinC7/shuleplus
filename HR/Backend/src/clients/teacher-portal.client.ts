import { env } from '../config/env';

const BASE = (env.TEACHER_PORTAL_URL ?? '').replace(/\/$/, '');

interface SyncPayload {
  organizationId: string;
  userId: string;
  employeeNumber?: string;
  displayName?: string;
  netSalaryRwf?: number;
  tichaAvanceEligible?: boolean;
  source: 'hr' | 'payroll';
}

async function post(path: string, body: unknown) {
  if (!env.TEACHER_PORTAL_URL) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'HR',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[HR→TeacherPortal] ${path} failed: ${res.status} ${text}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.warn('[HR→TeacherPortal] Unreachable', err);
    return null;
  }
}

export const teacherPortalClient = {
  isEnabled: () => Boolean(env.TEACHER_PORTAL_URL),

  syncStaffPayroll(payload: SyncPayload) {
    return post('/api/internal/staff-payroll-sync', payload);
  },
};
