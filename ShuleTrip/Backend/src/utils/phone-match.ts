export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = normalizePhoneDigits(a ?? '');
  const db = normalizePhoneDigits(b ?? '');
  if (da.length < 9 || db.length < 9) return false;
  if (da === db) return true;
  return da.endsWith(db) || db.endsWith(da);
}
