import { TimePreference, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  assertUniqueCourseCode,
  generateUniqueCourseCode,
  normalizeCourseCode,
  type CourseCodeMode,
} from '../utils/course-code.utils';

type CourseUpsertFields = {
  courseCode?: string | null;
  codeMode?: CourseCodeMode;
  color?: string | null;
  priority?: number;
  periodsPerWeek?: number;
  requiresLab?: boolean;
  prefersDoublePeriod?: boolean;
  timePreference?: TimePreference;
  customWindowStart?: string | null;
  customWindowEnd?: string | null;
  schedulingRules?: Prisma.InputJsonValue;
  isCore?: boolean;
};

const TIME_PREFERENCES = new Set<string>(['ANY', 'MORNING', 'AFTERNOON', 'CUSTOM']);

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function pickCourseFields(raw: Record<string, unknown>): CourseUpsertFields {
  const fields: CourseUpsertFields = {};
  if (raw.courseCode !== undefined) fields.courseCode = raw.courseCode as string | null;
  if (raw.codeMode === 'AUTOMATIC' || raw.codeMode === 'MANUAL') fields.codeMode = raw.codeMode;
  if (raw.color !== undefined) fields.color = raw.color as string | null;
  const priority = asFiniteNumber(raw.priority);
  if (priority !== undefined) fields.priority = Math.round(priority);
  const periodsPerWeek = asFiniteNumber(raw.periodsPerWeek);
  if (periodsPerWeek !== undefined) fields.periodsPerWeek = Math.max(0, Math.round(periodsPerWeek));
  const requiresLab = asBoolean(raw.requiresLab);
  if (requiresLab !== undefined) fields.requiresLab = requiresLab;
  const prefersDoublePeriod = asBoolean(raw.prefersDoublePeriod);
  if (prefersDoublePeriod !== undefined) fields.prefersDoublePeriod = prefersDoublePeriod;
  if (typeof raw.timePreference === 'string' && TIME_PREFERENCES.has(raw.timePreference)) {
    fields.timePreference = raw.timePreference as TimePreference;
  }
  if (raw.customWindowStart !== undefined) fields.customWindowStart = raw.customWindowStart as string | null;
  if (raw.customWindowEnd !== undefined) fields.customWindowEnd = raw.customWindowEnd as string | null;
  if (raw.schedulingRules !== undefined && raw.schedulingRules !== null) {
    fields.schedulingRules = raw.schedulingRules as Prisma.InputJsonValue;
  }
  const isCore = asBoolean(raw.isCore);
  if (isCore !== undefined) fields.isCore = isCore;
  return fields;
}

export class CourseConfigService {
  async list(organizationId: string) {
    const rows = await prisma.timetableCourseConfig.findMany({
      where: { organizationId },
      orderBy: [{ priority: 'desc' }, { subjectName: 'asc' }],
    });

    for (const row of rows) {
      if (!row.courseCode) {
        const code = await generateUniqueCourseCode(organizationId, row.subjectName, row.id);
        await prisma.timetableCourseConfig.update({
          where: { id: row.id },
          data: { courseCode: code, codeMode: row.codeMode || 'AUTOMATIC' },
        });
        row.courseCode = code;
      }
    }

    return rows;
  }

  async get(organizationId: string, subjectName: string) {
    const config = await prisma.timetableCourseConfig.findFirst({
      where: { organizationId, subjectName },
      orderBy: { createdAt: 'asc' },
    });
    if (!config) {
      const courseCode = await generateUniqueCourseCode(organizationId, subjectName);
      return prisma.timetableCourseConfig.create({
        data: { organizationId, subjectName, courseCode, codeMode: 'AUTOMATIC' },
      });
    }
    return config;
  }

  async getById(organizationId: string, id: string) {
    const row = await prisma.timetableCourseConfig.findFirst({
      where: { organizationId, id },
    });
    if (!row) throw new AppError(404, 'Course config not found');
    return this.ensureCourseCode(row);
  }

