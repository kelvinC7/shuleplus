import { randomBytes } from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { fetchTimetableClassCatalog } from '../clients/timetable.client';
import { smListClasses } from '../clients/student-management.client';
import {
  assertCanSeeAll,
  assertOwnRecord,
  currentAcademicScope,
  mergeOwnData,
} from '../middleware/academic-scope';

type SlotCourseInput = { courseName: string; subjectId?: string | null; courseCode?: string | null; teacherName?: string | null };

type SlotInput = {
  examDate: string;
  session: 'MORNING' | 'AFTERNOON';
  sessionCode?: string;
  sessionName?: string;
  courseName: string;
  /** Part-3 multi-course: simple list of course names for one session. */
  courseNames?: string[];
  /** Part-3 multi-course: rich course list for one session. */
  courses?: SlotCourseInput[];
  startTime: string;
  endTime: string;
};

type SessionInput = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

const DEFAULT_SESSIONS: SessionInput[] = [
  { id: 'MORNING', name: 'Morning', startTime: '08:00', endTime: '10:00' },
  { id: 'AFTERNOON', name: 'Afternoon', startTime: '14:00', endTime: '16:00' },
];

async function generateUniqueExaminationCode(organizationId: string) {
  for (let i = 0; i < 10; i++) {
    const code = `EX-${randomBytes(3).toString('hex').toUpperCase()}`;
    const exists = await prisma.classExaminationTimetable.findFirst({
      where: { examinationCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  return `EX-${Date.now().toString(36).toUpperCase()}`;
}

function toDateKey(value: Date | string) {
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function atNoonUtc(value: Date | string) {
  return new Date(`${toDateKey(value)}T12:00:00.000Z`);
}

function datesBetween(start: string, end: string, excludeWeekends: boolean) {
  const [sy, sm, sd] = toDateKey(start).split('-').map(Number);
  const [ey, em, ed] = toDateKey(end).split('-').map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const last = new Date(Date.UTC(ey, em - 1, ed));
  if (last < cur) throw new AppError(400, 'End date must be on or after start date');
  const out: string[] = [];
  while (cur <= last) {
    const dow = cur.getUTCDay();
    if (!excludeWeekends || (dow !== 0 && dow !== 6)) {
      out.push(cur.toISOString().slice(0, 10));
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function parseMinutes(t: string) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((t || '').trim());
  if (!m) throw new AppError(400, `Invalid time: ${t}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

function normalizeClass(s: string) {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

async function findClassCourses(organizationId: string, classId: string, academicYear: string, term: string) {
  const [classes, catalog] = await Promise.all([
    smListClasses(organizationId).catch(() => [] as any[]),
    fetchTimetableClassCatalog(organizationId, { academicYear, term }).catch(() => []),
  ]);
  const cls = (Array.isArray(classes) ? classes : []).find((c: any) => c.id === classId);
  const className = cls?.label || [cls?.name, cls?.stream].filter(Boolean).join(' ').trim() || '';
  const targetNorm = normalizeClass(className);
  const match = (Array.isArray(catalog) ? catalog : []).find((c: any) => {
    if (c.classId && c.classId === classId) return true;
    if (targetNorm && normalizeClass(c.className || '') === targetNorm) return true;
    if (c.stream && targetNorm && normalizeClass(`${c.level} ${c.stream}`) === targetNorm) return true;
    return false;
  });
  const courses = (match?.courses ?? []).map((c: any) => ({
    subjectName: c.subjectName,
    courseCode: c.courseCode ?? null,
    teacherName: c.teacherName ?? null,
  })).filter((c: any) => c.subjectName);
  const seen = new Set<string>();
  const unique = courses.filter((c: any) => {
    const k = c.subjectName.trim().toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { className: className || match?.className || '', courses: unique };
}

function normalizeSessions(sessions?: SessionInput[]) {
  const configured = Array.isArray(sessions) && sessions.length ? sessions : DEFAULT_SESSIONS;
  const seen = new Set<string>();
  const seenNames = new Set<string>();
  const result = configured.map((session) => {
    const id = String(session?.id || '').trim();
    const name = String(session?.name || '').trim();
    if (!id || !name) throw new AppError(400, 'Each examination session needs an ID and name');
    if (id.length > 80 || name.length > 80) throw new AppError(400, 'Examination session IDs and names must be 80 characters or fewer');
    if (seen.has(id)) throw new AppError(400, `Duplicate examination session: ${name}`);
    const normalizedName = name.toLocaleLowerCase();
    if (seenNames.has(normalizedName)) throw new AppError(400, `Duplicate examination session name: ${name}`);
    seen.add(id);
    seenNames.add(normalizedName);
    const startTime = String(session?.startTime || '').trim();
    const endTime = String(session?.endTime || '').trim();
    if (parseMinutes(endTime) <= parseMinutes(startTime)) {
      throw new AppError(400, `End time must be after start time for ${name}`);
    }
    return { id, name, startTime, endTime };
  });
  if (result.length > 12) throw new AppError(400, 'A timetable can have at most 12 examination sessions');
  const ordered = result.sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));
  for (let index = 1; index < ordered.length; index += 1) {
    if (parseMinutes(ordered[index - 1].endTime) > parseMinutes(ordered[index].startTime)) {
      throw new AppError(400, `${ordered[index - 1].name} and ${ordered[index].name} sessions overlap`);
    }
  }
  return ordered;
}

function sessionPeriod(startTime: string): 'MORNING' | 'AFTERNOON' {
  return parseMinutes(startTime) < 12 * 60 ? 'MORNING' : 'AFTERNOON';
}

function normalizeSlotCourses(slot: SlotInput): SlotCourseInput[] {
  let courses: SlotCourseInput[] = [];
  if (Array.isArray(slot.courses) && slot.courses.length) {
    courses = slot.courses.map((c) => ({ courseName: String(c?.courseName || '').trim(), subjectId: c?.subjectId ?? null, courseCode: c?.courseCode ?? null, teacherName: c?.teacherName ?? null })).filter((c) => c.courseName);
  } else if (Array.isArray(slot.courseNames) && slot.courseNames.length) {
    courses = slot.courseNames.map((n) => ({ courseName: String(n || '').trim() })).filter((c) => c.courseName);
  } else if (slot.courseName && String(slot.courseName).trim()) {
    courses = [{ courseName: String(slot.courseName).trim() }];
  }
  const seen = new Set<string>();
  const out: SlotCourseInput[] = [];
  for (const c of courses) {
    const k = c.courseName.toLowerCase();
    if (seen.has(k)) throw new AppError(409, `Duplicate course in the same session: ` + c.courseName);
    seen.add(k);
    out.push(c);
  }
  return out;
}

function validateSlots(slots: SlotInput[], sessions: SessionInput[], startDate: string, endDate: string, excludeWeekends: boolean) {
  const start = toDateKey(startDate);
  const end = toDateKey(endDate);
  const byDay = new Map<string, SlotInput[]>();
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const scheduledCourses = new Set<string>();
  for (const slot of slots) {
    const sessionCode = slot.sessionCode || slot.session;
    const session = sessionsById.get(sessionCode);
    if (!session) throw new AppError(400, `Unknown examination session: ${sessionCode}`);
    const day = toDateKey(slot.examDate);
    if (day < start || day > end) throw new AppError(400, `Exam date ${day} is outside the selected range`);
    if (excludeWeekends) {
      const [y, m, d] = day.split('-').map(Number);
      const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      if (weekday === 0 || weekday === 6) throw new AppError(400, `Weekend examination is not allowed for ${day}`);
    }
    const courses = normalizeSlotCourses(slot);
    for (const course of courses) {
      const courseKey = course.courseName.toLowerCase();
      if (scheduledCourses.has(courseKey)) throw new AppError(409, `Duplicate examination course: ${course.courseName}`);
      scheduledCourses.add(courseKey);
    }
    const courseLabel = courses.length ? courses.map((c) => c.courseName).join(', ') : (slot.sessionName?.trim() || 'Free session');
    const startMinutes = parseMinutes(slot.startTime);
    const endMinutes = parseMinutes(slot.endTime);
    if (endMinutes <= startMinutes) throw new AppError(400, `End time must be after start time for ${courseLabel} on ${day}`);
    const daySlots = byDay.get(day) || [];
    if (daySlots.some((existing) => (existing.sessionCode || existing.session) === sessionCode)) {
      throw new AppError(409, `Duplicate ${session.name} session on ${day}`);
    }
    daySlots.push({ ...slot, session: sessionPeriod(slot.startTime), sessionCode, sessionName: session.name });
    byDay.set(day, daySlots);
  }
  for (const [day, daySlots] of byDay) {
    const sorted = daySlots.slice().sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));
    for (let index = 1; index < sorted.length; index += 1) {
      if (parseMinutes(sorted[index - 1].endTime) > parseMinutes(sorted[index].startTime)) {
        throw new AppError(409, `Examination sessions overlap on ${day}`);
      }
    }
  }
  return slots.map((slot) => {
    const session = sessionsById.get(slot.sessionCode || slot.session)!;
    const courses = normalizeSlotCourses(slot);
    const freeLabel = String(slot.courseName || '').trim() || 'Free Session';
    return {
      ...slot,
      session: sessionPeriod(slot.startTime),
      sessionCode: session.id,
      sessionName: session.name,
      courseName: courses[0]?.courseName ?? freeLabel,
      courses,
    };
  });
}

export class ExaminationTimetableService {
  async listExaminationTypes(organizationId: string, params: { academicYear?: string; term?: string; name?: string; status?: string }) {
    const name = params.name?.trim();
    const where: any = {
      organizationId,
      ...(params.academicYear ? { academicYear: params.academicYear } : {}),
      ...(params.term ? { term: params.term } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(name ? { OR: [{ name: { contains: name, mode: 'insensitive' } }, { code: { contains: name, mode: 'insensitive' } }] } : {}),
    };
    return prisma.examinationType.findMany({
      where: mergeOwnData(where),
      orderBy: [{ academicYear: 'desc' }, { term: 'asc' }, { name: 'asc' }],
    });
  }

  async createExaminationType(
    organizationId: string,
    body: { name: string; code?: string; description?: string; academicYear: string; term: string; status?: string },
    createdBy?: string,
  ) {
    const name = String(body.name || '').trim();
    const code = body.code != null && String(body.code).trim() !== '' ? String(body.code).trim() : null;
    const academicYear = String(body.academicYear || '').trim();
    const term = String(body.term || '').trim();
    const status = body.status ? String(body.status).trim().toUpperCase() : 'ACTIVE';
    if (!name || !academicYear || !term) throw new AppError(400, 'name, academicYear and term are required');
    if (status !== 'ACTIVE' && status !== 'INACTIVE') throw new AppError(400, 'status must be ACTIVE or INACTIVE');
    try {
      return await prisma.examinationType.create({
        data: {
          organizationId,
          name,
          code,
          status,
          academicYear,
          term,
          description: body.description?.trim() || null,
          createdBy: createdBy || null,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new AppError(409, 'An examination type with this name/code already exists for the selected academic year and term');
      throw e;
    }
  }

  async getExaminationType(id: string, organizationId: string) {
    const row = await prisma.examinationType.findFirst({ where: mergeOwnData({ id, organizationId }) });
    if (!row) throw new AppError(404, 'Examination type not found');
    const [timetableCount, sessionCount, listCount] = await Promise.all([
      prisma.classExaminationTimetable.count({ where: { examinationTypeId: id, organizationId } }),
      prisma.classExaminationSlot.count({ where: { timetable: { examinationTypeId: id, organizationId } } }),
      prisma.examinationList.count({ where: { examinationTypeId: id, organizationId } }),
    ]);
    return { ...row, counts: { timetables: timetableCount, sessions: sessionCount, examinationLists: listCount } };
  }

  async updateExaminationType(
    id: string,
    organizationId: string,
    body: { name?: string; code?: string | null; description?: string | null; academicYear?: string; term?: string; status?: string },
  ) {
    const existing = await prisma.examinationType.findFirst({ where: mergeOwnData({ id, organizationId }) });
    if (!existing) throw new AppError(404, 'Examination type not found');
    assertOwnRecord(existing.createdBy, 'examination type');
    const data: Record<string, unknown> = {};
    if (body.name != null) {
      const name = String(body.name).trim();
      if (!name) throw new AppError(400, 'name cannot be empty');
      data.name = name;
    }
    if (body.code !== undefined) data.code = body.code != null && String(body.code).trim() !== '' ? String(body.code).trim() : null;
    if (body.description !== undefined) data.description = body.description != null && String(body.description).trim() !== '' ? String(body.description).trim() : null;
    if (body.academicYear != null) {
      const y = String(body.academicYear).trim();
      if (!y) throw new AppError(400, 'academicYear cannot be empty');
      data.academicYear = y;
    }
    if (body.term != null) {
      const t = String(body.term).trim();
      if (!t) throw new AppError(400, 'term cannot be empty');
      data.term = t;
    }
    if (body.status != null) {
      const status = String(body.status).trim().toUpperCase();
      if (status !== 'ACTIVE' && status !== 'INACTIVE') throw new AppError(400, 'status must be ACTIVE or INACTIVE');
      data.status = status;
    }
    try {
      return await prisma.examinationType.update({ where: { id }, data });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new AppError(409, 'An examination type with this name/code already exists for the selected academic year and term');
      throw e;
    }
  }

  /** Part-2.4/2.5 dashboard stats. */
  async examinationTypeStats(organizationId: string, params: { academicYear?: string; term?: string; name?: string }) {
    const types = await this.listExaminationTypes(organizationId, params);
    const ids = types.map((t) => t.id);
    const [timetables, sessions, lists] = await Promise.all([
      prisma.classExaminationTimetable.count({ where: { organizationId, ...(ids.length ? { examinationTypeId: { in: ids } } : { examinationTypeId: { in: [] } }) } }),
      ids.length ? prisma.classExaminationSlot.count({ where: { timetable: { organizationId, examinationTypeId: { in: ids } } } }) : 0,
      ids.length ? prisma.examinationList.count({ where: { organizationId, examinationTypeId: { in: ids } } }) : 0,
    ]);
    const years = new Set(types.map((t) => t.academicYear).filter(Boolean));
    return {
      totalExaminationTypes: types.length,
      activeExaminationTypes: types.filter((t) => String(t.status).toUpperCase() === 'ACTIVE').length,
      totalExaminationTimetables: timetables,
      totalExaminationSessions: sessions,
      totalExaminationLists: lists,
      academicYearsCovered: years.size,
    };
  }

  /** Part-2.4 table rows incl. dependent-record counts. */
  async examinationTypeRows(organizationId: string, params: { academicYear?: string; term?: string; name?: string }) {
    const types = await this.listExaminationTypes(organizationId, params);
    return Promise.all(
      types.map(async (t) => {
        const [timetableCount, sessionCount, listCount] = await Promise.all([
          prisma.classExaminationTimetable.count({ where: { examinationTypeId: t.id, organizationId } }),
          prisma.classExaminationSlot.count({ where: { timetable: { examinationTypeId: t.id, organizationId } } }),
          prisma.examinationList.count({ where: { examinationTypeId: t.id, organizationId } }),
        ]);
        return {
          id: t.id,
          name: t.name,
          code: t.code ?? null,
          description: t.description ?? null,
          academicYear: t.academicYear,
          term: t.term,
          status: String(t.status || 'ACTIVE').toUpperCase(),
          createdBy: t.createdBy ?? null,
          createdAt: t.createdAt,
          numberOfTimetables: timetableCount,
          numberOfExaminationSessions: sessionCount,
          numberOfExaminationLists: listCount,
        };
      }),
    );
  }

  /**
   * Part-2.5 / requirement 5: cascading deletion in ONE transaction.
   * Deletes examination timetables, slots(sessions), slot-courses, examination lists,
   * rooms, allocations, classes, invigilator assignments, attendance, then the type.
   */
  async deleteExaminationType(id: string, organizationId: string) {
    // Deleting a type cascades to every user's timetables/lists for that type.
    assertCanSeeAll('delete examination types');
    return prisma.$transaction(async (tx) => {
      const type = await tx.examinationType.findFirst({ where: { id, organizationId }, select: { id: true } });
      if (!type) throw new AppError(404, 'Examination type not found');

      const timetables = await tx.classExaminationTimetable.findMany({ where: { examinationTypeId: id, organizationId }, select: { id: true } });
      const timetableIds = timetables.map((t) => t.id);

      const lists = await tx.examinationList.findMany({
        where: { organizationId, OR: [{ examinationTypeId: id }, ...(timetableIds.length ? [{ examinationTimetableId: { in: timetableIds } }] : [])] },
        select: { id: true },
      });
      const listIds = lists.map((l) => l.id);

      const removed = {
        timetables: timetableIds.length,
        sessions: 0,
        examinationLists: listIds.length,
        roomAllocations: 0,
        invigilatorAssignments: 0,
      };

      if (listIds.length) {
        removed.invigilatorAssignments += await tx.examinationInvigilatorAssignment.deleteMany({ where: { examinationListId: { in: listIds } } }).then((r) => r.count);
        await tx.examinationAttendance.deleteMany({ where: { examinationListId: { in: listIds } } });
        removed.roomAllocations += await tx.examinationAllocation.deleteMany({ where: { listId: { in: listIds } } }).then((r) => r.count);
        await tx.examinationListRoom.deleteMany({ where: { listId: { in: listIds } } });
        await tx.examinationListClass.deleteMany({ where: { listId: { in: listIds } } });
        await tx.examinationList.deleteMany({ where: { id: { in: listIds } } });
      }

      if (timetableIds.length) {
        removed.invigilatorAssignments += await tx.examinationInvigilatorAssignment.deleteMany({ where: { examinationTimetableId: { in: timetableIds } } }).then((r) => r.count);
        removed.sessions += await tx.classExaminationSlot.deleteMany({ where: { timetableId: { in: timetableIds } } }).then((r) => r.count);
        // Clear dangling list links on any lists still referencing removed timetables.
        await tx.examinationList.updateMany({ where: { examinationTimetableId: { in: timetableIds } }, data: { examinationTimetableId: null } });
        await tx.classExaminationTimetable.deleteMany({ where: { id: { in: timetableIds } } });
      }

      await tx.examinationType.delete({ where: { id } });
      return { deleted: true, id, ...removed };
    });
  }

  async context(organizationId: string, params: { classId: string; academicYear: string; term: string; examinationTypeId?: string }) {
    if (!params.classId || !params.academicYear || !params.term) {
      throw new AppError(400, 'classId, academicYear and term are required');
    }
    const { className, courses } = await findClassCourses(organizationId, params.classId, params.academicYear, params.term);
    const [examinationTypes, timetable] = await Promise.all([
      this.listExaminationTypes(organizationId, { academicYear: params.academicYear, term: params.term }),
      prisma.classExaminationTimetable.findFirst({
        where: mergeOwnData({
          organizationId,
          classId: params.classId,
          academicYear: params.academicYear,
          term: params.term,
          ...(params.examinationTypeId ? { examinationTypeId: params.examinationTypeId } : {}),
        }),
        include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }], include: { courses: true } }, examinationType: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return { classId: params.classId, className, academicYear: params.academicYear, term: params.term, courses, examinationTypes, timetable };
  }

  async list(organizationId: string, params: { academicYear?: string; term?: string; classId?: string; examinationTypeId?: string }) {
    return prisma.classExaminationTimetable.findMany({
      where: mergeOwnData({
        organizationId,
        ...(params.academicYear ? { academicYear: params.academicYear } : {}),
        ...(params.term ? { term: params.term } : {}),
        ...(params.classId ? { classId: params.classId } : {}),
        ...(params.examinationTypeId ? { examinationTypeId: params.examinationTypeId } : {}),
      }),
      include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }], include: { courses: true } }, examinationType: true },
      orderBy: [{ className: 'asc' }],
    });
  }

  async getById(id: string, organizationId: string) {
    const row = await prisma.classExaminationTimetable.findFirst({
      where: mergeOwnData({ id, organizationId }),
      include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }], include: { courses: true } }, examinationType: true },
    });
    if (!row) throw new AppError(404, 'Examination timetable not found');
    return row;
  }

  async impact(id: string, organizationId: string) {
    const tt = await prisma.classExaminationTimetable.findFirst({
      where: mergeOwnData({ id, organizationId }),
      select: { id: true, examinationCode: true },
    });
    if (!tt) throw new AppError(404, 'Examination timetable not found');
    const [lists, assignments] = await Promise.all([
      prisma.examinationList.count({ where: { organizationId, examinationTimetableId: id } }),
      prisma.examinationInvigilatorAssignment.count({ where: { organizationId, examinationTimetableId: id } }),
    ]);
    const warnings: string[] = [];
    if (lists > 0) warnings.push(`${lists} examination list(s) are linked to this timetable and may need review/regeneration if the schedule changes.`);
    if (assignments > 0) warnings.push(`${assignments} invigilator assignment(s) depend on this examination schedule and may become inconsistent.`);
    return { timetableId: id, linkedLists: lists, linkedInvigilatorAssignments: assignments, hasImpact: lists > 0 || assignments > 0, warnings };
  }

  async generate(organizationId: string, body: {
    classId: string;
    academicYear: string;
    term: string;
    examinationTypeId?: string;
    startDate: string;
    endDate: string;
    excludeWeekends?: boolean;
    sessions?: SessionInput[];
  }) {
    if (!body.classId || !body.academicYear || !body.term || !body.startDate || !body.endDate) {
      throw new AppError(400, 'classId, academicYear, term, startDate and endDate are required');
    }
    const days = datesBetween(body.startDate, body.endDate, !!body.excludeWeekends);
    if (!days.length) throw new AppError(400, 'No examination days available in the selected range');
    const sessions = normalizeSessions(body.sessions);
    const { className, courses } = await findClassCourses(organizationId, body.classId, body.academicYear, body.term);
    if (!courses.length) throw new AppError(400, 'No courses found for this class in the existing class timetable');

    const slots: SlotInput[] = [];
    let i = 0;
    for (const day of days) {
      for (const session of sessions) {
        if (i >= courses.length) break;
        slots.push({
          examDate: day,
          session: sessionPeriod(session.startTime),
          sessionCode: session.id,
          sessionName: session.name,
          courseName: courses[i].subjectName,
          startTime: session.startTime,
          endTime: session.endTime,
        });
        i += 1;
      }
      if (i >= courses.length) break;
    }
    if (i < courses.length) {
      throw new AppError(400, `Not enough examination sessions for all courses. ${courses.length - i} course(s) could not be scheduled.`);
    }

    const examType = body.examinationTypeId ? await prisma.examinationType.findFirst({ where: mergeOwnData({ id: body.examinationTypeId, organizationId }) }) : null;
    if (body.examinationTypeId && !examType) throw new AppError(404, 'Examination type not found');
    const existing = await prisma.classExaminationTimetable.findFirst({
      where: mergeOwnData({
        organizationId,
        classId: body.classId,
        academicYear: body.academicYear,
        term: body.term,
        examinationTypeId: body.examinationTypeId || null,
      }),
      select: { id: true, examinationCode: true },
    });

    return {
      id: existing?.id ?? null,
      examinationCode: existing?.examinationCode ?? null,
      examinationTypeId: body.examinationTypeId || null,
      examinationTypeName: examType?.name || null,
      classId: body.classId,
      className,
      name: `${className} ${examType ? examType.name + ' ' : ''}${body.term} ${body.academicYear} Examination`,
      academicYear: body.academicYear,
      term: body.term,
      startDate: body.startDate,
      endDate: body.endDate,
      excludeWeekends: !!body.excludeWeekends,
      sessions,
      slots,
      generated: true,
      persisted: false,
    };
  }

  async save(organizationId: string, body: {
    id?: string;
    classId: string;
    className?: string;
    name?: string;
    examinationTypeId?: string;
    academicYear: string;
    term: string;
    startDate: string;
    endDate: string;
    excludeWeekends?: boolean;
    sessions?: SessionInput[];
    slots: SlotInput[];
    confirmImpact?: boolean;
  }) {
    if (!body.classId || !body.academicYear || !body.term || !body.startDate || !body.endDate) {
      throw new AppError(400, 'classId, academicYear, term, startDate and endDate are required');
    }
    const sessions = normalizeSessions(body.sessions);
    const validSlots = validateSlots(body.slots || [], sessions, body.startDate, body.endDate, !!body.excludeWeekends);
    let className = body.className?.trim() || '';
    if (!className) {
      const classes = await smListClasses(organizationId).catch(() => [] as any[]);
      const cls = (Array.isArray(classes) ? classes : []).find((c: any) => c.id === body.classId);
      className = cls?.label || [cls?.name, cls?.stream].filter(Boolean).join(' ').trim();
    }
    if (!className) throw new AppError(400, 'Class not found');

    const examType = body.examinationTypeId ? await prisma.examinationType.findFirst({ where: mergeOwnData({ id: body.examinationTypeId, organizationId }) }) : null;
    if (body.examinationTypeId && !examType) throw new AppError(404, 'Examination type not found');
    const existing = body.id
      ? await prisma.classExaminationTimetable.findFirst({ where: mergeOwnData({ id: body.id, organizationId }) })
      : await prisma.classExaminationTimetable.findFirst({
          where: mergeOwnData({
            organizationId,
            classId: body.classId,
            academicYear: body.academicYear,
            term: body.term,
            examinationTypeId: body.examinationTypeId || null,
          }),
        });
    if (body.id && !existing) throw new AppError(404, 'Examination timetable not found');
    if (existing) assertOwnRecord(existing.createdBy, 'examination timetable');

    if (existing && !body.confirmImpact) {
      const [linkedLists, linkedAssignments] = await Promise.all([
        prisma.examinationList.count({ where: { organizationId, examinationTimetableId: existing.id } }),
        prisma.examinationInvigilatorAssignment.count({ where: { organizationId, examinationTimetableId: existing.id } }),
      ]);
      if (linkedLists > 0 || linkedAssignments > 0) {
        const err: any = new AppError(409, 'This timetable has dependent examination lists/invigilator assignments. Confirm to proceed with changes.');
        err.details = {
          requiresConfirmation: true,
          linkedLists,
          linkedInvigilatorAssignments: linkedAssignments,
          warnings: [
            ...(linkedLists ? [`${linkedLists} examination list(s) are linked to this timetable.`] : []),
            ...(linkedAssignments ? [`${linkedAssignments} invigilator assignment(s) depend on this timetable and may need review.`] : []),
          ],
        };
        throw err;
      }
    }

    const startDate = atNoonUtc(body.startDate);
    const endDate = atNoonUtc(body.endDate);
    const slotsData = validSlots.map((s) => ({
      slot: {
        examDate: atNoonUtc(s.examDate),
        session: s.session,
        sessionCode: s.sessionCode!,
        sessionName: s.sessionName!,
        courseName: s.courseName.trim(),
        startTime: s.startTime.trim(),
        endTime: s.endTime.trim(),
      },
      courses: (s.courses ?? []).map((c) => ({
        courseName: c.courseName.trim(),
        subjectId: c.subjectId ?? null,
        courseCode: c.courseCode ?? null,
        teacherName: c.teacherName ?? null,
      })),
    }));
    const name = (body.name || `${className} ${examType ? examType.name + ' ' : ''}${body.term} ${body.academicYear} Examination`).trim();

    if (existing) {
      return prisma.$transaction(async (tx) => {
        const examinationCode = existing.examinationCode || await generateUniqueExaminationCode(organizationId);
        await tx.classExaminationTimetable.update({
          where: { id: existing.id },
          data: {
            examinationCode,
            name,
            className,
            examinationTypeId: body.examinationTypeId || null,
            startDate,
            endDate,
            excludeWeekends: !!body.excludeWeekends,
            sessions,
          },
        });
        await tx.classExaminationSlot.deleteMany({ where: { timetableId: existing.id } });
        for (const s of slotsData) {
          await tx.classExaminationSlot.create({
            data: { timetableId: existing.id, ...s.slot, courses: { create: s.courses } },
          });
        }
        // keep linked list snapshots in sync (basic); invigilator assignments may need review after schedule changes
        await tx.examinationList.updateMany({
          where: { examinationTimetableId: existing.id },
          data: { examinationCode, examinationName: name, academicYear: body.academicYear, term: body.term, startDate, endDate },
        });
        return tx.classExaminationTimetable.findUnique({
          where: { id: existing.id },
          include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }], include: { courses: true } }, examinationType: true },
        });
      });
    }

    const examinationCode = await generateUniqueExaminationCode(organizationId);
    return prisma.$transaction(async (tx) => {
      const created = await tx.classExaminationTimetable.create({
        data: {
          organizationId,
          examinationCode,
          name,
          classId: body.classId,
          className,
          examinationTypeId: body.examinationTypeId || null,
          academicYear: body.academicYear,
          term: body.term,
          startDate,
          endDate,
          excludeWeekends: !!body.excludeWeekends,
          sessions,
          createdBy: currentAcademicScope()?.userId ?? null,
        },
      });
      for (const s of slotsData) {
        await tx.classExaminationSlot.create({
          data: { timetableId: created.id, ...s.slot, courses: { create: s.courses } },
        });
      }
      return tx.classExaminationTimetable.findUnique({
        where: { id: created.id },
        include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }], include: { courses: true } }, examinationType: true },
      });
    });
  }

  /**
   * Part-4: copy an existing timetable to a new class in ONE transaction.
   * Original is preserved; new timetable gets a fresh id + examination code.
   * Caller may review/modify sessions, courses, dates before saving.
   */
  async copy(id: string, organizationId: string, body: {
    classId: string;
    className?: string;
    name?: string;
    academicYear?: string;
    term?: string;
    startDate?: string;
    endDate?: string;
    examinationTypeId?: string | null;
    excludeWeekends?: boolean;
    sessions?: SessionInput[];
    slots?: SlotInput[];
  }) {
    return prisma.$transaction(async (tx) => {
      const src = await tx.classExaminationTimetable.findFirst({
        where: mergeOwnData({ id, organizationId }),
        include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }], include: { courses: true } } },
      });
      if (!src) throw new AppError(404, 'Examination timetable not found');

      const classId = String(body.classId || '').trim();
      if (!classId) throw new AppError(400, 'A destination classId is required');
      if (classId === src.classId) throw new AppError(400, 'Destination class must be different from the original class');

      let className = body.className?.trim() || '';
      if (!className) {
        const classes = await smListClasses(organizationId).catch(() => [] as any[]);
        const cls = (Array.isArray(classes) ? classes : []).find((c: any) => c.id === classId);
        className = cls?.label || [cls?.name, cls?.stream].filter(Boolean).join(' ').trim() || '';
      }
      if (!className) throw new AppError(400, 'Destination class not found');

      const academicYear = (body.academicYear ?? src.academicYear).trim();
      const term = (body.term ?? src.term).trim();
      const startDate = body.startDate ?? toDateKey(src.startDate);
      const endDate = body.endDate ?? toDateKey(src.endDate);
      const excludeWeekends = body.excludeWeekends ?? src.excludeWeekends;
      const examinationTypeId = body.examinationTypeId !== undefined ? (body.examinationTypeId || null) : (src.examinationTypeId || null);
      if (examinationTypeId) {
        const t = await tx.examinationType.findFirst({ where: { id: examinationTypeId, organizationId }, select: { id: true } });
        if (!t) throw new AppError(404, 'Examination type not found');
      }

      const sessions = normalizeSessions(
        body.sessions ?? (Array.isArray(src.sessions) ? (src.sessions as unknown as SessionInput[]) : DEFAULT_SESSIONS),
      );

      const sourceSlots: SlotInput[] = body.slots?.length
        ? body.slots
        : src.slots.map((s) => ({
            examDate: toDateKey(s.examDate),
            session: s.session,
            sessionCode: s.sessionCode,
            sessionName: s.sessionName,
            courseName: s.courseName,
            courses: (s.courses ?? []).map((c) => ({ courseName: c.courseName, subjectId: c.subjectId, courseCode: c.courseCode, teacherName: c.teacherName })),
            startTime: s.startTime,
            endTime: s.endTime,
          }));

      const validSlots = validateSlots(sourceSlots, sessions, startDate, endDate, !!excludeWeekends);
      const examinationCode = await generateUniqueExaminationCode(organizationId);
      const name = (body.name ?? `${className} ${src.name ?? `${src.term} ${src.academicYear} Examination`}`).trim();

      const created = await tx.classExaminationTimetable.create({
        data: {
          organizationId,
          examinationCode,
          name,
          classId,
          className,
          examinationTypeId,
          academicYear,
          term,
          startDate: atNoonUtc(startDate),
          endDate: atNoonUtc(endDate),
          excludeWeekends: !!excludeWeekends,
          sessions,
          createdBy: currentAcademicScope()?.userId ?? null,
        },
      });

      for (const s of validSlots) {
        await tx.classExaminationSlot.create({
          data: {
            timetableId: created.id,
            examDate: atNoonUtc(s.examDate),
            session: s.session,
            sessionCode: s.sessionCode!,
            sessionName: s.sessionName!,
            courseName: s.courseName.trim(),
            startTime: s.startTime.trim(),
            endTime: s.endTime.trim(),
            courses: { create: (s.courses ?? []).map((c) => ({ courseName: c.courseName.trim(), subjectId: c.subjectId ?? null, courseCode: c.courseCode ?? null, teacherName: c.teacherName ?? null })) },
          },
        });
      }

      return tx.classExaminationTimetable.findUnique({
        where: { id: created.id },
        include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }], include: { courses: true } }, examinationType: true },
      });
    });
  }
  async remove(id: string, organizationId: string, opts?: { confirmImpact?: boolean }) {
    const existing = await prisma.classExaminationTimetable.findFirst({ where: mergeOwnData({ id, organizationId }) });
    if (!existing) throw new AppError(404, 'Examination timetable not found');
    assertOwnRecord(existing.createdBy, 'examination timetable');
    const impact = await this.impact(id, organizationId);
    const hasImpact = (impact.linkedLists || 0) > 0 || (impact.linkedInvigilatorAssignments || 0) > 0;
    if (hasImpact && !opts?.confirmImpact) {
      const err: any = new AppError(409, 'This examination timetable has dependent records. Confirm deletion to continue.');
      err.details = { requiresConfirmation: true, ...impact, warnings: impact.warnings };
      throw err;
    }
    await prisma.classExaminationTimetable.delete({ where: { id } });
    return { deleted: true, id };
  }
}

export const examinationTimetableService = new ExaminationTimetableService();



