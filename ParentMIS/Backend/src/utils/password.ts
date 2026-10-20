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
  if (phone.startsWith('0')) phone = `25${phone.slice(1)}`;
  return phone;
}
