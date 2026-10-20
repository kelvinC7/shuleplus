/** Rwanda mobile: +250 7XX XXX XXX or 07XXXXXXXX */
export function normalizeRwandaPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('250') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith('07') && digits.length === 10) {
    return `+250${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith('7')) {
    return `+250${digits}`;
  }
  return null;
}

export function isValidRwandaPhone(input: string): boolean {
  return normalizeRwandaPhone(input) !== null;
}
