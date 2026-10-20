import { PaymentMethod, RequestStatus } from '../generated/prisma';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { generateRequestNumber, generatePaymentNumber } from '../utils/request-number';
import { studentManagementClient } from './student-management-client.service';

/** Map an Academic class label (N1, P3, S4…) to a ShuleKit grade level. */
export function mapGradeLevel(classLabel: string | null | undefined): string | null {
  const label = (classLabel ?? '').trim().toUpperCase();
  const prefix = label.match(/^([NPS])\d+/)?.[1];
  const num = parseInt(label.match(/^[NPS](\d+)/)?.[1] ?? '', 10);
  if (!prefix || Number.isNaN(num)) return null;
  if (prefix === 'N') return 'Nursery';
  if (prefix === 'P') return 'Primary';
  if (prefix === 'S') return num <= 3 ? 'O-Level' : 'A-Level';
  return null;
}

export interface CreateRequestInput {
  /** Optional for the public parent flow — resolved from the student lookup when absent. */
  organizationId?: string;
  studentCode: string;
  kitId: string;
  /** Custom kit: the specific items (requirements) the parent picked. Absent = whole standard kit. */
  items?: { requirementId: string; quantity?: number }[];
  parentName: string;
  parentPhone?: string;
  parentRelation: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  deliveryMethod: 'AT_SCHOOL' | 'AT_HOME';
  notes?: string;
  recordedBy?: string;
}

export interface PaymentInput {
  method?: PaymentMethod;
  amount?: string | number;
  reference?: string;
  paidBy?: string;
}

export class RequestService {
  async create(input: CreateRequestInput) {
    const student = await studentManagementClient.lookupByCode(input.studentCode).catch(() => null);
    if (!student) throw new AppError(404, 'Student not found in the Academic module');

    const organizationId = input.organizationId ?? student.organizationId;
    if (input.organizationId && input.organizationId !== student.organizationId) {
      throw new AppError(404, 'Student not found in the Academic module');
    }

    const kit = await prisma.kit.findFirst({
      where: { id: input.kitId, organizationId, status: 'ACTIVE' },
      include: { requirements: true },
    });
    if (!kit) throw new AppError(404, 'Kit not found or inactive');

    const gradeLevel = mapGradeLevel(student.classLabel ?? student.className) ?? kit.gradeLevel;
    if (gradeLevel !== kit.gradeLevel) {
      throw new AppError(400, `This kit is for "${kit.gradeLevel}" but the student is in "${gradeLevel}"`);
    }

    let items: Array<{ requirementId: string | null; title: string; imageUrl: string | null; unitPrice: number; quantity: number; lineTotal: number }> = [];
    let subtotal: number;

    if (Array.isArray(input.items)) {
      const byId = new Map(kit.requirements.map((r) => [r.id, r]));
      const seen = new Set<string>();
      for (const sel of input.items) {
        const req = byId.get(sel.requirementId);
        if (!req) throw new AppError(400, 'Selected item is not part of this kit');
        if (seen.has(req.id)) continue;
        seen.add(req.id);
        const quantity = Math.min(9999, Math.max(1, Math.round(sel.quantity ?? req.quantity) || 1));
        const unitPrice = Number(req.unitPrice) || 0;
        items.push({
          requirementId: req.id,
          title: req.title,
          imageUrl: req.imageUrl,
          unitPrice,
          quantity,
          lineTotal: unitPrice * quantity,
        });
      }
      if (items.length === 0) throw new AppError(400, 'Select at least one item');
      const pricedTotal = items.reduce((s, i) => s + i.lineTotal, 0);
      subtotal = kit.requirements.some((r) => Number(r.unitPrice) > 0) ? pricedTotal : Number(kit.amount);
    } else {
      const priced = kit.requirements.filter((r) => Number(r.unitPrice) > 0);
      if (priced.length > 0) {
        items = priced.map((r) => ({
          requirementId: r.id,
          title: r.title,
          imageUrl: r.imageUrl,
          unitPrice: Number(r.unitPrice),
          quantity: r.quantity,
          lineTotal: Number(r.unitPrice) * r.quantity,
        }));
        subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      } else {
        subtotal = Number(kit.amount);
      }
    }

    const requestNumber = await generateRequestNumber(organizationId);

    const homeFee = input.deliveryMethod === 'AT_HOME' ? env.HOME_DELIVERY_FEE : 0;

    return prisma.kitRequest.create({
      data: {
        organizationId,
        requestNumber,
        kitId: kit.id,
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.studentCode ?? student.studentUid,
        className: student.classLabel ?? student.className,
        gradeLevel,
        parentName: input.parentName,
        parentPhone: input.parentPhone,
        parentRelation: input.parentRelation,
        deliveryMethod: input.deliveryMethod,
        subtotal,
        homeFee,
        total: subtotal + homeFee,
        notes: input.notes,
        recordedBy: input.recordedBy,
        items: items.length ? { create: items } : undefined,
      },
      include: { kit: true, payments: true, items: true },
    });
  }

