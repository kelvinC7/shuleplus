import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface HrEmployee {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  employeeNumber: string | null;
  photoUrl: string | null;
}

/**
 * Outbound client: pulls employees (teachers + staff) from the HR module
 * via service-to-service internal endpoints.
 */
export class HrClient {
  private base = env.HR_API_URL.replace(/\/$/, '');

  private headers(): Record<string, string> {
    return {
      'x-service-key': env.SERVICE_API_KEY,
      Accept: 'application/json',
    };
  }

  /** Fetch all active staff from HR module. */
  async listStaff(organizationId: string, search?: string): Promise<HrEmployee[]> {
    const params = new URLSearchParams({ organizationId });
    if (search) params.set('search', search);

    let res: Response;
    try {
      res = await fetch(`${this.base}/internal/staff?${params}`, {
        headers: this.headers(),
      });
    } catch {
      throw new AppError(502, 'HR module unreachable — is it running on localhost:3005?');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(502, `HR staff endpoint failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { data: HrEmployee[] };
    return json.data ?? [];
  }
}

export const hrClient = new HrClient();
