import { env } from '../config/env';

const base = () => env.BABYEYI_API_URL.replace(/\/$/, '');

export interface PublicCircularSummary {
  id: string;
  academicYear: string;
  term: string;
  className: string;
  classes: unknown;
  status: string;
  totalFee: string | number | null;
  updatedAt: string;
}

export async function fetchBabyeyiCircularOptions(organizationId: string) {
  const url = `${base()}/public/circulars/options?organizationId=${encodeURIComponent(organizationId)}`;
  const res = await fetch(url);
  if (!res.ok) return { academicYears: [] as string[], terms: [] as string[], count: 0 };
  const body = (await res.json()) as { data?: { academicYears?: string[]; terms?: string[]; count?: number } };
  return {
    academicYears: body.data?.academicYears ?? [],
    terms: body.data?.terms ?? [],
    count: body.data?.count ?? 0,
  };
}

export async function fetchBabyeyiCircularList(
  organizationId: string,
  filters?: { academicYear?: string; term?: string }
): Promise<PublicCircularSummary[]> {
  const params = new URLSearchParams({ organizationId });
  if (filters?.academicYear) params.set('academicYear', filters.academicYear);
  if (filters?.term) params.set('term', filters.term);
  const url = `${base()}/public/circulars/list?${params}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const body = (await res.json()) as { data?: PublicCircularSummary[] };
  return body.data ?? [];
}

export async function fetchBabyeyiPrintHtml(
  organizationId: string,
  circularId: string,
  opts?: { lang?: string; autoprint?: boolean }
): Promise<string | null> {
  const params = new URLSearchParams({ organizationId });
  if (opts?.lang) params.set('lang', opts.lang);
  if (opts?.autoprint) params.set('autoprint', '1');
  const url = `${base()}/public/circulars/${encodeURIComponent(circularId)}/print?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}
