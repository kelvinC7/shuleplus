import { z } from 'zod';
import { normalizeRwandaPhone } from './phone.utils';

export function isEmailIdentifier(value: string): boolean {
  return z.string().email().safeParse(value.trim()).success;
}

export const loginIdentifierSchema = z
  .string()
  .trim()
  .min(1, 'Email or phone is required')
  .refine(
    (value) => isEmailIdentifier(value) || Boolean(normalizeRwandaPhone(value)),
    'Enter a valid email or Rwanda phone number'
  );

export function resolveLoginIdentifier(raw: string): { identifier: string; phone: string | null } {
  const identifier = raw.trim();
  return {
    identifier,
    phone: normalizeRwandaPhone(identifier),
  };
}