  /** Avoid unique-constraint failures when saving courses that were never backfilled with a code. */
  private async ensureCourseCode<T extends { id: string; organizationId: string; subjectName: string; courseCode: string | null; codeMode: string }>(
    row: T
  ): Promise<T> {
    if (row.courseCode?.trim()) return row;
    const courseCode = await generateUniqueCourseCode(row.organizationId, row.subjectName, row.id);
    await prisma.timetableCourseConfig.update({
      where: { id: row.id },
      data: { courseCode, codeMode: row.codeMode || 'AUTOMATIC' },
    });
    return { ...row, courseCode, codeMode: row.codeMode || 'AUTOMATIC' };
  }

  private buildPayload(
    organizationId: string,
    subjectName: string,
    fields: CourseUpsertFields,
    courseCode: string,
    codeMode: CourseCodeMode
  ): Prisma.TimetableCourseConfigUncheckedCreateInput {
    return {
      organizationId,
      subjectName,
      courseCode,
      codeMode,
      ...(fields.priority !== undefined ? { priority: fields.priority } : {}),
      ...(fields.periodsPerWeek !== undefined ? { periodsPerWeek: fields.periodsPerWeek } : {}),
      ...(fields.requiresLab !== undefined ? { requiresLab: fields.requiresLab } : {}),
      ...(fields.prefersDoublePeriod !== undefined ? { prefersDoublePeriod: fields.prefersDoublePeriod } : {}),
      ...(fields.timePreference !== undefined ? { timePreference: fields.timePreference } : {}),
      ...(fields.customWindowStart !== undefined ? { customWindowStart: fields.customWindowStart } : {}),
      ...(fields.customWindowEnd !== undefined ? { customWindowEnd: fields.customWindowEnd } : {}),
      ...(fields.schedulingRules !== undefined ? { schedulingRules: fields.schedulingRules } : {}),
      ...(fields.isCore !== undefined ? { isCore: fields.isCore } : {}),
      ...(fields.color !== undefined ? { color: fields.color } : {}),
    };
  }

  async create(organizationId: string, raw: Record<string, unknown>) {
    const subjectName = String(raw.subjectName ?? '').trim();
    if (!subjectName) throw new AppError(400, 'Course name is required');
    const fields = pickCourseFields(raw);
    const { courseCode, codeMode } = await this.resolveCourseCode(organizationId, subjectName, fields, null);
    const payload = this.buildPayload(organizationId, subjectName, fields, courseCode, codeMode);
    return prisma.timetableCourseConfig.create({ data: payload });
  }

  async updateById(organizationId: string, id: string, raw: Record<string, unknown>) {
    const existing = await this.getById(organizationId, id);
    const nextName = String(raw.subjectName ?? existing.subjectName).trim();
    if (!nextName) throw new AppError(400, 'Course name is required');
    const fields = pickCourseFields(raw);
    const { courseCode, codeMode } = await this.resolveCourseCode(
      organizationId,
      nextName,
      fields,
      existing
    );
    const payload = this.buildPayload(organizationId, nextName, fields, courseCode, codeMode);
    const { organizationId: _o, subjectName: _s, ...updateData } = payload;
    const data: Prisma.TimetableCourseConfigUpdateInput = {
      ...updateData,
      ...(nextName !== existing.subjectName ? { subjectName: nextName } : {}),
    };
    return prisma.timetableCourseConfig.update({
      where: { id: existing.id },
      data,
    });
  }

  private async resolveCourseCode(
    organizationId: string,
    subjectName: string,
    fields: CourseUpsertFields,
    existing: { id: string; courseCode: string | null; codeMode: string } | null
  ): Promise<{ courseCode: string; codeMode: CourseCodeMode }> {
    const codeMode: CourseCodeMode =
      fields.codeMode ?? (existing?.codeMode as CourseCodeMode) ?? 'AUTOMATIC';

    if (codeMode === 'MANUAL') {
      const raw = fields.courseCode ?? existing?.courseCode;
      if (!raw?.trim()) throw new AppError(400, 'Course code is required for manual mode');
      try {
        const normalized = await assertUniqueCourseCode(organizationId, raw, existing?.id);
        return { courseCode: normalized, codeMode };
      } catch (e) {
        throw new AppError(400, e instanceof Error ? e.message : 'Invalid course code');
      }
    }

    if (existing?.courseCode) {
      return { courseCode: existing.courseCode, codeMode: 'AUTOMATIC' };
    }

    const generated = await generateUniqueCourseCode(organizationId, subjectName, existing?.id);
    return { courseCode: generated, codeMode: 'AUTOMATIC' };
  }

