import { prisma } from '../config/database';
import { fetchSmStudents } from '../clients/student-management.client';
import { disciplineMarkService } from './discipline-mark.service';

export interface DisciplineOrgSettings {
  defaultMaxScore: number;
  defaultStartingScore: number;
  autoInitializeStudents: boolean;
}

export function defaultDisciplineSettings(): DisciplineOrgSettings {
  return {
    defaultMaxScore: 100,
    defaultStartingScore: 100,
    autoInitializeStudents: true,
  };
}

function parseSettings(raw: unknown): DisciplineOrgSettings {
  const defaults = defaultDisciplineSettings();
  if (!raw || typeof raw !== 'object') return defaults;
  const obj = raw as Record<string, unknown>;
  const defaultMaxScore =
    typeof obj.defaultMaxScore === 'number' && obj.defaultMaxScore >= 1 && obj.defaultMaxScore <= 1000
      ? Math.round(obj.defaultMaxScore)
      : defaults.defaultMaxScore;
  const defaultStartingScore =
    typeof obj.defaultStartingScore === 'number' &&
    obj.defaultStartingScore >= 0 &&
    obj.defaultStartingScore <= defaultMaxScore
      ? Math.round(obj.defaultStartingScore)
      : Math.min(defaults.defaultStartingScore, defaultMaxScore);
  return {
    defaultMaxScore,
    defaultStartingScore,
    autoInitializeStudents:
      typeof obj.autoInitializeStudents === 'boolean'
        ? obj.autoInitializeStudents
        : defaults.autoInitializeStudents,
  };
}

export const disciplineSettingsService = {
  async get(organizationId: string): Promise<DisciplineOrgSettings & { initializedStudents: number; totalMarks: number }> {
    await disciplineMarkService.ensureDefaults(organizationId);
    const [tenant, initializedStudents, totalMarks] = await Promise.all([
      prisma.tenant.findUnique({ where: { organizationId } }),
      prisma.studentDisciplineBalance.count({ where: { organizationId } }),
      prisma.disciplineMark.count({ where: { organizationId } }),
    ]);
    const settings = parseSettings(tenant?.disciplineSettings);
    return { ...settings, initializedStudents, totalMarks };
  },

  async update(organizationId: string, input: Partial<DisciplineOrgSettings>) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    if (!tenant) throw new Error('Tenant not found');

    const current = parseSettings(tenant.disciplineSettings);
    const defaultMaxScore = input.defaultMaxScore ?? current.defaultMaxScore;
    const defaultStartingScore = Math.min(
      input.defaultStartingScore ?? current.defaultStartingScore,
      defaultMaxScore
    );

    const next: DisciplineOrgSettings = {
      defaultMaxScore: Math.max(1, Math.min(1000, Math.round(defaultMaxScore))),
      defaultStartingScore: Math.max(0, Math.round(defaultStartingScore)),
      autoInitializeStudents: input.autoInitializeStudents ?? current.autoInitializeStudents,
    };

    if (next.defaultStartingScore > next.defaultMaxScore) {
      throw new Error('Starting score cannot exceed maximum score');
    }

    await prisma.tenant.update({
      where: { organizationId },
      data: { disciplineSettings: next },
    });

    if (
      next.defaultMaxScore !== current.defaultMaxScore ||
      next.defaultStartingScore !== current.defaultStartingScore
    ) {
      await this.applyStartingScoreToAll(organizationId);
    }

    return next;
  },

  async applyStartingScoreToAll(organizationId: string) {
    const settings = parseSettings(
      (await prisma.tenant.findUnique({ where: { organizationId } }))?.disciplineSettings
    );
    const result = await prisma.studentDisciplineBalance.updateMany({
      where: { organizationId },
      data: {
        maxScore: settings.defaultMaxScore,
        currentScore: settings.defaultStartingScore,
      },
    });
    return { updated: result.count };
  },

  async getScores(organizationId: string) {
    const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
    const s = parseSettings(tenant?.disciplineSettings);
    return { maxScore: s.defaultMaxScore, startingScore: s.defaultStartingScore };
  },

  async initializeAllStudents(organizationId: string) {
    const scores = await this.getScores(organizationId);
    const students = await fetchSmStudents(organizationId, { academicYear: undefined });
    if (!students.length) {
      return { created: 0, skipped: 0, total: 0, message: 'No active students found in Student Management' };
    }

    const existing = await prisma.studentDisciplineBalance.findMany({
      where: { organizationId },
      select: { studentId: true },
    });
    const existingIds = new Set(existing.map((e) => e.studentId));

    let created = 0;
    let skipped = 0;

    for (const student of students) {
      if (existingIds.has(student.id)) {
        await prisma.studentDisciplineBalance.updateMany({
          where: { organizationId, studentId: student.id },
          data: {
            maxScore: scores.maxScore,
            studentCode: student.studentCode,
            studentName: student.fullName,
            className: student.className,
            classId: student.classId,
          },
        });
        skipped += 1;
        continue;
      }
      await prisma.studentDisciplineBalance.create({
        data: {
          organizationId,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          className: student.className,
          classId: student.classId,
          currentScore: scores.startingScore,
          maxScore: scores.maxScore,
        },
      });
      created += 1;
    }

    return { created, skipped, total: students.length };
  },

  async seedDefaultMarks(organizationId: string) {
    return disciplineMarkService.ensureDefaults(organizationId);
  },
};
