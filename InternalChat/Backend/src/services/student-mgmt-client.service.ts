import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface SmStudent {
  studentId: string;
  studentCode: string;
  studentName: string | null;
  className: string | null;
  role: string;
}

export interface SmParent {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  students: SmStudent[];
}

/**
 * Outbound client: pulls parents from the StudentManagement module
 * via service-to-service internal endpoints.
 */
export class StudentMgmtClient {
  private base = env.STUDENT_MGMT_API_URL.replace(/\/$/, '');

  private headers(): Record<string, string> {
    return {
      'x-service-key': env.SERVICE_API_KEY,
      Accept: 'application/json',
    };
  }

  /** Fetch all parents linked to students in this organization. */
  async listParents(organizationId: string): Promise<SmParent[]> {
    const params = new URLSearchParams({ organizationId });

    let res: Response;
    try {
      res = await fetch(`${this.base}/service/parents?${params}`, {
        headers: this.headers(),
      });
    } catch {
      throw new AppError(502, 'StudentManagement module unreachable — is it running on localhost:3052?');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(502, `StudentManagement parents endpoint failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { data: SmParent[] };
    return json.data ?? [];
  }
}

export const studentMgmtClient = new StudentMgmtClient();
