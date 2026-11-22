import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent } from './parent-context.service';
import { xentripayApi } from './xentripay-api';
import type { StudentSelector } from '../utils/student-param';

const VALID_PURPOSES = new Set(['SHULEKIT', 'WALLET_TOPUP', 'TRIP_FEE', 'FEES']);
const MAX_AMOUNT = 10_000_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InitiateCollectionInput {
  amount: number;
  phone?: string;
  purpose?: string;
  description?: string;
  metadata?: unknown;
}

function normalizeRwandaPhone(raw: string | undefined): { local: string; msisdn: string } {
  const digits = String(raw ?? '').replace(/\D/g, '');
  let local = '';

  if (digits.startsWith('250') && digits.length === 12) {
    local = `0${digits.slice(3)}`;
  } else if (digits.startsWith('0') && digits.length === 10) {
    local = digits;
  } else if (digits.length === 9) {
    local = `0${digits}`;
  }

  if (!/^07[2389]\d{7}$/.test(local)) {
    throw new AppError(
      400,
      'Enter a valid Rwandan mobile money number, for example 0788 123 456'
    );
  }

  return { local, msisdn: `250${local.slice(1)}` };
}

function contactEmail(parent: { email: string | null; phone: string }): string {
  const email = parent.email?.trim();
  if (email && EMAIL_RE.test(email)) return email;
  const digits = parent.phone.replace(/\D/g, '').slice(-9) || 'parent';
  return `parent.${digits}@parents.shuleplus.rw`;
}

function mapGatewayStatus(status: string | undefined): 'PENDING' | 'SUCCESS' | 'FAILED' {
  const value = String(status ?? '').trim().toUpperCase();
  if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED'].includes(value)) return 'SUCCESS';
  if (['FAILED', 'CANCELLED', 'CANCELED', 'REVERSED', 'DECLINED'].includes(value)) return 'FAILED';
  return 'PENDING';
}

export class PaymentsService {
  async initiateCollection(
    organizationId: string,
    parentId: string,
    input: InitiateCollectionInput,
    requestedStudent?: StudentSelector
  ) {
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, 'Payment amount must be greater than zero');
    }
    if (amount > MAX_AMOUNT) {
      throw new AppError(400, 'Payment amount is too large');
    }

    const purpose = String(input.purpose ?? 'SHULEKIT').trim().toUpperCase();
    if (!VALID_PURPOSES.has(purpose)) {
      throw new AppError(400, 'Unsupported payment purpose');
    }

    const student = await resolveActiveStudent(organizationId, parentId, requestedStudent);
    const parent = await prisma.parentAccount.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError(404, 'Parent account not found');

    const { local, msisdn } = normalizeRwandaPhone(input.phone ?? parent.phone);
    const customerName =
      `${parent.firstName} ${parent.lastName}`.trim() ||
      `${student.firstName} ${student.lastName}`.trim();
    const customerRef = `PM-${purpose.slice(0, 3)}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const gateway = await xentripayApi.initiateCollection({
      email: contactEmail(parent),
      cname: customerName,
      amount,
      cnumber: local,
      msisdn,
      currency: 'RWF',
      pmethod: 'momo',
      chargesIncluded: true,
      customerRef,
    });

    const transaction = await prisma.paymentTransaction.create({
      data: {
        organizationId,
        parentId,
        studentId: student.id,
        purpose,
        customerRef,
        reference: gateway.refid,
        amount,
        currency: 'RWF',
        phone: local,
        status: 'PENDING',
        gatewayStatus: 'PENDING',
        gatewayTid: gateway.tid ?? null,
        authKey: gateway.authkey ?? null,
        description: input.description?.trim() || `${purpose} payment`,
        metadata: (input.metadata ?? undefined) as any,
      },
    });

    return {
      ...this.serialize(transaction),
      reply: gateway.reply ?? null,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
    };
  }

  async getCollectionStatus(
    organizationId: string,
    parentId: string,
    reference: string
  ) {
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { reference, parentId, organizationId },
    });
    if (!transaction) throw new AppError(404, 'Payment not found');

    if (transaction.status !== 'PENDING') {
      return this.serialize(transaction);
    }

    let gateway;
    try {
      gateway = await xentripayApi.getCollectionStatus(transaction.reference);
    } catch (error) {
      console.warn(
        `[payments] XentriPay status check failed (${(error as Error).message}); keeping PENDING`
      );
      return this.serialize(transaction);
    }

    if (gateway.customerRef && gateway.customerRef !== transaction.customerRef) {
      throw new AppError(502, 'Payment reference mismatch from XentriPay');
    }

    const status = mapGatewayStatus(gateway.status);
    const updated = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        gatewayStatus: gateway.status ?? null,
      },
    });

    if (status === 'SUCCESS') {
      await prisma.activityLog
        .create({
          data: {
            organizationId,
            userId: parentId,
            action: 'PAYMENT_COLLECTION',
            description: `${transaction.purpose} payment ${transaction.reference} confirmed (${transaction.amount.toLocaleString()} RWF)`,
          },
        })
        .catch(() => null);
    }

    return this.serialize(updated);
  }

  private serialize(transaction: {
    id: string;
    reference: string;
    customerRef: string;
    amount: number;
    currency: string;
    phone: string;
    status: string;
    gatewayStatus: string | null;
    purpose: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: transaction.id,
      reference: transaction.reference,
      customerRef: transaction.customerRef,
      amount: transaction.amount,
      currency: transaction.currency,
      phone: transaction.phone,
      status: transaction.status,
      gatewayStatus: transaction.gatewayStatus,
      purpose: transaction.purpose,
      description: transaction.description,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }
}

export const paymentsService = new PaymentsService();
