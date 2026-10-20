import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveParentContext, listLinkedStudents } from './parent-context.service';
import { feesService } from './fees.service';
import { attendanceService } from './attendance.service';
import type { StudentSelector } from '../utils/student-param';
import { fetchOrganizationAcademicSettings } from './iam-api';

function gradeFromScore(total: number): string {
  if (total >= 80) return 'A';
  if (total >= 75) return 'B+';
  if (total >= 70) return 'B';
  if (total >= 60) return 'B-';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'E';
}

export class DashboardService {
  async getSummary(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    let studentId: string;
    try {
      ({ studentId } = await resolveParentContext(organizationId, parentId, requestedStudentId));
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 403) {
        const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
        return {
          student: {
            id: '',
            firstName: '',
            lastName: '',
            fullName: 'Parent',
            class: '',
            stream: '',
            shuleCode: '',
            cardNumber: '',
            classTeacher: '',
            house: '',
            transportRoute: '',
            admissionDate: '',
            isBoarding: false,
            avatarUrl: null,
          },
          linkedStudents: [],
          attendance: {
            todayStatus: 'NONE' as const,
            checkInTime: null,
            checkOutTime: null,
            monthlyPresent: 0,
            monthlyAbsent: 0,
            monthlyLate: 0,
            monthlyExcused: 0,
            attendanceRate: 0,
          },
          academics: {
            currentGPA: 0,
            classRank: 0,
            totalStudents: 0,
            term: '',
            academicYear: '',
            topSubjects: [],
            upcomingExams: [],
            disciplineScore: 0,
          },
          fees: {
            totalBilled: 0,
            totalPaid: 0,
            outstanding: 0,
            overdue: 0,
            currency: 'RWF',
            currentTerm: '',
            feeStatements: [],
            recentPayments: [],
          },
          wallet: {
            balance: 0,
            currency: 'RWF',
            cardNumber: '',
            lastTopUp: null,
            lastTopUpAmount: null,
            recentTransactions: [],
          },
          organization: { name: tenant?.organizationName ?? 'School' },
          recentActivities: [],
          notifications: { unread: 0 },
        };
      }
      throw err;
    }

