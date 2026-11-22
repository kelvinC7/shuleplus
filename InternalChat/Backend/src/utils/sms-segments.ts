/** GSM-7: 160 chars first segment, 153 per concat part. Unicode: 70 / 67. */
export function countSmsSegments(text: string): number {
  const body = text.trim();
  if (!body) return 0;
  const isUnicode = /[^\u0000-\u007F]/.test(body);
  const single = isUnicode ? 70 : 160;
  const multi = isUnicode ? 67 : 153;
  if (body.length <= single) return 1;
  return Math.ceil((body.length - single) / multi) + 1;
}

export function normalizePhoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 9) return digits;
  return digits.slice(-9);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `+*** *** ${digits.slice(-3)}`;
}

export function formatRwPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('250')) return `+${digits}`;
  if (digits.length === 9) return `+250${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return `+25${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}
