/**
 * Shared, deterministic item-name reconciliation used by both Excel imports.
 * Exact normalised matching avoids fuzzy/incorrect pairings.
 */
export function normalizeItemName(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized =
    typeof value === 'string' ? value.replace(/,/g, '').replace(/\s/g, '').trim() : value;
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}