    const [student, tenant, schoolAcademic, currentTerm, grades, exams, feeStatements, feePayments, wallet, activityLogs] =
      await Promise.all([
        prisma.student.findUnique({ where: { id: studentId } }),
        prisma.tenant.findUnique({ where: { organizationId } }),
        fetchOrganizationAcademicSettings(organizationId),
        prisma.term.findFirst({
          where: { organizationId, isCurrent: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.grade.findMany({
          where: { studentId },
          include: { term: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.exam.findMany({
          where: { studentId, date: { gte: new Date() } },
          orderBy: { date: 'asc' },
          take: 5,
        }),
        prisma.feeStatement.findMany({ where: { studentId }, orderBy: { dueDate: 'desc' } }),
        prisma.feePayment.findMany({ where: { studentId }, orderBy: { date: 'desc' } }),
        prisma.wallet.findUnique({ where: { studentId } }),
        prisma.activityLog.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
      ]);

    if (!student) throw new AppError(404, 'Student profile not found');

    const notificationUnread = await prisma.notification.count({
      where: { parentId, organizationId, isRead: false },
    });

    // Attendance — live RFID taps from the Attendance module
    let monthlyPresent = 0;
    let monthlyAbsent = 0;
    let monthlyLate = 0;
    let monthlyExcused = 0;
    let attendanceRate = 0;
    let todayStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'NONE' = 'NONE';
    let checkInTime: string | null = null;
    let checkOutTime: string | null = null;
    try {
      const live = await attendanceService.getSummary(organizationId, parentId, {
        studentId: student.id,
        studentCode: student.shuleCode,
      });
      monthlyPresent = live.summary.monthlyPresent;
      monthlyAbsent = live.summary.monthlyAbsent;
      monthlyLate = live.summary.monthlyLate;
      monthlyExcused = live.summary.monthlyExcused;
      attendanceRate = live.summary.attendanceRate;
      todayStatus = live.todayStatus;
      checkInTime = live.checkInTime;
      checkOutTime = live.checkOutTime;
    } catch (err) {
      console.warn('[dashboard] live attendance unavailable', (err as Error).message);
    }

    // Academic summary (current term)
    const currentTermName =
      currentTerm?.name ??
      schoolAcademic.currentTerm ??
      grades[0]?.term.name ??
      'Current Term';
    const currentAcademicYear =
      currentTerm?.academicYear ??
      schoolAcademic.currentAcademicYear ??
      schoolAcademic.academicYears[0] ??
      '';
    const currentTermGrades = currentTerm
      ? grades.filter((g) => g.termId === currentTerm.id)
      : grades;
    const gpa = currentTermGrades.length
      ? Math.round((currentTermGrades.reduce((s, g) => s + g.total, 0) / currentTermGrades.length / 25) * 10) / 10
      : 0;
    const classRank = currentTermGrades.length
      ? Math.min(...currentTermGrades.map((g) => g.rank ?? 99))
      : 0;
    const totalStudents = 42;

    const topSubjects = currentTermGrades
      .slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((g) => ({
        subject: g.subjectName,
        ca: g.ca,
        exam: g.exam,
        total: g.total,
        grade: g.grade ?? gradeFromScore(g.total),
        rank: g.rank ?? 0,
      }));

    const disciplineRecords = await prisma.disciplineRecord.findMany({ where: { studentId } });
    const disciplineScore = Math.max(0, Math.min(100, 100 - disciplineRecords.reduce((s, r) => s + Math.abs(r.points), 0)));

    const now = new Date();

    // Fees — prefer live School Fees data for the selected child
    let totalBilled = feeStatements.reduce((s, f) => s + f.amount, 0);
    let totalPaid = feeStatements.reduce((s, f) => s + f.paid, 0);
    let outstanding = feeStatements.reduce((s, f) => s + f.balance, 0);
    let overdue = feeStatements
      .filter((f) => f.balance > 0 && f.dueDate < now)
      .reduce((s, f) => s + f.balance, 0);
    let liveStatements = feeStatements.map((f) => ({
      id: f.id,
      term: f.term,
      description: f.description,
      amount: f.amount,
      paid: f.paid,
      balance: f.balance,
      status: f.status,
      dueDate: f.dueDate.toISOString(),
    }));
    let livePayments = feePayments.map((p) => ({
      id: p.id,
      date: p.date.toISOString(),
      description: p.description,
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? '',
      receiptUrl: p.receiptUrl,
    }));
    try {
      const live = await feesService.getSummary(organizationId, parentId, {
        studentId: student.id,
        studentCode: student.shuleCode,
      });
      totalBilled = live.totalBilled;
      totalPaid = live.totalPaid;
      outstanding = live.outstanding;
      overdue = live.overdue;
      if (live.statements.length) {
        liveStatements = live.statements.map((s) => ({
          id: s.id,
          term: s.term,
          description: s.description,
          amount: s.amount,
          paid: s.paid,
          balance: s.balance,
          status: s.status as (typeof liveStatements)[number]['status'],
          dueDate: s.dueDate,
        }));
      }
      if (live.payments.length) {
        livePayments = live.payments.map((p) => ({
          id: p.id,
          date: p.date,
          description: p.description,
          amount: p.amount,
          method: p.method,
          reference: p.reference ?? '',
          receiptUrl: p.receiptUrl ?? null,
        }));
      }
    } catch (err) {
      console.warn('[dashboard] live fees unavailable', (err as Error).message);
    }

    const walletSummary = wallet
      ? {
          balance: wallet.balance,
          currency: wallet.currency,
          cardNumber: wallet.cardNumber ?? student.cardNumber ?? '',
          lastTopUp: null,
          lastTopUpAmount: null,
          recentTransactions: await prisma.walletTransaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { date: 'desc' },
            take: 5,
          }).then((txs) =>
            txs.map((t) => ({
              id: t.id,
              date: t.date.toISOString(),
              description: t.description,
              amount: t.amount,
              type: t.type,
              balanceAfter: t.balanceAfter,
            }))
          ),
        }
      : {
          balance: 0,
          currency: 'RWF',
          cardNumber: student.cardNumber ?? '',
          lastTopUp: null,
          lastTopUpAmount: null,
          recentTransactions: [],
        };

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        class: student.className,
        stream: student.stream ?? '',
        shuleCode: student.shuleCode,
        cardNumber: student.cardNumber ?? '',
        classTeacher: student.classTeacher ?? '',
        house: student.house ?? '',
        transportRoute: student.transportRoute ?? '',
        admissionDate: student.admissionDate ? student.admissionDate.toISOString() : '',
        isBoarding: student.isBoarding,
        avatarUrl: student.avatarUrl,
      },
      linkedStudents: await listLinkedStudents(parentId, organizationId),
      attendance: {
        todayStatus,
        checkInTime,
        checkOutTime,
        monthlyPresent,
        monthlyAbsent,
        monthlyLate,
        monthlyExcused,
        attendanceRate,
      },
      academics: {
        currentGPA: gpa,
        classRank,
        totalStudents,
        term: currentTermName,
        academicYear: currentAcademicYear,
        topSubjects,
        upcomingExams: exams.map((e) => ({
          id: e.id,
          subject: e.subject,
          date: e.date.toISOString(),
          type: e.type,
        })),
        disciplineScore,
      },
      fees: {
        totalBilled,
        totalPaid,
        outstanding,
        overdue,
        currency: 'RWF',
        currentTerm: currentTermName,
        feeStatements: liveStatements,
        recentPayments: livePayments,
      },
      wallet: walletSummary,
      organization: {
        name: tenant?.organizationName ?? 'Unknown School',
      },
      schoolAcademic: {
        academicYears: schoolAcademic.academicYears,
        terms: schoolAcademic.terms,
        currentAcademicYear: schoolAcademic.currentAcademicYear ?? currentAcademicYear,
        currentTerm: schoolAcademic.currentTerm ?? currentTermName,
      },
      recentActivities: activityLogs.map((log) => ({
        id: log.id,
        action: log.action,
        description: log.description ?? log.action,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
      notifications: {
        unread: notificationUnread,
      },
    };
  }
}

export const dashboardService = new DashboardService();
