import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { fetchIamAcademicSettings, getTeacherAccount } from '../clients/iam.client';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function normalizeLabel(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseIsoDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) throw new AppError(400, 'Dates must be YYYY-MM-DD');
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function periodIndexFromStart(startTime: string, allStarts: string[]): number {
  const sorted = [...new Set(allStarts)].sort();
  const idx = sorted.indexOf(startTime);
  return idx >= 0 ? idx + 1 : 1;
}

function classNameMatches(slotClass: string, wanted: string): boolean {
  const a = normalizeLabel(slotClass);
  const b = normalizeLabel(wanted);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

async function resolveTermYear(
  organizationId: string,
  term?: string,
  academicYear?: string
): Promise<{ term: string; academicYear: string }> {
  if (term?.trim() && academicYear?.trim()) {
    return { term: term.trim(), academicYear: academicYear.trim() };
  }
  try {
    const settings = await fetchIamAcademicSettings(organizationId);
    return {
      term: (term?.trim() || settings.currentTerm || settings.terms[0] || 'Term 1').trim(),
      academicYear: (
        academicYear?.trim() ||
        settings.currentAcademicYear ||
        settings.academicYears[0] ||
        `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
      ).trim(),
    };
  } catch {
    const y = new Date().getFullYear();
    return {
      term: (term?.trim() || 'Term 1').trim(),
      academicYear: (academicYear?.trim() || `${y}-${y + 1}`).trim(),
    };
  }
}

export type ParentPeriodStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'EXCUSED'
  | 'SICK'
  | 'SCHOOL_ACTIVITY'
  | null;

export async function getParentStudentWeek(input: {
  organizationId: string;
  studentCode: string;
  className: string;
  from: string;
  to: string;
  term?: string;
  academicYear?: string;
}) {
  const organizationId = input.organizationId.trim();
  const studentCode = input.studentCode.trim();
  const className = input.className.trim();
  if (!organizationId || !studentCode || !className) {
    throw new AppError(400, 'organizationId, studentCode and className are required');
  }

  const fromDate = parseIsoDate(input.from);
  const toDate = parseIsoDate(input.to);
  if (toDate < fromDate) throw new AppError(400, '`to` must be on or after `from`');

  const spanDays =
    Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (spanDays > 31) throw new AppError(400, 'Date range cannot exceed 31 days');

  const { term, academicYear } = await resolveTermYear(
    organizationId,
    input.term,
    input.academicYear
  );

  const allSlots = await prisma.academicTimetable.findMany({
    where: { organizationId, term, academicYear },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  const classSlots = allSlots.filter((s) => classNameMatches(s.className, className));
  const startsByDay = new Map<string, string[]>();
  for (const slot of classSlots) {
    const list = startsByDay.get(slot.dayOfWeek) ?? [];
    list.push(slot.startTime);
    startsByDay.set(slot.dayOfWeek, list);
  }

  const timetableIds = classSlots.map((s) => s.id);
  const sessions =
    timetableIds.length === 0
      ? []
      : await prisma.lessonSession.findMany({
          where: {
            organizationId,
            timetableId: { in: timetableIds },
            lessonDate: { gte: fromDate, lte: toDate },
          },
          include: {
            attendance: true,
          },
        });

  const sessionByKey = new Map<string, (typeof sessions)[number]>();
  for (const session of sessions) {
    sessionByKey.set(`${session.timetableId}|${toIsoDate(session.lessonDate)}`, session);
  }

  const codeLower = studentCode.toLowerCase();

  function markForSession(session: (typeof sessions)[number] | undefined) {
    if (!session) return null;
    const row =
      session.attendance.find((a) => a.studentCode === studentCode) ||
      session.attendance.find((a) => a.studentCode.toLowerCase() === codeLower);
    return row ?? null;
  }

  const days: Array<{
    date: string;
    day: string;
    dayIndex: number;
    slots: Array<{
      id: string;
      timetableId: string;
      period: number;
      periodLabel: string;
      startTime: string;
      endTime: string;
      subject: string;
      teacher: string;
      room: string | null;
      attendanceStatus: ParentPeriodStatus;
      attendanceDone: boolean;
      sessionId: string | null;
      sessionStatus: string | null;
      lessonStarted: boolean;
    }>;
  }> = [];

  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;
  let unmarked = 0;
  let total = 0;

  for (let i = 0; i < spanDays; i += 1) {
    const date = addDaysUtc(fromDate, i);
    const iso = toIsoDate(date);
    const dayIndex = date.getUTCDay();
    const dayName = DAY_NAMES[dayIndex]!;
    const daySlots = classSlots
      .filter((s) => s.dayOfWeek.toLowerCase() === dayName.toLowerCase())
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const starts = startsByDay.get(dayName) ?? daySlots.map((s) => s.startTime);
    const slots = daySlots.map((slot) => {
      const period = periodIndexFromStart(slot.startTime, starts);
      const session = sessionByKey.get(`${slot.id}|${iso}`);
      const markRow = markForSession(session);
      const mark = markRow?.status ?? null;
      const attendanceStatus = (mark as ParentPeriodStatus) ?? null;
      const attendanceDone = Boolean(session?.attendanceDone);
      const lessonStarted = Boolean(session?.qrVerified || session?.startedAt);

      total += 1;
      if (!attendanceStatus) unmarked += 1;
      else if (attendanceStatus === 'PRESENT') present += 1;
      else if (attendanceStatus === 'ABSENT') absent += 1;
      else if (attendanceStatus === 'LATE') late += 1;
      else excused += 1;

      return {
        id: `${slot.id}:${iso}`,
        timetableId: slot.id,
        period,
        periodLabel: session?.periodLabel || `Period ${period}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subject: slot.subjectName,
        teacher: slot.teacherName,
        room: slot.room,
        attendanceStatus,
        attendanceDone,
        sessionId: session?.id ?? null,
        sessionStatus: session?.status ?? null,
        lessonStarted,
      };
    });

    days.push({
      date: iso,
      day: dayName,
      dayIndex,
      slots,
    });
  }

  return {
    source: 'timetable' as const,
    term,
    academicYear,
    className,
    studentCode,
    weekStart: toIsoDate(fromDate),
    weekEnd: toIsoDate(toDate),
    days,
    summary: {
      present,
      absent,
      late,
      excused,
      unmarked,
      total,
    },
  };
}

