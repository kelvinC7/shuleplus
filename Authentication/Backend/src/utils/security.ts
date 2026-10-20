import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { JwtPayload } from '../middleware/auth.middleware';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

export function generateSecurePassword(): string {
  const raw = crypto.randomBytes(10).toString('base64url');
  return `Sp${raw}1!`;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: { sub: string; sessionId: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function parseUserAgent(userAgent?: string): {
  browser: string;
  os: string;
  deviceName: string;
} {
  const ua = userAgent ?? 'Unknown';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';

  return {
    browser,
    os,
    deviceName: `${browser} on ${os}`,
  };
}
