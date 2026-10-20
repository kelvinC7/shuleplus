import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface BabyeyiCircularListItem {
  id: string;
  organizationId: string;
  schoolName: string;
  schoolCode: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  academicYear: string;
  term: string;
  className: string;
  status: string;
  nesaStatus?: string | null;
  totalFee?: number | string | null;
  publishedAt?: string | null;
  createdAt?: string;
}

export interface BabyeyiRequirementLine {
  item?: string;
  description?: string;
  quantity?: string | number;
  pay_channel?: string;
  payChannel?: string;
  unitPrice?: number | string;
  cost?: number | string;
}

export interface BabyeyiCircularDetail extends BabyeyiCircularListItem {
  educationLevel?: string | null;
  requirements?: BabyeyiRequirementLine[] | unknown;
  schoolDistrict?: string | null;
}

function parseQty(raw: string | number | undefined): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(1, Math.round(raw));
  const n = parseInt(String(raw ?? '1').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parsePrice(raw: number | string | undefined): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, raw);
  const n = parseFloat(String(raw ?? '0').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * ShuleKit Standard Kits import "Other Requirement" lines only
 * (`pay_channel === 'babyeyi'` or empty).
 * "Paid to School Account" (`school`) are school fees and are skipped.
 */
export function isSellableRequirement(line: BabyeyiRequirementLine): boolean {
  const channel = (line.pay_channel ?? line.payChannel ?? '').toLowerCase().trim();
  return channel === 'babyeyi' || channel === 'other' || channel === '';
}

export function summarizeRequirementChannels(circular: BabyeyiCircularDetail): {
  total: number;
  schoolChannel: number;
  otherRequirementChannel: number;
  unknownChannel: number;
  untitled: number;
} {
  const raw = Array.isArray(circular.requirements) ? circular.requirements : [];
  let schoolChannel = 0;
  let otherRequirementChannel = 0;
  let unknownChannel = 0;
  let untitled = 0;
  for (const line of raw) {
    if (!line || typeof line !== 'object') continue;
    const req = line as BabyeyiRequirementLine;
    const title = String(req.item ?? '').trim();
    if (!title) {
      untitled += 1;
      continue;
    }
    const channel = (req.pay_channel ?? req.payChannel ?? '').toLowerCase().trim();
    if (channel === 'school') schoolChannel += 1;
    else if (channel === 'babyeyi' || channel === 'other' || channel === '') otherRequirementChannel += 1;
    else unknownChannel += 1;
  }
  return {
    total: raw.length,
    schoolChannel,
    otherRequirementChannel,
    unknownChannel,
    untitled,
  };
}

/** Human-readable reason when a circular cannot be imported into a Standard Kit. */
export function explainNoSellableItems(circular: BabyeyiCircularDetail): string {
  const stats = summarizeRequirementChannels(circular);
  const meta = [
    `Academic Year : ${circular.academicYear || '—'}`,
    `Term          : ${circular.term || '—'}`,
    `Class         : ${circular.className || '—'}`,
    '',
    `Total Requirements : ${stats.total}`,
    `Imported to ShuleKit : 0`,
    `Paid to School Account : ${stats.schoolChannel}`,
  ].join('\n');

  if (stats.total === 0) {
    return (
      `No Standard Kit Available\n\n` +
      `The selected Babyeyi circular has no student requirements.\n\n` +
      `Open the Babyeyi Circular → Student Requirements, add items, ` +
      `leave “Paid to School Account” unchecked for kit materials, then import again.\n\n` +
      meta
    );
  }

  if (stats.otherRequirementChannel === 0 && stats.schoolChannel > 0) {
    return (
      `No Standard Kit Available\n\n` +
      `The selected Babyeyi circular contains ${stats.total} student requirement(s), ` +
      `but all of them are marked as Paid to School Account.\n\n` +
      `Only requirements marked as Other Requirement can be imported into ShuleKit Standard Kits.\n\n` +
      `To continue:\n` +
      `1. Open the Babyeyi Circular.\n` +
      `2. Go to Student Requirements.\n` +
      `3. Leave Paid to School Account unchecked for items parents buy through ShuleKit.\n` +
      `4. Save the circular and import it again.\n\n` +
      meta
    );
  }

  return (
    `No Standard Kit Available\n\n` +
    `No Other Requirement items were found to import.\n` +
    `Untitled rows: ${stats.untitled}. Unknown pay type: ${stats.unknownChannel}.\n\n` +
    meta
  );
}

export function extractSellableItems(circular: BabyeyiCircularDetail): Array<{
  title: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  sourceItemKey: string;
}> {
  const raw = Array.isArray(circular.requirements) ? circular.requirements : [];
  const out: Array<{
    title: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    sourceItemKey: string;
  }> = [];

  raw.forEach((line, idx) => {
    if (!line || typeof line !== 'object') return;
    const req = line as BabyeyiRequirementLine;
    if (!isSellableRequirement(req)) return;
    const title = String(req.item ?? '').trim();
    if (!title) return;
    // Prefer unitPrice; cost may be a line total (qty × unit) for school-priced rows.
    const qty = parseQty(req.quantity);
    let unitPrice = parsePrice(req.unitPrice);
    if (unitPrice <= 0 && req.cost != null) {
      const cost = parsePrice(req.cost);
      // If cost looks like a line total, derive unit price.
      unitPrice = qty > 1 && cost > 0 ? cost / qty : cost;
    }
    out.push({
      title,
      description: req.description ? String(req.description) : null,
      quantity: qty,
      unitPrice,
      sourceItemKey: `${circular.id}:${idx}:${title.slice(0, 40)}`,
    });
  });

  return out;
}

export class BabyeyiClient {
  private base = env.BABYEYI_API_URL.replace(/\/$/, '');

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}${qs}`, {
        headers: {
          'x-service-key': env.SERVICE_API_KEY,
          Accept: 'application/json',
        },
      });
    } catch (err) {
      throw new AppError(502, `Babyeyi unreachable: ${(err as Error).message}`);
    }

    const body = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; message?: string };
    if (!res.ok) {
      throw new AppError(res.status >= 500 ? 502 : res.status, body.message ?? `Babyeyi error ${res.status}`);
    }
    return (body.data ?? body) as T;
  }

  async listCirculars(query: {
    district?: string;
    academicYear?: string;
    organizationId?: string;
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<BabyeyiCircularListItem[]> {
    const params: Record<string, string> = {};
    if (query.district) params.district = query.district;
    if (query.academicYear) params.academicYear = query.academicYear;
    if (query.organizationId) params.organizationId = query.organizationId;
    if (query.status) params.status = query.status;
    if (query.search) params.search = query.search;
    if (query.limit) params.limit = String(query.limit);
    const data = await this.get<BabyeyiCircularListItem[]>('/nesa/circulars', params);
    return Array.isArray(data) ? data : [];
  }

  async getCircular(id: string): Promise<BabyeyiCircularDetail> {
    return this.get<BabyeyiCircularDetail>(`/nesa/circulars/${id}`);
  }
}

export const babyeyiClient = new BabyeyiClient();