export async function listClassTeachers(input: {
  organizationId: string;
  className: string;
  term?: string;
  academicYear?: string;
}) {
  const organizationId = input.organizationId.trim();
  const className = input.className.trim();
  if (!organizationId || !className) {
    throw new AppError(400, 'organizationId and className are required');
  }

  const { term, academicYear } = await resolveTermYear(
    organizationId,
    input.term,
    input.academicYear
  );

  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      term,
      academicYear,
    },
    orderBy: { teacherName: 'asc' },
  });

  const slots = await prisma.academicTimetable.findMany({
    where: { organizationId, term, academicYear },
  });

  const byTeacher = new Map<
    string,
    { teacherUserId: string; teacherName: string; subjects: Set<string> }
  >();

  for (const row of assignments) {
    if (!classNameMatches(row.className, className)) continue;
    const key = row.teacherUserId || row.teacherName;
    const entry = byTeacher.get(key) ?? {
      teacherUserId: row.teacherUserId,
      teacherName: row.teacherName,
      subjects: new Set<string>(),
    };
    if (row.subjectName) entry.subjects.add(row.subjectName);
    byTeacher.set(key, entry);
  }

  for (const slot of slots) {
    if (!classNameMatches(slot.className, className)) continue;
    const key = slot.teacherUserId || slot.teacherName;
    const entry = byTeacher.get(key) ?? {
      teacherUserId: slot.teacherUserId,
      teacherName: slot.teacherName,
      subjects: new Set<string>(),
    };
    if (slot.subjectName) entry.subjects.add(slot.subjectName);
    byTeacher.set(key, entry);
  }

  const teachers = [];
  for (const entry of byTeacher.values()) {
    const account = entry.teacherUserId
      ? await getTeacherAccount(organizationId, entry.teacherUserId).catch(() => null)
      : null;
    teachers.push({
      teacherUserId: entry.teacherUserId,
      teacherName: entry.teacherName,
      subjects: [...entry.subjects].sort(),
      phone: account?.phone ?? null,
      email: account?.email ?? null,
    });
  }

  teachers.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  return { term, academicYear, className, teachers };
}
