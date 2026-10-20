import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface IamOrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  department: string | null;
  branch: string | null;
  position: string | null;
  status: string;
  roles: string[];
}

/**
 * Outbound client: pulls the organization member directory from the IAM
 * (service-to-service, x-service-key protected internal endpoint).
 */
export class IamClient {
  private base = env.IAM_API_URL.replace(/\/$/, '');

  async listOrgUsers(organizationId: string): Promise<IamOrgUser[]> {
    let res: Response;
    try {
      res = await fetch(
        `${this.base}/internal/organizations/${encodeURIComponent(organizationId)}/users`,
        {
          headers: {
            'x-service-key': env.SERVICE_API_KEY,
            Accept: 'application/json',
          },
        }
      );
    } catch {
      throw new AppError(502, 'IAM module unreachable — is it running on localhost:3001?');
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(502, `IAM member directory failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { data: IamOrgUser[] };
    return json.data;
  }
}

export const iamClient = new IamClient();
