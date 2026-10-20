import { Prisma, ScholarshipType } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { seedService } from './seed.service';
import { parentMisClient } from '../clients/parent-mis.client';
import { structureService } from './structure.service';
import { studentManagementClient } from '../clients/student-management.client';

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : Number(v);
}

async function ensureCategories(organizationId: string) {
  await seedService.ensureFeeCategories(organizationId);
}

const TYPE_MAP: Record<string, ScholarshipType> = {
  FULL: ScholarshipType.FINANCIAL_AID,
  PARTIAL: ScholarshipType.FINANCIAL_AID,
  MERIT: ScholarshipType.MERIT,
  ACADEMIC: ScholarshipType.MERIT,
  SPORTS: ScholarshipType.PRIVATE,
  NEED_BASED: ScholarshipType.NEED_BASED,
  STAFF_CHILD: ScholarshipType.PRIVATE,
  SIBLING: ScholarshipType.PRIVATE,
  GOVERNMENT: ScholarshipType.GOVERNMENT,
  SPECIAL: ScholarshipType.FINANCIAL_AID,
  CUSTOM: ScholarshipType.PRIVATE,
  GOVERNMENT_NGO: ScholarshipType.GOVERNMENT,
  NGO: ScholarshipType.NGO,
  FINANCIAL_AID: ScholarshipType.FINANCIAL_AID,
};

function mapScholarship(row: {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  type: ScholarshipType;
  academicYear: string;
  term: string | null;
  amount: Prisma.Decimal;
  allocated: Prisma.Decimal;
  remaining: Prisma.Decimal;
  coverageType: string;
  coveragePercent: Prisma.Decimal | null;
  coverageAmount: Prisma.Decimal | null;
  feeItems: unknown;
  status: string;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedReason: string | null;
  sponsor?: { name: string } | null;
}) {
  return {
    ...row,
    amount: num(row.amount),
    allocated: num(row.allocated),
    remaining: num(row.remaining),
    coveragePercent: row.coveragePercent != null ? num(row.coveragePercent) : null,
    coverageAmount: row.coverageAmount != null ? num(row.coverageAmount) : null,
  };
}

export class ScholarshipService {
  async create(organizationId: string, body: Record<string, unknown>, actorEmail?: string) {
    await ensureCategories(organizationId);
    const studentId = String(body.studentId ?? '').trim();
    const studentName = String(body.studentName ?? '').trim();
    if (!studentId || !studentName) throw new AppError(400, 'studentId and studentName are required');

    const typeKey = String(body.type ?? 'MERIT').toUpperCase();
    const type = TYPE_MAP[typeKey] ?? ScholarshipType.MERIT;
    const coverageType = String(body.coverageType ?? 'PERCENTAGE');
    const totalEligible = Number(body.totalEligible ?? body.amount ?? 0);
    let allocated = Number(body.allocated ?? 0);
    const coveragePercent = body.coveragePercent != null ? Number(body.coveragePercent) : null;

    if (coverageType === 'PERCENTAGE' && coveragePercent != null) {
      allocated = Math.round((totalEligible * coveragePercent) / 100);
    } else if (coverageType === 'FIXED') {
      allocated = Number(body.coverageAmount ?? body.allocated ?? 0);
    }

    const submitForApproval = Boolean(body.submitForApproval ?? allocated >= 50_000);
    const status = submitForApproval ? 'UNDER_REVIEW' : String(body.status ?? 'DRAFT');

    const row = await prisma.scholarship.create({
      data: {
        organizationId,
        sponsorId: body.sponsorId ? String(body.sponsorId) : null,
        studentId,
        studentName,
        className: body.className ? String(body.className) : null,
        type,
        academicYear: String(body.academicYear ?? '2025-2026'),
        term: body.term ? String(body.term) : null,
        amount: totalEligible,
        allocated,
        remaining: Math.max(totalEligible - allocated, 0),
        coverageType,
        coveragePercent: coveragePercent != null ? coveragePercent : null,
        coverageAmount: body.coverageAmount != null ? Number(body.coverageAmount) : null,
        feeItems: body.feeItems ?? undefined,
        status,
        notes: body.notes ? String(body.notes) : null,
      },
      include: { sponsor: true },
    });

    if (status === 'UNDER_REVIEW') {
      await prisma.approvalRequest.create({
        data: {
          organizationId,
          entityType: 'SCHOLARSHIP',
          entityId: row.id,
          action: 'APPROVE',
          requestedBy: actorEmail ?? 'system',
          status: 'PENDING',
          notes: `Scholarship ${allocated.toLocaleString()} RWF for ${studentName}`,
        },
      });
    }

    return mapScholarship(row);
  }

  async approve(organizationId: string, id: string, body: Record<string, unknown>, actorEmail?: string) {
    const row = await prisma.scholarship.findFirst({ where: { id, organizationId }, include: { sponsor: true } });
    if (!row) throw new AppError(404, 'Scholarship not found');
    if (row.status === 'ACTIVE') throw new AppError(400, 'Already approved');
    if (row.status === 'REJECTED') throw new AppError(400, 'Cannot approve rejected scholarship');

    const allocated = num(row.allocated);

    const updated = await prisma.$transaction(async (tx) => {
      const scholarship = await tx.scholarship.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          approvedBy: actorEmail ?? String(body.approvedBy ?? 'admin'),
          approvedAt: new Date(),
        },
        include: { sponsor: true },
      });

