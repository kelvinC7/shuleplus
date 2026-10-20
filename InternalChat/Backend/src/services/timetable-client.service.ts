import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface TimetableTeacher {
  id: string;
  teacherUserId: string;
  teacherName: string;
  loginEmail: string | null;
  loginPhone: string | null;
  rfidUid: string | null;
  portalEnabled: boolean;
  account?: {
    userId: string;
    email: string;
    phone: string | null;
    status: string;
  } | null;
}

/**
 * Outbound client: pulls teacher profiles from the Timetable module
 * via service-to-service internal endpoints.
 */
export class TimetableClient {
  private base = env.TIMETABLE_API_URL.replace(/\/$/, '');

  private headers(): Record<string, string> {
    return {
      'x-service-key': env.SERVICE_API_KEY,
      Accept: 'application/json',
    };
  }

  /** Fetch all teacher profiles from Timetable module. */
  async listTeachers(organizationId: string): Promise<TimetableTeacher[]> {
    const params = new URLSearchParams({ organizationId });

    let res: Response;
    try {
      res = await fetch(`${this.base}/internal/teacher-profiles?${params}`, {
        headers: this.headers(),
      });
    } catch {
      throw new AppError(502, 'Timetable module unreachable — is it running on localhost:3010?');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(502, `Timetable teacher-profiles endpoint failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { data: TimetableTeacher[] };
    return json.data ?? [];
  }
}

export const timetableClient = new TimetableClient();
