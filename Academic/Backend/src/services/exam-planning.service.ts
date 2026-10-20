import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { smListClasses, smListStudents } from '../clients/student-management.client';
import { fetchTimetableClassCatalog } from '../clients/timetable.client';
import { fetchIamOrgUsers, resolveOrgAcademicPeriod } from '../clients/iam.client';
import { lookupExamEligibility } from '../clients/school-fees.client';

const MAJOR = new Set([
  'mathematics', 'math', 'physics', 'chemistry', 'biology', 'english', 'science',
]);

type RoomCfg = { name: string; capacity: number; rows?: number; cols?: number };
type AllocatedRoom = { name: string; capacity: number; studentCount?: number };

function uniqueRoomsByName(rooms: RoomCfg[]): RoomCfg[] {
  const map = new Map<string, RoomCfg>();
  for (const room of rooms) {
    const name = room.name?.trim();
    if (!name) continue;
    const capacity = Math.max(0, Number(room.capacity) || 0);
    const prev = map.get(name);
    if (!prev) {
      map.set(name, { ...room, name, capacity });
      continue;
    }
    map.set(name, {
      ...prev,
      capacity: Math.max(prev.capacity, capacity),
      cols: prev.cols || room.cols,
      rows: prev.rows || room.rows,
    });
  }
  return [...map.values()];
}
type SlotCfg = { code: string; label: string; startTime: string; endTime: string; durationMinutes: number };
type DayCfg = { date: string; morning: boolean; afternoon: boolean; evening?: boolean };
type InvigilatorSettings = {
  assignmentMode: 'AUTO' | 'MANUAL';
  dailyRotation: boolean;
  rotationFrequency: 'SESSION' | 'DAY' | 'TWO_DAYS' | 'CUSTOM';
  maxDutiesPerDay: number;
  maxConsecutiveSessions: number;
  minBreakSessions: number;
  avoidSameRoom: boolean;
  balanceDuties: boolean;
  autoReplaceAbsent: boolean;
  avoidOwnClass: boolean;
  avoidOwnSubject: boolean;
  invigilatorsPerRoom: number;
  lateGraceMinutes: number;
};

type InvigilatorPoolPerson = {
  id: string;
  name: string;
  subjects: string[];
  classes: string[];
  userId?: string | null;
  email?: string | null;
  source: 'TEACHER' | 'STAFF' | 'USER';
  hasAccount: boolean;
};

function teacherSlug(name: string) {
  return `t-${name.toLowerCase().replace(/\s+/g, '-')}`;
}

function normPersonName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const DEFAULT_SLOTS: SlotCfg[] = [
  { code: 'MORNING', label: 'Morning', startTime: '08:00', endTime: '10:00', durationMinutes: 120 },
  { code: 'AFTERNOON', label: 'Afternoon', startTime: '14:00', endTime: '16:00', durationMinutes: 120 },
];

const DEFAULT_INVIGILATOR: InvigilatorSettings = {
  assignmentMode: 'AUTO',
  dailyRotation: true,
  rotationFrequency: 'DAY',
  maxDutiesPerDay: 2,
  maxConsecutiveSessions: 2,
  minBreakSessions: 1,
  avoidSameRoom: true,
  balanceDuties: true,
  autoReplaceAbsent: true,
  avoidOwnClass: true,
  avoidOwnSubject: true,
  invigilatorsPerRoom: 2,
  lateGraceMinutes: 15,
};

function classLabel(c: { name?: string; stream?: string | null; label?: string | null }) {
  return c.label?.trim() || [c.name, c.stream].filter(Boolean).join(' ').trim();
}

