import { env } from "../config/env";
import { AppError } from "../middleware/error.middleware";

export interface IamOrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string | null;
  position: string | null;
  status: string;
  roles: string[];
  modules: string[];
}

async function iamFetch<T>(path: string): Promise<T> {
  const base = env.IAM_API_URL.replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "transport",
      },
    });
  } catch {
    throw new AppError(502, "Users & Access (IAM) is unavailable");
  }
  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: T;
    message?: string;
  };
  if (!response.ok) {
    throw new AppError(response.status, body.message || "IAM request failed");
  }
  return (body.data ?? []) as T;
}

export async function listOrganizationUsers(organizationId: string): Promise<IamOrgUser[]> {
  const data = await iamFetch<IamOrgUser[]>(`/internal/organizations/${organizationId}/users`);
  return Array.isArray(data) ? data : [];
}
