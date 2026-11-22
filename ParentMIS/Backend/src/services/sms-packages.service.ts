import { AppError } from '../middleware/error.middleware';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { resolveParentContext } from './parent-context.service';
import { chatSmsApi } from './chat-sms-api';
import { prisma } from '../config/database';
import { getRequestedStudent } from '../utils/student-param';

async function ctxFromReq(req: AuthenticatedRequest) {
  const organizationId = req.organizationRef!;
  const parentId = req.user!.parentId ?? req.user!.sub;
  return resolveParentContext(organizationId, parentId, getRequestedStudent(req));
}

async function parentPhones(parentId: string): Promise<string[]> {
  const parent = await prisma.parentAccount.findUnique({
    where: { id: parentId },
    select: { phone: true },
  });
  return parent?.phone ? [parent.phone] : [];
}

export class SmsPackagesService {
  async config(req: AuthenticatedRequest) {
    const ctx = await ctxFromReq(req);
    const phones = await parentPhones(ctx.parentId);
    const parentPhone = phones[0] ?? req.user?.phone ?? '';
    return chatSmsApi.config(ctx.organizationId, ctx.parentId, parentPhone);
  }

  async summary(req: AuthenticatedRequest) {
    const ctx = await ctxFromReq(req);
    const phones = await parentPhones(ctx.parentId);
    const parentPhone = phones[0] ?? req.user?.phone ?? '';
    return chatSmsApi.summary(ctx.parentId, parentPhone, phones.length ? phones : [parentPhone]);
  }

  async purchases(req: AuthenticatedRequest, status?: string) {
    const ctx = await ctxFromReq(req);
    return chatSmsApi.purchases(ctx.parentId, status);
  }

  async messages(req: AuthenticatedRequest, status?: string) {
    const ctx = await ctxFromReq(req);
    const phones = await parentPhones(ctx.parentId);
    const parentPhone = phones[0] ?? req.user?.phone ?? '';
    return chatSmsApi.messages(ctx.parentId, phones.length ? phones : [parentPhone], status);
  }

  async createPurchase(
    req: AuthenticatedRequest,
    body: {
      payerPhone: string;
      allocation: 'CHILD' | 'FAMILY';
      lines: Array<{ studentId: string; packageId: string }>;
    }
  ) {
    const ctx = await ctxFromReq(req);
    const phones = await parentPhones(ctx.parentId);
    const parentPhone = phones[0] ?? req.user?.phone ?? '';
    if (!parentPhone) throw new AppError(400, 'Parent phone not on file');

    const studentIds = body.lines.map((l) => l.studentId);
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId: ctx.parentId, studentId: { in: studentIds } },
      include: { student: true },
    });
    if (links.length !== studentIds.length) {
      throw new AppError(403, 'One or more students are not linked to your account');
    }
    const linkMap = new Map(links.map((l) => [l.studentId, l]));

    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: ctx.organizationId },
      select: { organizationName: true },
    });

    const lines = body.lines.map((l) => {
      const link = linkMap.get(l.studentId)!;
      const s = link.student;
      return {
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`.trim(),
        studentCode: s.shuleCode,
        className: s.className,
        schoolName: tenant?.organizationName ?? null,
        organizationId: s.organizationId,
        packageId: l.packageId,
      };
    });

    return chatSmsApi.createPurchase({
      parentId: ctx.parentId,
      parentPhone,
      payerPhone: body.payerPhone,
      allocation: body.allocation,
      lines,
    });
  }

  async submitPayment(req: AuthenticatedRequest, body: { purchaseId: string; momoReference: string }) {
    const ctx = await ctxFromReq(req);
    return chatSmsApi.submitPayment({
      parentId: ctx.parentId,
      purchaseId: body.purchaseId,
      momoReference: body.momoReference,
    });
  }
}

export const smsPackagesService = new SmsPackagesService();