function normClass(s: string) {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function isMajor(name: string) {
  return MAJOR.has(name.trim().toLowerCase());
}

/** "P6 A" / "P6A" → "P6". Streams of the same level share one exam timetable. */
export function classLevelOf(className: string) {
  const raw = className.trim();
  const spaced = raw.match(/^([A-Za-z]+)\s*(\d+)\s*([A-Za-z])?$/);
  if (spaced) return `${spaced[1].toUpperCase()}${spaced[2]}`;
  const glued = raw.match(/^([A-Za-z]+)(\d+)([A-Za-z])?$/);
  if (glued) return `${glued[1].toUpperCase()}${glued[2]}`;
  return raw.replace(/[\s_-]*[A-Za-z]$/, '').trim() || raw;
}

export function streamOf(className: string) {
  const raw = className.trim();
  const spaced = raw.match(/^[A-Za-z]+\s*\d+\s*([A-Za-z])$/);
  if (spaced) return spaced[1].toUpperCase();
  const glued = raw.match(/^[A-Za-z]+\d+([A-Za-z])$/);
  if (glued) return glued[1].toUpperCase();
  return null;
}

function isMorningSlot(slot: SlotCfg) {
  if (slot.code === 'MORNING') return true;
  if (slot.code === 'AFTERNOON' || slot.code === 'EVENING') return false;
  const hour = Number(slot.startTime.split(':')[0] ?? 12);
  return hour < 12;
}

function calendarKey(value: Date | string) {
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(value);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function atNoonUtc(value: Date | string) {
  return new Date(`${calendarKey(value)}T12:00:00.000Z`);
}

function datesBetween(start: Date | string, end: Date | string) {
  const [sy, sm, sd] = calendarKey(start).split('-').map(Number);
  const [ey, em, ed] = calendarKey(end).split('-').map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const last = new Date(Date.UTC(ey, em - 1, ed));
  const days: string[] = [];
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function slotDuration(slot: SlotCfg) {
  const [sh, sm] = slot.startTime.split(':').map(Number);
  const [eh, em] = slot.endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function includeSession() {
  return {
    classes: true,
    courses: true,
    schedules: { include: { seats: true, duties: true, attendances: true } },
    conflicts: true,
    duties: true,
  } as const;
}

export class ExamPlanningService {
  async catalog(organizationId: string, opts?: { term?: string; academicYear?: string }) {
    let warning: string | undefined;
    const period = await resolveOrgAcademicPeriod(organizationId, opts);
    const { term, academicYear } = period;
    const [smClasses, smStudents, ttResult] = await Promise.all([
      smListClasses(organizationId).catch(() => []),
      smListStudents(organizationId, { status: 'ACTIVE' }).catch(() => []),
      fetchTimetableClassCatalog(organizationId, { term, academicYear })
        .then((rows) => ({ rows, error: null as string | null }))
        .catch((e) => {
          const message = e instanceof Error ? e.message : 'unavailable';
          console.warn('[exam-planning] timetable catalog failed:', message);
          return { rows: [] as Awaited<ReturnType<typeof fetchTimetableClassCatalog>>, error: message };
        }),
    ]);
    const ttClasses = ttResult.rows;
    if (ttResult.error) {
      warning = `Courses from Smart Timetable could not be loaded (${ttResult.error}). Ensure timetable-api is running on port 4014 and Config Class is set for ${academicYear} · ${term}.`;
    } else if (!ttClasses.some((t) => (t.courses?.length ?? t.courseCount ?? 0) > 0)) {
      warning = `No Config Class courses found for ${academicYear} · ${term}. Open Smart Timetable → Config Class and confirm the same academic year and term as Organization Admin settings.`;
    }
    const students = Array.isArray(smStudents) ? smStudents : [];
    const usedTt = new Set<string>();
    const classes = (Array.isArray(smClasses) ? smClasses : []).map((c: any) => {
      const name = classLabel(c);
      const n = normClass(name);
      const tt = ttClasses.find((t) => {
        if (t.classId && t.classId === c.id) return true;
        if (normClass(t.className) === n) return true;
        if (t.stream && normClass(`${t.level} ${t.stream}`) === n) return true;
        return false;
      });
      if (tt) usedTt.add(normClass(tt.className));
      const courses = (tt?.courses ?? []).map((course) => ({
        subjectName: course.subjectName,
        durationMinutes: 120,
        teacherName: course.teacherName,
        isMajor: isMajor(course.subjectName),
      }));
      const studentCount =
        (tt?.studentCount && tt.studentCount > 0 ? tt.studentCount : 0) ||
        students.filter((s: any) => (s.classId === c.id) || normClass(String(s.className ?? '')) === n).length;
      return {
        classId: c.id,
        className: name,
        studentCount,
        courseCount: courses.length || tt?.courseCount || 0,
        courses,
      };
    });
    for (const tt of ttClasses) {
      if (!tt.courses?.length || usedTt.has(normClass(tt.className))) continue;
      classes.push({
        classId: tt.classId || `tt:${tt.className}`,
        className: tt.className,
        studentCount: tt.studentCount,
        courseCount: tt.courses.length,
        courses: tt.courses.map((course) => ({
          subjectName: course.subjectName,
          durationMinutes: 120,
          teacherName: course.teacherName,
          isMajor: isMajor(course.subjectName),
        })),
      });
    }
    if (classes.some((c) => c.courseCount > 0)) warning = undefined;
    return { classes, totalStudents: students.length, warning, academicYear, term };
  }

  async listSessions(organizationId: string, filters?: { academicYear?: string; term?: string; status?: string }) {
    return prisma.examSession.findMany({
      where: {
        organizationId,
        ...(filters?.academicYear ? { academicYear: filters.academicYear } : {}),
        ...(filters?.term ? { term: filters.term } : {}),
        ...(filters?.status ? { status: filters.status as any } : {}),
      },
      include: { _count: { select: { schedules: true, conflicts: true, classes: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSession(id: string, organizationId: string) {
    const session = await prisma.examSession.findFirst({
      where: { id, organizationId },
      include: includeSession(),
    });
    if (!session) throw new AppError(404, 'Examination session not found');
    return session;
  }

  async createSession(organizationId: string, actorId: string | undefined, data: {
    name: string;
    academicYear: string;
    term: string;
    examType: string;
    startDate: string;
    endDate: string;
    generateAutomatically?: boolean;
  }) {
    const start = atNoonUtc(data.startDate);
    const end = atNoonUtc(data.endDate);
    if (end < start) throw new AppError(400, 'End date must be after start date');
    const days: DayCfg[] = datesBetween(data.startDate, data.endDate).map((date) => ({ date, morning: true, afternoon: true }));
    const catalog = await this.catalog(organizationId, { term: data.term, academicYear: data.academicYear });
    const defaultRooms: RoomCfg[] = catalog.classes.map((_, i) => ({
      name: `Room ${String(i + 1).padStart(2, '0')}`,
      capacity: 50,
      rows: 5,
      cols: 10,
    }));

    const session = await prisma.examSession.create({
      data: {
        organizationId,
        name: data.name,
        academicYear: data.academicYear,
        term: data.term,
        examType: data.examType,
        startDate: start,
        endDate: end,
        generateAutomatically: data.generateAutomatically !== false,
        rooms: defaultRooms,
        timeSlots: DEFAULT_SLOTS,
        days,
        invigilatorSettings: DEFAULT_INVIGILATOR,
        createdBy: actorId ?? null,
      },
    });

    if (catalog.classes.length) {
      await prisma.examSessionClass.createMany({
        data: catalog.classes.map((c) => ({
          sessionId: session.id,
          classId: c.classId,
          className: c.className,
          studentCount: c.studentCount,
          selected: true,
        })),
      });
      const courseRows = catalog.classes.flatMap((c) =>
        c.courses.map((course) => ({
          sessionId: session.id,
          classId: c.classId,
          subjectName: course.subjectName,
          durationMinutes: course.durationMinutes,
          selected: true,
          isMajor: course.isMajor,
        })),
      );
      if (courseRows.length) await prisma.examSessionCourse.createMany({ data: courseRows });
    }

    await this.audit(organizationId, session.id, actorId, 'CREATE', `Created examination ${data.name}`);
    return this.getSession(session.id, organizationId);
  }

  async saveSetup(id: string, organizationId: string, actorId: string | undefined, body: {
    name?: string;
    examType?: string;
    startDate?: string;
    endDate?: string;
    maxExamsPerDay?: number;
    majorGapSessions?: number;
    classes?: Array<{ classId: string; className: string; studentCount: number; selected: boolean }>;
    courses?: Array<{ classId: string; subjectName: string; durationMinutes: number; selected: boolean; isMajor?: boolean }>;
    rooms?: RoomCfg[];
    timeSlots?: SlotCfg[];
    days?: DayCfg[];
    invigilatorSettings?: Partial<InvigilatorSettings>;
  }) {
    const existing = await prisma.examSession.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Examination session not found');

    await prisma.examSession.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        examType: body.examType ?? existing.examType,
        startDate: body.startDate ? atNoonUtc(body.startDate) : existing.startDate,
        endDate: body.endDate ? atNoonUtc(body.endDate) : existing.endDate,
        maxExamsPerDay: body.maxExamsPerDay ?? existing.maxExamsPerDay,
        majorGapSessions: body.majorGapSessions ?? existing.majorGapSessions,
        rooms: (body.rooms ?? existing.rooms) as any,
        timeSlots: (body.timeSlots ?? existing.timeSlots) as any,
        days: (body.days ?? existing.days) as any,
        invigilatorSettings: {
          ...(existing.invigilatorSettings as object),
          ...(body.invigilatorSettings ?? {}),
        } as any,
      },
    });

    if (body.classes) {
      await prisma.examSessionClass.deleteMany({ where: { sessionId: id } });
      if (body.classes.length) {
        await prisma.examSessionClass.createMany({
          data: body.classes.map((c) => ({ sessionId: id, ...c })),
        });
      }
    }
    if (body.courses) {
      await prisma.examSessionCourse.deleteMany({ where: { sessionId: id } });
      if (body.courses.length) {
        await prisma.examSessionCourse.createMany({
          data: body.courses.map((c) => ({
            sessionId: id,
            classId: c.classId,
            subjectName: c.subjectName,
            durationMinutes: c.durationMinutes,
            selected: c.selected,
            isMajor: c.isMajor ?? isMajor(c.subjectName),
          })),
        });
      }
    }

    await this.refreshReadiness(id);
    await this.audit(organizationId, id, actorId, 'SETUP', 'Updated examination setup');
    return this.getSession(id, organizationId);
  }

  async generateTimetable(id: string, organizationId: string, actorId?: string) {
    const session = await this.getSession(id, organizationId);
    const rooms = uniqueRoomsByName((session.rooms as RoomCfg[]) ?? []).filter((r) => r.name && r.capacity > 0);
    const slots = [...((session.timeSlots as SlotCfg[]) ?? DEFAULT_SLOTS)].sort(
      (a, b) => Number(isMorningSlot(b)) - Number(isMorningSlot(a)) || a.startTime.localeCompare(b.startTime),
    );
    const days = ((session.days as DayCfg[]) ?? []).filter((d) => d.morning || d.afternoon || d.evening);
    const selectedClasses = session.classes.filter((c) => c.selected);
    const selectedCourses = session.courses.filter((c) => c.selected);
    if (!selectedClasses.length) throw new AppError(400, 'Select at least one class');
    if (!selectedCourses.length) throw new AppError(400, 'Select at least one course');
    if (!rooms.length) throw new AppError(400, 'Configure examination rooms');
    if (!days.length) throw new AppError(400, 'Configure examination days');

    const timeline: Array<{ date: string; slot: SlotCfg; index: number }> = [];
    for (const day of days) {
      for (const slot of slots) {
        const enabled =
          (isMorningSlot(slot) && day.morning) ||
          (!isMorningSlot(slot) && slot.code !== 'EVENING' && day.afternoon) ||
          (slot.code === 'EVENING' && Boolean(day.evening)) ||
          (!['MORNING', 'AFTERNOON', 'EVENING'].includes(slot.code) && (isMorningSlot(slot) ? day.morning : day.afternoon));
        if (enabled) timeline.push({ date: day.date, slot, index: timeline.length });
      }
    }

    type StreamCls = { classId: string; className: string; studentCount: number; level: string };
    const streams: StreamCls[] = selectedClasses.map((c) => ({
      classId: c.classId,
      className: c.className,
      studentCount: c.studentCount,
      level: classLevelOf(c.className),
    }));

    type LevelPaper = {
      level: string;
      subjectName: string;
      durationMinutes: number;
      isMajor: boolean;
      streams: StreamCls[];
    };

    const byLevel = new Map<string, StreamCls[]>();
    for (const s of streams) {
      byLevel.set(s.level, [...(byLevel.get(s.level) ?? []), s]);
    }

    const papers: LevelPaper[] = [];
    for (const [level, levelStreams] of byLevel.entries()) {
      const ids = new Set(levelStreams.map((s) => s.classId));
      const subjects = new Map<string, { durationMinutes: number; isMajor: boolean }>();
      for (const course of selectedCourses) {
        if (!ids.has(course.classId)) continue;
        const cur = subjects.get(course.subjectName);
        subjects.set(course.subjectName, {
          durationMinutes: Math.max(cur?.durationMinutes ?? 0, course.durationMinutes),
          isMajor: Boolean(cur?.isMajor || course.isMajor || isMajor(course.subjectName)),
        });
      }
      for (const [subjectName, meta] of subjects.entries()) {
        papers.push({
          level,
          subjectName,
          durationMinutes: meta.durationMinutes,
          isMajor: meta.isMajor,
          streams: levelStreams,
        });
      }
    }
    papers.sort((a, b) => Number(b.isMajor) - Number(a.isMajor) || b.streams.reduce((n, s) => n + s.studentCount, 0) - a.streams.reduce((n, s) => n + s.studentCount, 0));

    await prisma.$transaction([
      prisma.examSchedule.deleteMany({ where: { sessionId: id } }),
      prisma.examConflict.deleteMany({ where: { sessionId: id } }),
      prisma.examInvigilatorDuty.deleteMany({ where: { sessionId: id } }),
      prisma.examSeat.deleteMany({ where: { sessionId: id } }),
      prisma.examAttendance.deleteMany({ where: { sessionId: id } }),
    ]);

    type Placed = StreamCls & {
      subjectName: string;
      isMajor: boolean;
      durationMinutes: number;
      date: string;
      slot: SlotCfg;
      rooms: Array<{ name: string; capacity: number; studentCount: number }>;
      afternoonMajor?: boolean;
    };
    const placed: Placed[] = [];
    const conflicts: Array<{ type: any; severity: any; message: string; details?: any }> = [];

    const occupancy: Record<string, Set<string>> = {};
    const classSlot: Record<string, Set<string>> = {};
    const classDayCount: Record<string, Record<string, number>> = {};
    const levelMajorIndex: Record<string, number> = {};

    function slotKey(date: string, code: string) {
      return `${date}|${code}`;
    }

    function allocate(
      remaining: RoomCfg[],
      studentCount: number,
    ): Array<{ name: string; capacity: number; studentCount: number }> | null {
      if (studentCount <= 0) {
        const spare = remaining[remaining.length - 1];
        return spare ? [{ name: spare.name, capacity: spare.capacity, studentCount: 0 }] : [];
      }
      const allocated: Array<{ name: string; capacity: number; studentCount: number }> = [];
      let left = studentCount;
      for (const room of [...remaining].sort((a, b) => b.capacity - a.capacity)) {
        if (left <= 0) break;
        if (allocated.some((r) => r.name === room.name)) continue;
        const take = Math.min(room.capacity, left);
        allocated.push({ name: room.name, capacity: room.capacity, studentCount: take });
        left -= take;
      }
      return left > 0 ? null : allocated;
    }

    for (const paper of papers) {
      const morningFirst = paper.isMajor
        ? [...timeline.filter((t) => isMorningSlot(t.slot)), ...timeline.filter((t) => !isMorningSlot(t.slot))]
        : timeline;

      let assigned = false;
      for (const cell of morningFirst) {
        const { date, slot } = cell;
        const k = slotKey(date, slot.code);
        occupancy[k] ??= new Set();
        if (slotDuration(slot) < paper.durationMinutes) continue;
        if (paper.isMajor && levelMajorIndex[paper.level] != null) {
          if (Math.abs(cell.index - levelMajorIndex[paper.level]) < session.majorGapSessions) continue;
        }

        const blocked = paper.streams.some((st) => {
          classSlot[st.classId] ??= new Set();
          classDayCount[st.classId] ??= {};
          classDayCount[st.classId][date] ??= 0;
          return classSlot[st.classId].has(k) || classDayCount[st.classId][date] >= session.maxExamsPerDay;
        });
        if (blocked) continue;

        const free = rooms.filter((r) => !occupancy[k].has(r.name));
        const plan: Array<{ stream: StreamCls; rooms: Array<{ name: string; capacity: number; studentCount: number }> }> = [];
        const usedNow = new Set<string>();
        let ok = true;
        for (const st of [...paper.streams].sort((a, b) => b.studentCount - a.studentCount)) {
          const remaining = free.filter((r) => !usedNow.has(r.name));
          const allocated = allocate(remaining, st.studentCount);
          if (!allocated) {
            ok = false;
            break;
          }
          allocated.forEach((r) => usedNow.add(r.name));
          plan.push({ stream: st, rooms: allocated });
        }
        if (!ok) continue;

        const afternoonMajor = paper.isMajor && !isMorningSlot(slot);
        for (const row of plan) {
          row.rooms.forEach((r) => occupancy[k].add(r.name));
          classSlot[row.stream.classId] ??= new Set();
          classSlot[row.stream.classId].add(k);
          classDayCount[row.stream.classId] ??= {};
          classDayCount[row.stream.classId][date] = (classDayCount[row.stream.classId][date] ?? 0) + 1;
          placed.push({
            ...row.stream,
            subjectName: paper.subjectName,
            isMajor: paper.isMajor,
            durationMinutes: paper.durationMinutes,
            date,
            slot,
            rooms: row.rooms,
            afternoonMajor,
          });
        }
        if (paper.isMajor) levelMajorIndex[paper.level] = cell.index;
        if (afternoonMajor) {
          conflicts.push({
            type: 'DAILY_LOAD',
            severity: 'WARNING',
            message: `Major paper ${paper.level} · ${paper.subjectName} was placed in the afternoon because no free morning session remained.`,
          });
        }
        assigned = true;
        break;
      }
      if (!assigned) {
        conflicts.push({
          type: 'STUDENT',
          severity: 'ERROR',
          message: `Could not place ${paper.level} · ${paper.subjectName} for all streams without a class, room or capacity conflict`,
          details: { level: paper.level, subjectName: paper.subjectName, streams: paper.streams.map((s) => s.className) },
        });
      }
    }

    if (placed.length) {
      await prisma.examSchedule.createMany({
        data: placed.map((p) => ({
          organizationId,
          sessionId: id,
          classId: p.classId,
          className: p.className,
          subjectName: p.subjectName,
          examDate: atNoonUtc(p.date),
          slotCode: p.slot.code,
          startTime: p.slot.startTime,
          endTime: p.slot.endTime,
          status: 'SCHEDULED' as const,
          rooms: p.rooms as any,
          studentCount: p.studentCount,
        })),
      });
    }

    await this.generateInvigilators(id, organizationId, actorId, true);
    const fresh = await this.getSession(id, organizationId);
    conflicts.push(...this.detectScheduleConflicts(fresh));

    if (conflicts.length) {
      await prisma.examConflict.createMany({
        data: conflicts.map((c) => ({
          organizationId,
          sessionId: id,
          type: c.type,
          severity: c.severity,
          message: c.message,
          details: c.details ?? undefined,
        })),
      });
    }

    await this.refreshReadiness(id);
    await this.audit(organizationId, id, actorId, 'GENERATE', `Generated ${placed.length} exam slots with class-level sync`);
    return this.getSession(id, organizationId);
  }

  private detectScheduleConflicts(session: Awaited<ReturnType<ExamPlanningService['getSession']>>) {
    const found: Array<{ type: any; severity: any; message: string; details?: any }> = [];
    const schedules = session.schedules ?? [];
    const bySlot = new Map<string, typeof schedules>();
    for (const s of schedules) {
      const k = `${calendarKey(s.examDate)}|${s.slotCode}`;
      bySlot.set(k, [...(bySlot.get(k) ?? []), s]);
    }
    for (const [k, rows] of bySlot.entries()) {
      const classSeen = new Map<string, string>();
      const roomSeen = new Map<string, string>();
      for (const s of rows) {
        const prev = classSeen.get(s.classId);
        if (prev) {
          found.push({
            type: 'STUDENT',
            severity: 'ERROR',
            message: `${s.className} has two exams at the same time: ${prev} and ${s.subjectName}`,
          });
        }
        classSeen.set(s.classId, s.subjectName);
        for (const room of (s.rooms ?? []) as Array<{ name: string; capacity?: number | null; studentCount: number }>) {
          const other = roomSeen.get(room.name);
          if (other) {
            found.push({
              type: 'ROOM',
              severity: 'ERROR',
              message: `${room.name} is assigned to ${other} and ${s.className} · ${s.subjectName} at the same time`,
            });
          }
          roomSeen.set(room.name, `${s.className} · ${s.subjectName}`);
          if (room.studentCount > (room.capacity ?? room.studentCount)) {
            found.push({
              type: 'CAPACITY',
              severity: 'ERROR',
              message: `${room.name} capacity (${room.capacity}) exceeded by ${s.className} (${room.studentCount} students)`,
            });
          }
        }
      }

      const dutySeen = new Map<string, string>();
      for (const s of rows) {
        const duties = (s.duties ?? []).length
          ? s.duties!
          : session.duties.filter((x) => x.scheduleId === s.id && x.slotCode === s.slotCode);
        for (const d of duties) {
          const prev = dutySeen.get(d.invigilatorId);
          if (prev && prev !== d.roomName) {
            found.push({
              type: 'INVIGILATOR',
              severity: 'ERROR',
              message: `${d.invigilatorName} is assigned to ${prev} and ${d.roomName} at the same time (${k})`,
            });
          }
          dutySeen.set(d.invigilatorId, d.roomName);
        }
      }
    }

    const levelMap = new Map<string, Set<string>>();
    for (const s of schedules) {
      const key = `${classLevelOf(s.className)}|${s.subjectName}`;
      const times = levelMap.get(key) ?? new Set<string>();
      times.add(`${calendarKey(s.examDate)}|${s.slotCode}|${s.startTime}`);
      levelMap.set(key, times);
    }
    for (const [key, times] of levelMap.entries()) {
      if (times.size > 1) {
        const [level, subject] = key.split('|');
        found.push({
          type: 'STUDENT',
          severity: 'ERROR',
          message: `${level} streams do not share the same timetable for ${subject}`,
          details: [...times],
        });
      }
    }
    return found;
  }

  async generateInvigilators(
    id: string,
    organizationId: string,
    actorId?: string,
    silent = false,
    opts?: { perRoom?: number; expandPool?: boolean },
  ) {
    const session = await this.getSession(id, organizationId);
    const settings = { ...DEFAULT_INVIGILATOR, ...(session.invigilatorSettings as object) } as InvigilatorSettings;
    const catalog = await this.catalog(organizationId, { term: session.term, academicYear: session.academicYear });
    const perRoom = Math.max(1, opts?.perRoom ?? settings.invigilatorsPerRoom);
    const fakeIds = session.duties.filter((d) => !this.isNamedInvigilator(d)).map((d) => d.id);
    const locked = session.duties.filter((d) =>
      this.isNamedInvigilator(d) && (d.locked || d.mode === 'LOCKED' || d.mode === 'MANUAL'),
    );
    const pool = (await this.invigilatorPool(session, catalog)).filter((p) => this.isNamedInvigilator(p));

    await prisma.examInvigilatorDuty.deleteMany({
      where: {
        sessionId: id,
        OR: [
          { locked: false, mode: 'AUTO' },
          ...(fakeIds.length ? [{ id: { in: fakeIds } }] : []),
        ],
      },
    });

    const used: Record<string, number> = {};
    const lastRoom: Record<string, string> = {};
    const busyAt = new Set<string>();
    for (const d of locked) {
      used[d.invigilatorId] = (used[d.invigilatorId] ?? 0) + 1;
      lastRoom[d.invigilatorId] = d.roomName;
      busyAt.add(`${d.invigilatorId}|${calendarKey(d.examDate)}|${d.slotCode}`);
    }

    type DutyRow = {
      organizationId: string;
      sessionId: string;
      scheduleId: string;
      examDate: Date;
      slotCode: string;
      roomName: string;
      invigilatorId: string;
      invigilatorName: string;
      userId: string | null;
      email: string | null;
      mode: 'AUTO';
      locked: false;
    };
    const duties: DutyRow[] = [];
    const uncovered: Array<{ className: string; subjectName: string; room: string; date: string; slot: string }> = [];
    const sorted = [...session.schedules].sort(
      (a, b) => a.examDate.getTime() - b.examDate.getTime() || a.slotCode.localeCompare(b.slotCode),
    );

    const pickFor = (
      schedule: (typeof sorted)[number],
      roomName: string,
      relax: 'strict' | 'prefer' | 'any',
    ) => {
      const dateKey = calendarKey(schedule.examDate);
      const slotBusy = `${dateKey}|${schedule.slotCode}`;
      return pool
        .filter((p) => {
          if (busyAt.has(`${p.id}|${slotBusy}`)) return false;
          if (relax === 'any') return true;
          const dayCount = [...duties, ...locked].filter(
            (d) => d.invigilatorId === p.id && calendarKey(d.examDate) === dateKey,
          ).length;
          if (dayCount >= settings.maxDutiesPerDay) return false;
          if (relax === 'strict') {
            if (settings.avoidSameRoom && lastRoom[p.id] === roomName) return false;
            if (settings.avoidOwnSubject && p.subjects.includes(schedule.subjectName)) return false;
            if (settings.avoidOwnClass && p.classes.includes(schedule.className)) return false;
          }
          return true;
        })
        .sort((a, b) => (used[a.id] ?? 0) - (used[b.id] ?? 0))[0];
    };

    for (const schedule of sorted) {
      const rooms = (schedule.rooms as Array<{ name: string; studentCount: number }>) ?? [];
      for (const room of rooms) {
        const already = locked.filter((d) => d.scheduleId === schedule.id && d.roomName === room.name);
        const needed = perRoom - already.length;
        for (let n = 0; n < needed; n++) {
          const pick = pickFor(schedule, room.name, 'strict')
            || pickFor(schedule, room.name, 'prefer')
            || pickFor(schedule, room.name, 'any');
          if (!pick) {
            uncovered.push({
              className: schedule.className,
              subjectName: schedule.subjectName,
              room: room.name,
              date: calendarKey(schedule.examDate),
              slot: schedule.slotCode,
            });
            continue;
          }
          const dateKey = calendarKey(schedule.examDate);
          duties.push({
            organizationId,
            sessionId: id,
            scheduleId: schedule.id,
            examDate: schedule.examDate,
            slotCode: schedule.slotCode,
            roomName: room.name,
            invigilatorId: pick.id,
            invigilatorName: pick.name,
            userId: pick.userId ?? null,
            email: pick.email ?? null,
            mode: 'AUTO',
            locked: false,
          });
          used[pick.id] = (used[pick.id] ?? 0) + 1;
          lastRoom[pick.id] = room.name;
          busyAt.add(`${pick.id}|${dateKey}|${schedule.slotCode}`);
        }
      }
    }

    if (duties.length) await prisma.examInvigilatorDuty.createMany({ data: duties });
    const staffing = this.invigilatorStaffing(session, pool, perRoom);
    const advice: string[] = [];
    if (staffing.shortfall > 0) {
      advice.push(
        `Need ${staffing.needed} named invigilator${staffing.needed === 1 ? '' : 's'} for the busiest session (${staffing.peakRooms} room${staffing.peakRooms === 1 ? '' : 's'} × ${perRoom} per room). You have ${staffing.available}. Add ${staffing.shortfall} more on Invigilators, or lower Invigilators per room.`,
      );
    }
    if (uncovered.length) {
      advice.push(`${uncovered.length} room slot${uncovered.length === 1 ? '' : 's'} could not be fully staffed. Add invigilators, then generate again.`);
    }
    if (!silent) {
      await this.audit(organizationId, id, actorId, 'INVIGILATORS', `Assigned ${duties.length} invigilator duties`);
      await this.refreshReadiness(id);
    }
    return { session: await this.getSession(id, organizationId), uncovered, advice, staffing };
  }

  private invigilatorStaffing(
    session: Awaited<ReturnType<ExamPlanningService['getSession']>>,
    pool: InvigilatorPoolPerson[],
    perRoom: number,
  ) {
    const named = pool.filter((p) => this.isNamedInvigilator(p));
    const needed = this.peakInvigilatorNeed(session, perRoom);
    const peakRooms = perRoom > 0 ? Math.round(needed / perRoom) : 0;
    const available = named.length;
    return {
      available,
      needed,
      perRoom,
      peakRooms,
      shortfall: Math.max(0, needed - available),
    };
  }

  private isNamedInvigilator(person: { id?: string; name?: string; invigilatorId?: string; invigilatorName?: string }) {
    const id = person.invigilatorId ?? person.id ?? '';
    const name = (person.invigilatorName ?? person.name ?? '').trim();
    return Boolean(id) && !id.startsWith('inv-extra') && !/^invigilator\s*\d+$/i.test(name);
  }

  private peakInvigilatorNeed(
    session: Awaited<ReturnType<ExamPlanningService['getSession']>>,
    perRoom: number,
  ) {
    const bySlot = new Map<string, Set<string>>();
    for (const s of session.schedules) {
      const k = `${calendarKey(s.examDate)}|${s.slotCode}`;
      const set = bySlot.get(k) ?? new Set<string>();
      for (const room of (s.rooms as Array<{ name: string }> | null) ?? []) set.add(room.name);
      bySlot.set(k, set);
    }
    let peak = 0;
    for (const rooms of bySlot.values()) peak = Math.max(peak, rooms.size);
    return peak * perRoom;
  }

  async resolveAllConflicts(id: string, organizationId: string, actorId?: string) {
    const before = await this.getSession(id, organizationId);
    const openBefore = before.conflicts.filter((c) => !c.resolved).length;
    const settings = { ...DEFAULT_INVIGILATOR, ...(before.invigilatorSettings as object) } as InvigilatorSettings;
    const advice: string[] = [];
    const actions: string[] = [];

    const hasHard = before.conflicts.some(
      (c) => !c.resolved && c.severity === 'ERROR' && ['STUDENT', 'ROOM', 'CAPACITY'].includes(c.type),
    );
    if (hasHard) {
      await this.generateTimetable(id, organizationId, actorId);
      actions.push('Regenerated the examination timetable to remove class, room and capacity clashes.');
    }

    let invig = await this.generateInvigilators(id, organizationId, actorId, true, {
      perRoom: settings.invigilatorsPerRoom,
      expandPool: false,
    });
    actions.push('Reassigned invigilators so no person is in two rooms at the same time.');

    if (invig.uncovered.length && settings.invigilatorsPerRoom > 1) {
      invig = await this.generateInvigilators(id, organizationId, actorId, true, {
        perRoom: 1,
        expandPool: false,
      });
      actions.push('Dropped to 1 invigilator per room because there were not enough named staff for 2 per room.');
    }

    const fresh = invig.session;
    const remaining = this.detectScheduleConflicts(fresh);
    if (invig.uncovered.length) {
      remaining.push({
        type: 'INVIGILATOR',
        severity: 'WARNING',
        message: `${invig.uncovered.length} room(s) still have no invigilator after auto-assignment.`,
        details: invig.uncovered.slice(0, 20),
      });
    }

    await prisma.examConflict.deleteMany({ where: { sessionId: id, resolved: false } });
    if (remaining.length) {
      await prisma.examConflict.createMany({
        data: remaining.map((c) => ({
          organizationId,
          sessionId: id,
          type: c.type,
          severity: c.severity,
          message: c.message,
          details: c.details ?? undefined,
        })),
      });
    }

    if (remaining.length) {
      const teachers = (await this.invigilatorPool(fresh, undefined)).filter((p) => this.isNamedInvigilator(p)).length;
      const peak = this.peakInvigilatorNeed(fresh, settings.invigilatorsPerRoom);
      if (invig.uncovered.length) {
        advice.push(`Not enough named teachers for every room at once (need about ${peak} people in the busiest session, ${teachers} available). Add more invigilators on the Invigilators page, or lower Invigilators per room.`);
      }
      if (remaining.some((c) => c.type === 'ROOM' || c.type === 'CAPACITY')) {
        advice.push('Add more examination rooms or increase room capacity, then click Solve all conflicts again.');
      }
      if (remaining.some((c) => c.type === 'STUDENT')) {
        advice.push('Add more exam days or morning sessions, or reduce exams per class per day, then generate again.');
      }
      if (remaining.some((c) => /afternoon/i.test(c.message))) {
        advice.push('Add more morning sessions so major papers do not spill into the afternoon.');
      }
      if (!remaining.filter((c) => c.severity === 'ERROR').length) {
        advice.push('Only warnings remain. Review them, then mark Reviewed → Approved when you accept the timetable.');
      }
    }

    await this.refreshReadiness(id);
    await this.audit(organizationId, id, actorId, 'RESOLVE_ALL', `Resolved conflicts ${openBefore} → ${remaining.length}`);
    const session = await this.getSession(id, organizationId);
    return {
      session,
      resolved: Math.max(0, openBefore - session.conflicts.filter((c) => !c.resolved).length),
      remaining: session.conflicts.filter((c) => !c.resolved).length,
      actions,
      advice,
    };
  }

  async overrideInvigilator(id: string, organizationId: string, actorId: string | undefined, body: {
    dutyId?: string;
    scheduleId: string;
    roomName: string;
    invigilatorId: string;
    invigilatorName: string;
    lock?: boolean;
  }) {
    const session = await this.getSession(id, organizationId);
    const schedule = session.schedules.find((s) => s.id === body.scheduleId);
    if (!schedule) throw new AppError(404, 'Schedule not found');
    const catalog = await this.catalog(organizationId, { term: session.term, academicYear: session.academicYear });
    const pool = (await this.invigilatorPool(session, catalog)).filter((p) => this.isNamedInvigilator(p));
    const pick = pool.find((p) => p.id === body.invigilatorId);
    if (!pick) throw new AppError(400, 'Choose a teacher from the invigilator list');
    const existing = session.duties.find((d) => d.id === body.dutyId)
      || session.duties.find((d) => d.scheduleId === body.scheduleId && d.roomName === body.roomName);
    const clash = session.duties.find((d) =>
      d.invigilatorId === body.invigilatorId
      && calendarKey(d.examDate) === calendarKey(schedule.examDate)
      && d.slotCode === schedule.slotCode
      && d.roomName !== body.roomName
      && d.id !== existing?.id
    );
    if (clash) {
      throw new AppError(409, `${pick.name} is already invigilating ${clash.roomName} at this time`);
    }
    const data = {
      organizationId,
      sessionId: id,
      scheduleId: body.scheduleId,
      examDate: schedule.examDate,
      slotCode: schedule.slotCode,
      roomName: body.roomName,
      invigilatorId: pick.id,
      invigilatorName: pick.name,
      userId: pick?.userId ?? null,
      email: pick?.email ?? null,
      mode: 'LOCKED' as const,
      locked: body.lock !== false,
    };
    if (existing) {
      await prisma.examInvigilatorDuty.update({ where: { id: existing.id }, data });
    } else {
      await prisma.examInvigilatorDuty.create({ data });
    }
    await this.audit(organizationId, id, actorId, 'INVIGILATOR_OVERRIDE', `Locked ${body.invigilatorName} on ${body.roomName}`);
    return this.getSession(id, organizationId);
  }

  async setRoomInvigilators(id: string, organizationId: string, actorId: string | undefined, body: {
    scheduleId: string;
    roomName: string;
    invigilatorIds: string[];
    lock?: boolean;
  }) {
    const session = await this.getSession(id, organizationId);
    const schedule = session.schedules.find((s) => s.id === body.scheduleId);
    if (!schedule) throw new AppError(404, 'Schedule not found');
    const ids = [...new Set((body.invigilatorIds ?? []).map((v) => String(v).trim()).filter(Boolean))];
    if (!ids.length) throw new AppError(400, 'Select at least one invigilator for this room');
    if (ids.length > 8) throw new AppError(400, 'A room can have at most 8 invigilators');

    const catalog = await this.catalog(organizationId, { term: session.term, academicYear: session.academicYear });
    const pool = (await this.invigilatorPool(session, catalog)).filter((p) => this.isNamedInvigilator(p));
    const picks = ids.map((invigilatorId) => {
      const pick = pool.find((p) => p.id === invigilatorId);
      if (!pick) throw new AppError(400, 'Choose teachers from the invigilator list');
      return pick;
    });

    const dateKey = calendarKey(schedule.examDate);
    for (const pick of picks) {
      const clash = session.duties.find((d) =>
        d.invigilatorId === pick.id
        && calendarKey(d.examDate) === dateKey
        && d.slotCode === schedule.slotCode
        && d.roomName !== body.roomName
      );
      if (clash) {
        throw new AppError(409, `${pick.name} is already invigilating ${clash.roomName} at this time`);
      }
    }

    const existing = session.duties.filter((d) =>
      d.scheduleId === body.scheduleId
      && d.roomName === body.roomName
      && calendarKey(d.examDate) === dateKey
      && d.slotCode === schedule.slotCode
    );
    if (existing.length) {
      await prisma.examInvigilatorDuty.deleteMany({ where: { id: { in: existing.map((d) => d.id) } } });
    }

    await prisma.examInvigilatorDuty.createMany({
      data: picks.map((pick) => ({
        organizationId,
        sessionId: id,
        scheduleId: body.scheduleId,
        examDate: schedule.examDate,
        slotCode: schedule.slotCode,
        roomName: body.roomName,
        invigilatorId: pick.id,
        invigilatorName: pick.name,
        userId: pick.userId ?? null,
        email: pick.email ?? null,
        mode: 'LOCKED' as const,
        locked: body.lock !== false,
      })),
    });

    await this.audit(
      organizationId,
      id,
      actorId,
      'INVIGILATOR_ROOM',
      `Set ${picks.length} invigilator${picks.length === 1 ? '' : 's'} on ${body.roomName}: ${picks.map((p) => p.name).join(', ')}`,
    );
    return this.getSession(id, organizationId);
  }

  async generateSeating(id: string, organizationId: string, actorId: string | undefined, opts?: {
    scheduleIds?: string[];
    strategy?: 'CLASS_TOGETHER' | 'MIXED' | 'ANTI_CHEAT';
  }) {
    const session = await this.getSession(id, organizationId);
    const strategy = opts?.strategy ?? 'ANTI_CHEAT';
    const schedules = opts?.scheduleIds?.length
      ? session.schedules.filter((s) => opts.scheduleIds!.includes(s.id))
      : session.schedules;
    const studentsByClass = new Map<string, Array<{ id: string; studentCode: string; fullName: string }>>();
    const studentsByName = new Map<string, Array<{ id: string; studentCode: string; fullName: string }>>();

    for (const cls of session.classes.filter((c) => c.selected)) {
      const rows = (await smListStudents(organizationId, { classId: cls.classId, className: cls.className, status: 'ACTIVE' }).catch(() => [])) as any[];
      const planned = Math.max(0, Number(cls.studentCount) || 0);
      const seen = new Set<string>();
      const mapped = (Array.isArray(rows) ? rows : []).flatMap((s) => {
        const id = String(s.id || s.studentCode || '');
        if (!id || seen.has(id)) return [];
        seen.add(id);
        return [{
          id,
          studentCode: s.studentCode || id,
          fullName: s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student',
        }];
      });
      const capped = planned > 0 ? mapped.slice(0, planned) : mapped;
      studentsByClass.set(cls.classId, capped);
      studentsByName.set(cls.className, capped);
    }

    await prisma.examSeat.deleteMany({
      where: { sessionId: id, ...(opts?.scheduleIds?.length ? { scheduleId: { in: opts.scheduleIds } } : {}) },
    });

    const sessionRooms = uniqueRoomsByName(((session.rooms as RoomCfg[]) ?? []).filter((r) => r.name && (r.capacity ?? 0) > 0));
    const roomCap = new Map(sessionRooms.map((r) => [r.name, r.capacity]));
    const roomCols = new Map(sessionRooms.map((r) => [r.name, Math.max(1, Number(r.cols) || 10)]));
    const occupancy = new Map<string, number>();
    const seats: any[] = [];
    let plannedSeats = 0;
    let assignedSeats = 0;

    for (const schedule of schedules) {
      const planned = Math.max(0, Number(schedule.studentCount) || 0);
      const roster = (studentsByClass.get(schedule.classId) ?? studentsByName.get(schedule.className) ?? [])
        .slice(0, planned || undefined);
      plannedSeats += roster.length;
      const ordered = this.arrangeExamStudents(
        roster.map((student) => ({ ...student, className: schedule.className })),
        strategy,
      );
      const allocated = ((schedule.rooms as AllocatedRoom[]) ?? []).filter((r) => r.name);
      const roomsForPaper: AllocatedRoom[] = allocated.length
        ? allocated.map((r) => ({
            name: r.name,
            capacity: roomCap.get(r.name) ?? (Number(r.capacity) || 0),
            studentCount: Number(r.studentCount) || Number(r.capacity) || 0,
          }))
        : sessionRooms.map((r) => ({ name: r.name, capacity: r.capacity, studentCount: r.capacity }));

      let remaining = ordered;
      const date = calendarKey(schedule.examDate);
      for (const room of roomsForPaper) {
        if (!remaining.length) break;
        const cap = Math.max(0, roomCap.get(room.name) ?? (Number(room.capacity) || 0));
        if (!cap) continue;
        const occKey = `${date}|${schedule.slotCode}|${room.name}`;
        const used = occupancy.get(occKey) ?? 0;
        const paperTake = Math.max(0, Number(room.studentCount) || cap);
        const take = Math.min(cap - used, paperTake, remaining.length);
        if (take <= 0) continue;
        const slice = remaining.slice(0, take);
        remaining = remaining.slice(take);
        const cols = roomCols.get(room.name) || 10;
        slice.forEach((student, i) => {
          const idx = used + i;
          const row = Math.floor(idx / cols);
          const col = (idx % cols) + 1;
          const rowLabel = String.fromCharCode(65 + (row % 26));
          seats.push({
            organizationId,
            sessionId: id,
            scheduleId: schedule.id,
            studentId: student.id,
            studentCode: student.studentCode,
            fullName: student.fullName,
            className: schedule.className,
            roomName: room.name,
            seatCode: `${rowLabel}${col}`,
            rowLabel,
            colIndex: col,
          });
        });
        occupancy.set(occKey, used + take);
        assignedSeats += take;
      }
    }
    if (seats.length) {
      const chunk = 500;
      for (let i = 0; i < seats.length; i += chunk) {
        await prisma.examSeat.createMany({ data: seats.slice(i, i + chunk), skipDuplicates: true });
      }
    }
    await prisma.examConflict.deleteMany({ where: { sessionId: id, type: 'SEATING' } });
    const unassigned = Math.max(0, plannedSeats - assignedSeats);
    if (unassigned > 0) {
      await prisma.examConflict.create({
        data: {
          organizationId,
          sessionId: id,
          type: 'SEATING',
          severity: 'WARNING',
          message: `${unassigned} of ${plannedSeats} planned students were not seated. Each room is filled only up to the capacity you set (${sessionRooms.map((r) => `${r.name}: ${r.capacity}`).join(', ') || 'no rooms'}).`,
        },
      });
    }
    await this.refreshReadiness(id);
    await this.audit(organizationId, id, actorId, 'SEATING', `Assigned ${seats.length} seats (${strategy})`);
    return this.getSession(id, organizationId);
  }

  async moveSeat(id: string, organizationId: string, actorId: string | undefined, body: {
    seatId: string;
    roomName: string;
    seatCode: string;
    swap?: boolean;
  }) {
    const seat = await prisma.examSeat.findFirst({ where: { id: body.seatId, sessionId: id, organizationId } });
    if (!seat) throw new AppError(404, 'Seat not found');
    const session = await this.getSession(id, organizationId);
    const current = session.schedules.find((s) => s.id === seat.scheduleId);
    const peerIds = session.schedules
      .filter((s) => current && s.slotCode === current.slotCode && calendarKey(s.examDate) === calendarKey(current.examDate))
      .map((s) => s.id);
    const occupied = await prisma.examSeat.findFirst({
      where: {
        sessionId: id,
        roomName: body.roomName,
        seatCode: body.seatCode,
        scheduleId: { in: peerIds.length ? peerIds : [seat.scheduleId] },
        id: { not: seat.id },
      },
    });
    if (occupied && !body.swap) throw new AppError(409, `Seat ${body.seatCode} is occupied by ${occupied.fullName}`);
    if (occupied && body.swap) {
      await prisma.examSeat.update({
        where: { id: occupied.id },
        data: { roomName: seat.roomName, seatCode: seat.seatCode, rowLabel: seat.rowLabel, colIndex: seat.colIndex },
      });
    }
    const rowLabel = body.seatCode.replace(/\d+/g, '') || 'A';
    const colIndex = parseInt(body.seatCode.replace(/\D+/g, ''), 10) || 1;
    await prisma.examSeat.update({
      where: { id: seat.id },
      data: { roomName: body.roomName, seatCode: body.seatCode, rowLabel, colIndex },
    });
    await this.audit(organizationId, id, actorId, 'SEAT_MOVE', `${seat.fullName} → ${body.roomName} ${body.seatCode}`);
    return this.getSession(id, organizationId);
  }

  async moveSchedule(id: string, organizationId: string, actorId: string | undefined, body: {
    scheduleId: string;
    examDate: string;
    slotCode: string;
  }) {
    const session = await this.getSession(id, organizationId);
    const schedule = session.schedules.find((s) => s.id === body.scheduleId);
    if (!schedule) throw new AppError(404, 'Schedule not found');
    const slot = ((session.timeSlots as SlotCfg[]) ?? DEFAULT_SLOTS).find((s) => s.code === body.slotCode);
    if (!slot) throw new AppError(400, 'Unknown time slot');
    const level = classLevelOf(schedule.className);
    const peers = session.schedules.filter(
      (s) => classLevelOf(s.className) === level && s.subjectName === schedule.subjectName,
    );
    const peerIds = new Set(peers.map((s) => s.id));
    for (const peer of peers) {
      const clash = session.schedules.find(
        (s) =>
          !peerIds.has(s.id) &&
          s.classId === peer.classId &&
          s.slotCode === body.slotCode &&
          calendarKey(s.examDate) === body.examDate,
      );
      if (clash) throw new AppError(409, `${peer.className} already has ${clash.subjectName} in that session`);
    }
    const roomNames = new Set(peers.flatMap((p) => (p.rooms as Array<{ name: string }> | null)?.map((r) => r.name) ?? []));
    const roomClash = session.schedules.find((s) => {
      if (peerIds.has(s.id)) return false;
      if (s.slotCode !== body.slotCode || calendarKey(s.examDate) !== body.examDate) return false;
      return ((s.rooms as Array<{ name: string }> | null) ?? []).some((r) => roomNames.has(r.name));
    });
    if (roomClash) throw new AppError(409, `A room is already used by ${roomClash.className} · ${roomClash.subjectName} in that session`);
    await prisma.examSchedule.updateMany({
      where: { id: { in: [...peerIds] }, sessionId: id },
      data: {
        examDate: atNoonUtc(body.examDate),
        slotCode: slot.code,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    });
    await this.audit(organizationId, id, actorId, 'MOVE', `Moved ${level} ${schedule.subjectName} for all streams`);
    return this.getSession(id, organizationId);
  }

  async publish(id: string, organizationId: string, actorId?: string) {
    const session = await this.getSession(id, organizationId);
    const blocking = session.conflicts.filter((c) => !c.resolved && c.severity === 'ERROR');
    if (blocking.length) throw new AppError(400, `${blocking.length} blocking conflicts must be resolved before publish`);
    await prisma.examSession.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    await this.audit(organizationId, id, actorId, 'PUBLISH', `Published ${session.name}`);
    return this.getSession(id, organizationId);
  }

  async updateStatus(id: string, organizationId: string, status: string, actorId?: string) {
    await this.getSession(id, organizationId);
    await prisma.examSession.update({ where: { id }, data: { status: status as any } });
    await this.audit(organizationId, id, actorId, 'STATUS', `Status → ${status}`);
    return this.getSession(id, organizationId);
  }

  async startExam(scheduleId: string, organizationId: string, actorId?: string) {
    const schedule = await prisma.examSchedule.findFirst({ where: { id: scheduleId, organizationId } });
    if (!schedule) throw new AppError(404, 'Exam not found');
    await prisma.examSchedule.update({ where: { id: scheduleId }, data: { status: 'IN_PROGRESS' } });
    await this.ensureAttendanceRows(schedule);
    await this.audit(organizationId, schedule.sessionId, actorId, 'START', `Started ${schedule.subjectName} ${schedule.className}`);
    return prisma.examSchedule.findFirst({
      where: { id: scheduleId },
      include: { attendances: true, seats: true, duties: true },
    });
  }

  async checkIn(organizationId: string, actorId: string | undefined, body: {
    scheduleId: string;
    studentId?: string;
    studentCode?: string;
    roomName?: string;
    method?: 'MANUAL' | 'QR' | 'RFID';
  }): Promise<{
    already: boolean;
    attendance: unknown;
    eligibility: Awaited<ReturnType<typeof lookupExamEligibility>>;
    message?: string;
  }> {
    const schedule = await prisma.examSchedule.findFirst({
      where: { id: body.scheduleId, organizationId },
      include: { session: true, seats: true, attendances: true },
    });
    if (!schedule) throw new AppError(404, 'Exam not found');
    let student = schedule.seats.find((s) => s.studentId === body.studentId || s.studentCode === body.studentCode)
      || schedule.attendances.find((s) => s.studentId === body.studentId || s.studentCode === body.studentCode);
    if (!student) {
      const peer = await prisma.examSeat.findFirst({
        where: {
          sessionId: schedule.sessionId,
          organizationId,
          OR: [
            body.studentId ? { studentId: body.studentId } : undefined,
            body.studentCode ? { studentCode: body.studentCode } : undefined,
          ].filter(Boolean) as any,
        },
        include: { schedule: true },
      });
      if (
        peer
        && calendarKey(peer.schedule.examDate) === calendarKey(schedule.examDate)
        && peer.schedule.slotCode === schedule.slotCode
        && peer.scheduleId !== schedule.id
      ) {
        return this.checkIn(organizationId, actorId, { ...body, scheduleId: peer.scheduleId });
      }
    }
    if (!student) throw new AppError(404, 'Student is not on this examination');
    if (body.roomName && student.roomName && body.roomName !== student.roomName) {
      throw new AppError(409, `WRONG EXAM ROOM. ${student.fullName} is assigned to ${student.roomName}, not ${body.roomName}`);
    }
    const eligibility = await lookupExamEligibility({
      organizationId,
      academicYear: schedule.session.academicYear,
      term: schedule.session.term,
      className: student.className,
      studentId: student.studentId,
      studentCode: student.studentCode,
    });
    if (eligibility.published && !eligibility.allowed) {
      const balance = Number(eligibility.balance ?? 0);
      throw new AppError(403, 'EXAMINATION ACCESS NOT AUTHORIZED', {
        code: 'EXAM_NOT_ALLOWED',
        studentName: eligibility.studentName || student.fullName,
        studentCode: eligibility.studentCode || student.studentCode,
        className: eligibility.className || student.className,
        balance,
        status: eligibility.status,
        financialStatus: eligibility.financialStatus,
        reason: eligibility.reason,
        message: 'Please contact the school office.',
      });
    }
    const existing = schedule.attendances.find((a) => a.studentId === student.studentId);
    if (existing?.checkInAt) {
      return {
        already: true,
        attendance: existing,
        eligibility,
        message: `Already checked in at ${existing.checkInAt.toISOString()}`,
      };
    }
    const settings = { ...DEFAULT_INVIGILATOR, ...(schedule.session.invigilatorSettings as object) } as InvigilatorSettings;
    const now = new Date();
    const [h, m] = schedule.startTime.split(':').map(Number);
    const start = new Date(schedule.examDate);
    start.setUTCHours(h, m, 0, 0);
    const late = now.getTime() > start.getTime() + settings.lateGraceMinutes * 60_000;
    const status = late ? 'LATE' : 'PRESENT';
    const lateMinutes = late ? Math.round((now.getTime() - start.getTime()) / 60000) : 0;
    const row = await prisma.examAttendance.upsert({
      where: { scheduleId_studentId: { scheduleId: schedule.id, studentId: student.studentId } },
      create: {
        organizationId,
        sessionId: schedule.sessionId,
        scheduleId: schedule.id,
        studentId: student.studentId,
        studentCode: student.studentCode,
        fullName: student.fullName,
        className: student.className,
        roomName: student.roomName,
        seatCode: 'seatCode' in student ? student.seatCode : null,
        status,
        checkInAt: now,
        method: (body.method ?? 'MANUAL') as any,
        lateMinutes,
        actorId: actorId ?? null,
      },
      update: {
        status,
        checkInAt: now,
        method: (body.method ?? 'MANUAL') as any,
        lateMinutes,
        actorId: actorId ?? null,
      },
    });
    await this.audit(organizationId, schedule.sessionId, actorId, 'CHECK_IN', `${student.fullName} ${status}`);
    return { already: false, attendance: row, eligibility };
  }

  async submit(organizationId: string, actorId: string | undefined, body: {
    scheduleId: string;
    studentId?: string;
    studentCode?: string;
    earlyReason?: string;
    method?: 'MANUAL' | 'QR' | 'RFID';
  }) {
    const row = await prisma.examAttendance.findFirst({
      where: {
        organizationId,
        scheduleId: body.scheduleId,
        OR: [
          body.studentId ? { studentId: body.studentId } : undefined,
          body.studentCode ? { studentCode: body.studentCode } : undefined,
        ].filter(Boolean) as any,
      },
      include: { schedule: true },
    });
    if (!row) throw new AppError(404, 'Attendance record not found. Check the student in first.');
    if (row.status === 'ABSENT' || row.status === 'NOT_ARRIVED') {
      throw new AppError(400, 'Cannot submit. Student was marked absent.');
    }
    if (row.submitAt) return { already: true, attendance: row };
    const now = new Date();
    const [h, m] = row.schedule.endTime.split(':').map(Number);
    const end = new Date(row.schedule.examDate);
    end.setUTCHours(h, m, 0, 0);
    await prisma.examAttendance.update({
      where: { id: row.id },
      data: {
        status: 'SUBMITTED',
        submitAt: now,
        earlyReason: now < end ? (body.earlyReason ?? 'Early submission') : row.earlyReason,
        method: (body.method ?? row.method ?? 'MANUAL') as any,
        actorId: actorId ?? null,
      },
    });
    await this.audit(organizationId, row.sessionId, actorId, 'SUBMIT', `${row.fullName} submitted`);
    return { already: false, attendance: await prisma.examAttendance.findUnique({ where: { id: row.id } }) };
  }

  async markAbsentCutoff(scheduleId: string, organizationId: string) {
    await prisma.examAttendance.updateMany({
      where: { scheduleId, organizationId, checkInAt: null, status: 'NOT_ARRIVED' },
      data: { status: 'ABSENT' },
    });
  }

  async dashboard(organizationId: string, filters?: { academicYear?: string; term?: string }) {
    const sessions = await this.listSessions(organizationId, filters);
    const published = sessions.filter((s) => s.status === 'PUBLISHED').length;
    const live = await prisma.examSchedule.count({
      where: { organizationId, status: 'IN_PROGRESS' },
    });
    const conflicts = await prisma.examConflict.count({
      where: { organizationId, resolved: false },
    });
    return {
      sessions: sessions.length,
      published,
      live,
      openConflicts: conflicts,
      sessionsList: sessions,
    };
  }

  async liveBoard(id: string, organizationId: string) {
    const session = await this.getSession(id, organizationId);
    return session.schedules.map((s) => {
      const present = s.attendances.filter((a) => ['PRESENT', 'LATE', 'IN_PROGRESS', 'SUBMITTED', 'EXITED'].includes(a.status)).length;
      const late = s.attendances.filter((a) => a.status === 'LATE').length;
      const absent = s.attendances.filter((a) => a.status === 'ABSENT' || a.status === 'NOT_ARRIVED').length;
      const submitted = s.attendances.filter((a) => a.status === 'SUBMITTED' || a.status === 'EXITED').length;
      return {
        ...s,
        kpis: { present, late, absent, submitted, total: s.studentCount },
      };
    });
  }

  async reports(id: string, organizationId: string) {
    const session = await this.getSession(id, organizationId);
    const attendance = session.schedules.map((s) => {
      const present = s.attendances.filter((a) => a.checkInAt).length;
      return {
        className: s.className,
        subjectName: s.subjectName,
        examDate: s.examDate,
        slotCode: s.slotCode,
        total: s.studentCount,
        present,
        late: s.attendances.filter((a) => a.status === 'LATE').length,
        absent: s.studentCount - present,
        submitted: s.attendances.filter((a) => a.submitAt).length,
      };
    });
    const invigilators = session.duties.map((d) => ({
      name: d.invigilatorName,
      roomName: d.roomName,
      date: d.examDate,
      slotCode: d.slotCode,
      mode: d.mode,
      checkedInAt: d.checkedInAt,
    }));
    return { attendance, invigilators, audits: await prisma.examAuditLog.findMany({ where: { sessionId: id }, orderBy: { createdAt: 'desc' }, take: 200 }) };
  }

  async resolveConflict(id: string, conflictId: string, organizationId: string, actorId?: string) {
    await prisma.examConflict.updateMany({ where: { id: conflictId, sessionId: id }, data: { resolved: true } });
    await this.audit(organizationId, id, actorId, 'RESOLVE', 'Marked conflict resolved');
    return this.getSession(id, organizationId);
  }

  async deleteSession(id: string, organizationId: string) {
    await this.getSession(id, organizationId);
    await prisma.examSession.delete({ where: { id } });
    return { id };
  }

  private async invigilatorPool(
    session: Awaited<ReturnType<ExamPlanningService['getSession']>>,
    catalog?: Awaited<ReturnType<ExamPlanningService['catalog']>>,
  ): Promise<InvigilatorPoolPerson[]> {
    const map = new Map<string, InvigilatorPoolPerson>();
    const [staff, users] = await Promise.all([
      prisma.examInvigilatorStaff.findMany({ where: { organizationId: session.organizationId } }),
      fetchIamOrgUsers(session.organizationId),
    ]);
    const usersByName = new Map(users.map((u) => [normPersonName(u.name), u]));
    const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    for (const cls of catalog?.classes ?? []) {
      for (const course of cls.courses) {
        if (!course.teacherName || /unassigned/i.test(course.teacherName)) continue;
        const id = teacherSlug(course.teacherName);
        const cur = map.get(id) ?? {
          id,
          name: course.teacherName,
          subjects: [],
          classes: [],
          source: 'TEACHER' as const,
          hasAccount: false,
          userId: null,
          email: null,
        };
        if (!cur.subjects.includes(course.subjectName)) cur.subjects.push(course.subjectName);
        if (!cur.classes.includes(cls.className)) cur.classes.push(cls.className);
        map.set(id, cur);
      }
    }

    for (const row of staff) {
      const id = row.userId ? `user:${row.userId}` : `staff-${row.id}`;
      const existingByName = [...map.values()].find((p) => normPersonName(p.name) === normPersonName(row.name));
      if (existingByName) {
        existingByName.userId = row.userId ?? existingByName.userId;
        existingByName.email = row.email ?? existingByName.email;
        existingByName.hasAccount = Boolean(row.userId || existingByName.hasAccount);
        continue;
      }
      map.set(id, {
        id,
        name: row.name,
        subjects: [],
        classes: [],
        userId: row.userId,
        email: row.email,
        source: (row.source as InvigilatorPoolPerson['source']) || 'STAFF',
        hasAccount: row.hasAccount || Boolean(row.userId),
      });
    }

    for (const person of map.values()) {
      const byName = usersByName.get(normPersonName(person.name));
      const byEmail = person.email ? usersByEmail.get(person.email.toLowerCase()) : undefined;
      const match = byEmail || byName;
      if (match) {
        person.userId = person.userId || match.id;
        person.email = person.email || match.email;
        person.hasAccount = true;
      }
    }

    for (const d of session.duties) {
      if (!this.isNamedInvigilator(d) || map.has(d.invigilatorId)) continue;
      map.set(d.invigilatorId, {
        id: d.invigilatorId,
        name: d.invigilatorName,
        subjects: [],
        classes: [],
        userId: d.userId,
        email: d.email,
        source: d.userId ? 'USER' : 'STAFF',
        hasAccount: Boolean(d.userId),
      });
    }

    return [...map.values()];
  }

  private groupExamLevels<T extends { className: string }>(schedules: T[]) {
    const map = new Map<string, T[]>();
    for (const s of schedules) {
      const key = classLevelOf(s.className);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.values()];
  }

  private arrangeExamStudents<T extends { className: string }>(students: T[], strategy: string): T[] {
    const byClass = new Map<string, T[]>();
    for (const s of students) {
      byClass.set(s.className, [...(byClass.get(s.className) ?? []), s]);
    }
    const groups = [...byClass.values()];
    if (strategy === 'CLASS_TOGETHER') return groups.flat();
    if (strategy === 'MIXED') {
      return this.roundRobin(groups.map((g) => [...g].sort(() => Math.random() - 0.5)));
    }
    return this.roundRobin(groups);
  }

  private roundRobin<T>(groups: T[][]): T[] {
    const copies = groups.map((g) => [...g]);
    const out: T[] = [];
    let added = true;
    while (added) {
      added = false;
      for (const g of copies) {
        const next = g.shift();
        if (!next) continue;
        out.push(next);
        added = true;
      }
    }
    return out;
  }

  private fillRoomsWithStudents<T extends { className: string }>(
    students: T[],
    rooms: RoomCfg[],
    strategy: string,
  ) {
    const out: Array<T & { roomName: string; seatCode: string; rowLabel: string; colIndex: number }> = [];
    let cursor = 0;
    for (const room of rooms) {
      if (cursor >= students.length) break;
      const capacity = Math.max(0, Number(room.capacity) || 0);
      if (!capacity) continue;
      const cols = Math.max(1, Number(room.cols) || 10);
      const slice: T[] = [];
      if (strategy === 'CLASS_TOGETHER') {
        const cls = students[cursor]?.className;
        while (slice.length < capacity && cursor < students.length && students[cursor].className === cls) {
          slice.push(students[cursor]);
          cursor += 1;
        }
      } else {
        while (slice.length < capacity && cursor < students.length) {
          slice.push(students[cursor]);
          cursor += 1;
        }
      }
      slice.forEach((student, idx) => {
        const row = Math.floor(idx / cols);
        const col = (idx % cols) + 1;
        const rowLabel = String.fromCharCode(65 + (row % 26));
        out.push({
          ...student,
          roomName: room.name,
          seatCode: `${rowLabel}${col}`,
          rowLabel,
          colIndex: col,
        });
      });
    }
    return out;
  }

  private interleave<T>(list: T[]) {
    const out: T[] = [];
    const mid = Math.ceil(list.length / 2);
    for (let i = 0; i < mid; i++) {
      out.push(list[i]);
      if (list[i + mid]) out.push(list[i + mid]);
    }
    return out;
  }

  async directory(id: string, organizationId: string) {
    const session = await this.getSession(id, organizationId);
    const catalog = await this.catalog(organizationId, { term: session.term, academicYear: session.academicYear });
    const pool = await this.invigilatorPool(session, catalog);
    return pool.filter((p) => this.isNamedInvigilator(p)).map((p) => {
      const duties = session.duties.filter((d) => d.invigilatorId === p.id);
      return {
        ...p,
        assigned: duties.length,
        locked: duties.filter((d) => d.locked).length,
        checkedIn: duties.filter((d) => d.checkedInAt).length,
      };
    });
  }

  async checkInInvigilator(id: string, organizationId: string, actorId: string | undefined, body: {
    dutyId: string;
    method?: 'MANUAL' | 'QR' | 'RFID';
  }) {
    const duty = await prisma.examInvigilatorDuty.findFirst({ where: { id: body.dutyId, sessionId: id, organizationId } });
    if (!duty) throw new AppError(404, 'Invigilator assignment not found');
    const now = new Date();
    await prisma.examInvigilatorDuty.update({ where: { id: duty.id }, data: { checkedInAt: now } });
    await this.audit(organizationId, id, actorId, 'INVIGILATOR_CHECKIN', `${duty.invigilatorName} checked in ${duty.roomName}`, { method: body.method });
    return this.getSession(id, organizationId);
  }

  async replaceInvigilator(id: string, organizationId: string, actorId: string | undefined, body: { dutyId: string; invigilatorId?: string; invigilatorName?: string }) {
    const session = await this.getSession(id, organizationId);
    const duty = session.duties.find((d) => d.id === body.dutyId);
    if (!duty) throw new AppError(404, 'Duty not found');
    const catalog = await this.catalog(organizationId, { term: session.term, academicYear: session.academicYear });
    const pool = (await this.invigilatorPool(session, catalog)).filter((p) => this.isNamedInvigilator(p));
    const pick = body.invigilatorId
      ? pool.find((p) => p.id === body.invigilatorId)
      : pool
          .filter((p) => {
            const busy = session.duties.some(
              (d) => d.invigilatorId === p.id && calendarKey(d.examDate) === calendarKey(duty.examDate) && d.slotCode === duty.slotCode && d.id !== duty.id,
            );
            return !busy;
          })
          .sort((a, b) => session.duties.filter((d) => d.invigilatorId === a.id).length - session.duties.filter((d) => d.invigilatorId === b.id).length)[0];
    if (!pick && !body.invigilatorName) throw new AppError(400, 'No available named teacher to replace this duty');
    if (pick) {
      const clash = session.duties.find((d) =>
        d.invigilatorId === pick.id
        && calendarKey(d.examDate) === calendarKey(duty.examDate)
        && d.slotCode === duty.slotCode
        && d.id !== duty.id
      );
      if (clash) throw new AppError(409, `${pick.name} is already invigilating ${clash.roomName} at this time`);
    }
    await prisma.examInvigilatorDuty.update({
      where: { id: duty.id },
      data: {
        invigilatorId: pick?.id ?? body.invigilatorId ?? duty.invigilatorId,
        invigilatorName: pick?.name ?? body.invigilatorName ?? duty.invigilatorName,
        userId: pick?.userId ?? duty.userId ?? null,
        email: pick?.email ?? duty.email ?? null,
        mode: 'MANUAL',
      },
    });
    await this.audit(organizationId, id, actorId, 'INVIGILATOR_REPLACE', `Replaced ${duty.invigilatorName} with ${pick?.name ?? body.invigilatorName}`);
    return this.getSession(id, organizationId);
  }

  async markExit(organizationId: string, actorId: string | undefined, body: {
    scheduleId: string;
    studentId?: string;
    studentCode?: string;
    allowWithoutSubmit?: boolean;
    method?: 'MANUAL' | 'QR' | 'RFID';
  }) {
    const row = await prisma.examAttendance.findFirst({
      where: {
        organizationId,
        scheduleId: body.scheduleId,
        OR: [
          body.studentId ? { studentId: body.studentId } : undefined,
          body.studentCode ? { studentCode: body.studentCode } : undefined,
        ].filter(Boolean) as any,
      },
    });
    if (!row) throw new AppError(404, 'Attendance record not found. Record entry first.');
    if (!row.checkInAt) throw new AppError(400, 'Student must be marked present (entry) before exit');
    if (!body.allowWithoutSubmit && !row.submitAt) {
      throw new AppError(400, 'Student must submit the examination before exit');
    }
    const now = new Date();
    await prisma.examAttendance.update({
      where: { id: row.id },
      data: {
        status: 'EXITED',
        exitAt: now,
        submitAt: row.submitAt ?? now,
        method: (body.method ?? row.method ?? 'MANUAL') as any,
        actorId: actorId ?? null,
      },
    });
    await this.audit(organizationId, row.sessionId, actorId, 'EXIT', `${row.fullName} exited`);
    return prisma.examAttendance.findUnique({ where: { id: row.id } });
  }

  async reschedule(id: string, organizationId: string, actorId: string | undefined, body: { scheduleId: string; examDate?: string; slotCode?: string }) {
    const session = await this.getSession(id, organizationId);
    const schedule = session.schedules.find((s) => s.id === body.scheduleId);
    if (!schedule) throw new AppError(404, 'Schedule not found');
    const slots = (session.timeSlots as SlotCfg[]) ?? DEFAULT_SLOTS;
    const days = (session.days as DayCfg[]) ?? [];
    const timeline: Array<{ date: string; slot: SlotCfg }> = [];
    for (const day of days) {
      for (const slot of slots) {
        const enabled =
          (slot.code === 'MORNING' && day.morning) ||
          (slot.code === 'AFTERNOON' && day.afternoon) ||
          (slot.code === 'EVENING' && day.evening) ||
          (!['MORNING', 'AFTERNOON', 'EVENING'].includes(slot.code) && day.morning);
        if (enabled) timeline.push({ date: day.date, slot });
      }
    }
    const currentKey = `${calendarKey(schedule.examDate)}|${schedule.slotCode}`;
    const level = classLevelOf(schedule.className);
    const peers = session.schedules.filter(
      (s) => classLevelOf(s.className) === level && s.subjectName === schedule.subjectName,
    );
    const peerIds = new Set(peers.map((s) => s.id));
    let target = body.examDate && body.slotCode
      ? { date: body.examDate, slot: slots.find((s) => s.code === body.slotCode)! }
      : timeline.find((t) => {
          const k = `${t.date}|${t.slot.code}`;
          if (k === currentKey) return false;
          if (k <= currentKey) return false;
          return !peers.some((peer) =>
            session.schedules.some(
              (s) =>
                !peerIds.has(s.id) &&
                s.classId === peer.classId &&
                calendarKey(s.examDate) === t.date &&
                s.slotCode === t.slot.code,
            ),
          );
        });
    if (!target?.slot) throw new AppError(400, 'No valid replacement slot found');
    await prisma.examSchedule.updateMany({
      where: { id: { in: [...peerIds] }, sessionId: id },
      data: {
        examDate: atNoonUtc(target.date),
        slotCode: target.slot.code,
        startTime: target.slot.startTime,
        endTime: target.slot.endTime,
        status: 'RESCHEDULED',
      },
    });
    await this.audit(organizationId, id, actorId, 'RESCHEDULE', `${level} ${schedule.subjectName} → ${target.date} ${target.slot.label} (all streams)`);
    return {
      recommended: { date: target.date, slot: target.slot.label, startTime: target.slot.startTime, endTime: target.slot.endTime },
      session: await this.getSession(id, organizationId),
    };
  }

  private async ensureAttendanceRows(schedule: { id: string; organizationId: string; sessionId: string; classId?: string; className?: string }) {
    const seats = await prisma.examSeat.findMany({ where: { scheduleId: schedule.id } });
    if (seats.length) {
      await prisma.examAttendance.createMany({
        data: seats.map((s) => ({
          organizationId: schedule.organizationId,
          sessionId: schedule.sessionId,
          scheduleId: schedule.id,
          studentId: s.studentId,
          studentCode: s.studentCode,
          fullName: s.fullName,
          className: s.className,
          roomName: s.roomName,
          seatCode: s.seatCode,
          status: 'NOT_ARRIVED' as const,
        })),
        skipDuplicates: true,
      });
      return;
    }
    const full = await prisma.examSchedule.findFirst({ where: { id: schedule.id } });
    if (!full) return;
    const students = (await smListStudents(schedule.organizationId, {
      classId: full.classId,
      className: full.className,
      status: 'ACTIVE',
    }).catch(() => [])) as any[];
    if (!Array.isArray(students) || !students.length) return;
    await prisma.examAttendance.createMany({
      data: students.map((s) => ({
        organizationId: schedule.organizationId,
        sessionId: schedule.sessionId,
        scheduleId: schedule.id,
        studentId: s.id,
        studentCode: s.studentCode || s.id,
        fullName: s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' '),
        className: full.className,
        roomName: ((full.rooms as any[])?.[0]?.name as string) ?? 'Unassigned',
        seatCode: null,
        status: 'NOT_ARRIVED' as const,
      })),
      skipDuplicates: true,
    });
  }

  private async refreshReadiness(id: string) {
    const session = await prisma.examSession.findUnique({
      where: { id },
      include: { classes: true, courses: true, schedules: true, seats: true, duties: true, conflicts: true },
    });
    if (!session) return;
    const checks = [
      session.classes.some((c) => c.selected),
      session.courses.some((c) => c.selected),
      ((session.rooms as any[]) ?? []).length > 0,
      session.duties.length > 0,
      session.schedules.length > 0,
      session.seats.length > 0,
      !session.conflicts.some((c) => !c.resolved && c.severity === 'ERROR'),
    ];
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    await prisma.examSession.update({ where: { id }, data: { readinessScore: score } });
  }

  private async audit(organizationId: string, sessionId: string, actorId: string | undefined, action: string, message: string, payload?: any) {
    await prisma.examAuditLog.create({
      data: { organizationId, sessionId, actorId: actorId ?? null, action, message, payload: payload ?? undefined },
    });
  }
}

export const examPlanningService = new ExamPlanningService();
