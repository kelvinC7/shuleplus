import { env } from '../config/env';

export interface GateOfficerCheckResult {
  isGateOfficer: boolean;
  entryPath: string;
}

const base = () => (env.STUDENT_DISCIPLINE_API_URL ?? 'http://localhost:3032/api').replace(/\/$/, '');

export async function checkGateOfficer(
  organizationId: string,
  email: string,
  userId: string
): Promise<GateOfficerCheckResult | null> {
  try {
    const params = new URLSearchParams({
      organizationId,
      email: email.trim().toLowerCase(),
      userId,
    });
    const res = await fetch(`${base()}/internal/gate-officer/check?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.MODULE_PROVISIONING_KEY,
        'x-source-service': 'iam',
      },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; data?: GateOfficerCheckResult };
    return body.data ?? null;
  } catch {
    return null;
  }
}
