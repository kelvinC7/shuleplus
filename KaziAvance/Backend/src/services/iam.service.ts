import { env } from "../config/env";
import { AppError } from "../middleware/error";

type IamUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  lastLoginAt: string | null;
  modules: Array<{ slug: string; name?: string }>;
  employeeId: string | null;
};

async function iamRequest<T>(
  bearerToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${env.IAM_API_URL}/iam/org${path}`, {
    ...init,
    headers: {
      Authorization: bearerToken,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    message?: string;
  } | null;

  if (!res.ok) {
    throw new AppError(res.status, json?.message ?? `IAM request failed (${res.status})`);
  }

  return (json?.data ?? json) as T;
}

export async function listIamUsers(bearerToken: string): Promise<IamUser[]> {
  return iamRequest<IamUser[]>(bearerToken, "/users");
}

export async function findIamUserByEmail(bearerToken: string, email: string): Promise<IamUser | null> {
  const users = await listIamUsers(bearerToken);
  const normalized = email.toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function createIamUser(
  bearerToken: string,
  payload: {
    email: string;
    firstName: string;
    lastName: string;
    department?: string;
    position?: string;
    employeeId?: string;
    password?: string;
    moduleSlugs?: string[];
    sendCredentialsEmail?: boolean;
    requirePasswordChange?: boolean;
  }
) {
  return iamRequest<{
    id: string;
    email: string;
    tempPassword?: string;
    credentialsSent?: boolean;
  }>(bearerToken, "/users", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      moduleSlugs: payload.moduleSlugs ?? [env.MODULE_SLUG],
      sendCredentialsEmail: payload.sendCredentialsEmail ?? true,
      requirePasswordChange: payload.requirePasswordChange ?? true,
    }),
  });
}

export async function resetIamPassword(
  bearerToken: string,
  userId: string,
  body?: { password?: string; sendEmail?: boolean }
) {
  return iamRequest<{ tempPassword: string; emailSent: boolean }>(
    bearerToken,
    `/users/${userId}/reset-password`,
    {
      method: "POST",
      body: JSON.stringify(body ?? { sendEmail: true }),
    }
  );
}

export async function updateIamUserStatus(bearerToken: string, userId: string, status: string) {
  return iamRequest(bearerToken, `/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export type { IamUser };
