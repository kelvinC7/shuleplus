import { api } from './api';
import type { DeliveryReportResult, DeliveryReportRow } from './sms-api';

type ReportParams = {
  campaignId?: string;
  status?: string;
  student?: string;
  term?: string;
  dateFrom?: string;
  dateTo?: string;
};

type Campaign = {
  id: string;
  createdAt: string;
  status: string;
  mode?: string;
  recipientCount: number;
};

function termRange(term: string): { from: Date; to: Date } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (term === 'MONTH') {
    return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59) };
  }
  if (term === 'TERM') {
    const termStartMonth = m < 4 ? 0 : m < 8 ? 4 : 8;
    return { from: new Date(y, termStartMonth, 1), to: now };
  }
  if (term === 'YEAR') {
    return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59) };
  }
  return null;
}

function applyFilters(rows: DeliveryReportRow[], params: ReportParams): DeliveryReportRow[] {
  let out = rows;
  if (params.campaignId) {
    out = out.filter((r) => r.campaign?.id === params.campaignId);
  }
  if (params.status && params.status !== 'ALL') {
    out = out.filter((r) => r.status === params.status);
  }
  if (params.student?.trim()) {
    const q = params.student.trim().toLowerCase();
    out = out.filter((r) => (r.studentSummary ?? '').toLowerCase().includes(q));
  }

  let from = params.dateFrom ? new Date(params.dateFrom) : undefined;
  let to = params.dateTo ? new Date(`${params.dateTo}T23:59:59`) : undefined;
  if (params.term && params.term !== 'ALL') {
    const range = termRange(params.term);
    if (range) {
      from = range.from;
      to = range.to;
    }
  }
  if (from || to) {
    out = out.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
      return true;
    });
  }

  return out
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2000);
}

function summarize(rows: DeliveryReportRow[]): DeliveryReportResult['summary'] {
  let delivered = 0;
  let failed = 0;
  let pending = 0;
  let segments = 0;
  for (const r of rows) {
    segments += r.segments;
    if (r.status === 'DELIVERED') delivered += 1;
    else if (r.status === 'FAILED') failed += 1;
    else pending += 1;
  }
  return {
    totalMessages: rows.length,
    delivered,
    failed,
    pending,
    segments,
  };
}

async function loadViaCampaignRecipients(params: ReportParams): Promise<DeliveryReportResult> {
  const { data: campRes } = await api.get<{ data: Campaign[] }>('/sms/campaigns');
  let campaigns = campRes.data ?? [];
  if (params.campaignId) {
    campaigns = campaigns.filter((c) => c.id === params.campaignId);
  }
  campaigns = campaigns.slice(0, 40);

  const rows: DeliveryReportRow[] = [];
  const batchSize = 6;
  for (let i = 0; i < campaigns.length; i += batchSize) {
    const batch = campaigns.slice(i, i + batchSize);
    const parts = await Promise.all(
      batch.map(async (c) => {
        const { data: recRes } = await api.get<{ data: Record<string, unknown>[] }>(
          `/sms/campaigns/${c.id}/recipients`
        );
        const recs = recRes.data ?? [];
        return recs.map((r) => ({
          id: String(r.id),
          phoneNormalized: String(r.phoneNormalized ?? ''),
          parentName: (r.parentName as string | null) ?? null,
          phoneMasked: String(r.phoneMasked ?? ''),
          studentSummary: (r.studentSummary as string | null) ?? null,
          status: String(r.status ?? 'QUEUED'),
          segments: Number(r.segments ?? 1),
          failureReason: (r.failureReason as string | null) ?? null,
          messageBody: String(r.messageBody ?? ''),
          createdAt: String(r.createdAt ?? c.createdAt),
          sentAt: (r.sentAt as string | null) ?? null,
          deliveredAt: (r.deliveredAt as string | null) ?? null,
          campaign: {
            id: c.id,
            createdAt: c.createdAt,
            status: c.status,
            mode: String(c.mode ?? ''),
            recipientCount: c.recipientCount,
          },
        })) satisfies DeliveryReportRow[];
      })
    );
    rows.push(...parts.flat());
  }

  const filtered = applyFilters(rows, params);
  return { rows: filtered, summary: summarize(filtered) };
}

export type DeliveryReportLoad = DeliveryReportResult & { usedLegacyFallback?: boolean };

/** Primary API route; falls back to per-campaign recipients if chat-api is outdated (404). */
export async function fetchDeliveryReport(params: ReportParams = {}): Promise<DeliveryReportLoad> {
  try {
    const { data } = await api.get<{ data: DeliveryReportResult }>('/sms/delivery-report', { params });
    return { ...data.data, usedLegacyFallback: false };
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status !== 404) throw e;
    const legacy = await loadViaCampaignRecipients(params);
    return { ...legacy, usedLegacyFallback: true };
  }
}
