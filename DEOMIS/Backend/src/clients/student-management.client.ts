import { env } from '../config/env';

export type SmDashboardSummary = {
  studentCount: number;
  activeEnrollments: number;
  classCount: number;
  studentsByClass: { label: string; value: number; male?: number; female?: number }[];
  studentsByCategory: { label: string; value: number }[];
  genderDistribution?: { MALE?: number; FEMALE?: number; OTHER?: number };
};

export type SmBatchRow = {
  organizationId: string;
  ok: boolean;
  data: SmDashboardSummary | null;
};

function smBase() {
  return (env.STUDENT_MANAGEMENT_API_URL || '').replace(/\/$/, '');
}

function serviceHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-service-key': env.SERVICE_API_KEY,
    'x-source-service': 'deo-mis',
  };
}

export async function fetchBatchDashboardSummaries(organizationIds: string[]): Promise<Map<string, SmDashboardSummary>> {
  const base = smBase();
  const map = new Map<string, SmDashboardSummary>();
  if (!base || !organizationIds.length) return map;

  try {
    const res = await fetch(`${base}/service/sector/batch-dashboard-summary`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify({ organizationIds }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return map;
    const body = (await res.json()) as { data?: SmBatchRow[] };
    for (const row of body.data ?? []) {
      if (row.ok && row.data) map.set(row.organizationId, row.data);
    }
  } catch {
    /* offline */
  }
  return map;
}

export async function fetchDashboardSummary(organizationId: string): Promise<SmDashboardSummary | null> {
  const map = await fetchBatchDashboardSummaries([organizationId]);
  return map.get(organizationId) ?? null;
}