      const bill = await tx.studentBill.findFirst({
        where: {
          organizationId,
          OR: [{ studentId: row.studentId }, { studentCode: row.studentId }],
          balance: { gt: 0 },
        },
        orderBy: { billedAt: 'desc' },
      });
      if (bill) {
        const scholarshipAmount = num(bill.scholarshipAmount) + allocated;
        const netAmount = Math.max(num(bill.grossAmount) - scholarshipAmount - num(bill.discountAmount), 0);
        const balance = Math.max(netAmount - num(bill.paidAmount), 0);
        await tx.studentBill.update({
          where: { id: bill.id },
          data: { scholarshipAmount, netAmount, balance },
        });
      }

      await tx.approvalRequest.updateMany({
        where: { organizationId, entityType: 'SCHOLARSHIP', entityId: id, status: 'PENDING' },
        data: { status: 'APPROVED', decidedBy: actorEmail ?? 'admin', decidedAt: new Date() },
      });

      if (row.sponsorId) {
        await tx.sponsor.update({
          where: { id: row.sponsorId },
          data: {
            allocatedFund: { increment: allocated },
            remainingFund: { decrement: allocated },
          },
        });
      }

      return scholarship;
    });

    void parentMisClient.ingestFeeEvent({
      organizationId,
      studentCode: row.studentId,
      studentName: row.studentName,
      title: 'Scholarship approved',
      body: `${row.studentName} received a scholarship of ${allocated.toLocaleString()} RWF.`,
      eventType: 'SCHOLARSHIP_APPROVED',
      priority: 'IMPORTANT',
      link: '/fees',
    });

    return mapScholarship(updated);
  }

  async reject(organizationId: string, id: string, body: Record<string, unknown>, actorEmail?: string) {
    const row = await prisma.scholarship.findFirst({ where: { id, organizationId } });
    if (!row) throw new AppError(404, 'Scholarship not found');

    const updated = await prisma.scholarship.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: String(body.reason ?? 'Not approved'),
        approvedBy: actorEmail ?? null,
        approvedAt: new Date(),
      },
      include: { sponsor: true },
    });

    await prisma.approvalRequest.updateMany({
      where: { organizationId, entityType: 'SCHOLARSHIP', entityId: id, status: 'PENDING' },
      data: { status: 'REJECTED', decidedBy: actorEmail ?? 'admin', decidedAt: new Date() },
    });

    void parentMisClient.ingestFeeEvent({
      organizationId,
      studentCode: row.studentId,
      studentName: row.studentName,
      title: 'Scholarship not approved',
      body: String(body.reason ?? 'Your scholarship application was not approved.'),
      eventType: 'SCHOLARSHIP_REJECTED',
      priority: 'NORMAL',
      link: '/fees',
    });

    return mapScholarship(updated);
  }

  async previewImpact(organizationId: string, body: Record<string, unknown>) {
    await ensureCategories(organizationId);

    let totalFees = Number(body.totalFees ?? 0);
    let paid = 0;
    let studentName: string | null = null;
    let className: string | null = null;
    let feeBreakdown: Array<{ description: string; amount: number }> = [];

    const studentCode = body.studentCode ? String(body.studentCode).trim() : '';
    const academicYear = body.academicYear ? String(body.academicYear) : '';
    const term = body.term ? String(body.term) : '';

    if (studentCode && academicYear && term) {
      const sm = await studentManagementClient.lookupStudentByCode(organizationId, studentCode);
      const resolved = await structureService.resolveStudentFees({
        organizationId,
        studentCode,
        studentId: sm?.id ?? studentCode,
        studentName: sm?.fullName,
        className: sm?.className ?? undefined,
        academicYear,
        term,
        autoBill: true,
      });
      if (resolved.found) {
        totalFees = resolved.total;
        paid = resolved.paid;
        studentName = sm?.fullName ?? null;
        className = sm?.className ?? resolved.className ?? null;
        if (resolved.billId) {
          const bill = await prisma.studentBill.findFirst({
            where: { id: resolved.billId },
            include: { lineItems: true },
          });
          if (bill) {
            const paidRatio = num(bill.netAmount) > 0 ? num(bill.paidAmount) / num(bill.netAmount) : 0;
            feeBreakdown = bill.lineItems.map((li) => {
              const amount = num(li.amount);
              const linePaid = Math.round(amount * paidRatio);
              return { description: li.description, amount: Math.max(0, amount - linePaid) };
            });
          }
        }
        if (!totalFees) totalFees = resolved.remaining;
      }
    }

    const scholarship = Number(body.scholarshipAmount ?? 0);
    const outstanding = Math.max(totalFees - paid, 0);
    const appliedTo = Math.min(scholarship, outstanding);

    return {
      before: outstanding || totalFees,
      totalFees,
      paid,
      scholarship,
      newBalance: Math.max((outstanding || totalFees) - appliedTo, 0),
      parentSaves: appliedTo,
      studentName,
      className,
      feeBreakdown,
    };
  }
}

export const scholarshipService = new ScholarshipService();
