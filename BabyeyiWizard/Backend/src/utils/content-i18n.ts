import { translateToRwFr } from './content-translator';

export interface Triplet {
  en: string;
  rw: string;
  fr: string;
}

export interface ContentI18nBundle {
  v: 1;
  sourceLang: 'en';
  generatedAt: string;
  status: 'pending' | 'complete' | 'partial' | 'failed' | 'manual';
  parentMessage: Triplet;
  payments: Array<{ name: Triplet }>;
  requirements: Array<{ item: Triplet; description: Triplet }>;
  otherInfos: Array<{ item: Triplet }>;
  classReqs: Array<{ item: Triplet }>;
  leaders: Array<{ role: Triplet }>;
}

interface CircularEnglishSource {
  parentMessage?: string | null;
  payments: Array<{ name?: string }>;
  requirements: Array<{ item?: string; description?: string }>;
  otherInfos: Array<{ item?: string }>;
  classReqs: Array<{ item?: string }>;
  leaders: Array<{ role?: string }>;
}

function emptyTriplet(en = ''): Triplet {
  return { en, rw: en, fr: en };
}

async function tripletFor(en: string | undefined | null, previous?: Triplet): Promise<{ triplet: Triplet; ok: boolean }> {
  const value = en ?? '';
  if (previous && previous.en === value) {
    return { triplet: previous, ok: true };
  }
  if (!value.trim()) {
    return { triplet: emptyTriplet(value), ok: true };
  }
  const { rw, fr, ok } = await translateToRwFr(value);
  return { triplet: { en: value, rw, fr }, ok };
}

/**
 * Builds (or refreshes) the content_i18n v1 bundle from the current English source rows.
 * Pass the previous bundle to avoid re-translating fields whose English text is unchanged —
 * this preserves manual Hindura edits across unrelated saves.
 */
export async function buildContentI18nFromEnglish(
  source: CircularEnglishSource,
  previous?: ContentI18nBundle | null
): Promise<ContentI18nBundle> {
  let allOk = true;
  const track = (ok: boolean) => {
    if (!ok) allOk = false;
  };

  const parentMessageResult = await tripletFor(source.parentMessage, previous?.parentMessage);
  track(parentMessageResult.ok);

  const payments = await Promise.all(
    source.payments.map(async (p, i) => {
      const prev = previous?.payments?.[i]?.name;
      const result = await tripletFor(p.name, prev);
      track(result.ok);
      return { name: result.triplet };
    })
  );

  const requirements = await Promise.all(
    source.requirements.map(async (r, i) => {
      const prevItem = previous?.requirements?.[i]?.item;
      const prevDesc = previous?.requirements?.[i]?.description;
      const [itemResult, descResult] = await Promise.all([
        tripletFor(r.item, prevItem),
        tripletFor(r.description, prevDesc),
      ]);
      track(itemResult.ok);
      track(descResult.ok);
      return { item: itemResult.triplet, description: descResult.triplet };
    })
  );

  const otherInfos = await Promise.all(
    source.otherInfos.map(async (o, i) => {
      const prev = previous?.otherInfos?.[i]?.item;
      const result = await tripletFor(o.item, prev);
      track(result.ok);
      return { item: result.triplet };
    })
  );

  const classReqs = await Promise.all(
    source.classReqs.map(async (c, i) => {
      const prev = previous?.classReqs?.[i]?.item;
      const result = await tripletFor(c.item, prev);
      track(result.ok);
      return { item: result.triplet };
    })
  );

  const leaders = await Promise.all(
    source.leaders.map(async (l, i) => {
      const prev = previous?.leaders?.[i]?.role;
      const result = await tripletFor(l.role, prev);
      track(result.ok);
      return { role: result.triplet };
    })
  );

  return {
    v: 1,
    sourceLang: 'en',
    generatedAt: new Date().toISOString(),
    status: allOk ? 'complete' : 'partial',
    parentMessage: parentMessageResult.triplet,
    payments,
    requirements,
    otherInfos,
    classReqs,
    leaders,
  };
}

/** Applies a partial manual Kinyarwanda edit ("Hindura") on top of an existing bundle. */
export function applyRwPatch(
  bundle: ContentI18nBundle,
  patch: {
    parentMessage?: string;
    payments?: Array<{ index: number; name: string }>;
    requirements?: Array<{ index: number; item?: string; description?: string }>;
    otherInfos?: Array<{ index: number; item: string }>;
    classReqs?: Array<{ index: number; item: string }>;
    leaders?: Array<{ index: number; role: string }>;
  }
): ContentI18nBundle {
  const next: ContentI18nBundle = JSON.parse(JSON.stringify(bundle));

  if (typeof patch.parentMessage === 'string') {
    next.parentMessage = { ...next.parentMessage, rw: patch.parentMessage };
  }
  patch.payments?.forEach(({ index, name }) => {
    if (next.payments[index]) next.payments[index] = { name: { ...next.payments[index].name, rw: name } };
  });
  patch.requirements?.forEach(({ index, item, description }) => {
    const row = next.requirements[index];
    if (!row) return;
    next.requirements[index] = {
      item: item != null ? { ...row.item, rw: item } : row.item,
      description: description != null ? { ...row.description, rw: description } : row.description,
    };
  });
  patch.otherInfos?.forEach(({ index, item }) => {
    if (next.otherInfos[index]) next.otherInfos[index] = { item: { ...next.otherInfos[index].item, rw: item } };
  });
  patch.classReqs?.forEach(({ index, item }) => {
    if (next.classReqs[index]) next.classReqs[index] = { item: { ...next.classReqs[index].item, rw: item } };
  });
  patch.leaders?.forEach(({ index, role }) => {
    if (next.leaders[index]) next.leaders[index] = { role: { ...next.leaders[index].role, rw: role } };
  });

  next.status = 'manual';
  next.generatedAt = new Date().toISOString();
  return next;
}

export function isContentI18nBundle(value: unknown): value is ContentI18nBundle {
  return Boolean(value) && typeof value === 'object' && (value as { v?: number }).v === 1;
}
