import type { Circular, CircularStatus } from '@/types';

/** Print / PDF unlocked for approved & published documents. */
export function isSharingLocked(circular: Pick<Circular, 'status' | 'requestIncrease'>): boolean {
  const unlocked: CircularStatus[] = ['APPROVED', 'PUBLISHED'];
  if (!unlocked.includes(circular.status)) return true;
  // Increase still pending gate (NESA) — keep locked while request flagged and not published/approved complete
  if (circular.requestIncrease && circular.status === 'PENDING') return true;
  return false;
}

export type DocLang = 'en' | 'rw' | 'fr';

export const DOC_LANG_STORAGE_KEY = 'babyeyi_doc_lang';

export function readStoredDocLang(): DocLang {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem(DOC_LANG_STORAGE_KEY);
  return saved === 'rw' || saved === 'fr' ? saved : 'en';
}

export function storeDocLang(lang: DocLang) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DOC_LANG_STORAGE_KEY, lang);
}

/** True when RW/FR machine translation is missing or still the English fallback. */
export function needsTranslation(circular: Pick<Circular, 'contentI18n' | 'translationStatus' | 'parentMessage'>, lang: DocLang): boolean {
  if (lang === 'en') return false;
  const status = circular.translationStatus;
  if (status === 'complete' || status === 'manual') {
    const triplet = circular.contentI18n?.parentMessage;
    const localized = lang === 'rw' ? triplet?.rw : triplet?.fr;
    const en = triplet?.en ?? circular.parentMessage ?? '';
    if (localized?.trim() && localized.trim() !== en.trim()) return false;
  }
  return true;
}

export const DOC_LABELS: Record<
  DocLang,
  {
    parentMessage: string;
    fees: string;
    total: string;
    banking: string;
    requirements: string;
    other: string;
    leaders: string;
    notes: string;
    official: string;
    republic: string;
    account: string;
    name: string;
    bank: string;
    item: string;
    amount: string;
    qty: string;
    role: string;
    phone: string;
    paidAtSchoolTitle: string;
    paidAtSchoolSubtitle: string;
  }
> = {
  en: {
    parentMessage: 'Message to Parents',
    fees: 'Fees',
    total: 'Total',
    banking: 'Banking Details',
    requirements: 'Student Requirements',
    other: 'Other Information',
    leaders: 'School Leadership',
    notes: 'Class Notes',
    official: 'Official Circular',
    republic: 'Republic of Rwanda',
    account: 'Account No.',
    name: 'Account Name',
    bank: 'Bank',
    item: 'Item',
    amount: 'Amount (RWF)',
    qty: 'Qty',
    role: 'Role',
    phone: 'Phone',
    paidAtSchoolTitle: 'Total Paid at School Account',
    paidAtSchoolSubtitle:
      'Fees and requirements settled directly at the school office — not paid via bank.',
  },
  rw: {
    parentMessage: 'Ubutumwa ku Babyeyi',
    fees: 'Amafaranga',
    total: 'Igiteranyo',
    banking: 'Amabanki',
    requirements: 'Ibikenewe',
    other: 'Andi Makuru',
    leaders: 'Ubuyobozi bw’Ishuri',
    notes: 'Inyandiko',
    official: 'Itangazo Risemeye',
    republic: 'Repubulika y’u Rwanda',
    account: 'Konti',
    name: 'Izina ry’uwufite konti',
    bank: 'Banki',
    item: 'Ikibazo',
    amount: 'Amafaranga (RWF)',
    qty: 'Umubare',
    role: 'Inshingano',
    phone: 'Telefone',
    paidAtSchoolTitle: 'Igiteranyo cyishyurwa kuri Konti y’Ishuri',
    paidAtSchoolSubtitle:
      'Amafaranga yose y’ishuri n’ibindi bisabwa byishyurwa kuri Konti (Account) y’Ishuri',
  },
  fr: {
    parentMessage: 'Message aux parents',
    fees: 'Frais',
    total: 'Total',
    banking: 'Coordonnées bancaires',
    requirements: 'Exigences',
    other: 'Autres informations',
    leaders: 'Direction de l’école',
    notes: 'Notes de classe',
    official: 'Circulaire officielle',
    republic: 'République du Rwanda',
    account: 'N° de compte',
    name: 'Titulaire',
    bank: 'Banque',
    item: 'Article',
    amount: 'Montant (RWF)',
    qty: 'Qté',
    role: 'Rôle',
    phone: 'Téléphone',
    paidAtSchoolTitle: 'Total payé au compte de l’école',
    paidAtSchoolSubtitle:
      'Frais et exigences réglés directement au bureau de l’école — non payés via la banque.',
  },
};

/** Picks the localized value from an i18n triplet, falling back to the English/original value. */
function pickTriplet(
  triplet: { en?: string; rw?: string; fr?: string } | undefined,
  lang: DocLang,
  fallback: string
): string {
  if (!triplet || lang === 'en') return fallback;
  const value = lang === 'rw' ? triplet.rw : triplet.fr;
  return value?.trim() ? value : fallback;
}

export function resolveParentMessage(circular: Circular, lang: DocLang): string {
  return pickTriplet(circular.contentI18n?.parentMessage, lang, circular.parentMessage?.trim() || '');
}

/** Returns payments with names localized for the given document language. */
export function resolveLocalizedPayments(circular: Circular, lang: DocLang) {
  const bundle = circular.contentI18n?.payments;
  return circular.payments.map((p, i) => ({ ...p, name: pickTriplet(bundle?.[i]?.name, lang, p.name) }));
}

/** Returns requirements with item/description localized for the given document language. */
export function resolveLocalizedRequirements(circular: Circular, lang: DocLang) {
  const bundle = circular.contentI18n?.requirements;
  return circular.requirements.map((r, i) => ({
    ...r,
    item: pickTriplet(bundle?.[i]?.item, lang, r.item),
    description: r.description ? pickTriplet(bundle?.[i]?.description, lang, r.description) : r.description,
  }));
}

/** Returns "other information" bullets localized for the given document language. */
export function resolveLocalizedOtherInfos(circular: Circular, lang: DocLang) {
  const bundle = circular.contentI18n?.otherInfos;
  return circular.otherInfos.map((o, i) => ({ ...o, item: pickTriplet(bundle?.[i]?.item, lang, o.item) }));
}

/** Returns class notes localized for the given document language. */
export function resolveLocalizedClassReqs(circular: Circular, lang: DocLang) {
  const bundle = circular.contentI18n?.classReqs;
  return circular.classReqs.map((n, i) => ({ ...n, item: pickTriplet(bundle?.[i]?.item, lang, n.item) }));
}

/** Returns school leaders with role localized for the given document language. */
export function resolveLocalizedLeaders(circular: Circular, lang: DocLang) {
  const bundle = circular.contentI18n?.leaders;
  return circular.leaders.map((l, i) => ({ ...l, role: pickTriplet(bundle?.[i]?.role, lang, l.role) }));
}

export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^(https?:|data:)/i.test(path)) return path;
  const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3012/api').replace(/\/$/, '');
  if (path.startsWith('/')) return `${apiBase}${path}`;
  return `${apiBase}/${path}`;
}

export function moneyRwf(n: number | string) {
  return `${Number(n || 0).toLocaleString()} RWF`;
}

export function shortDocId(id: string) {
  return id.slice(0, 8).toUpperCase();
}
