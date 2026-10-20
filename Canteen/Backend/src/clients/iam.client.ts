import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface IamCreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  position?: string;
  roleSlug?: 'organization_admin' | 'organization_member';
  moduleSlugs?: string[];
  sendCredentialsEmail?: boolean;
  requirePasswordChange?: boolean;
}

export interface IamCreateUserResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tempPassword?: string;
  credentialsSent?: boolean;
}

/**
 * Proxies user creation to IAM using the caller's org-admin JWT.
 * Users (sellers, suppliers, drivers) are stored in IAM like every other module.
 */
export async function createIamUser(
  callerToken: string,
  input: IamCreateUserInput
): Promise<IamCreateUserResult> {
  const base = env.IAM_API_URL.replace(/\/$/, '');
  const response = await fetch(`${base}/iam/org/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${callerToken}`,
    },
    body: JSON.stringify({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      position: input.position,
      roleSlug: input.roleSlug ?? 'organization_member',
      moduleSlugs: input.moduleSlugs ?? [env.MODULE_SLUG],
      moduleAssignments: [{ slug: env.MODULE_SLUG, accessLevel: 'USER' }],
      requirePasswordChange: input.requirePasswordChange ?? true,
      sendCredentialsEmail: input.sendCredentialsEmail ?? true,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = `IAM user creation failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (text) message = text;
    }
    throw new AppError(400, message);
  }

  const body = (await response.json()) as { success?: boolean; data?: IamCreateUserResult };
  return body.data ?? (body as unknown as IamCreateUserResult);
}
