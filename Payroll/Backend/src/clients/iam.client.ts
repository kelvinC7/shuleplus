import { env } from '../config/env';

const base = () => (env.IAM_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '');

export type IamUserLookup = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
};

async function iamFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${base()}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'payroll',
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export const iamClient = {
  isEnabled: () => Boolean(env.IAM_API_URL),

  findUserByEmail(organizationId: string, email: string) {
    const q = encodeURIComponent(email.trim());
    return iamFetch<IamUserLookup | null>(
      `/internal/organizations/${organizationId}/users/by-email?email=${q}`
    );
  },
};
