import { prisma } from '../config/database';
import { fetchSmStudents } from '../clients/student-management.client';
import { disciplineMarkService } from './discipline-mark.service';

export interface DisciplineOrgSettings {
  defaultMaxScore: number;
  defaultStartingScore: number;
  autoInitializeStudents: boolean;
  /** Deduct points automatically when Attendance records an absence. */
  absenceDeductionEnabled: boolean;
  absenceDeductionPoints: number;
  /** Run absence deductions automatically every day for that school day (when enabled). */
  autoAbsenceDeductionEnabled: boolean;
  /** ISO date of the last successful automatic run (per organization), used to avoid duplicates. */
  autoAbsenceLastRunDate: string | null;
  /** Deduct points automatically when Attendance records a late arrival. */
  lateDeductionEnabled: boolean;
  lateDeductionPoints: number;
}

export const ATTENDANCE_MARK_NAMES = {
  absence: 'Absence Without Permission',
  late: 'Late Coming',
} as const;

export function defaultDisciplineSettings(): DisciplineOrgSettings {
  return {
    defaultMaxScore: 100,
    defaultStartingScore: 100,
    autoInitializeStudents: true,
    absenceDeductionEnabled: true,
    absenceDeductionPoints: 4,
    autoAbsenceDeductionEnabled: false,
    autoAbsenceLastRunDate: null,
    lateDeductionEnabled: true,
    lateDeductionPoints: 2,
  };
}

function parsePoints(value: unknown, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampSettings(input: Partial<DisciplineOrgSettings>, current: DisciplineOrgSettings): DisciplineOrgSettings {
  const defaultMaxScore = Math.max(1, Math.min(1000, Math.round(input.defaultMaxScore ?? current.defaultMaxScore)));
  const defaultStartingScore = Math.max(
    0,
    Math.min(defaultMaxScore, Math.round(input.defaultStartingScore ?? current.defaultStartingScore))
  );
  const nextAutoLastRun =
    input.autoAbsenceLastRunDate === null
      ? null
      : typeof input.autoAbsenceLastRunDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.autoAbsenceLastRunDate)
        ? input.autoAbsenceLastRunDate
        : current.autoAbsenceLastRunDate;

  return {
    defaultMaxScore,
    defaultStartingScore,
    autoInitializeStudents: input.autoInitializeStudents ?? current.autoInitializeStudents,
    absenceDeductionEnabled: input.absenceDeductionEnabled ?? current.absenceDeductionEnabled,
    absenceDeductionPoints: parsePoints(input.absenceDeductionPoints, current.absenceDeductionPoints),
    autoAbsenceDeductionEnabled: input.autoAbsenceDeductionEnabled ?? current.autoAbsenceDeductionEnabled,
    autoAbsenceLastRunDate: nextAutoLastRun,
    lateDeductionEnabled: input.lateDeductionEnabled ?? current.lateDeductionEnabled,
    lateDeductionPoints: parsePoints(input.lateDeductionPoints, current.lateDeductionPoints),
  };
}

function rowToSettings(row: {
  defaultMaxScore: number;
  defaultStartingScore: number;
  autoInitializeStudents: boolean;
  absenceDeductionEnabled: boolean;
  absenceDeductionPoints: number;
  autoAbsenceDeductionEnabled: boolean;
  autoAbsenceLastRunDate: string | null;
  lateDeductionEnabled: boolean;
  lateDeductionPoints: number;
}): DisciplineOrgSettings {
  return {
    defaultMaxScore: row.defaultMaxScore,
    defaultStartingScore: row.defaultStartingScore,
    autoInitializeStudents: row.autoInitializeStudents,
    absenceDeductionEnabled: row.absenceDeductionEnabled,
    absenceDeductionPoints: row.absenceDeductionPoints,
    autoAbsenceDeductionEnabled: row.autoAbsenceDeductionEnabled,
    autoAbsenceLastRunDate: row.autoAbsenceLastRunDate ?? null,
    lateDeductionEnabled: row.lateDeductionEnabled,
    lateDeductionPoints: row.lateDeductionPoints,
  };
}

function isMissingDisciplineSettingsTable(error: unknown) {
  const e = error as { code?: string; message?: string };
  return e?.code === 'P2021' || e?.code === '42P01' || /discipline_settings|relation .* does not exist/i.test(String(e?.message ?? ''));
}

async function ensureSettingsRow(organizationId: string): Promise<DisciplineOrgSettings> {
  const tenant = await prisma.tenant.findUnique({ where: { organizationId }, select: { id: true } });
  if (!tenant) throw new Error('Tenant not found');
  try {
    const existing = await prisma.disciplineSettings.findUnique({ where: { organizationId } });
    if (existing) return rowToSettings(existing);
    const defaults = defaultDisciplineSettings();
    const created = await prisma.disciplineSettings.create({
      data: {
        organizationId,
        defaultMaxScore: defaults.defaultMaxScore,
        defaultStartingScore: defaults.defaultStartingScore,
        autoInitializeStudents: defaults.autoInitializeStudents,
        absenceDeductionEnabled: defaults.absenceDeductionEnabled,
        absenceDeductionPoints: defaults.absenceDeductionPoints,
        autoAbsenceDeductionEnabled: defaults.autoAbsenceDeductionEnabled,
        autoAbsenceLastRunDate: defaults.autoAbsenceLastRunDate,
        lateDeductionEnabled: defaults.lateDeductionEnabled,
        lateDeductionPoints: defaults.lateDeductionPoints,
      },
    });
    return rowToSettings(created);
  } catch (error) {
    // Migration 20260814230000_discipline_settings_table may not be applied yet (e.g. marked applied after BOM error).
    // Fall back to defaults so settings UI can load; writes require the table to exist.
    if (isMissingDisciplineSettingsTable(error)) return defaultDisciplineSettings();
    throw error;
  }
}

