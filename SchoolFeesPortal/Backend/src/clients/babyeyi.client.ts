import { env } from '../config/env';

export type BabyeyiSchoolFeeItem = {
  id: string;
  name: string;
  amount: number;
  kind: 'payment' | 'requirement';
  source: 'BABYEYI';
  paymentType: 'SCHOOL_ACCOUNT';
};

export type BabyeyiFetchResult = {
  items: BabyeyiSchoolFeeItem[];
  hint: string | null;
  circularFound: boolean;
};

type PublicCircular = {
  payments?: Array<{ id: string; name: string; amount: number; payChannel?: string | null }>;
  requirements?: Array<{ id: string; name: string; price: number; payChannel?: string | null }>;
};

type PublicCircularListItem = {
  className?: string | null;
  classes?: unknown;
};

function isPaidAtSchool(channel?: string | null) {
  return (channel ?? '').toLowerCase() === 'school';
}

function classVariants(className?: string): (string | undefined)[] {
  if (!className?.trim()) return [undefined];
  const raw = className.trim();
  const base = raw.split(/\s+/)[0];
  return [...new Set([raw, base])];
}

function termVariants(term: string): string[] {
  const t = term.trim();
  const variants = new Set<string>([t]);
  const lower = t.toLowerCase();
  if (/term\s*1|term\s*i\b|^1$|^i$/i.test(lower)) {
    variants.add('Term 1');
    variants.add('Term I');
    variants.add('Term1');
  }
  if (/term\s*2|term\s*ii\b|^2$|^ii$/i.test(lower)) {
    variants.add('Term 2');
    variants.add('Term II');
    variants.add('Term2');
  }
  if (/term\s*3|term\s*iii\b|^3$|^iii$/i.test(lower)) {
    variants.add('Term 3');
    variants.add('Term III');
    variants.add('Term3');
  }
  return [...variants];
}

function yearVariants(year: string): string[] {
  const y = year.trim();
  return [...new Set([y, y.replace(/\//g, '-'), y.replace(/-/g, '/')])];
}

function extractSchoolItems(circular: PublicCircular): BabyeyiSchoolFeeItem[] {
  const payments = (circular.payments ?? [])
    .filter((p) => isPaidAtSchool(p.payChannel))
    .map((p) => ({
      id: p.id,
      name: p.name,
      amount: Number(p.amount) || 0,
      kind: 'payment' as const,
      source: 'BABYEYI' as const,
      paymentType: 'SCHOOL_ACCOUNT' as const,
    }));

  const requirements = (circular.requirements ?? [])
    .filter((r) => isPaidAtSchool(r.payChannel))
    .map((r) => ({
      id: r.id,
      name: r.name,
      amount: Number(r.price) || 0,
      kind: 'requirement' as const,
      source: 'BABYEYI' as const,
      paymentType: 'SCHOOL_ACCOUNT' as const,
    }));

  return [...payments, ...requirements];
}

async function fetchCircular(params: {
  organizationId: string;
  academicYear: string;
  term: string;
  className?: string;
}): Promise<{ ok: boolean; circular?: PublicCircular; status: number }> {
  const base = env.BABYEYI_API_URL.replace(/\/$/, '');
  const qs = new URLSearchParams({
    organizationId: params.organizationId,
    academicYear: params.academicYear,
    term: params.term,
  });
  if (params.className?.trim()) qs.set('class', params.className.trim());

  const response = await fetch(`${base}/public/circulars?${qs.toString()}`);
  if (!response.ok) return { ok: false, status: response.status };
  const body = (await response.json()) as { data?: PublicCircular };
  return { ok: true, circular: body.data, status: response.status };
}

/** Classes from approved Babyeyi circulars — snapshotted items stay in fee structures even if Babyeyi circular is removed. */
export async function fetchBabyeyiClasses(
  organizationId: string,
  filters?: { academicYear?: string; term?: string }
): Promise<Array<{ id: string; name: string; label: string }>> {
  if (!organizationId?.trim()) return [];
  try {
    const base = env.BABYEYI_API_URL.replace(/\/$/, '');
    const qs = new URLSearchParams({ organizationId });
    if (filters?.academicYear) qs.set('academicYear', filters.academicYear);
    if (filters?.term) qs.set('term', filters.term);
    const response = await fetch(`${base}/public/circulars/list?${qs.toString()}`);
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: PublicCircularListItem[] };
    const names = new Set<string>();
    for (const row of body.data ?? []) {
      if (row.className?.trim()) names.add(row.className.trim());
      if (Array.isArray(row.classes)) {
        for (const c of row.classes) {
          if (typeof c === 'string' && c.trim()) names.add(c.trim());
          else if (c && typeof c === 'object' && 'name' in c && typeof (c as { name: string }).name === 'string') {
            names.add((c as { name: string }).name.trim());
          }
        }
      }
    }
    return [...names].sort().map((name) => ({ id: name, name, label: name }));
  } catch {
    return [];
  }
}

export async function fetchBabyeyiSchoolAccountItems(params: {
  organizationId: string;
  academicYear: string;
  term: string;
  className?: string;
}): Promise<BabyeyiFetchResult> {
  if (!params.organizationId?.trim() || !params.academicYear?.trim() || !params.term?.trim()) {
    return {
      items: [],
      circularFound: false,
      hint: 'Select academic year, term and class before fetching from Babyeyi.',
    };
  }

  try {
    for (const academicYear of yearVariants(params.academicYear)) {
      for (const term of termVariants(params.term)) {
        for (const className of classVariants(params.className)) {
          const result = await fetchCircular({
            organizationId: params.organizationId,
            academicYear,
            term,
            className,
          });
          if (!result.ok || !result.circular) continue;

          const items = extractSchoolItems(result.circular);
          if (items.length > 0) {
            return { items, circularFound: true, hint: null };
          }

          return {
            items: [],
            circularFound: true,
            hint:
              'Circular found but no fees marked "Paid at School Account". In Babyeyi Step 3, set payment channel to Paid at School Account.',
          };
        }
      }
    }

    return {
      items: [],
      circularFound: false,
      hint:
        'No approved Babyeyi circular for this year, term and class. Publish a circular in Babyeyi Wizard first.',
    };
  } catch {
    return {
      items: [],
      circularFound: false,
      hint: `Cannot reach Babyeyi API at ${env.BABYEYI_API_URL}. Ensure Babyeyi backend is running.`,
    };
  }
}
