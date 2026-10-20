import { prisma } from '../config/database';
import { parseStudentSelector, tryResolveActiveStudent } from './parent-context.service';
import { feesApi, ParentFeeSummary } from './fees-api';
import type { StudentSelector } from '../utils/student-param';

function identityCodes(
  ...values: Array<string | null | undefined | Array<string | null | undefined>>
): string[] {
  const flat = values.flat();
  return [...new Set(flat.map((v) => String(v ?? '').trim()).filter(Boolean))];
}

export class FeesService {
  async getSummary(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    const requested = parseStudentSelector(requestedStudentId);
    const student = await tryResolveActiveStudent(organizationId, parentId, requestedStudentId);
    const codes = identityCodes(student?.id, student?.shuleCode, requested.id, requested.code);
    if (!codes.length) {
      return {
        totalBilled: 0,
        totalPaid: 0,
        outstanding: 0,
        overdue: 0,
        currency: 'RWF',
        statements: [],
        payments: [],
      };
    }

    try {
      const remote = await feesApi.getParentFeeSummary(organizationId, codes);
      return this.mapRemote(remote);
    } catch (error) {
      console.warn(
        `[fees] School Fees module unreachable (${(error as Error).message}); falling back to local data`
      );
      return student ? this.fallbackLocal(student.id) : {
        totalBilled: 0,
        totalPaid: 0,
        outstanding: 0,
        overdue: 0,
        currency: 'RWF',
        statements: [],
        payments: [],
      };
    }
  }

  async getTransactions(
    organizationId: string,
    parentId: string,
    query: { studentId?: string; studentCode?: string; academicYear?: string; term?: string; allChildren?: string }
  ) {
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId, student: { organizationId } },
      include: { student: true },
    });
    const children = links.map((l) => l.student);
    const all = query.allChildren === '1' || query.allChildren === 'true' || (!query.studentId && !query.studentCode);
    const selected = all
      ? children
      : children.filter(
          (s) =>
            s.id === query.studentId ||
            s.shuleCode === query.studentCode ||
            s.shuleCode === query.studentId ||
            s.id === query.studentCode
        );
    const codes = identityCodes(
      ...(selected.length ? selected : children).flatMap((s) => [s.id, s.shuleCode]),
      query.studentId,
      query.studentCode
    );
    if (!codes.length) {
      return {
        currency: 'RWF',
        totalPaid: 0,
        thisTermPaid: 0,
        outstanding: 0,
        transactions: 0,
        students: children.map((s) => ({
          studentId: s.id,
          studentCode: s.shuleCode,
          studentName: `${s.firstName} ${s.lastName}`.trim(),
          className: s.className,
        })),
        years: [],
        terms: [],
        payments: [],
      };
    }

    try {
      const remote = await feesApi.getParentTransactions(
        organizationId,
        codes,
        query.academicYear,
        query.term
      );
      return {
        ...remote,
        students: children.map((s) => ({
          studentId: s.id,
          studentCode: s.shuleCode,
          studentName: `${s.firstName} ${s.lastName}`.trim(),
          className: s.className,
          academicYear: remote.students.find((r) => r.studentCode === s.shuleCode)?.academicYear,
          term: remote.students.find((r) => r.studentCode === s.shuleCode)?.term,
        })),
      };
    } catch (error) {
      console.warn(`[fees] transactions unreachable (${(error as Error).message}); using local payments`);
      const studentIds = (selected.length ? selected : children).map((s) => s.id);
      const payments = await prisma.feePayment.findMany({
        where: { organizationId, studentId: { in: studentIds } },
        include: { student: true },
        orderBy: { date: 'desc' },
      });
      return {
        currency: 'RWF',
        totalPaid: payments.reduce((s, p) => s + p.amount, 0),
        thisTermPaid: payments.reduce((s, p) => s + p.amount, 0),
        outstanding: 0,
        transactions: payments.length,
        students: children.map((s) => ({
          studentId: s.id,
          studentCode: s.shuleCode,
          studentName: `${s.firstName} ${s.lastName}`.trim(),
          className: s.className,
        })),
        years: [],
        terms: [],
        payments: payments.map((p) => ({
          id: p.id,
          transactionId: p.reference || p.id,
          date: p.date.toISOString(),
          studentId: p.studentId,
          studentCode: p.student.shuleCode,
          studentName: `${p.student.firstName} ${p.student.lastName}`.trim(),
          className: p.student.className,
          description: p.description,
          amount: p.amount,
          method: p.method,
          status: 'SUCCESSFUL',
          receiptUrl: p.receiptUrl,
          receiptNumber: p.reference,
        })),
      };
    }
  }

  async getReceipt(receiptNumber: string) {
    return feesApi.getPublicReceipt(receiptNumber);
  }

  private mapRemote(data: ParentFeeSummary) {
    return {
      branding: data.branding ?? null,
      studentName: data.studentName ?? null,
      studentCode: data.studentCode ?? null,
      className: data.className ?? null,
      academicYear: data.academicYear ?? null,
      term: data.term ?? null,
      totalBilled: data.totalBilled,
      totalPaid: data.totalPaid,
      outstanding: data.outstanding,
      overdue: data.overdue,
      currency: data.currency,
      statements: data.statements.map((s) => ({
        id: s.id,
        term: s.term,
        academicYear: s.academicYear,
        billNumber: s.billNumber,
        description: s.description,
        items: s.items ?? [],
        amount: s.amount,
        paid: s.paid,
        balance: s.balance,
        status: s.status,
        dueDate: s.dueDate ?? new Date().toISOString(),
      })),
      payments: data.payments.map((p) => ({
        id: p.id,
        date: p.date,
        description: p.description,
        amount: p.amount,
        method: p.method,
        reference: p.reference ?? '',
        receiptUrl: p.receiptUrl,
        receiptNumber: p.receiptNumber ?? p.reference,
        studentName: p.studentName,
        studentCode: p.studentCode,
        className: p.className,
        academicYear: p.academicYear,
        term: p.term,
        remainingBalance: p.remainingBalance,
        previousBalance: p.previousBalance,
        lineItems: p.lineItems ?? [],
      })),
    };
  }

  private async fallbackLocal(studentId: string) {
    const [statements, payments] = await Promise.all([
      prisma.feeStatement.findMany({ where: { studentId }, orderBy: { dueDate: 'desc' } }),
      prisma.feePayment.findMany({ where: { studentId }, orderBy: { date: 'desc' } }),
    ]);

    const totalBilled = statements.reduce((s, f) => s + f.amount, 0);
    const totalPaid = statements.reduce((s, f) => s + f.paid, 0);
    const outstanding = statements.reduce((s, f) => s + f.balance, 0);
    const now = new Date();
    const overdue = statements
      .filter((f) => f.balance > 0 && f.dueDate < now)
      .reduce((s, f) => s + f.balance, 0);

    return {
      totalBilled,
      totalPaid,
      outstanding,
      overdue,
      currency: 'RWF',
      statements: statements.map((f) => ({
        id: f.id,
        term: f.term,
        description: f.description,
        amount: f.amount,
        paid: f.paid,
        balance: f.balance,
        status: f.status,
        dueDate: f.dueDate.toISOString(),
      })),
      payments: payments.map((p) => ({
        id: p.id,
        date: p.date.toISOString(),
        description: p.description,
        amount: p.amount,
        method: p.method,
        reference: p.reference ?? '',
        receiptUrl: p.receiptUrl,
      })),
    };
  }
}

export const feesService = new FeesService();
