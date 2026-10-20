import { createHash } from 'crypto';

const MAX_KEY_LENGTH = 128;
const KEY_PATTERN = /^[\x21-\x7E]+$/;

export type InitiatePaymentResponse = {
  reference: string;
  status: 'PENDING';
  paymentNumber: string;
  amount: number;
  method: string;
  provider: string | null;
  autoConfirmSeconds: number | null;
};

export function normalizeIdempotencyKey(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const key = raw.trim();
  if (!key) return null;
  if (key.length > MAX_KEY_LENGTH) {
    throw new Error('IDEMPOTENCY_KEY_TOO_LONG');
  }
  if (!KEY_PATTERN.test(key)) {
    throw new Error('IDEMPOTENCY_KEY_INVALID');
  }
  return key;
}

/** Stable fingerprint of the initiate body (scoped per organization via storage, not hash). */
export function hashInitiatePaymentBody(body: Record<string, unknown>): string {
  const method = String(body.method ?? '').toUpperCase();
  const canonical: Record<string, unknown> = {
    method,
    amount: Number(body.amount),
    academicYear: String(body.academicYear ?? '').trim(),
    term: String(body.term ?? '').trim(),
    className: body.className ? String(body.className).trim() : '',
    studentCode: body.studentCode ? String(body.studentCode).trim() : '',
    studentId: body.studentId ? String(body.studentId).trim() : '',
    studentName: String(body.studentName ?? '').trim(),
    payerName: String(body.payerName ?? '').trim(),
    allowOverpay: body.allowOverpay === true,
  };

  if (method === 'MOMO') {
    const rawPhone = String(body.phone ?? '').replace(/[^\d+]/g, '');
    const normalized = rawPhone.replace(/^\+?250/, '0').replace(/^(\d{9})$/, '0$1');
    canonical.phone = normalized;
    canonical.provider = String(body.provider ?? '').toUpperCase();
  }

  if (method === 'CARD') {
    canonical.cardNumber = String(body.cardNumber ?? '').replace(/\D/g, '');
    canonical.expiry = String(body.expiry ?? '').replace(/\s/g, '');
    canonical.cardHolder = String(body.cardHolder ?? '').trim();
    canonical.cvv = String(body.cvv ?? '');
  }

  if (method === 'BANK') {
    canonical.bankName = String(body.bankName ?? '').trim();
    canonical.accountNumber = String(body.accountNumber ?? '').replace(/\s/g, '');
    canonical.accountHolder = String(body.accountHolder ?? '').trim();
  }

  if (Array.isArray(body.lines)) {
    canonical.lines = (body.lines as Array<Record<string, unknown>>)
      .map((l) => ({ name: String(l.name ?? 'Fee'), amount: Number(l.amount ?? 0) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function parseStoredInitiateResponse(raw: string): InitiatePaymentResponse {
  return JSON.parse(raw) as InitiatePaymentResponse;
}
