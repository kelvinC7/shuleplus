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

/** Build "First Last" from IAM profile parts. */
export function fullNameFromParts(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ').trim();
}
