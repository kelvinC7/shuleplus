/** Convert email or raw value to a display name for records and documents. */
export function formatPersonName(value?: string | null): string {
  if (!value?.trim()) return '';

  const trimmed = value.trim();
  if (!trimmed.includes('@')) return trimmed;

  const local = trimmed.split('@')[0] ?? trimmed;
  return local
    .replace(/\d+/g, ' ')
    .split(/[._-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

export function fullNameFromParts(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ').trim();
}

export function personNameFromAuth(email?: string): string {
  return formatPersonName(email) || email || 'User';
}
