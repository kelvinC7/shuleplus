import { prisma } from '../config/database';
import { disciplineMarkService } from './discipline-mark.service';
import { parentNotificationService } from './parent-notification.service';
import { computeScoreAfter, signedPoints, studentBalanceService } from './student-balance.service';

function nextCaseNumber(existing: string[]) {
  const year = new Date().getFullYear();
  const prefix = `DC-${year}-`;
  const nums = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const disciplineCaseService = {
  async list(
    organizationId: string,
    filters?: { className?: string; studentCode?: string; status?: string; search?: string }
  ) {
    const q = filters?.search?.trim();
    return prisma.disciplineCase.findMany({
      where: {
        organizationId,
        ...(filters?.className ? { className: { equals: filters.className, mode: 'insensitive' } } : {}),
        ...(filters?.studentCode ? { studentCode: filters.studentCode } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(q
          ? {
              OR: [
                { studentName: { contains: q, mode: 'insensitive' } },
                { caseNumber: { contains: q, mode: 'insensitive' } },
                { studentCode: { contains: q, mode: 'insensitive' } },
                { markName: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { mark: true },
      orderBy: [{ incidentDate: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async stats(organizationId: string) {
    const monthStart = startOfMonth();
    const [total, thisMonth, pending, resolved, deductions] = await Promise.all([
      prisma.disciplineCase.count({ where: { organizationId } }),
      prisma.disciplineCase.count({ where: { organizationId, createdAt: { gte: monthStart } } }),
      prisma.disciplineCase.count({ where: { organizationId, status: { in: ['Open', 'Under Review', 'Pending'] } } }),
      prisma.disciplineCase.count({ where: { organizationId, status: { in: ['Closed', 'Resolved'] } } }),
      prisma.disciplineCase.findMany({
        where: { organizationId, appliedPoints: { lt: 0 } },
        select: { appliedPoints: true },
      }),
    ]);
    const pointsDeducted = deductions.reduce((sum, r) => sum + (r.appliedPoints ?? 0), 0);
    return { total, thisMonth, pending, resolved, pointsDeducted };
  },

  async seedSamples(organizationId: string, userId: string) {
    await disciplineMarkService.ensureDefaults(organizationId);
    const count = await prisma.disciplineCase.count({ where: { organizationId } });
    if (count > 0) return { seeded: false };

    const marks = await prisma.disciplineMark.findMany({ where: { organizationId, status: 'Active' }, take: 2 });
    const existing = await prisma.disciplineCase.findMany({ where: { organizationId }, select: { caseNumber: true } });

    const samples = [
      { studentName: 'John Doe', studentCode: 'STU001', className: 'S4 MPC', mark: marks[0] },
      { studentName: 'Jane Smith', studentCode: 'STU002', className: 'S5 MEG', mark: marks[1] ?? marks[0] },
    ];

    for (const sample of samples) {
      if (!sample.mark) continue;
      const applied = signedPoints(sample.mark.type, sample.mark.points);
      await this.create(organizationId, userId, {
        studentName: sample.studentName,
        studentCode: sample.studentCode,
        className: sample.className,
        markId: sample.mark.id,
        description: sample.mark.description ?? undefined,
        status: 'Open',
      });
    }

    return { seeded: true };
  },

  async create(
    organizationId: string,
    userId: string,
    input: {
      studentId?: string;
      studentName: string;
      studentCode?: string;
      className: string;
      classId?: string;
      academicYear?: string;
      markId?: string;
      customCaseName?: string;
      category?: string;
      severity?: string;
      status?: string;
      incidentDate?: string;
      incidentTime?: string;
      location?: string;
      description?: string;
      appliedPoints?: number;
      allowMarkOverride?: boolean;
      actionsTaken?: string[];
      actionNotes?: string;
      notifyParent?: boolean;
      notifyMethods?: string[];
      evidence?: unknown;
      witnesses?: unknown;
    }
  ) {
    await disciplineMarkService.ensureDefaults(organizationId);

    let mark = input.markId ? await disciplineMarkService.getById(organizationId, input.markId) : null;
    let markName = mark?.name ?? input.customCaseName ?? 'Other';
    let defaultPoints = mark ? signedPoints(mark.type, mark.points) : 0;
    let appliedPoints = input.appliedPoints ?? defaultPoints;

    if (mark && !input.allowMarkOverride && input.appliedPoints != null && input.appliedPoints !== defaultPoints) {
      appliedPoints = defaultPoints;
    }

    if (mark && input.appliedPoints == null) {
      appliedPoints = defaultPoints;
    }

    if (!mark && input.customCaseName) {
      markName = input.customCaseName;
      appliedPoints = input.appliedPoints ?? -2;
    }

    const studentId = input.studentId ?? `manual-${input.studentCode ?? Date.now()}`;
    const { scoreBefore, scoreAfter } = input.studentId
      ? await studentBalanceService.applyCasePoints(organizationId, studentId, appliedPoints, {
          studentCode: input.studentCode,
          studentName: input.studentName,
          className: input.className,
          classId: input.classId,
        })
      : { scoreBefore: null as number | null, scoreAfter: null as number | null };

    const existing = await prisma.disciplineCase.findMany({ where: { organizationId }, select: { caseNumber: true } });
    const caseNumber = nextCaseNumber(existing.map((e) => e.caseNumber));

    const row = await prisma.disciplineCase.create({
      data: {
        organizationId,
        caseNumber,
        createdBy: userId,
        studentId: input.studentId ?? null,
        studentName: input.studentName,
        studentCode: input.studentCode,
        className: input.className,
        classId: input.classId,
        academicYear: input.academicYear,
        markId: mark?.id,
        markName,
        customCaseName: input.customCaseName,
        category: mark?.category ?? input.category ?? 'Conduct',
        severity: input.severity ?? (Math.abs(appliedPoints) >= 8 ? 'High' : Math.abs(appliedPoints) >= 4 ? 'Medium' : 'Low'),
        status: input.status ?? 'Open',
        incidentDate: input.incidentDate ? new Date(input.incidentDate) : new Date(),
        incidentTime: input.incidentTime,
        location: input.location,
        description: input.description,
        appliedPoints,
        defaultPoints,
        scoreBefore,
        scoreAfter,
        actionsTaken: input.actionsTaken ?? [],
        actionNotes: input.actionNotes,
        notifyParent: input.notifyParent ?? false,
        notifyMethods: input.notifyMethods ?? [],
        evidence: input.evidence ?? undefined,
        witnesses: input.witnesses ?? undefined,
      },
      include: { mark: true },
    });

    if (mark) {
      await prisma.disciplineMark.update({
        where: { id: mark.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    if (input.notifyParent && input.studentId && (input.notifyMethods?.length ?? 0) > 0) {
      void parentNotificationService
        .notifyDisciplineCase(
          organizationId,
          {
            id: row.id,
            caseNumber: row.caseNumber,
            studentId: input.studentId,
            studentName: row.studentName,
            studentCode: row.studentCode,
            className: row.className,
            markName: row.markName ?? markName,
            appliedPoints,
            scoreBefore,
            scoreAfter,
            incidentDate: row.incidentDate,
            description: row.description,
          },
          input.notifyMethods ?? []
        )
        .catch((err) => console.warn('[Discipline] Parent notification failed', err));
    }

    return row;
  },

  async update(
    organizationId: string,
    id: string,
    input: Partial<{
      studentName: string;
      studentCode: string;
      className: string;
      category: string;
      severity: string;
      status: string;
      incidentDate: string;
      description: string;
      actionNotes: string;
    }>
  ) {
    const row = await prisma.disciplineCase.findFirst({ where: { id, organizationId } });
    if (!row) throw new Error('Case not found');
    return prisma.disciplineCase.update({
      where: { id },
      data: {
        studentName: input.studentName ?? row.studentName,
        studentCode: input.studentCode ?? row.studentCode,
        className: input.className ?? row.className,
        category: input.category ?? row.category,
        severity: input.severity ?? row.severity,
        status: input.status ?? row.status,
        incidentDate: input.incidentDate ? new Date(input.incidentDate) : row.incidentDate,
        description: input.description ?? row.description,
        actionNotes: input.actionNotes ?? row.actionNotes,
        resolvedAt: input.status === 'Closed' || input.status === 'Resolved' ? new Date() : row.resolvedAt,
      },
      include: { mark: true },
    });
  },

  async remove(organizationId: string, id: string) {
    const row = await prisma.disciplineCase.findFirst({ where: { id, organizationId } });
    if (!row) throw new Error('Case not found');
    await prisma.disciplineCase.delete({ where: { id } });
    return { id };
  },

  async notify(organizationId: string, id: string, notifyMethods?: string[]) {
    const row = await prisma.disciplineCase.findFirst({ where: { id, organizationId }, include: { mark: true } });
    if (!row) throw new Error('Case not found');
    if (!row.studentId) throw new Error('Case has no linked student to notify');
    const methods = notifyMethods?.length ? notifyMethods : ['SMS', 'InApp'];
    return parentNotificationService.notifyDisciplineCase(
      organizationId,
      {
        id: row.id,
        caseNumber: row.caseNumber,
        studentId: row.studentId,
        studentName: row.studentName,
        studentCode: row.studentCode,
        className: row.className,
        markName: row.markName ?? 'Discipline case',
        appliedPoints: row.appliedPoints ?? 0,
        scoreBefore: row.scoreBefore ?? 0,
        scoreAfter: row.scoreAfter ?? 0,
        incidentDate: row.incidentDate,
        description: row.description,
      },
      methods
    );
  },

  async previewScore(organizationId: string, studentId: string, appliedPoints: number) {
    const profile = await studentBalanceService.getProfile(organizationId, studentId);
    const scoreBefore = profile.currentScore ?? 100;
    const maxScore = profile.maxScore ?? 100;
    const scoreAfter = computeScoreAfter(scoreBefore, appliedPoints, maxScore);
    return {
      scoreBefore,
      scoreAfter,
      maxScore,
      exceedsAvailable: appliedPoints < 0 && scoreBefore + appliedPoints < 0,
      clampedToZero: appliedPoints < 0 && scoreBefore + appliedPoints < 0,
    };
  },
};
