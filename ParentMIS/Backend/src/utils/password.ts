import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { AppError } from '../middleware/error.middleware';

const KEY_LENGTH = 64;

/** Parent Portal / USSD: 5-digit numeric PIN. */
export function normalizeParentPin(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length !== 5) {
    throw new AppError(400, 'PIN must be exactly 5 digits');
  }
  return digits;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const derived = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function sanitizePhone(raw: string): string {
  let phone = raw.replace(/[\s\-().]/g, '');
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('0')) phone = `250${phone.slice(1)}`;
  return phone;
}

export function phoneVariants(raw: string): string[] {
  const digits = String(raw || '').replace(/\D/g, '');
  const variants = new Set<string>([raw, digits]);
  if (digits.startsWith('250') && digits.length >= 12) {
    variants.add(`0${digits.slice(3)}`);
    variants.add(`+${digits}`);
    variants.add(digits.slice(3));
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    variants.add(`+250${digits.slice(1)}`);
    variants.add(`250${digits.slice(1)}`);
    variants.add(digits.slice(1));
  }
  if (digits.length >= 9) {
    const last9 = digits.slice(-9);
    variants.add(last9);
    variants.add(`0${last9}`);
    variants.add(`250${last9}`);
    variants.add(`+250${last9}`);
  }
  return [...variants].filter(Boolean);
}
