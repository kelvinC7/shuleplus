import {
  BillStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { receiptPublicUrl } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { structureService } from './structure.service';
import {
  hashInitiatePaymentBody,
  normalizeIdempotencyKey,
  parseStoredInitiateResponse,
  type InitiatePaymentResponse,
} from '../utils/payment-initiation-idempotency.util';

/**
 * Public (unauthenticated) payment initiation from the landing-page fee wizard.
 *
 * Security notes:
 * - Card data: only the last 4 digits are ever persisted. PAN/CVV stay in the
 *   request scope and must eventually be tokenized by a PCI-compliant gateway.
 * - Bank account numbers are masked in stored notes (****last4).
 * - Payments start as PENDING and only a gateway callback / finance confirmation
 *   moves them to COMPLETED. For demos set FEES_PUBLIC_PAY_AUTO_CONFIRM_SECONDS
 *   to auto-complete PENDING payments after that many seconds when polled.
 */
const AUTO_CONFIRM_SECONDS = Math.max(0, Number(process.env.FEES_PUBLIC_PAY_AUTO_CONFIRM_SECONDS ?? '0'));

type PublicPayMethod = 'MOMO' | 'CARD' | 'BANK';

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

function mapMethod(m: PublicPayMethod): PaymentMethod {
  if (m === 'MOMO') return PaymentMethod.MOBILE_MONEY;
  if (m === 'CARD') return PaymentMethod.ONLINE;
  return PaymentMethod.BANK_TRANSFER;
}

/** Rwandan mobile prefixes → network (72/73/75 Airtel incl. legacy Tigo, 78/79 MTN). */
function detectNetwork(phone: string): 'MTN' | 'AIRTEL' | null {
  const m = phone.match(/^(?:\+?250|0)?(7\d)(\d{7})$/);
  if (!m) return null;
  const prefix = m[1];
  if (['72', '73', '75'].includes(prefix)) return 'AIRTEL';
  if (['78', '79'].includes(prefix)) return 'MTN';
  return null;
}

type StoredDetails = {
  channel?: string;
  method?: string;
  provider?: string | null;
  phone?: string | null;
  cardLast4?: string | null;
  cardHolder?: string | null;
  bankName?: string | null;
  accountNumberMasked?: string | null;
  accountHolder?: string | null;
  studentCode?: string | null;
  academicYear?: string | null;
  term?: string | null;
  lines?: Array<{ name: string; amount: number }>;
};

const IDEMPOTENCY_IN_PROGRESS_MESSAGE =
  'Idempotency key already used with a request still in progress; retry shortly with the same payload';

class PublicPaymentsService {
  async initiate(
    organizationId: string,
    body: Record<string, unknown>,
    options?: { idempotencyKey?: string | null }
  ) {
    let idempotencyKey: string | null = null;
    try {
      idempotencyKey = normalizeIdempotencyKey(options?.idempotencyKey);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'IDEMPOTENCY_KEY_TOO_LONG') {
        throw new AppError(400, `Idempotency-Key must be at most 128 characters`);
      }
      if (code === 'IDEMPOTENCY_KEY_INVALID') {
        throw new AppError(400, 'Idempotency-Key must be printable ASCII (no spaces)');
      }
      throw e;
    }

    const requestHash = idempotencyKey ? hashInitiatePaymentBody(body) : null;
    let idempotencyClaimed = false;
    if (idempotencyKey && requestHash) {
      const claim = await this.claimIdempotencySlot(organizationId, idempotencyKey, requestHash);
      if (claim !== 'NEW') return claim;
      idempotencyClaimed = true;
    }

    try {
      const result = await this.createInitiatePayment(organizationId, body);
      if (idempotencyKey && requestHash) {
        await this.completeIdempotencySlot(organizationId, idempotencyKey, result);
      }
      return result;
    } catch (e) {
      if (idempotencyClaimed && idempotencyKey) {
        await prisma.paymentInitiationIdempotency
          .deleteMany({
            where: { organizationId, idempotencyKey, responseBody: null },
          })
          .catch(() => undefined);
      }
      throw e;
    }
  }

  private async resolveIdempotentReplay(
    organizationId: string,
    idempotencyKey: string,
    requestHash: string
  ): Promise<InitiatePaymentResponse | null> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const row = await prisma.paymentInitiationIdempotency.findUnique({
        where: {
          organizationId_idempotencyKey: { organizationId, idempotencyKey },
        },
      });
      if (!row) return null;

      if (row.requestHash !== requestHash) {
        throw new AppError(409, 'Idempotency key already used with different payload');
      }

      if (row.responseBody) {
        return parseStoredInitiateResponse(row.responseBody);
      }

      if (attempt < 7) {
        await new Promise((r) => setTimeout(r, 150));
        continue;
      }
      throw new AppError(409, IDEMPOTENCY_IN_PROGRESS_MESSAGE);
    }
    return null;
  }

  private async claimIdempotencySlot(
    organizationId: string,
    idempotencyKey: string,
    requestHash: string
  ): Promise<'NEW' | InitiatePaymentResponse> {
    try {
      await prisma.paymentInitiationIdempotency.create({
        data: {
          organizationId,
          idempotencyKey,
          requestHash,
          httpStatus: 201,
        },
      });
      return 'NEW';
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
      if (code !== 'P2002') throw e;
      const replay = await this.resolveIdempotentReplay(organizationId, idempotencyKey, requestHash);
      if (replay) return replay;
      throw new AppError(409, IDEMPOTENCY_IN_PROGRESS_MESSAGE);
    }
  }

  private async completeIdempotencySlot(
    organizationId: string,
    idempotencyKey: string,
    result: InitiatePaymentResponse
  ) {
    await prisma.paymentInitiationIdempotency.update({
      where: {
        organizationId_idempotencyKey: { organizationId, idempotencyKey },
      },
      data: {
        responseBody: JSON.stringify(result),
        paymentReference: result.reference,
      },
    });
  }

  private async createInitiatePayment(
    organizationId: string,
    body: Record<string, unknown>
  ): Promise<InitiatePaymentResponse> {
    const method = String(body.method ?? '').toUpperCase() as PublicPayMethod;
    if (!(['MOMO', 'CARD', 'BANK'] as PublicPayMethod[]).includes(method)) {
      throw new AppError(400, 'Unsupported payment method');
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new AppError(400, 'Amount must be positive');

    const academicYear = String(body.academicYear ?? '').trim();
    const term = String(body.term ?? '').trim();
    const className = body.className ? String(body.className).trim() : '';
    const studentCode = body.studentCode ? String(body.studentCode).trim() : '';
    const studentId = body.studentId ? String(body.studentId).trim() : '';
    const studentName = String(body.studentName ?? '').trim();
    if (!academicYear || !term) throw new AppError(400, 'academicYear and term are required');
    if (!studentCode && !studentId && !studentName) {
      throw new AppError(400, 'Student information is required');
    }

    const details: StoredDetails = { channel: 'PUBLIC_LANDING', method };
    let payerHint = '';

    if (method === 'MOMO') {
      const rawPhone = String(body.phone ?? '').replace(/[^\d+]/g, '');
      const normalized = rawPhone.replace(/^\+?250/, '0').replace(/^(\d{9})$/, '0$1');
      if (!/^07\d{8}$/.test(normalized)) throw new AppError(400, 'A valid Rwandan phone number is required (e.g. 0788123456)');
      const requested = String(body.provider ?? '').toUpperCase();
      details.provider = requested === 'MTN' || requested === 'AIRTEL' ? requested : detectNetwork(normalized) ?? 'MTN';
      details.phone = normalized;
      payerHint = normalized;
    }

    if (method === 'CARD') {
      const digits = String(body.cardNumber ?? '').replace(/\D/g, '');
      if (digits.length < 12 || digits.length > 19) throw new AppError(400, 'A valid card number is required');
      const expiry = String(body.expiry ?? '').replace(/\s/g, '');
      if (!/^\d{2}\/\d{2}$/.test(expiry)) throw new AppError(400, 'Card expiry must be MM/YY');
      const mm = Number(expiry.slice(0, 2));
      if (mm < 1 || mm > 12) throw new AppError(400, 'Card expiry month must be between 01 and 12');
      const cvv = String(body.cvv ?? '');
      if (!/^\d{3,4}$/.test(cvv)) throw new AppError(400, 'A valid CVV is required');
      // PCI: persist last4 only — never the PAN or CVV.
      details.cardLast4 = digits.slice(-4);
      details.cardHolder = String(body.cardHolder ?? '').trim() || null;
      payerHint = details.cardHolder ?? '';
    }

    if (method === 'BANK') {
      details.bankName = String(body.bankName ?? '').trim();
      if (!details.bankName) throw new AppError(400, 'Select a bank');
      const accountNumber = String(body.accountNumber ?? '').replace(/\s/g, '');
      if (!accountNumber) throw new AppError(400, 'Bank account number is required');
      details.accountNumberMasked = `****${accountNumber.slice(-4)}`;
      details.accountHolder = String(body.accountHolder ?? '').trim() || null;
      payerHint = details.accountHolder ?? '';
    }

    details.studentCode = studentCode || null;
    details.academicYear = academicYear;
    details.term = term;
    details.lines = Array.isArray(body.lines)
      ? (body.lines as Array<Record<string, unknown>>)
          .map((l) => ({ name: String(l.name ?? 'Fee'), amount: Number(l.amount ?? 0) }))
          .filter((l) => Number.isFinite(l.amount))
      : undefined;

    let billId: string | null = null;
    try {
      const resolved = await structureService.resolveStudentFees({
        organizationId,
        academicYear,
        term,
        className: className || undefined,
        studentCode: studentCode || undefined,
        studentId: studentId || undefined,
        studentName: studentName || undefined,
        autoBill: true,
      });
      if (resolved.found && resolved.billId) {
        billId = resolved.billId;
        if (!studentName && resolved.structureName) {
          // keep structure context even without a name
        }
        if (amount > resolved.remaining + 0.01 && resolved.remaining > 0 && body.allowOverpay !== true) {
          throw new AppError(400, `Amount exceeds the remaining balance for this bill`);
        }
      }
    } catch (e) {
      if (e instanceof AppError) throw e;
      console.warn('[public-payments] bill resolution skipped:', (e as Error)?.message);
    }

    const count = await prisma.payment.count({ where: { organizationId } });
    const paymentNumber = `PAY-2026-${String(count + 1).padStart(5, '0')}`;
    const reference = `PUB-${method}-${Date.now().toString(36).toUpperCase()}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        organizationId,
        paymentNumber,
        billId,
        studentId: studentId || studentCode || 'PUBLIC-PAYER',
        studentName: studentName || 'Public Portal Payer',
        className: className || null,
        amount,
        method: mapMethod(method),
        status: PaymentStatus.PENDING,
        reference,
        payerName: String(body.payerName ?? '').trim() || payerHint || null,
        isPartial: Boolean(billId),
        notes: JSON.stringify(details),
      },
    });

    return {
      reference,
      status: 'PENDING' as const,
      paymentNumber,
      amount,
      method: mapMethod(method),
      provider: details.provider ?? null,
      autoConfirmSeconds: AUTO_CONFIRM_SECONDS > 0 ? AUTO_CONFIRM_SECONDS : null,
    };
  }

  async status(reference: string) {
    let payment = await prisma.payment.findFirst({
      where: { reference },
      include: { receipt: true },
    });
    if (!payment) throw new AppError(404, 'Payment not found');

    if (
      payment.status === PaymentStatus.PENDING &&
      AUTO_CONFIRM_SECONDS > 0 &&
      Date.now() - payment.createdAt.getTime() >= AUTO_CONFIRM_SECONDS * 1000
    ) {
      payment = await this.confirm(payment.id);
    }

    return {
      reference: payment.reference,
      status: payment.status,
      paymentNumber: payment.paymentNumber,
      amount: num(payment.amount),
      method: payment.method,
      receiptNumber: payment.receipt?.receiptNumber ?? null,
    };
  }

  /** Flip a PENDING public payment to COMPLETED: updates the bill, issues a receipt, notifies parents. */
  private async confirm(paymentId: string) {
    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { receipt: true },
    });
    if (!existing) throw new AppError(404, 'Payment not found');
    if (existing.status !== PaymentStatus.PENDING) return existing;

    const amount = num(existing.amount);
    let balanceAfter = 0;
    if (existing.billId) {
      const bill = await prisma.studentBill.findFirst({ where: { id: existing.billId } });
      if (bill) {
        const paid = num(bill.paidAmount) + amount;
        balanceAfter = Math.max(num(bill.netAmount) - paid, 0);
        await prisma.studentBill.update({
          where: { id: bill.id },
          data: {
            paidAmount: paid,
            balance: balanceAfter,
            status: balanceAfter <= 0 ? BillStatus.PAID : BillStatus.PARTIALLY_PAID,
          },
        });
      }
    }

    let details: StoredDetails = {};
    try {
      details = existing.notes ? (JSON.parse(existing.notes) as StoredDetails) : {};
    } catch {
      /* notes not JSON */
    }

    const count = await prisma.receipt.count({ where: { organizationId: existing.organizationId } });
    const receiptNumber = `RC-2026-${String(count + 1).padStart(5, '0')}`;

    const updated = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: PaymentStatus.COMPLETED,
        verifiedAt: new Date(),
        receipt: {
          create: {
            organizationId: existing.organizationId,
            receiptNumber,
            studentName: existing.studentName,
            studentCode: details.studentCode ?? null,
            className: existing.className,
            amountPaid: amount,
            outstanding: balanceAfter,
            method: existing.method,
            qrCode: receiptPublicUrl(receiptNumber),
          },
        },
      },
      include: { receipt: true },
    });

    void import('./payment-notification.service')
      .then(({ paymentNotificationService }) =>
        paymentNotificationService.notifyPayment(existing.organizationId, {
          studentId: existing.studentId,
          studentCode: details.studentCode ?? null,
          studentName: existing.studentName,
          className: existing.className,
          academicYear: details.academicYear ?? null,
          term: details.term ?? null,
          amount,
          previousBalance: balanceAfter + amount,
          remainingBalance: balanceAfter,
          method: existing.method,
          paymentId: updated.id,
          paymentNumber: updated.paymentNumber,
          receiptNumber,
          recordedBy: 'ShulePlus Public Portal',
        })
      )
      .catch((err: unknown) => console.warn('[public-payments] parent notify failed', err));

    return updated;
  }
}

export const publicPaymentsService = new PublicPaymentsService();