  async list(
    organizationId: string,
    query: { status?: string; search?: string; studentId?: string; kitId?: string }
  ) {
    const where: any = { organizationId };
    if (query.status) where.status = query.status as RequestStatus;
    if (query.studentId) where.studentId = query.studentId;
    if (query.kitId) where.kitId = query.kitId;
    if (query.search) {
      where.OR = [
        { requestNumber: { contains: query.search, mode: 'insensitive' } },
        { studentName: { contains: query.search, mode: 'insensitive' } },
        { studentCode: { contains: query.search, mode: 'insensitive' } },
        { parentName: { contains: query.search, mode: 'insensitive' } },
        { parentPhone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, requests] = await Promise.all([
      prisma.kitRequest.count({ where }),
      prisma.kitRequest.findMany({
        where,
        include: {
          kit: true,
          payments: { orderBy: { createdAt: 'desc' } },
          items: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, requests };
  }

  async getById(id: string, organizationId: string) {
    const request = await prisma.kitRequest.findFirst({
      where: { id, organizationId },
      include: {
        kit: { include: { requirements: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!request) throw new AppError(404, 'Request not found');
    return request;
  }

  /** Public parent-facing status lookup by request number (no auth). */
  async getPublicStatus(requestNumber: string) {
    const request = await prisma.kitRequest.findUnique({
      where: { requestNumber },
      include: {
        kit: true,
        standardKit: true,
        payments: { orderBy: { createdAt: 'desc' } },
        items: { orderBy: { createdAt: 'asc' } },
        delivery: true,
      },
    });
    if (!request) throw new AppError(404, 'Request not found');

    return {
      requestNumber: request.requestNumber,
      status: request.status,
      studentName: request.studentName,
      className: request.className,
      gradeLevel: request.gradeLevel,
      kitName: request.kit?.name ?? request.standardKit?.name ?? null,
      trackingNumber: request.trackingNumber,
      orderType: request.orderType,
      deliveryMethod: request.deliveryMethod,
      subtotal: request.subtotal,
      homeFee: request.homeFee,
      total: request.total,
      notes: request.notes,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      items: request.items.map((i) => ({
        id: i.id,
        requirementId: i.requirementId,
        title: i.title,
        imageUrl: i.imageUrl,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
      })),
      payments: request.payments.map((p) => ({
        paymentNumber: p.paymentNumber,
        amount: p.amount,
        method: p.method,
        status: p.status,
        reference: p.reference,
        verifiedAt: p.verifiedAt,
      })),
    };
  }

  async updateStatus(id: string, organizationId: string, status: RequestStatus, recordedBy?: string) {
    const request = await prisma.kitRequest.findFirst({ where: { id, organizationId } });
    if (!request) throw new AppError(404, 'Request not found');

    const transitions: Partial<Record<RequestStatus, RequestStatus[]>> = {
      PENDING: ['APPROVED', 'CONFIRMED', 'CANCELLED', 'PAID'],
      CONFIRMED: ['PROCESSING', 'APPROVED', 'CANCELLED', 'PAID'],
      PROCESSING: ['PACKED', 'CANCELLED'],
      PACKED: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
      APPROVED: ['PENDING', 'CANCELLED', 'PAID', 'PROCESSING'],
      PAID: ['DELIVERED', 'APPROVED', 'PROCESSING', 'PACKED', 'REFUNDED'],
      DELIVERED: ['REFUNDED'],
      CANCELLED: ['PENDING'],
      REFUNDED: [],
    };

    const allowed = transitions[request.status] ?? [];
    if (!allowed.includes(status)) {
      throw new AppError(400, `Cannot move a "${request.status}" request to "${status}"`);
    }

    return prisma.kitRequest.update({
      where: { id },
      data: { status, recordedBy: recordedBy ?? request.recordedBy },
      include: { payments: true },
    });
  }

  /** Record-only payment, mirrors SchoolFeesPortal createPayment (no external gateway yet). */
  async recordPayment(organizationId: string, requestId: string, input: PaymentInput) {
    const request = await prisma.kitRequest.findFirst({ where: { id: requestId, organizationId } });
    if (!request) throw new AppError(404, 'Request not found');
    if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
      throw new AppError(400, `Only pending or approved requests can be paid (current: ${request.status})`);
    }

    const amount = input.amount !== undefined ? Number(input.amount) : Number(request.total);
    if (amount <= 0) throw new AppError(400, 'Payment amount must be positive');

    const paymentNumber = await generatePaymentNumber(organizationId);

    const payment = await prisma.kitRequestPayment.create({
      data: {
        requestId: request.id,
        organizationId,
        paymentNumber,
        amount,
        method: input.method ?? PaymentMethod.MOBILE_MONEY,
        status: 'COMPLETED',
        reference: input.reference,
        paidBy: input.paidBy,
        verifiedAt: new Date(),
      },
    });

    await prisma.kitRequest.update({ where: { id: request.id }, data: { status: 'PAID' } });

    return payment;
  }
}

export const requestService = new RequestService();