  async upsert(organizationId: string, subjectName: string, raw: Record<string, unknown>) {
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (id) return this.updateById(organizationId, id, { ...raw, subjectName: raw.subjectName ?? subjectName });
    const existing = await prisma.timetableCourseConfig.findFirst({
      where: { organizationId, subjectName },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return this.updateById(organizationId, existing.id, { ...raw, subjectName });
    return this.create(organizationId, { ...raw, subjectName });
  }

  async suggestCode(organizationId: string, subjectName: string) {
    const code = await generateUniqueCourseCode(organizationId, subjectName);
    return { courseCode: code };
  }

  async removeById(organizationId: string, id: string) {
    await this.getById(organizationId, id);
    await prisma.timetableCourseConfig.delete({ where: { id } });
    return { deleted: true };
  }

  async removeCompleteById(organizationId: string, id: string) {
    const config = await this.getById(organizationId, id);
    const sameNameCount = await prisma.timetableCourseConfig.count({
      where: { organizationId, subjectName: config.subjectName },
    });
    const wipeLinked =
      sameNameCount <= 1
        ? [
            prisma.teacherAssignment.deleteMany({
              where: { organizationId, subjectName: config.subjectName },
            }),
            prisma.academicTimetable.deleteMany({
              where: { organizationId, subjectName: config.subjectName },
            }),
          ]
        : [];
    await prisma.$transaction([
      ...wipeLinked,
      prisma.timetableCourseConfig.delete({ where: { id: config.id } }),
    ]);
    return { deleted: true, removedLinkedData: sameNameCount <= 1 };
  }

  async remove(organizationId: string, subjectName: string) {
    const existing = await prisma.timetableCourseConfig.findFirst({
      where: { organizationId, subjectName },
      orderBy: { createdAt: 'asc' },
    });
    if (!existing) throw new AppError(404, 'Course config not found');
    await prisma.timetableCourseConfig.delete({ where: { id: existing.id } });
    return { deleted: true };
  }

  async removeComplete(organizationId: string, subjectName: string) {
    const [configCount, assignments, timetableRows] = await Promise.all([
      prisma.timetableCourseConfig.count({ where: { organizationId, subjectName } }),
      prisma.teacherAssignment.count({ where: { organizationId, subjectName } }),
      prisma.academicTimetable.count({ where: { organizationId, subjectName } }),
    ]);

    if (configCount === 0 && assignments === 0 && timetableRows === 0) {
      throw new AppError(404, 'Course not found');
    }

    await prisma.$transaction([
      prisma.teacherAssignment.deleteMany({ where: { organizationId, subjectName } }),
      prisma.academicTimetable.deleteMany({ where: { organizationId, subjectName } }),
      prisma.timetableCourseConfig.deleteMany({ where: { organizationId, subjectName } }),
    ]);

    return {
      deleted: true,
      removedAssignments: assignments,
      removedTimetableRows: timetableRows,
    };
  }

  async rename(
    organizationId: string,
    fromName: string,
    toName: string,
    raw: Record<string, unknown>
  ) {
    const trimmed = toName.trim();
    if (!trimmed) throw new AppError(400, 'Course name is required');
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';

    if (fromName === trimmed) {
      return id ? this.updateById(organizationId, id, raw) : this.upsert(organizationId, fromName, raw);
    }

    const existing = id
      ? await this.getById(organizationId, id)
      : await prisma.timetableCourseConfig.findFirst({
          where: { organizationId, subjectName: fromName },
          orderBy: { createdAt: 'asc' },
        });

    if (!existing) {
      return this.create(organizationId, { ...raw, subjectName: trimmed });
    }

    const updated = await this.updateById(organizationId, existing.id, {
      ...raw,
      subjectName: trimmed,
    });

    const remainingOldName = await prisma.timetableCourseConfig.count({
      where: { organizationId, subjectName: fromName },
    });
    if (remainingOldName === 0) {
      await prisma.$transaction([
        prisma.teacherAssignment.updateMany({
          where: { organizationId, subjectName: fromName },
          data: { subjectName: trimmed },
        }),
        prisma.academicTimetable.updateMany({
          where: { organizationId, subjectName: fromName },
          data: { subjectName: trimmed },
        }),
      ]);
    }

    return updated;
  }
}

export const courseConfigService = new CourseConfigService();
