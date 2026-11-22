import { env } from "../config/env";

async function serviceGet<T>(path: string, organizationId: string): Promise<T | null> {
  const base = (env.PARENT_MIS_API_URL ?? "").replace(/\/$/, "");
  if (!base) return null;
  const url = new URL(`${base}${path}`);
  url.searchParams.set("organizationId", organizationId);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "transport",
        "x-organization-id": organizationId,
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json.data ?? (json as T);
  } catch {
    return null;
  }
}

async function servicePatch<T>(path: string, organizationId: string, body: unknown): Promise<T | null> {
  const base = (env.PARENT_MIS_API_URL ?? "").replace(/\/$/, "");
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": env.SERVICE_API_KEY,
        "x-source-service": "transport",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T };
    return json.data ?? (json as T);
  } catch {
    return null;
  }
}

export const parentPortalClient = {
  enabled: () => Boolean(env.PARENT_MIS_API_URL),

  listChangeRequests(organizationId: string, status?: string) {
    const q = status ? `&status=${encodeURIComponent(status)}` : "";
    return serviceGet<unknown[]>(`/service/transport/change-requests?organizationId=${organizationId}${q}`, organizationId);
  },

  respondChangeRequest(organizationId: string, id: string, body: { status: "APPROVED" | "REJECTED"; schoolResponse?: string }) {
    return servicePatch<unknown>(`/service/transport/change-requests/${id}?organizationId=${organizationId}`, organizationId, body);
  },

  listIssueReports(organizationId: string, status?: string) {
    const q = status ? `&status=${encodeURIComponent(status)}` : "";
    return serviceGet<unknown[]>(`/service/transport/issue-reports?organizationId=${organizationId}${q}`, organizationId);
  },

  updateIssueReport(organizationId: string, id: string, body: { status?: string; schoolNote?: string }) {
    return servicePatch<unknown>(`/service/transport/issue-reports/${id}?organizationId=${organizationId}`, organizationId, body);
  },
};
