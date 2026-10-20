import crypto from 'crypto';
import { prisma } from '../config/database';

/**
 * Generate a unique request number with collision retry.
 * Format: SK-YYYY-XXXX (XXXX = sequential padded, retried on conflict).
 */
export async function generateRequestNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SK-${year}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.kitRequest.count({ where: { organizationId } });
    const num = String(count + 1 + attempt).padStart(4, '0');
    const candidate = `${prefix}${num}`;

    const exists = await prisma.kitRequest.findFirst({
      where: { requestNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  // Fallback: unique random suffix
  return `${prefix}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Generate a unique payment number with collision retry.
 * Format: PAY-SK-YYYY-XXXX (XXXX = sequential padded, retried on conflict).
 */
export async function generatePaymentNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-SK-${year}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.kitRequestPayment.count({ where: { organizationId } });
    const num = String(count + 1 + attempt).padStart(4, '0');
    const candidate = `${prefix}${num}`;

    const exists = await prisma.kitRequestPayment.findFirst({
      where: { paymentNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  return `${prefix}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}