export const disciplineSettingsService = {
  async get(organizationId: string): Promise<DisciplineOrgSettings & { initializedStudents: number; totalMarks: number }> {
    try {
      await disciplineMarkService.ensureDefaults(organizationId);
    } catch {
      // best-effort; defaults below still allow UI to load during partial migration states
    }
    let settings: DisciplineOrgSettings;
    try {
      settings = await ensureSettingsRow(organizationId);
    } catch (error) {
      if (isMissingDisciplineSettingsTable(error)) settings = defaultDisciplineSettings();
      else throw error;
    }
    let initializedStudents = 0;
    let totalMarks = 0;
    try {
      [initializedStudents, totalMarks] = await Promise.all([
        prisma.studentDisciplineBalance.count({ where: { organizationId } }),
        prisma.disciplineMark.count({ where: { organizationId } }),
      ]);
    } catch {
      // ignore count failures in degraded state
    }
    return { ...settings, initializedStudents, totalMarks };
  },

  async update(organizationId: string, input: Partial<DisciplineOrgSettings>) {
    const current = await ensureSettingsRow(organizationId);
    const next = clampSettings(input, current);
    if (next.defaultStartingScore > next.defaultMaxScore) {
      throw new Error('Starting score cannot exceed maximum score');
    }

    await prisma.disciplineSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        defaultMaxScore: next.defaultMaxScore,
        defaultStartingScore: next.defaultStartingScore,
        autoInitializeStudents: next.autoInitializeStudents,
        absenceDeductionEnabled: next.absenceDeductionEnabled,
        absenceDeductionPoints: next.absenceDeductionPoints,
        autoAbsenceDeductionEnabled: next.autoAbsenceDeductionEnabled,
        autoAbsenceLastRunDate: next.autoAbsenceLastRunDate,
        lateDeductionEnabled: next.lateDeductionEnabled,
        lateDeductionPoints: next.lateDeductionPoints,
      },
      update: {
        defaultMaxScore: next.defaultMaxScore,
        defaultStartingScore: next.defaultStartingScore,
        autoInitializeStudents: next.autoInitializeStudents,
        absenceDeductionEnabled: next.absenceDeductionEnabled,
        absenceDeductionPoints: next.absenceDeductionPoints,
        autoAbsenceDeductionEnabled: next.autoAbsenceDeductionEnabled,
        autoAbsenceLastRunDate: next.autoAbsenceLastRunDate,
        lateDeductionEnabled: next.lateDeductionEnabled,
        lateDeductionPoints: next.lateDeductionPoints,
      },
    });

    await disciplineMarkService.ensureDefaults(organizationId);
    await syncAttendanceMarkPoints(organizationId, next);

    if (
      next.defaultMaxScore !== current.defaultMaxScore ||
      next.defaultStartingScore !== current.defaultStartingScore
    ) {
      await this.applyStartingScoreToAll(organizationId);
    }

    return next;
  },

  async applyStartingScoreToAll(organizationId: string) {
    const settings = await ensureSettingsRow(organizationId);
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
    const s = await ensureSettingsRow(organizationId);
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

  /** Organizations eligible for automatic daily absence deductions. */
  async listAutoAbsenceEnabled(): Promise<
    Array<{ organizationId: string; absenceDeductionEnabled: boolean; autoAbsenceLastRunDate: string | null }>
  > {
    const rows = await prisma.disciplineSettings.findMany({
      where: {
        autoAbsenceDeductionEnabled: true,
        absenceDeductionEnabled: true,
        tenant: { status: 'ACTIVE' },
      },
      select: {
        organizationId: true,
        absenceDeductionEnabled: true,
        autoAbsenceLastRunDate: true,
      },
    });
    return rows.map((r) => ({
      organizationId: r.organizationId,
      absenceDeductionEnabled: r.absenceDeductionEnabled,
      autoAbsenceLastRunDate: r.autoAbsenceLastRunDate ?? null,
    }));
  },

  async markAutoAbsenceRun(organizationId: string, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
    await ensureSettingsRow(organizationId);
    await prisma.disciplineSettings.update({
      where: { organizationId },
      data: { autoAbsenceLastRunDate: date },
    });
    return { updated: true, date };
  },
};

/** Keep the built-in attendance mark rules aligned with Settings. */
async function syncAttendanceMarkPoints(organizationId: string, settings: DisciplineOrgSettings) {
  const pairs: Array<[string, number]> = [
    [ATTENDANCE_MARK_NAMES.absence, settings.absenceDeductionPoints],
    [ATTENDANCE_MARK_NAMES.late, settings.lateDeductionPoints],
  ];
  for (const [name, points] of pairs) {
    await prisma.disciplineMark.updateMany({
      where: { organizationId, name, type: 'DEDUCTION' },
      data: { points: Math.abs(points) },
    });
  }
}
