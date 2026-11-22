/** Turn emails or raw strings into a readable person name for documents. */
export function formatPersonName(value?: string | null): string {
  if (!value?.trim()) return '';

  const trimmed = value.trim();

  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0] ?? trimmed;
    return local
      .replace(/\d+/g, ' ')
      .split(/[._-\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  return trimmed;
}

/** Abbreviate a person name as "F.Lastname" (e.g. Murekatete Gloria -> M.Gloria). */
export function abbreviatePersonName(value?: string | null): string {
  const name = formatPersonName(value);
  if (!name) return '';

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];

  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = first.charAt(0).toUpperCase();
  const lastName = last.charAt(0).toUpperCase() + last.slice(1);
  return `${initial}.${lastName}`;
}

/** Modern "Prepared by" format: first-name initial + full remaining names (e.g. Gloria Murekatete -> G. Murekatete). */
export function formatPreparedByName(value?: string | null): string {
  const name = formatPersonName(value);
  if (!name) return '';

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  const initial = parts[0].charAt(0).toUpperCase();
  const rest = parts.slice(1).join(' ');
  return `${initial}. ${rest}`.trim();
}

/** Build "First Last" from IAM profile parts. */
export function fullNameFromParts(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ').trim();
}
