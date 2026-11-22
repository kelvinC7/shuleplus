export function tripReferencePrefix(year = new Date().getFullYear()): string {
  return `ST-${year}-`;
}

export function nextTripReference(seq: number, year = new Date().getFullYear()): string {
  const padded = String(seq).padStart(4, '0');
  return `${tripReferencePrefix(year)}${padded}`;
}

export function parseTripReferenceSequence(reference: string, year = new Date().getFullYear()): number | null {
  const prefix = tripReferencePrefix(year);
  if (!reference.startsWith(prefix)) return null;
  const n = Number.parseInt(reference.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : null;
}
