import { randomUUID } from 'crypto';
import {
  LessonSessionStatus,
  PunctualityStatus,
  StudentAttendanceMark,
  AssignmentStatus,
  Prisma,
} from '../generated/prisma';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  fetchAcademicClasses,
  fetchAcademicStudents,
  fetchStudentsForClass,
  formatClassLabel,
  lookupClassMonitorByQr,
  matchAcademicClass,
  normalizeAcademicClass,
  normalizeClassLabel,
  type AcademicClass,
} from '../clients/academic.client';
import { fetchIamOrganizationProfile } from '../clients/iam.client';
import { emitLiveMonitorChanged } from '../live/live-socket';
import { scheduleService } from './schedule.service';
import { filterRowsVisibleToTeachers } from './timetable-publish.service';
import { normalizeTime } from '../utils/time.utils';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayName(d = new Date()) {
  return DAY_NAMES[d.getDay()];
}

function dateOnly(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Map IAM login to timetable teacherUserId(s) — JWT sub, profile email, legacy slug ids. */
function nameTokens(value?: string | null): string[] {
  return String(value || '')
    .trim()
    .toUpperCase()
    .split(/[\s,._+-]+/)
    .filter((token) => token.length >= 3);
}

function namesOverlap(stored?: string | null, wanted?: string | null): boolean {
  const a = String(stored || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  const b = String(wanted || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const tokens = nameTokens(b);
  return tokens.length > 0 && tokens.every((token) => a.includes(token));
}

function longestNameToken(value?: string | null): string | null {
  const tokens = nameTokens(value).sort((a, b) => b.length - a.length);
  const token = tokens[0];
  return token && token.length >= 4 ? token : null;
}

export async function resolveTeacherUserIds(
  organizationId: string,
  jwtUserId: string,
  email?: string | null,
  teacherName?: string | null
): Promise<string[]> {
  const ids = new Set<string>([jwtUserId]);
  const normalizedEmail = email?.trim().toLowerCase();

  const profiles = await prisma.timetableTeacherProfile.findMany({
    where: {
      organizationId,
      OR: [
        { teacherUserId: jwtUserId },
        ...(normalizedEmail ? [{ loginEmail: normalizedEmail }] : []),
      ],
    },
    select: { teacherUserId: true },
  });
  for (const p of profiles) ids.add(p.teacherUserId);

  const nameHints = [
    teacherName,
    normalizedEmail ? normalizedEmail.split('@')[0]?.replace(/[._+-]/g, ' ') : null,
  ].filter((value): value is string => Boolean(value && value.trim()));

  for (const hint of nameHints) {
    const needle = longestNameToken(hint);
    if (!needle) continue;

    const byProfile = await prisma.timetableTeacherProfile.findMany({
      where: {
        organizationId,
        teacherName: { contains: needle, mode: 'insensitive' },
      },
      select: { teacherUserId: true, teacherName: true },
      take: 25,
    });
    for (const p of byProfile) {
      if (namesOverlap(p.teacherName, hint)) ids.add(p.teacherUserId);
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: {
        organizationId,
        teacherName: { contains: needle, mode: 'insensitive' },
      },
      select: { teacherUserId: true, teacherName: true },
      take: 50,
    });
    for (const a of assignments) {
      if (namesOverlap(a.teacherName, hint)) ids.add(a.teacherUserId);
    }

    const timetableRows = await prisma.academicTimetable.findMany({
      where: {
        organizationId,
        teacherName: { contains: needle, mode: 'insensitive' },
      },
      select: { teacherUserId: true, teacherName: true },
      take: 80,
    });
    for (const row of timetableRows) {
      if (namesOverlap(row.teacherName, hint)) ids.add(row.teacherUserId);
    }
  }

  return [...ids];
}

function teacherIdFilter(ids: string[]): string | { in: string[] } {
  return ids.length === 1 ? ids[0]! : { in: ids };
}

async function findTeacherTimetableRows(
  organizationId: string,
  teacherIds: string[],
  opts?: {
    term?: string;
    academicYear?: string;
    className?: string;
    day?: string;
    course?: string;
    dayOfWeek?: string;
    orderBy?: Prisma.AcademicTimetableOrderByWithRelationInput | Prisma.AcademicTimetableOrderByWithRelationInput[];
  }
) {
  const base: Prisma.AcademicTimetableWhereInput = {
    organizationId,
    teacherUserId: teacherIdFilter(teacherIds),
    ...(opts?.dayOfWeek ? { dayOfWeek: opts.dayOfWeek } : {}),
    ...(opts?.className ? { className: opts.className } : {}),
    ...(opts?.day ? { dayOfWeek: opts.day } : {}),
    ...(opts?.course ? { subjectName: opts.course } : {}),
  };
  const withPeriod: Prisma.AcademicTimetableWhereInput = {
    ...base,
    ...(opts?.term ? { term: opts.term } : {}),
    ...(opts?.academicYear ? { academicYear: { in: academicYearVariants(opts.academicYear)! } } : {}),
  };
  const orderBy = opts?.orderBy ?? [{ dayOfWeek: 'asc' as const }, { startTime: 'asc' as const }];
  let rows = await prisma.academicTimetable.findMany({ where: withPeriod, orderBy });
  if (!rows.length && (opts?.term || opts?.academicYear)) {
    rows = await prisma.academicTimetable.findMany({ where: base, orderBy });
  }
  return filterRowsVisibleToTeachers(organizationId, rows, opts?.term, opts?.academicYear);
}

/** Support IAM format (2026-2027) and legacy single-year (2026) in timetable rows. */
function academicYearVariants(year?: string): string[] | undefined {
  if (!year?.trim()) return undefined;
  const variants = new Set<string>([year.trim()]);
  if (year.includes('-')) {
    variants.add(year.split('-')[0]!);
  } else {
    const y = Number(year);
    if (!Number.isNaN(y)) variants.add(`${y}-${y + 1}`);
  }
  return [...variants];
}

function parseHm(hm: string) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

function lessonPhase(start: string, end: string, now = nowMinutes()) {
  const s = parseHm(start);
  const e = parseHm(end);
  if (now < s) return 'upcoming' as const;
  if (now >= s && now < e) return 'current' as const;
  return 'past' as const;
}

function formatPeriodLabel(index: number) {
  return `P${index + 1}`;
}

function hmFromMinutes(total: number) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateAttendanceReference(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const suffix = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `ATT-${y}${m}${d}-${suffix}`;
}

type AttendanceAccess = {
  phase: 'upcoming' | 'current' | 'past';
  locked: boolean;
  lockReason: string | null;
  opensAt: string | null;
  minutesRemaining: number | null;
  canEdit: boolean;
  editMode: 'live' | 'past_edit' | 'readonly' | 'locked';
  available: boolean;
};

function evaluateAttendanceAccess(
  startTime: string,
  endTime: string,
  settings: { attendanceEarlyOpenMinutes: number; attendanceEditAfterMinutes: number },
  session?: { attendanceDone: boolean; status: string; lessonDate?: Date | null } | null,
  now = nowMinutes(),
  nowDate = new Date()
): AttendanceAccess {
  const today = dateOnly(nowDate);
  const lessonDay = session?.lessonDate ? dateOnly(new Date(session.lessonDate)) : today;

  let phase: 'upcoming' | 'current' | 'past';
  if (lessonDay.getTime() < today.getTime()) {
    phase = 'past';
  } else if (lessonDay.getTime() > today.getTime()) {
    phase = 'upcoming';
  } else {
    phase = lessonPhase(startTime, endTime, now);
  }

  const start = parseHm(startTime);
  const end = parseHm(endTime);
  const minutesRemaining = phase === 'current' ? Math.max(0, end - now) : null;
  const opensAt =
    phase === 'upcoming' ? hmFromMinutes(Math.max(0, start - settings.attendanceEarlyOpenMinutes)) : null;

  if (phase === 'upcoming') {
    const earlyOpen = lessonDay.getTime() > today.getTime() ? false : now >= start - settings.attendanceEarlyOpenMinutes;
    return {
      phase,
      locked: !earlyOpen,
      lockReason: earlyOpen
        ? null
        : lessonDay.getTime() > today.getTime()
          ? 'This lesson is scheduled for a future date'
          : `Attendance opens at ${opensAt} (${settings.attendanceEarlyOpenMinutes} min before period start)`,
      opensAt,
      minutesRemaining: null,
      canEdit: earlyOpen,
      editMode: earlyOpen ? 'live' : 'locked',
      available: earlyOpen,
    };
  }

  if (phase === 'current') {
    return {
      phase,
      locked: false,
      lockReason: null,
      opensAt: null,
      minutesRemaining,
      canEdit: true,
      editMode: 'live',
      available: true,
    };
  }

  const submitted = session?.attendanceDone ?? false;
  return {
    phase,
    locked: true,
    lockReason: submitted
      ? 'Attendance was submitted and is now read-only'
      : 'This period has ended — view only',
    opensAt: null,
    minutesRemaining: null,
    canEdit: false,
    editMode: 'readonly',
    available: true,
  };
}

export async function getOrCreateSettings(organizationId: string) {
  return prisma.smartTimetableSettings.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId },
  });
}

export async function updateSettings(
  organizationId: string,
  input: Partial<{
    graceMinutesOnTime: number;
    lateThresholdMinutes: number;
    veryLateThresholdMinutes: number;
    qrRequired: boolean;
    gpsRequired: boolean;
    autoCloseAfterEnd: boolean;
    reminderEnabled: boolean;
    liveRefreshSeconds: number;
    notifyHeadOfStudies: boolean;
    notifyDeputyHead: boolean;
    notifyDepartmentHead: boolean;
    alertLateEnabled: boolean;
    alertMissingCheckInEnabled: boolean;
    alertMissingCheckOutEnabled: boolean;
    alertEarlyDepartureEnabled: boolean;
    missingCheckInAfterMinutes: number;
    attendanceEarlyOpenMinutes: number;
    attendanceEditAfterMinutes: number;
  }>
) {
  await getOrCreateSettings(organizationId);
  return prisma.smartTimetableSettings.update({
    where: { organizationId },
    data: input,
  });
}

function computePunctuality(
  scheduledStart: string,
  scannedAt: Date,
  settings: {
    graceMinutesOnTime: number;
    lateThresholdMinutes: number;
    veryLateThresholdMinutes: number;
  }
): PunctualityStatus {
  const scheduled = parseHm(scheduledStart);
  const scan = scannedAt.getHours() * 60 + scannedAt.getMinutes();
  const diff = scan - scheduled;
  if (diff < 0) return PunctualityStatus.EARLY;
  if (diff <= settings.graceMinutesOnTime) return PunctualityStatus.ON_TIME;
  if (diff <= settings.lateThresholdMinutes) return PunctualityStatus.LATE;
  if (diff <= settings.veryLateThresholdMinutes) return PunctualityStatus.VERY_LATE;
  return PunctualityStatus.VERY_LATE;
}

/**
 * Extract classroom token from raw paste or public URL.
 * Preferred format: {schoolCode}-QR-CLS-NNNNN (e.g. 28001-QR-CLS-00005).
 * Legacy bare QR-CLS-NNNNN still accepted.
 */
function normalizeClassroomQrInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const prefixed =
    trimmed.match(/\b(\d{3,})-QR-CLS-(\d+)\b/i) ??
    trimmed.match(/\b(\d{3,})-QR-CLASS-(\d+)\b/i) ??
    trimmed.match(/\b([A-Z0-9]{3,})-QR-CLS-(\d+)\b/i);
  if (prefixed) {
    return `${prefixed[1]}-QR-CLS-${prefixed[2]}`.toUpperCase();
  }

  const bare = trimmed.match(/QR-CLS-\d+/i) ?? trimmed.match(/QR-CLASS-\d+/i);
  if (bare) {
    return bare[0].toUpperCase().replace('QR-CLASS', 'QR-CLS');
  }
  return trimmed;
}

function bareClassQrToken(code: string): string | null {
  const m = code.match(/QR-CLS-\d+/i);
  return m ? m[0].toUpperCase() : null;
}

async function schoolCodeForOrg(organizationId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({ where: { organizationId } });
  let raw = (tenant?.organizationCode ?? '').trim();
  if (!raw) {
    const profile = await fetchIamOrganizationProfile(organizationId).catch(() => null);
    raw = (profile?.organizationCode ?? '').trim();
    if (raw && tenant) {
      await prisma.tenant
        .update({
          where: { organizationId },
          data: { organizationCode: raw },
        })
        .catch(() => null);
    }
  }
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return (digits || raw).toUpperCase();
}

/** Candidate DB values for a scanned/pasted token (prefixed + legacy bare). */
async function classroomQrLookupCandidates(
  organizationId: string | null,
  raw: string
): Promise<string[]> {
  const primary = normalizeClassroomQrInput(raw);
  if (!primary) return [];
  const set = new Set<string>([primary]);
  const bare = bareClassQrToken(primary);
  if (bare) set.add(bare);
  if (organizationId && bare && /^QR-CLS-\d+$/i.test(primary)) {
    const school = await schoolCodeForOrg(organizationId);
    if (school) set.add(`${school}-${bare}`);
  }
  return [...set];
}

async function findClassroomByQr(organizationId: string, raw: string) {
  const candidates = await classroomQrLookupCandidates(organizationId, raw);
  for (const qrCode of candidates) {
    const row = await prisma.classroom.findFirst({
      where: { organizationId, qrCode, active: true },
    });
    if (row) return row;
  }
  return null;
}

function normLabel(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function roomMatchesClassroom(
  slot: { room: string | null; className: string },
  classroom: { roomNumber: string; name: string; classLabel?: string | null },
): boolean {
  const classroomLabels = [
    classroom.name,
    classroom.classLabel,
    classroom.roomNumber,
  ]
    .map(normLabel)
    .filter(Boolean);

  const slotLabels = [slot.room, slot.className].map(normLabel).filter(Boolean);
  if (slotLabels.length === 0 || classroomLabels.length === 0) return false;

  return slotLabels.some((slotLabel) =>
    classroomLabels.some(
      (classLabel) =>
        slotLabel === classLabel ||
        slotLabel.includes(classLabel) ||
        classLabel.includes(slotLabel),
    ),
  );
}

function minutesLateFromStart(scheduledStart: string, at: Date): number {
  const diff = nowMinutes(at) - parseHm(scheduledStart);
  return diff > 0 ? diff : 0;
}

function timetableSlotSummary(
  slot: {
    id: string;
    subjectName: string;
    className: string;
    room: string | null;
    startTime: string;
    endTime: string;
    academicYear: string;
    term: string;
  },
  periodIndex: number
) {
  return {
    timetableId: slot.id,
    subjectName: slot.subjectName,
    className: slot.className,
    room: slot.room,
    startTime: slot.startTime,
    endTime: slot.endTime,
    periodLabel: formatPeriodLabel(periodIndex),
    academicYear: slot.academicYear,
    term: slot.term,
  };
}

async function ensureClassroomForRoom(organizationId: string, room?: string | null) {
  if (!room?.trim()) return null;
  const roomNumber = room.trim();
  const existing = await prisma.classroom.findFirst({
    where: { organizationId, roomNumber },
  });
  if (existing) return existing;
  const qrCode = await nextClassQrCode(organizationId);
  return prisma.classroom.create({
    data: {
      organizationId,
      name: roomNumber,
      roomNumber,
      building: roomNumber.includes('-') ? roomNumber.split('-')[0] : null,
      qrCode,
    },
  });
}

export async function listClassrooms(organizationId: string) {
  return prisma.classroom.findMany({
    where: { organizationId, active: true },
    orderBy: { roomNumber: 'asc' },
  });
}

export async function upsertClassroom(
  organizationId: string,
  input: {
    id?: string;
    name: string;
    building?: string;
    floor?: string;
    roomNumber: string;
    capacity?: number;
  }
) {
  if (input.id) {
    return prisma.classroom.update({
      where: { id: input.id },
      data: {
        name: input.name,
        building: input.building,
        floor: input.floor,
        roomNumber: input.roomNumber,
        capacity: input.capacity,
      },
    });
  }
  const qrCode = await nextClassQrCode(organizationId);
  return prisma.classroom.create({
    data: {
      organizationId,
      name: input.name,
      building: input.building,
      floor: input.floor,
      roomNumber: input.roomNumber,
      capacity: input.capacity,
      qrCode,
    },
  });
}

async function enrichLesson(
  row: {
    id: string;
    className: string;
    subjectName: string;
    teacherUserId: string;
    teacherName: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    room: string | null;
    term: string;
    academicYear: string;
  },
  session: Awaited<ReturnType<typeof prisma.lessonSession.findFirst>> | null,
  periodLabel?: string
) {
  const phase = lessonPhase(row.startTime, row.endTime);
  return {
    timetableId: row.id,
    className: row.className,
    stream: row.className.includes(' ') ? row.className.split(' ').slice(-1)[0] : null,
    subjectName: row.subjectName,
    teacherUserId: row.teacherUserId,
    teacherName: row.teacherName,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    room: row.room,
    term: row.term,
    academicYear: row.academicYear,
    periodLabel: periodLabel ?? session?.periodLabel ?? null,
    phase,
    lessonStatus: session?.status ?? 'SCHEDULED',
    punctuality: session?.punctuality ?? 'NOT_STARTED',
    qrVerified: session?.qrVerified ?? false,
    attendanceDone: session?.attendanceDone ?? false,
    attendanceSubmittedAt: session?.attendanceSubmittedAt ?? null,
    attendanceReference: session?.attendanceReference ?? null,
    sessionId: session?.id ?? null,
    scannedAt: session?.scannedAt ?? null,
    startedAt: session?.startedAt ?? null,
    completedAt: session?.completedAt ?? null,
    topic: session?.topic ?? null,
  };
}

function resolveLessonDayAndPhase(
  lessonDate: Date,
  startTime: string,
  endTime: string
): { day: string; phase: 'past' | 'current' | 'upcoming' } {
  const day = DAY_NAMES[lessonDate.getDay()];
  const today = dateOnly();
  const target = dateOnly(lessonDate);
  if (target.getTime() < today.getTime()) {
    return { day, phase: 'past' };
  }
  if (target.getTime() > today.getTime()) {
    return { day, phase: 'upcoming' };
  }
  return { day, phase: lessonPhase(startTime, endTime) };
}

export async function teacherToday(
  organizationId: string,
  teacherUserId: string,
  opts?: { term?: string; academicYear?: string; email?: string | null; teacherName?: string | null; date?: string }
) {
  const teacherIds = await resolveTeacherUserIds(
    organizationId,
    teacherUserId,
    opts?.email,
    opts?.teacherName
  );
  const lessonDate = opts?.date
    ? new Date(`${opts.date}T12:00:00`)
    : new Date();
  const { day } = resolveLessonDayAndPhase(lessonDate, '00:00', '23:59');
  const lessonDateOnly = dateOnly(lessonDate);
  const isViewingToday = lessonDateOnly.getTime() === dateOnly().getTime();
  const rows = await findTeacherTimetableRows(organizationId, teacherIds, {
    term: opts?.term,
    academicYear: opts?.academicYear,
    dayOfWeek: day,
    orderBy: { startTime: 'asc' },
  });

  const sessions = await prisma.lessonSession.findMany({
    where: {
      organizationId,
      teacherUserId: teacherIdFilter(teacherIds),
      lessonDate: lessonDateOnly,
      timetableId: { in: rows.map((r) => r.id) },
    },
  });
  const sessionMap = new Map(sessions.map((s) => [s.timetableId, s]));

  const lessons = await Promise.all(
    rows.map(async (r, index) => {
      const base = await enrichLesson(r, sessionMap.get(r.id) ?? null, formatPeriodLabel(index));
      if (!isViewingToday) {
        const { phase } = resolveLessonDayAndPhase(lessonDateOnly, r.startTime, r.endTime);
        return { ...base, phase };
      }
      return base;
    })
  );
  const current = isViewingToday ? lessons.find((l) => l.phase === 'current') ?? null : null;
  const next = isViewingToday ? lessons.find((l) => l.phase === 'upcoming') ?? null : null;
  const periodTransition =
    isViewingToday && current
      ? buildPeriodTransition(current, next, lessons, nowMinutes())
      : null;
  const completed = lessons.filter((l) => l.lessonStatus === 'COMPLETED').length;
  const running = lessons.filter((l) => l.lessonStatus === 'RUNNING').length;

  const checkedIn = lessons.filter((l) => l.qrVerified || l.scannedAt).length;
  const lateArrivals = lessons.filter((l) =>
    ['LATE', 'VERY_LATE'].includes(String(l.punctuality))
  ).length;
  const notCheckedIn = lessons.filter(
    (l) => l.phase !== 'upcoming' && !l.qrVerified && !l.scannedAt
  ).length;

  return {
    date: lessonDateOnly.toISOString().slice(0, 10),
    dayOfWeek: day,
    kpis: {
      todayClasses: lessons.length,
      currentPeriod: current?.startTime ?? null,
      nextLesson: next ? `${next.subjectName} · ${next.className}` : null,
      lessonsCompleted: completed,
      classesRunning: running,
      pendingAttendance: lessons.filter((l) => l.lessonStatus === 'RUNNING' && !l.attendanceDone)
        .length,
      checkedIn,
      lateArrivals,
      notCheckedIn,
    },
    current,
    next,
    lessons,
    periodTransition,
  };
}

function isDoublePeriodPair(
  current: { endTime: string; className: string; subjectName: string; room: string | null },
  next: { startTime: string; className: string; subjectName: string; room: string | null }
) {
  return (
    current.endTime === next.startTime &&
    current.className === next.className &&
    current.subjectName === next.subjectName &&
    (current.room?.trim() || current.className) === (next.room?.trim() || next.className)
  );
}

function buildPeriodTransition(
  current: {
    timetableId: string;
    startTime: string;
    endTime: string;
    className: string;
    subjectName: string;
    room: string | null;
    periodLabel?: string | null;
  },
  next: {
    startTime: string;
    className: string;
    subjectName: string;
    room: string | null;
    periodLabel?: string | null;
  } | null,
  lessons: Array<{
    timetableId: string;
    endTime: string;
    startTime: string;
    className: string;
    subjectName: string;
    room: string | null;
    periodLabel?: string | null;
  }>,
  nowM: number
) {
  if (!current) return null;

  const endM = parseHm(current.endTime);
  const minutesRemaining = Math.max(0, endM - nowM);
  const currentIndex = lessons.findIndex((l) => l.timetableId === current.timetableId);
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const inDoublePeriod =
    (next && isDoublePeriodPair(current, next)) ||
    (previous && isDoublePeriodPair(previous, current));

  const doubleContinue = Boolean(next && isDoublePeriodPair(current, next));

  let nextAction: 'free' | 'move' | 'double_continue' = 'free';
  let message = '';

  if (doubleContinue) {
    nextAction = 'double_continue';
    message = `Double period — stay in ${current.className} for ${next!.periodLabel ?? 'next period'} · ${current.subjectName}`;
  } else if (next) {
    nextAction = 'move';
    const location = next.room?.trim() || next.className;
    message = `Go to ${next.periodLabel ?? 'next period'} · ${next.subjectName} · ${next.className} · ${location} at ${next.startTime}`;
  } else {
    message =
      minutesRemaining <= 0
        ? 'No more lessons scheduled for today.'
        : 'No further lesson after this period.';
  }

  return {
    minutesRemaining,
    nextAction,
    message,
    isDoublePeriod: inDoublePeriod,
    doublePeriodContinues: doubleContinue,
    alertAtMinutes: [5, 2, 0],
  };
}

export async function teacherSchedule(
  organizationId: string,
  teacherUserId: string,
  opts?: {
    term?: string;
    academicYear?: string;
    view?: string;
    className?: string;
    day?: string;
    course?: string;
    email?: string | null;
    teacherName?: string | null;
  }
) {
  const teacherIds = await resolveTeacherUserIds(
    organizationId,
    teacherUserId,
    opts?.email,
    opts?.teacherName
  );
  const rows = await findTeacherTimetableRows(organizationId, teacherIds, {
    term: opts?.term,
    academicYear: opts?.academicYear,
    className: opts?.className,
    day: opts?.day,
    course: opts?.course,
  });

  if (opts?.view === 'daily') {
    return teacherToday(organizationId, teacherUserId, opts);
  }

  const term = opts?.term ?? 'Term 1';
  const academicYear = opts?.academicYear ?? String(new Date().getFullYear());
  const schedule = await scheduleService.get(organizationId, term, academicYear);
  const periodSlots = ((schedule as { periodSlots?: Array<{ name: string; startTime: string; endTime: string; isBreak: boolean }> }).periodSlots ?? [])
    .filter((slot) => !slot.isBreak)
    .map((slot) => ({
      name: slot.name,
      startTime: normalizeTime(slot.startTime),
      endTime: normalizeTime(slot.endTime),
    }));

  const byDay: Record<
    string,
    Array<
      (typeof rows)[number] & {
        timetableId: string;
        periodLabel: string | null;
      }
    >
  > = {};
  for (const r of rows) {
    const idx = periodSlots.findIndex(
      (p) => normalizeTime(p.startTime) === normalizeTime(r.startTime)
    );
    const periodLabel = idx >= 0 ? formatPeriodLabel(idx) : null;
    (byDay[r.dayOfWeek] ??= []).push({
      ...r,
      timetableId: r.id,
      periodLabel,
    });
  }

  const classes = [...new Set(rows.map((r) => r.className))].sort();
  const courses = [...new Set(rows.map((r) => r.subjectName))].sort();

  return {
    view: opts?.view ?? 'weekly',
    byDay,
    total: rows.length,
    classes,
    courses,
    days: [...new Set(rows.map((r) => r.dayOfWeek))],
    periodSlots,
  };
}

export async function startLesson(
  organizationId: string,
  teacherUserId: string,
  teacherName: string,
  input: {
    timetableId: string;
    qrCode?: string;
    device?: string;
    location?: string;
    skipQr?: boolean;
    email?: string | null;
  }
) {
  const settings = await getOrCreateSettings(organizationId);
  const teacherIds = await resolveTeacherUserIds(
    organizationId,
    teacherUserId,
    input.email,
    teacherName
  );
  const slot = await prisma.academicTimetable.findFirst({
    where: { id: input.timetableId, organizationId },
  });
  if (!slot) throw new AppError(404, 'Timetable lesson not found');
  if (!teacherIds.includes(slot.teacherUserId)) {
    throw new AppError(403, 'This lesson is not assigned to you');
  }

  const day = todayName();
  if (slot.dayOfWeek !== day) {
    throw new AppError(400, `This lesson is scheduled for ${slot.dayOfWeek}, not today`);
  }

  let classroom = await ensureClassroomForRoom(organizationId, slot.room);
  if (!classroom && slot.className?.trim()) {
    classroom = await prisma.classroom.findFirst({
      where: {
        organizationId,
        active: true,
        OR: [{ name: slot.className }, { classLabel: slot.className }],
      },
    });
  }
  let wrongClassroom = false;

  if (settings.qrRequired && !input.skipQr) {
    if (!input.qrCode) throw new AppError(400, 'Classroom or class monitor QR scan is required');
    const scanned = await findClassroomByQr(organizationId, input.qrCode);
    const monitorLookup = !scanned ? await lookupClassMonitorByQr(organizationId, input.qrCode) : null;
    const classMonitor = monitorLookup?.monitor ?? null;
    if (!scanned && !classMonitor) {
      throw new AppError(400, monitorLookup?.message || 'Invalid QR code');
    }
    if (scanned) {
      if (
        classroom &&
        scanned.id !== classroom.id &&
        !roomMatchesClassroom(slot, scanned)
      ) {
        wrongClassroom = true;
      }
      if (!classroom && !roomMatchesClassroom(slot, scanned)) {
        wrongClassroom = true;
      }
      classroom = scanned;
    } else if (classMonitor) {
      const monitorClass = normalizeClassLabel(classMonitor.className);
      const lessonClass = normalizeClassLabel(slot.className);
      if (monitorClass !== lessonClass) {
        wrongClassroom = true;
      }
    }
  }

  const now = new Date();
  const lessonDate = dateOnly(now);
  let punctuality = wrongClassroom
    ? PunctualityStatus.WRONG_CLASSROOM
    : computePunctuality(slot.startTime, now, settings);

  const session = await prisma.lessonSession.upsert({
    where: {
      timetableId_lessonDate: { timetableId: slot.id, lessonDate },
    },
    update: {
      status: LessonSessionStatus.RUNNING,
      punctuality,
      scannedAt: now,
      startedAt: now,
      qrVerified: Boolean(input.qrCode) || !settings.qrRequired,
      scanDevice: input.device,
      scanLocation: input.location,
      classroomId: classroom?.id,
      room: classroom?.roomNumber ?? slot.room,
      teacherName,
      periodLabel: formatPeriodLabel(
        await prisma.academicTimetable.count({
          where: {
            organizationId,
            teacherUserId: slot.teacherUserId,
            dayOfWeek: day,
            startTime: { lt: slot.startTime },
          },
        })
      ),
    },
    create: {
      organizationId,
      timetableId: slot.id,
      classroomId: classroom?.id,
      lessonDate,
      status: LessonSessionStatus.RUNNING,
      punctuality,
      scheduledStart: slot.startTime,
      scheduledEnd: slot.endTime,
      scannedAt: now,
      startedAt: now,
      qrVerified: Boolean(input.qrCode) || !settings.qrRequired,
      scanDevice: input.device,
      scanLocation: input.location,
      teacherUserId: slot.teacherUserId,
      teacherName,
      className: slot.className,
      subjectName: slot.subjectName,
      room: classroom?.roomNumber ?? slot.room,
      periodLabel: formatPeriodLabel(
        await prisma.academicTimetable.count({
          where: {
            organizationId,
            teacherUserId: slot.teacherUserId,
            dayOfWeek: day,
            startTime: { lt: slot.startTime },
          },
        })
      ),
    },
  });

  emitLiveMonitorChanged(organizationId, {
    event: 'check_in',
    sessionId: session.id,
    timetableId: slot.id,
    room: displayLocation(classroom?.roomNumber ?? slot.room, slot.className),
  });

  return session;
}

export async function scanClassroomQr(
  organizationId: string,
  teacherUserId: string,
  teacherName: string,
  qrCode: string,
  meta?: { device?: string; location?: string; email?: string | null }
) {
  const settings = await getOrCreateSettings(organizationId);
  const teacherIds = await resolveTeacherUserIds(
    organizationId,
    teacherUserId,
    meta?.email,
    teacherName
  );

  const classroom = await findClassroomByQr(organizationId, qrCode);
  const monitorLookup = !classroom ? await lookupClassMonitorByQr(organizationId, qrCode) : null;
  const classMonitor = monitorLookup?.monitor ?? null;
  if (!classroom && !classMonitor) {
    return {
      ok: false as const,
      code: 'INVALID_QR' as const,
      message:
        monitorLookup?.message ||
        'Invalid code. Scan the classroom poster QR, a class monitor badge (QR-MON), or the class monitor’s ShuleCard QR (student must be assigned as class monitor).',
    };
  }

  const day = todayName();
  const now = new Date();
  const nowM = nowMinutes(now);
  const lessonDate = dateOnly(now);

  const allSlots = await prisma.academicTimetable.findMany({
    where: {
      organizationId,
      teacherUserId: teacherIdFilter(teacherIds),
      dayOfWeek: day,
    },
    orderBy: { startTime: 'asc' },
  });

  const scannedRoom = classroom
    ? {
        id: classroom.id,
        name: classroom.name,
        roomNumber: classroom.roomNumber,
        qrCode: classroom.qrCode,
      }
    : {
        id: classMonitor!.id,
        name: classMonitor!.className,
        roomNumber: `Monitor ${classMonitor!.slot}`,
        qrCode: classMonitor!.qrCode,
        monitorName: classMonitor!.studentName,
      };

  if (allSlots.length === 0) {
    return {
      ok: false as const,
      code: 'NO_ASSIGNMENT' as const,
      message: 'You have no lessons scheduled today.',
      scanned: scannedRoom,
    };
  }

  let targetSlot = allSlots.find(
    (s) => parseHm(s.startTime) <= nowM && nowM < parseHm(s.endTime)
  );
  let window: 'current' | 'upcoming' = 'current';

  if (!targetSlot) {
    targetSlot = allSlots.find((s) => {
      const start = parseHm(s.startTime);
      return nowM < start && start - nowM <= settings.attendanceEarlyOpenMinutes;
    });
    if (targetSlot) window = 'upcoming';
  }

  if (!targetSlot) {
    const nextSlot = allSlots.find((s) => parseHm(s.startTime) > nowM);
    if (nextSlot) {
      const periodIndex = allSlots.indexOf(nextSlot);
      const opensAtMin = Math.max(0, parseHm(nextSlot.startTime) - settings.attendanceEarlyOpenMinutes);
      return {
        ok: false as const,
        code: 'TOO_EARLY' as const,
        message: `Check-in opens ${settings.attendanceEarlyOpenMinutes} minutes before the period starts.`,
        expected: timetableSlotSummary(nextSlot, periodIndex),
        opensAt: hmFromMinutes(opensAtMin),
        currentTime: hmFromMinutes(nowM),
        scanned: scannedRoom,
      };
    }
    return {
      ok: false as const,
      code: 'NO_ASSIGNMENT' as const,
      message: 'No active period for classroom check-in right now.',
      scanned: scannedRoom,
    };
  }

  const periodIndex = allSlots.indexOf(targetSlot);
  const expected = timetableSlotSummary(targetSlot, periodIndex);

  if (classroom) {
    if (!roomMatchesClassroom(targetSlot, classroom)) {
      return {
        ok: false as const,
        code: 'WRONG_CLASSROOM' as const,
        message: `You are scheduled in ${targetSlot.room?.trim() || targetSlot.className}. Please scan the QR in your assigned classroom.`,
        expected,
        scanned: scannedRoom,
      };
    }
  } else if (classMonitor) {
    const monitorClass = normalizeClassLabel(classMonitor.className);
    const lessonClass = normalizeClassLabel(targetSlot.className);
    if (monitorClass !== lessonClass) {
      return {
        ok: false as const,
        code: 'WRONG_CLASSROOM' as const,
        message: `This monitor badge is for ${classMonitor.className}. Your current period is ${targetSlot.className}.`,
        expected,
        scanned: scannedRoom,
      };
    }
  }

  const existingSession = await prisma.lessonSession.findUnique({
    where: {
      timetableId_lessonDate: { timetableId: targetSlot.id, lessonDate },
    },
  });

  if (existingSession?.qrVerified && existingSession.scannedAt) {
    return {
      ok: true as const,
      code: 'ALREADY_CHECKED_IN' as const,
      message: 'You already checked in for this period.',
      classroom: scannedRoom,
      lesson: expected,
      session: existingSession,
      punctuality: existingSession.punctuality,
      minutesLate: minutesLateFromStart(targetSlot.startTime, existingSession.scannedAt),
      checkedInAt: existingSession.scannedAt.toISOString(),
    };
  }

  const verifiedQr = classroom?.qrCode ?? classMonitor!.qrCode;
  const session = await startLesson(organizationId, teacherUserId, teacherName, {
    timetableId: targetSlot.id,
    qrCode: verifiedQr,
    device: meta?.device,
    location: meta?.location,
    email: meta?.email,
  });

  const punctuality = session.punctuality;
  const minutesLate = minutesLateFromStart(targetSlot.startTime, now);

  return {
    ok: true as const,
    code: 'SUCCESS' as const,
    message:
      punctuality === PunctualityStatus.ON_TIME || punctuality === PunctualityStatus.EARLY
        ? 'Checked in on time.'
        : punctuality === PunctualityStatus.LATE || punctuality === PunctualityStatus.VERY_LATE
          ? `Checked in ${minutesLate} minute${minutesLate === 1 ? '' : 's'} late.`
          : 'Classroom verified.',
    classroom: scannedRoom,
    lesson: expected,
    session,
    punctuality,
    minutesLate,
    checkedInAt: session.scannedAt?.toISOString() ?? now.toISOString(),
    window,
  };
}

async function assertTeacherOwnsSession(
  organizationId: string,
  session: { teacherUserId: string; timetable?: { teacherUserId: string } | null },
  teacherUserId: string,
  email?: string | null
) {
  const teacherIds = await resolveTeacherUserIds(organizationId, teacherUserId, email);
  const slotTeacher = session.timetable?.teacherUserId;
  const owns =
    teacherIds.includes(session.teacherUserId) ||
    (slotTeacher ? teacherIds.includes(slotTeacher) : false);
  if (!owns) {
    throw new AppError(403, 'You are not scheduled to teach this class');
  }
}

function normalizeAttendanceMark(
  value: unknown,
  submit?: boolean
): StudentAttendanceMark | null {
  if (value == null || value === '') {
    return submit ? StudentAttendanceMark.ABSENT : null;
  }
  const raw = String(value).trim().toUpperCase().replace(/\s+/g, '_');
  if (raw === 'UNMARKED' || raw === 'NOT_MARKED' || raw === 'NONE') {
    return submit ? StudentAttendanceMark.ABSENT : null;
  }
  switch (raw) {
    case StudentAttendanceMark.PRESENT:
      return StudentAttendanceMark.PRESENT;
    case StudentAttendanceMark.ABSENT:
      return StudentAttendanceMark.ABSENT;
    case StudentAttendanceMark.LATE:
      return StudentAttendanceMark.LATE;
    case StudentAttendanceMark.EXCUSED:
      return StudentAttendanceMark.EXCUSED;
    case StudentAttendanceMark.SICK:
      return StudentAttendanceMark.SICK;
    case StudentAttendanceMark.SCHOOL_ACTIVITY:
      return StudentAttendanceMark.SCHOOL_ACTIVITY;
    default:
      return StudentAttendanceMark.PRESENT;
  }
}

export async function saveAttendance(
  organizationId: string,
  sessionId: string,
  teacherUserId: string,
  rows: Array<{
    studentCode: string;
    fullName: string;
    gender?: string;
    className?: string;
    stream?: string;
    rollNumber?: string;
    photoUrl?: string;
    status: StudentAttendanceMark | string;
    reason?: string | null;
    arrivalTime?: string | null;
    minutesLate?: number | null;
    notes?: string | null;
  }>,
  opts?: { submit?: boolean; email?: string | null }
) {
  const settings = await getOrCreateSettings(organizationId);
  const session = await prisma.lessonSession.findFirst({
    where: { id: sessionId, organizationId },
    include: { timetable: true },
  });
  if (!session) throw new AppError(404, 'Lesson session not found');
  await assertTeacherOwnsSession(organizationId, session, teacherUserId, opts?.email);

  const access = evaluateAttendanceAccess(
    session.scheduledStart,
    session.scheduledEnd,
    settings,
    {
      attendanceDone: session.attendanceDone,
      status: session.status,
      lessonDate: session.lessonDate,
    }
  );
  if (!access.canEdit) {
    throw new AppError(403, access.lockReason ?? 'Attendance is locked for this period');
  }

  if (
    session.status !== LessonSessionStatus.RUNNING &&
    session.status !== LessonSessionStatus.COMPLETED
  ) {
    throw new AppError(400, 'Start the lesson before taking attendance');
  }

  const now = new Date();
  const reference =
    opts?.submit && !session.attendanceReference
      ? generateAttendanceReference(now)
      : session.attendanceReference;

  const normalizedRows = rows
    .map((r) => ({
      ...r,
      studentCode: String(r.studentCode ?? '').trim(),
      fullName: String(r.fullName ?? '').trim(),
      status: normalizeAttendanceMark(r.status, opts?.submit),
    }))
    .filter((r) => r.studentCode && r.fullName && r.status !== null) as Array<
    Omit<(typeof rows)[number], 'status'> & { status: StudentAttendanceMark }
  >;

  if (normalizedRows.length === 0) {
    throw new AppError(400, 'No valid attendance rows to save');
  }

  await prisma.$transaction(
    normalizedRows.map((r) =>
      prisma.lessonAttendanceRow.upsert({
        where: {
          sessionId_studentCode: { sessionId, studentCode: r.studentCode },
        },
        update: {
          status: r.status,
          fullName: r.fullName,
          gender: r.gender,
          rollNumber: r.rollNumber,
          photoUrl: r.photoUrl,
          reason: r.reason ?? null,
          arrivalTime: r.arrivalTime ?? null,
          minutesLate: r.minutesLate ?? null,
          notes: r.notes ?? null,
          markedAt: now,
        },
        create: {
          organizationId,
          sessionId,
          studentCode: r.studentCode,
          fullName: r.fullName,
          gender: r.gender,
          className: r.className || session.className,
          stream: r.stream,
          rollNumber: r.rollNumber,
          photoUrl: r.photoUrl,
          status: r.status,
          reason: r.reason ?? null,
          arrivalTime: r.arrivalTime ?? null,
          minutesLate: r.minutesLate ?? null,
          notes: r.notes ?? null,
          markedAt: now,
        },
      })
    )
  );

  await prisma.lessonSession.update({
    where: { id: sessionId },
    data: {
      attendanceDone: opts?.submit ? true : session.attendanceDone || normalizedRows.length > 0,
      ...(opts?.submit
        ? {
            attendanceSubmittedAt: now,
            attendanceReference: reference,
            status:
              session.status === LessonSessionStatus.RUNNING
                ? LessonSessionStatus.RUNNING
                : session.status,
          }
        : {}),
    },
  });

  return prisma.lessonAttendanceRow.findMany({
    where: { sessionId },
    orderBy: [{ rollNumber: 'asc' }, { fullName: 'asc' }],
  });
}

function parseConfiguredClassLabel(label: string): Pick<AcademicClass, 'name' | 'stream' | 'label'> {
  const trimmed = label.trim();
  if (!trimmed) return { name: '', stream: null, label: '' };

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const stream = parts[parts.length - 1]!;
    const name = parts.slice(0, -1).join(' ');
    return { name, stream, label: formatClassLabel(name, stream) };
  }

  return { name: trimmed, stream: null, label: trimmed };
}

/** Classes/streams from Timetable class config (assignments + generated timetable), not Student Management. */
export async function listConfiguredClasses(
  organizationId: string,
  filters: { term?: string; academicYear?: string } = {}
): Promise<AcademicClass[]> {
  const where = {
    organizationId,
    ...(filters.term ? { term: filters.term } : {}),
    ...(filters.academicYear ? { academicYear: filters.academicYear } : {}),
  };

  const [assignmentClasses, timetableClasses, extraClasses] = await Promise.all([
    prisma.teacherAssignment.findMany({
      where: { ...where, status: AssignmentStatus.ACTIVE },
      select: { className: true },
      distinct: ['className'],
    }),
    filters.term && filters.academicYear
      ? prisma.academicTimetable.findMany({
          where,
          select: { className: true },
          distinct: ['className'],
        })
      : Promise.resolve([]),
    filters.term && filters.academicYear
      ? prisma.timetableExtraActivity.findMany({
          where,
          select: { className: true },
          distinct: ['className'],
        })
      : Promise.resolve([]),
  ]);

  const labels = new Set<string>();
  for (const row of assignmentClasses) {
    const label = row.className?.trim();
    if (label) labels.add(label);
  }
  for (const row of timetableClasses) {
    const label = row.className?.trim();
    if (label) labels.add(label);
  }
  for (const row of extraClasses) {
    const label = row.className?.trim();
    if (label) labels.add(label);
  }

  return [...labels].sort().map((label) => {
    const parsed = parseConfiguredClassLabel(label);
    return {
      id: label,
      name: parsed.name,
      stream: parsed.stream,
      label: parsed.label,
      category: null,
      grade: { name: parsed.name },
    };
  });
}

export async function listAcademicClasses(
  organizationId: string,
  filters: { term?: string; academicYear?: string } = {}
) {
  let smClasses: AcademicClass[] = [];
  try {
    smClasses = await fetchAcademicClasses(organizationId);
  } catch {
    smClasses = [];
  }

  const configured = await listConfiguredClasses(organizationId, filters);
  const byLabel = new Map<string, AcademicClass>();

  for (const c of smClasses) {
    byLabel.set(normalizeClassLabel(c.label), normalizeAcademicClass(c));
  }

  for (const cfg of configured) {
    const key = normalizeClassLabel(cfg.label);
    if (byLabel.has(key)) continue;

    const matched = matchAcademicClass(smClasses, cfg.label);
    if (matched) {
      byLabel.set(normalizeClassLabel(matched.label), matched);
      continue;
    }

    byLabel.set(key, cfg);
  }

  const classes = [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label));

  if (smClasses.length === 0) {
    return {
      source: classes.length ? ('class-config' as const) : ('unavailable' as const),
      classes,
    };
  }

  const hasConfigOnly = configured.some(
    (c) => !smClasses.some((s) => normalizeClassLabel(s.label) === normalizeClassLabel(c.label))
  );

  return {
    source: hasConfigOnly ? ('student-management+class-config' as const) : ('student-management' as const),
    classes,
  };
}

type ClassQrRow = {
  id: string;
  organizationId: string;
  name: string;
  building: string | null;
  floor: string | null;
  roomNumber: string;
  qrCode: string;
  sourceClassId: string | null;
  classLabel: string | null;
  capacity: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Raw SQL so class QR works even when Prisma client is stale (missing sourceClassId columns). */
export async function listClassQrCodes(organizationId: string): Promise<ClassQrRow[]> {
  try {
    return await prisma.$queryRaw<ClassQrRow[]>`
      SELECT
        id,
        organization_id AS "organizationId",
        name,
        building,
        floor,
        room_number AS "roomNumber",
        qr_code AS "qrCode",
        source_class_id AS "sourceClassId",
        class_label AS "classLabel",
        capacity,
        active,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM classrooms
      WHERE organization_id = ${organizationId}
        AND active = true
        AND source_class_id IS NOT NULL
      ORDER BY class_label ASC NULLS LAST, name ASC
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/relation .*classrooms.* does not exist|column .* does not exist/i.test(message)) {
      throw new AppError(
        503,
        'Classrooms table is missing columns. Run Timetable database migrations, then sync again.'
      );
    }
    throw err;
  }
}

/**
 * qr_code is UNIQUE globally. Format: {schoolCode}-QR-CLS-NNNNN (e.g. 28001-QR-CLS-00005).
 * Sequence number is global; school prefix comes from IAM organizationCode.
 */
async function nextClassQrCode(organizationId: string): Promise<string> {
  const rows = await prisma.$queryRaw<{ qr_code: string }[]>`
    SELECT qr_code FROM classrooms
    WHERE qr_code ~ 'QR-CLS-[0-9]+'
  `;
  let max = 0;
  for (const row of rows) {
    const m = String(row.qr_code).match(/QR-CLS-(\d+)/i);
    if (m) max = Math.max(max, Number.parseInt(m[1]!, 10));
  }
  const seq = `QR-CLS-${String(max + 1).padStart(5, '0')}`;
  const school = await schoolCodeForOrg(organizationId);
  return school ? `${school}-${seq}` : seq;
}

/** Upgrade legacy bare QR-CLS-* rows to school-prefixed codes when possible. */
async function ensureSchoolPrefixedQr(
  classroomId: string,
  organizationId: string,
  currentQr: string
): Promise<string> {
  const school = await schoolCodeForOrg(organizationId);
  if (!school) return currentQr;
  const upper = currentQr.trim().toUpperCase();
  if (upper.startsWith(`${school}-`)) return currentQr;
  const bare = bareClassQrToken(upper);
  if (!bare) return currentQr;
  const next = `${school}-${bare}`;
  const clash = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM classrooms WHERE qr_code = ${next} AND id <> ${classroomId} LIMIT 1
  `;
  if (clash.length) return currentQr;
  try {
    await prisma.$executeRaw`
      UPDATE classrooms SET qr_code = ${next}, updated_at = NOW() WHERE id = ${classroomId}
    `;
    return next;
  } catch {
    return currentQr;
  }
}

function isUniqueViolation(message: string): boolean {
  return /unique|duplicate|already exists|23505/i.test(message);
}

async function insertClassroomWithUniqueQr(params: {
  organizationId: string;
  name: string;
  roomNumber: string;
  sourceClassId: string;
  classLabel: string;
}): Promise<void> {
  const { organizationId, name, roomNumber, sourceClassId, classLabel } = params;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const qrCode = await nextClassQrCode(organizationId);
    try {
      await prisma.$executeRaw`
        INSERT INTO classrooms (
          id, organization_id, name, room_number, qr_code,
          source_class_id, class_label, active, created_at, updated_at
        ) VALUES (
          ${randomUUID()},
          ${organizationId},
          ${name},
          ${roomNumber},
          ${qrCode},
          ${sourceClassId},
          ${classLabel},
          true,
          NOW(),
          NOW()
        )
      `;
      return;
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      if (isUniqueViolation(message) && /qr_code/i.test(message)) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function syncClassQrCodes(organizationId: string) {
  let classes: AcademicClass[] = [];
  try {
    const listed = await listAcademicClasses(organizationId);
    classes = listed.classes;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError(503, `Could not load classes from Student Management: ${message}`);
  }

  if (!classes.length) {
    return { synced: 0, classes: await listClassQrCodes(organizationId) };
  }

  let synced = 0;

  for (const cls of classes) {
    const label = (cls.label?.trim() || cls.name?.trim() || '').trim();
    if (!label || !cls.id) continue;

    try {
      const bySource = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM classrooms
        WHERE organization_id = ${organizationId}
          AND source_class_id = ${cls.id}
        LIMIT 1
      `;

      if (bySource.length) {
        await prisma.$executeRaw`
          UPDATE classrooms
          SET name = ${label},
              class_label = ${label},
              room_number = ${label},
              active = true,
              updated_at = NOW()
          WHERE id = ${bySource[0]!.id}
        `;
        const current = await prisma.$queryRaw<{ qr_code: string }[]>`
          SELECT qr_code FROM classrooms WHERE id = ${bySource[0]!.id} LIMIT 1
        `;
        if (current[0]?.qr_code) {
          await ensureSchoolPrefixedQr(bySource[0]!.id, organizationId, current[0].qr_code);
        }
        synced += 1;
        continue;
      }

      // Reuse an existing room with the same number/name (Smart Settings) instead of unique-conflict insert.
      const byRoom = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM classrooms
        WHERE organization_id = ${organizationId}
          AND lower(trim(room_number)) = lower(trim(${label}))
        LIMIT 1
      `;

      if (byRoom.length) {
        await prisma.$executeRaw`
          UPDATE classrooms
          SET name = ${label},
              class_label = ${label},
              source_class_id = ${cls.id},
              active = true,
              updated_at = NOW()
          WHERE id = ${byRoom[0]!.id}
        `;
        const current = await prisma.$queryRaw<{ qr_code: string }[]>`
          SELECT qr_code FROM classrooms WHERE id = ${byRoom[0]!.id} LIMIT 1
        `;
        if (current[0]?.qr_code) {
          await ensureSchoolPrefixedQr(byRoom[0]!.id, organizationId, current[0].qr_code);
        }
        synced += 1;
        continue;
      }

      // Also match by class name / label when room_number differs (legacy rows).
      const byName = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM classrooms
        WHERE organization_id = ${organizationId}
          AND source_class_id IS NULL
          AND (
            lower(trim(name)) = lower(trim(${label}))
            OR lower(trim(COALESCE(class_label, ''))) = lower(trim(${label}))
          )
        LIMIT 1
      `;

      if (byName.length) {
        await prisma.$executeRaw`
          UPDATE classrooms
          SET name = ${label},
              class_label = ${label},
              room_number = ${label},
              source_class_id = ${cls.id},
              active = true,
              updated_at = NOW()
          WHERE id = ${byName[0]!.id}
        `;
        const current = await prisma.$queryRaw<{ qr_code: string }[]>`
          SELECT qr_code FROM classrooms WHERE id = ${byName[0]!.id} LIMIT 1
        `;
        if (current[0]?.qr_code) {
          await ensureSchoolPrefixedQr(byName[0]!.id, organizationId, current[0].qr_code);
        }
        synced += 1;
        continue;
      }

      await insertClassroomWithUniqueQr({
        organizationId,
        name: label,
        roomNumber: label,
        sourceClassId: cls.id,
        classLabel: label,
      });
      synced += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/relation .*classrooms.* does not exist|column .* does not exist/i.test(message)) {
        throw new AppError(
          503,
          'Classrooms table is missing. Run Timetable database migrations, then sync again.'
        );
      }
      if (isUniqueViolation(message)) {
        // Race on room_number / source_class_id — treat as already synced.
        synced += 1;
        continue;
      }
      throw new AppError(500, `Failed syncing class "${label}": ${message}`);
    }
  }

  const classRows = await listClassQrCodes(organizationId);
  return { synced, classes: classRows };
}

export type PublicClassQrInfo = {
  qrCode: string;
  className: string;
  roomNumber: string;
  building: string | null;
  schoolName: string;
  organizationCode: string | null;
  location: {
    address: string | null;
    province: string | null;
    district: string | null;
    sector: string | null;
    cell: string | null;
    village: string | null;
    label: string | null;
  };
  logoUrl: string | null;
  schoolMotto: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

export async function getPublicClassQrInfo(codeParam: string): Promise<PublicClassQrInfo> {
  const normalized = normalizeClassroomQrInput(decodeURIComponent(codeParam));
  if (!normalized) throw new AppError(400, 'Class QR code is required');

  const candidates = new Set<string>([normalized]);
  const bare = bareClassQrToken(normalized);
  if (bare) candidates.add(bare);

  let classroom: ClassQrRow | null = null;
  for (const qrCode of candidates) {
    const rows = await prisma.$queryRaw<ClassQrRow[]>`
      SELECT
        id,
        organization_id AS "organizationId",
        name,
        building,
        floor,
        room_number AS "roomNumber",
        qr_code AS "qrCode",
        source_class_id AS "sourceClassId",
        class_label AS "classLabel",
        capacity,
        active,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM classrooms
      WHERE qr_code = ${qrCode}
        AND active = true
      LIMIT 1
    `;
    if (rows[0]) {
      classroom = rows[0];
      break;
    }
  }

  if (!classroom && bare) {
    const rows = await prisma.$queryRaw<ClassQrRow[]>`
      SELECT
        id,
        organization_id AS "organizationId",
        name,
        building,
        floor,
        room_number AS "roomNumber",
        qr_code AS "qrCode",
        source_class_id AS "sourceClassId",
        class_label AS "classLabel",
        capacity,
        active,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM classrooms
      WHERE qr_code ILIKE ${'%-' + bare}
        AND active = true
      LIMIT 1
    `;
    classroom = rows[0] ?? null;
  }

  if (!classroom) throw new AppError(404, 'Class QR code not found');

  const tenant = await prisma.tenant.findUnique({
    where: { organizationId: classroom.organizationId },
  });

  const profile = await fetchIamOrganizationProfile(classroom.organizationId).catch(() => null);

  const parts = [
    profile?.village,
    profile?.cell,
    profile?.sector,
    profile?.district,
    profile?.province,
  ]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);
  const address = (profile?.address ?? '').trim() || null;
  const locationLabel =
    [address, ...parts].filter(Boolean).join(', ') ||
    parts.join(', ') ||
    null;

  return {
    qrCode: classroom.qrCode,
    className: classroom.classLabel ?? classroom.name,
    roomNumber: classroom.roomNumber,
    building: classroom.building,
    schoolName: profile?.schoolName ?? tenant?.organizationName ?? 'School',
    organizationCode: profile?.organizationCode ?? tenant?.organizationCode ?? null,
    location: {
      address,
      province: profile?.province ?? null,
      district: profile?.district ?? null,
      sector: profile?.sector ?? null,
      cell: profile?.cell ?? null,
      village: profile?.village ?? null,
      label: locationLabel,
    },
    logoUrl: profile?.logoUrl ?? null,
    schoolMotto: profile?.schoolMotto ?? null,
    phone: profile?.phone ?? null,
    email: profile?.email ?? null,
    website: profile?.website ?? null,
  };
}

export async function listAcademicStudents(
  organizationId: string,
  opts: { classId?: string; className?: string; academicYear?: string } = {}
) {
  try {
    const { students, meta } = await fetchAcademicStudents(organizationId, opts);
    return { source: 'academic' as const, students, meta };
  } catch (err) {
    return {
      source: 'unavailable' as const,
      students: [] as Awaited<ReturnType<typeof fetchAcademicStudents>>['students'],
      meta: { error: err instanceof Error ? err.message : 'Academic unavailable' },
    };
  }
}

export async function getAttendance(
  organizationId: string,
  sessionId: string,
  teacherUserId?: string,
  email?: string | null
) {
  const settings = await getOrCreateSettings(organizationId);
  const session = await prisma.lessonSession.findFirst({
    where: { id: sessionId, organizationId },
    include: { timetable: true },
  });
  if (!session) throw new AppError(404, 'Lesson session not found');

  if (teacherUserId) {
    await assertTeacherOwnsSession(organizationId, session, teacherUserId, email);
  }

  const access = evaluateAttendanceAccess(
    session.scheduledStart,
    session.scheduledEnd,
    settings,
    {
      attendanceDone: session.attendanceDone,
      status: session.status,
      lessonDate: session.lessonDate,
    }
  );

  const rows = await prisma.lessonAttendanceRow.findMany({
    where: { sessionId },
    orderBy: [{ rollNumber: 'asc' }, { fullName: 'asc' }],
  });

  const baseSession = {
    ...session,
    className: session.className,
    subjectName: session.subjectName,
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    periodLabel: session.periodLabel,
    attendanceSubmittedAt: session.attendanceSubmittedAt,
    attendanceReference: session.attendanceReference,
  };

  if (rows.length > 0) {
    return {
      session: baseSession,
      rows,
      demo: false,
      source: 'saved' as const,
      access,
      studentCount: rows.length,
    };
  }

  const slot = await prisma.academicTimetable.findFirst({
    where: { id: session.timetableId, organizationId },
    select: { academicYear: true },
  });

  const rosterAttempts: Array<{ year?: string; tag: string }> = [
    { tag: 'current-enrollment' },
    ...(slot?.academicYear ? [{ year: slot.academicYear, tag: 'timetable-year' }] : []),
  ];

  try {
    for (const attempt of rosterAttempts) {
      try {
        const { students, meta: rosterMeta } = await fetchStudentsForClass(
          organizationId,
          session.className,
          attempt.year
        );
        if (students.length > 0) {
          return {
            session: baseSession,
            rows: students.map((s) => ({
              id: null,
              studentCode: s.studentCode,
              fullName: s.fullName,
              gender: s.gender,
              className: s.className || session.className,
              stream: s.stream,
              rollNumber: s.rollNumber,
              photoUrl: s.photoUrl,
              status: 'PRESENT' as const,
              reason: null,
              arrivalTime: null,
              minutesLate: null,
              notes: null,
              markedAt: null,
            })),
            demo: false,
            source: 'academic' as const,
            access,
            studentCount: students.length,
            rosterMeta: { ...rosterMeta, attempt: attempt.tag },
          };
        }
      } catch {
        // try next
      }
    }

    let rosterMeta: { classId: string | null; classLabel: string; matched: boolean; source: string } = {
      classId: null,
      classLabel: session.className,
      matched: false,
      source: 'student-management:none',
    };
    try {
      const empty = await fetchStudentsForClass(organizationId, session.className);
      rosterMeta = empty.meta;
    } catch {
      // keep default meta
    }

    return {
      session: baseSession,
      rows: [],
      demo: false,
      source: 'academic' as const,
      access,
      studentCount: 0,
      rosterMeta,
    };
  } catch (err) {
    const demoRows = demoRoster(session.className).map((s) => ({
      ...s,
      status: 'PRESENT' as const,
      id: null,
      reason: null,
      arrivalTime: null,
      minutesLate: null,
      notes: null,
      markedAt: null,
    }));
    return {
      session: baseSession,
      rows: demoRows,
      demo: true,
      source: 'demo' as const,
      access,
      studentCount: demoRows.length,
    };
  }
}

export async function teacherAccountProfile(
  organizationId: string,
  teacherUserId: string,
  email?: string | null
) {
  const normalizedEmail = email?.trim().toLowerCase();
  const profiles = await prisma.timetableTeacherProfile.findMany({
    where: {
      organizationId,
      OR: [
        { teacherUserId },
        ...(normalizedEmail ? [{ loginEmail: normalizedEmail }] : []),
      ],
    },
  });

  let profile = normalizedEmail
    ? profiles.find((p) => p.loginEmail?.trim().toLowerCase() === normalizedEmail)
    : undefined;
  if (!profile) profile = profiles.find((p) => p.teacherUserId === teacherUserId);
  if (!profile && profiles.length === 1) profile = profiles[0];
  if (!profile) return null;

  return {
    teacherUserId: profile.teacherUserId,
    teacherName: profile.teacherName,
    loginEmail: profile.loginEmail,
    loginPhone: profile.loginPhone,
    portalEnabled: profile.portalEnabled,
    loginMethod: profile.loginMethod,
    emailMatched: Boolean(
      normalizedEmail && profile.loginEmail?.trim().toLowerCase() === normalizedEmail
    ),
  };
}

export async function attendanceHistory(
  organizationId: string,
  teacherUserId: string,
  opts?: { term?: string; academicYear?: string; email?: string | null; teacherName?: string | null; limit?: number }
) {
  const teacherIds = await resolveTeacherUserIds(
    organizationId,
    teacherUserId,
    opts?.email,
    opts?.teacherName
  );
  const sessions = await prisma.lessonSession.findMany({
    where: {
      organizationId,
      teacherUserId: teacherIdFilter(teacherIds),
      attendanceDone: true,
    },
    include: { attendance: true, timetable: true },
    orderBy: [{ lessonDate: 'desc' }, { scheduledStart: 'desc' }],
    take: opts?.limit ?? 30,
  });

  return sessions.map((s) => {
    const present = s.attendance.filter((a) => a.status === 'PRESENT').length;
    const absent = s.attendance.filter((a) => a.status === 'ABSENT').length;
    const late = s.attendance.filter((a) => a.status === 'LATE').length;
    const excused = s.attendance.filter(
      (a) => a.status === 'EXCUSED' || a.status === 'SICK' || a.status === 'SCHOOL_ACTIVITY'
    ).length;
    return {
      sessionId: s.id,
      date: s.lessonDate.toISOString().slice(0, 10),
      periodLabel: s.periodLabel,
      className: s.className,
      subjectName: s.subjectName,
      startTime: s.scheduledStart,
      endTime: s.scheduledEnd,
      reference: s.attendanceReference,
      submittedAt: s.attendanceSubmittedAt,
      present,
      absent,
      late,
      excused,
      total: s.attendance.length,
      term: s.timetable?.term ?? null,
      academicYear: s.timetable?.academicYear ?? null,
    };
  });
}

export async function teacherCheckInHistory(
  organizationId: string,
  teacherUserId: string,
  opts?: { term?: string; academicYear?: string; email?: string | null; teacherName?: string | null; limit?: number; date?: string }
) {
  const teacherIds = await resolveTeacherUserIds(
    organizationId,
    teacherUserId,
    opts?.email,
    opts?.teacherName
  );
  const where: Prisma.LessonSessionWhereInput = {
    organizationId,
    teacherUserId: teacherIdFilter(teacherIds),
    scannedAt: { not: null },
  };

  if (opts?.date) {
    where.lessonDate = dateOnly(new Date(`${opts.date}T12:00:00`));
  }

  const sessions = await prisma.lessonSession.findMany({
    where,
    include: { timetable: true },
    orderBy: [{ lessonDate: 'desc' }, { scheduledStart: 'desc' }],
    take: opts?.limit ?? 50,
  });

  const filtered = sessions.filter((s) => {
    if (opts?.term && s.timetable?.term !== opts.term) return false;
    if (opts?.academicYear && s.timetable?.academicYear !== opts.academicYear) return false;
    return true;
  });

  return filtered.map((s) => ({
    sessionId: s.id,
    date: s.lessonDate.toISOString().slice(0, 10),
    periodLabel: s.periodLabel,
    className: s.className,
    subjectName: s.subjectName,
    room: s.room,
    startTime: s.scheduledStart,
    endTime: s.scheduledEnd,
    checkedInAt: s.scannedAt?.toISOString() ?? null,
    punctuality: s.punctuality,
    qrVerified: s.qrVerified,
    minutesLate:
      s.scannedAt && s.scheduledStart
        ? minutesLateFromStart(s.scheduledStart, s.scannedAt)
        : 0,
    term: s.timetable?.term ?? null,
    academicYear: s.timetable?.academicYear ?? null,
  }));
}

function demoRoster(className: string) {
  return [
    { studentCode: 'STU-001', fullName: 'Aline Uwase', gender: 'F', className, stream: 'A', rollNumber: '1' },
    { studentCode: 'STU-002', fullName: 'Eric Niyonzima', gender: 'M', className, stream: 'A', rollNumber: '2' },
    { studentCode: 'STU-003', fullName: 'Diane Mukamana', gender: 'F', className, stream: 'A', rollNumber: '3' },
    { studentCode: 'STU-004', fullName: 'Jean Habimana', gender: 'M', className, stream: 'A', rollNumber: '4' },
    { studentCode: 'STU-005', fullName: 'Grace Ingabire', gender: 'F', className, stream: 'A', rollNumber: '5' },
  ];
}

export async function completeLesson(
  organizationId: string,
  sessionId: string,
  teacherUserId: string,
  input: {
    topic?: string;
    objectives?: string;
    notes?: string;
    homework?: string;
    resourcesUsed?: string;
    nextLessonPlan?: string;
    draft?: boolean;
  }
) {
  const session = await prisma.lessonSession.findFirst({
    where: { id: sessionId, organizationId },
  });
  if (!session) throw new AppError(404, 'Lesson session not found');
  if (session.teacherUserId !== teacherUserId) throw new AppError(403, 'Not your lesson');

  const updated = await prisma.lessonSession.update({
    where: { id: sessionId },
    data: {
      topic: input.topic,
      objectives: input.objectives,
      notes: input.notes,
      homework: input.homework,
      resourcesUsed: input.resourcesUsed,
      nextLessonPlan: input.nextLessonPlan,
      ...(input.draft
        ? {}
        : { status: LessonSessionStatus.COMPLETED, completedAt: new Date() }),
    },
  });

  if (!input.draft) {
    emitLiveMonitorChanged(organizationId, {
      event: 'check_out',
      sessionId: updated.id,
      room: displayLocation(updated.room, updated.className),
    });
  }

  return updated;
}

type LiveRoomStatus = 'ON_TIME' | 'LATE' | 'MISSING' | 'UPCOMING' | 'COMPLETED' | 'FREE';

function displayLocation(room: string | null | undefined, className: string) {
  return room?.trim() || className;
}

function resolveLiveRoomStatus(
  slot: { startTime: string; endTime: string },
  session: {
    scannedAt: Date | null;
    punctuality: PunctualityStatus;
    status: LessonSessionStatus;
  } | undefined,
  now: number,
  settings: { missingCheckInAfterMinutes: number }
): LiveRoomStatus {
  const phase = lessonPhase(slot.startTime, slot.endTime, now);
  if (phase === 'upcoming') return 'UPCOMING';
  if (!session?.scannedAt) {
    if (phase === 'current') {
      const missingAfter = parseHm(slot.startTime) + settings.missingCheckInAfterMinutes;
      return now >= missingAfter ? 'MISSING' : 'UPCOMING';
    }
    return phase === 'past' ? 'MISSING' : 'FREE';
  }
  if (phase === 'past' || session.status === LessonSessionStatus.COMPLETED) return 'COMPLETED';
  if (
    session.punctuality === PunctualityStatus.LATE ||
    session.punctuality === PunctualityStatus.VERY_LATE
  ) {
    return 'LATE';
  }
  return 'ON_TIME';
}

function liveStatusPriority(status: LiveRoomStatus) {
  const order: LiveRoomStatus[] = ['MISSING', 'LATE', 'ON_TIME', 'UPCOMING', 'COMPLETED', 'FREE'];
  return order.indexOf(status);
}

function mapRoomDisplayScore(
  slot: { startTime: string; endTime: string },
  session: { scannedAt: Date | null } | undefined,
  status: LiveRoomStatus,
  now: number
) {
  const phase = lessonPhase(slot.startTime, slot.endTime, now);
  let score = phase === 'current' ? 1000 : phase === 'upcoming' ? 500 : 0;
  if (session?.scannedAt) score += 200;
  if (status === 'ON_TIME') score += 80;
  else if (status === 'LATE') score += 70;
  else if (status === 'COMPLETED') score += 60;
  else if (status === 'UPCOMING') score += 40;
  else if (status === 'MISSING') score += 10;
  return score;
}

function formatClock(iso: string | Date | null | undefined) {
  if (!iso) return null;
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function sessionDurationMinutes(start: Date | null | undefined, end: Date | null | undefined) {
  if (!start || !end) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export async function liveMonitor(
  organizationId: string,
  opts?: { term?: string; academicYear?: string }
) {
  const settings = await getOrCreateSettings(organizationId);
  const day = todayName();
  const lessonDate = dateOnly();
  const now = nowMinutes();

  // Mark missed lessons past end without scan
  const todaySlots = await prisma.academicTimetable.findMany({
    where: {
      organizationId,
      dayOfWeek: day,
      ...(opts?.term ? { term: opts.term } : {}),
      ...(opts?.academicYear
        ? { academicYear: { in: academicYearVariants(opts.academicYear) } }
        : {}),
    },
    orderBy: { startTime: 'asc' },
  });

  for (const slot of todaySlots) {
    if (now <= parseHm(slot.endTime) + 5) continue;
    const existing = await prisma.lessonSession.findUnique({
      where: { timetableId_lessonDate: { timetableId: slot.id, lessonDate } },
    });
    if (!existing) {
      await prisma.lessonSession.create({
        data: {
          organizationId,
          timetableId: slot.id,
          lessonDate,
          status: LessonSessionStatus.MISSED,
          punctuality: PunctualityStatus.MISSED,
          scheduledStart: slot.startTime,
          scheduledEnd: slot.endTime,
          teacherUserId: slot.teacherUserId,
          teacherName: slot.teacherName,
          className: slot.className,
          subjectName: slot.subjectName,
          room: slot.room,
        },
      });
      if (settings.reminderEnabled) {
        await prisma.smartNotification.create({
          data: {
            organizationId,
            audience: 'head_of_studies',
            title: 'Lesson missed',
            message: `${slot.teacherName} did not start ${slot.subjectName} (${slot.className})`,
            relatedType: 'lesson',
            relatedId: slot.id,
          },
        });
      }
    } else if (
      existing.status === LessonSessionStatus.SCHEDULED ||
      existing.status === LessonSessionStatus.WAITING
    ) {
      await prisma.lessonSession.update({
        where: { id: existing.id },
        data: { status: LessonSessionStatus.MISSED, punctuality: PunctualityStatus.MISSED },
      });
    }
  }

  const sessions = await prisma.lessonSession.findMany({
    where: { organizationId, lessonDate },
    include: { classroom: true, timetable: true },
    orderBy: { scheduledStart: 'asc' },
  });

  const currentSlots = todaySlots.filter((s) => {
    const phase = lessonPhase(s.startTime, s.endTime, now);
    return phase === 'current';
  });

  const running = sessions.filter((s) => s.status === LessonSessionStatus.RUNNING);
  const completed = sessions.filter((s) => s.status === LessonSessionStatus.COMPLETED);
  const missed = sessions.filter((s) => s.status === LessonSessionStatus.MISSED);
  const late = sessions.filter(
    (s) =>
      s.punctuality === PunctualityStatus.LATE || s.punctuality === PunctualityStatus.VERY_LATE
  );
  const onTime = sessions.filter(
    (s) =>
      s.punctuality === PunctualityStatus.ON_TIME || s.punctuality === PunctualityStatus.EARLY
  );

  const grid = currentSlots.map((slot) => {
    const session = sessions.find((s) => s.timetableId === slot.id);
    return {
      period: slot.startTime,
      time: `${slot.startTime} – ${slot.endTime}`,
      classroom: slot.room || slot.className,
      subject: slot.subjectName,
      teacher: slot.teacherName,
      qrVerified: session?.qrVerified ?? false,
      attendance: session?.attendanceDone ? 'Completed' : session?.status === 'RUNNING' ? 'Pending' : 'Not Started',
      status: session?.status ?? 'WAITING',
      punctuality: session?.punctuality ?? 'NOT_STARTED',
      sessionId: session?.id ?? null,
      timetableId: slot.id,
    };
  });

  const upcomingSlots = todaySlots.filter((s) => lessonPhase(s.startTime, s.endTime, now) === 'upcoming');

  const classrooms = await prisma.classroom.findMany({
    where: { organizationId, active: true },
    orderBy: [{ building: 'asc' }, { floor: 'asc' }, { name: 'asc' }],
  });

  const mapRoomsMap = new Map<string, Record<string, unknown>>();
  todaySlots.forEach((slot, index) => {
    const label = displayLocation(slot.room, slot.className);
    const key = label.toLowerCase();
    const session = sessions.find((s) => s.timetableId === slot.id);
    const classroom = classrooms.find(
      (c) =>
        c.name.toLowerCase() === slot.className.toLowerCase() ||
        c.classLabel?.toLowerCase() === slot.className.toLowerCase() ||
        c.roomNumber.toLowerCase() === label.toLowerCase()
    );
    const status = resolveLiveRoomStatus(slot, session, now, settings);
    const score = mapRoomDisplayScore(slot, session, status, now);
    const existing = mapRoomsMap.get(key) as { status?: LiveRoomStatus; score?: number } | undefined;
    if (!existing || score > (existing.score ?? 0)) {
      mapRoomsMap.set(key, {
        id: classroom?.id ?? key,
        label,
        className: slot.className,
        subject: slot.subjectName,
        teacher: slot.teacherName,
        building: classroom?.building ?? 'Main Block',
        floor: classroom?.floor ?? 'Ground Floor',
        status,
        score,
        periodLabel: formatPeriodLabel(index),
        startTime: slot.startTime,
        endTime: slot.endTime,
        minutesLate:
          session?.scannedAt && session.scheduledStart
            ? minutesLateFromStart(session.scheduledStart, session.scannedAt)
            : null,
        checkedInAt: session?.scannedAt?.toISOString() ?? null,
        checkedOutAt: session?.completedAt?.toISOString() ?? null,
        timetableId: slot.id,
        sessionId: session?.id ?? null,
        qrVerified: session?.qrVerified ?? false,
        attendanceDone: session?.attendanceDone ?? false,
      });
    }
  });

  for (const classroom of classrooms) {
    const label = classroom.classLabel?.trim() || classroom.name;
    const key = label.toLowerCase();
    if (!mapRoomsMap.has(key)) {
      mapRoomsMap.set(key, {
        id: classroom.id,
        label,
        className: classroom.classLabel ?? classroom.name,
        subject: null,
        teacher: null,
        building: classroom.building ?? 'Main Block',
        floor: classroom.floor ?? 'Ground Floor',
        status: 'FREE' as LiveRoomStatus,
        periodLabel: null,
        startTime: null,
        endTime: null,
        minutesLate: null,
        checkedInAt: null,
        checkedOutAt: null,
        timetableId: null,
        sessionId: null,
        qrVerified: false,
        attendanceDone: false,
      });
    }
  }

  const mapRooms = [...mapRoomsMap.values()].map(({ score: _score, ...room }) => room);

  const currentPeriodStatuses = currentSlots.map((slot) => {
    const session = sessions.find((s) => s.timetableId === slot.id);
    return resolveLiveRoomStatus(slot, session, now, settings);
  });
  const statusCounts = {
    onTime: currentPeriodStatuses.filter((s) => s === 'ON_TIME' || s === 'COMPLETED').length,
    late: currentPeriodStatuses.filter((s) => s === 'LATE').length,
    missing: currentPeriodStatuses.filter((s) => s === 'MISSING').length,
    upcoming: currentPeriodStatuses.filter((s) => s === 'UPCOMING').length,
  };

  const currentPeriodSlot = currentSlots[0] ?? null;
  const currentPeriod = currentPeriodSlot
    ? {
        label: formatPeriodLabel(todaySlots.indexOf(currentPeriodSlot)),
        startTime: currentPeriodSlot.startTime,
        endTime: currentPeriodSlot.endTime,
        progressPercent: Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((now - parseHm(currentPeriodSlot.startTime)) /
                Math.max(1, parseHm(currentPeriodSlot.endTime) - parseHm(currentPeriodSlot.startTime))) *
                100
            )
          )
        ),
      }
    : null;

  const periodTimeline = todaySlots.map((slot, index) => ({
    label: formatPeriodLabel(index),
    startTime: slot.startTime,
    endTime: slot.endTime,
    isCurrent: lessonPhase(slot.startTime, slot.endTime, now) === 'current',
    isPast: lessonPhase(slot.startTime, slot.endTime, now) === 'past',
  }));

  const alerts: Array<Record<string, unknown>> = [];
  for (const s of sessions) {
    if (s.scannedAt) {
      const isLate =
        s.punctuality === PunctualityStatus.LATE || s.punctuality === PunctualityStatus.VERY_LATE;
      if (isLate && settings.alertLateEnabled) {
        alerts.push({
          id: `late-${s.id}`,
          type: 'LATE',
          at: s.scannedAt.toISOString(),
          message: `Teacher late by ${minutesLateFromStart(s.scheduledStart, s.scannedAt)} minutes`,
          room: displayLocation(s.room, s.className),
          className: s.className,
          subject: s.subjectName,
          teacher: s.teacherName,
          mapKey: displayLocation(s.room, s.className).toLowerCase(),
        });
      } else if (!isLate) {
        alerts.push({
          id: `in-${s.id}`,
          type: 'CHECK_IN',
          at: s.scannedAt.toISOString(),
          message: 'Teacher checked in',
          room: displayLocation(s.room, s.className),
          className: s.className,
          subject: s.subjectName,
          teacher: s.teacherName,
          mapKey: displayLocation(s.room, s.className).toLowerCase(),
        });
      }
    }
    if (s.status === LessonSessionStatus.MISSED && settings.alertMissingCheckInEnabled) {
      alerts.push({
        id: `miss-${s.id}`,
        type: 'MISSING',
        at: s.updatedAt.toISOString(),
        message: 'Teacher not checked in',
        room: displayLocation(s.room, s.className),
        className: s.className,
        subject: s.subjectName,
        teacher: s.teacherName,
        mapKey: displayLocation(s.room, s.className).toLowerCase(),
      });
    }
    if (
      settings.alertMissingCheckOutEnabled &&
      s.scannedAt &&
      s.status !== LessonSessionStatus.COMPLETED &&
      now > parseHm(s.scheduledEnd) + 5
    ) {
      alerts.push({
        id: `out-${s.id}`,
        type: 'MISSING_CHECKOUT',
        at: s.updatedAt.toISOString(),
        message: 'Missing check-out',
        room: displayLocation(s.room, s.className),
        className: s.className,
        subject: s.subjectName,
        teacher: s.teacherName,
        mapKey: displayLocation(s.room, s.className).toLowerCase(),
      });
    }
    if (
      settings.alertEarlyDepartureEnabled &&
      s.completedAt &&
      s.scannedAt &&
      s.status === LessonSessionStatus.COMPLETED
    ) {
      const endM = parseHm(s.scheduledEnd);
      const leftM = s.completedAt.getHours() * 60 + s.completedAt.getMinutes();
      if (leftM < endM - 5) {
        alerts.push({
          id: `early-${s.id}`,
          type: 'EARLY_DEPARTURE',
          at: s.completedAt.toISOString(),
          message: 'Teacher left before period ended',
          room: displayLocation(s.room, s.className),
          className: s.className,
          subject: s.subjectName,
          teacher: s.teacherName,
          mapKey: displayLocation(s.room, s.className).toLowerCase(),
        });
      }
    }
  }
  alerts.sort((a, b) => String(b.at).localeCompare(String(a.at)));

  const teachers = currentSlots.map((slot) => {
    const session = sessions.find((s) => s.timetableId === slot.id);
    const status = resolveLiveRoomStatus(slot, session, now, settings);
    return {
      teacher: slot.teacherName,
      className: slot.className,
      subject: slot.subjectName,
      room: displayLocation(slot.room, slot.className),
      status,
      minutesLate:
        session?.scannedAt && session.scheduledStart
          ? minutesLateFromStart(session.scheduledStart, session.scannedAt)
          : null,
      timetableId: slot.id,
    };
  });

  const courseMap = new Map<string, Array<Record<string, unknown>>>();
  for (const slot of currentSlots) {
    const session = sessions.find((s) => s.timetableId === slot.id);
    const status = resolveLiveRoomStatus(slot, session, now, settings);
    const entry = {
      className: slot.className,
      room: displayLocation(slot.room, slot.className),
      teacher: slot.teacherName,
      status,
      minutesLate:
        session?.scannedAt && session.scheduledStart
          ? minutesLateFromStart(session.scheduledStart, session.scannedAt)
          : null,
    };
    const list = courseMap.get(slot.subjectName) ?? [];
    list.push(entry);
    courseMap.set(slot.subjectName, list);
  }
  const courses = [...courseMap.entries()].map(([subject, classes]) => ({ subject, classes }));

  const buildings = [...new Set(mapRooms.map((r) => String(r.building ?? 'Main Block')))].sort();
  const floors = [...new Set(mapRooms.map((r) => String(r.floor ?? 'Ground Floor')))].sort();

  return {
    refreshedAt: new Date().toISOString(),
    refreshSeconds: settings.liveRefreshSeconds,
    day,
    currentTime: hmFromMinutes(now),
    kpis: {
      classesRunningNow: running.length,
      teachersPresent: onTime.length,
      teachersLate: late.length,
      teachersMissing: missed.length,
      lessonsCompleted: completed.length,
      lessonsPending: Math.max(0, currentSlots.length - running.length - completed.length),
      attendanceCompletion: sessions.filter((s) => s.attendanceDone).length,
      activeQrScans: sessions.filter((s) => s.qrVerified && s.status === 'RUNNING').length,
      onTime: statusCounts.onTime,
      late: statusCounts.late,
      missing: statusCounts.missing,
      upcoming: statusCounts.upcoming,
      activeClasses: currentSlots.length,
      roomsOccupied: mapRooms.filter((r) => r.status !== 'FREE').length,
      totalRooms: mapRooms.length,
    },
    cards: running.map((s) => ({
      sessionId: s.id,
      teacherName: s.teacherName,
      subject: s.subjectName,
      className: s.className,
      classroom: displayLocation(s.room, s.className),
      building: s.classroom?.building,
      startTime: s.scheduledStart,
      scanTime: s.scannedAt,
      punctuality: s.punctuality,
      attendanceDone: s.attendanceDone,
      status: s.status,
      qrVerified: s.qrVerified,
    })),
    grid,
    mapRooms,
    currentPeriod,
    periodTimeline,
    alerts: alerts.slice(0, 20),
    needsAttention: {
      missing: statusCounts.missing,
      late: statusCounts.late,
      conflicts: 0,
    },
    teachers,
    courses,
    buildings,
    floors,
    settings: {
      graceMinutesOnTime: settings.graceMinutesOnTime,
      liveRefreshSeconds: settings.liveRefreshSeconds,
      lateThresholdMinutes: settings.lateThresholdMinutes,
      missingCheckInAfterMinutes: settings.missingCheckInAfterMinutes,
      alertLateEnabled: settings.alertLateEnabled,
      alertMissingCheckInEnabled: settings.alertMissingCheckInEnabled,
      alertMissingCheckOutEnabled: settings.alertMissingCheckOutEnabled,
      alertEarlyDepartureEnabled: settings.alertEarlyDepartureEnabled,
      notifyHeadOfStudies: settings.notifyHeadOfStudies,
      notifyDeputyHead: settings.notifyDeputyHead,
      notifyDepartmentHead: settings.notifyDepartmentHead,
    },
  };
}

export async function livePeriodReplay(
  organizationId: string,
  opts: {
    date: string;
    periodLabel: string;
    term?: string;
    academicYear?: string;
  }
) {
  const lessonDate = dateOnly(new Date(`${opts.date}T12:00:00`));
  const day = DAY_NAMES[new Date(`${opts.date}T12:00:00`).getDay()];

  const slots = await prisma.academicTimetable.findMany({
    where: {
      organizationId,
      dayOfWeek: day,
      ...(opts.term ? { term: opts.term } : {}),
      ...(opts.academicYear
        ? { academicYear: { in: academicYearVariants(opts.academicYear) } }
        : {}),
    },
    orderBy: { startTime: 'asc' },
  });

  const periodSlots = slots.filter((_, index) => formatPeriodLabel(index) === opts.periodLabel);
  if (periodSlots.length === 0) {
    throw new AppError(404, `No lessons found for ${opts.periodLabel} on ${opts.date}`);
  }

  const sessions = await prisma.lessonSession.findMany({
    where: {
      organizationId,
      lessonDate,
      timetableId: { in: periodSlots.map((s) => s.id) },
    },
  });

  const settings = await getOrCreateSettings(organizationId);
  const events: Array<Record<string, unknown>> = [];
  const mapRooms: Array<Record<string, unknown>> = [];

  const periodStart = periodSlots[0]!.startTime;
  const periodEnd = periodSlots[periodSlots.length - 1]!.endTime;

  events.push({
    at: periodStart,
    isoAt: `${opts.date}T${periodStart}:00`,
    type: 'SCHEDULED',
    message: 'Period scheduled',
  });

  for (const slot of periodSlots) {
    const index = slots.indexOf(slot);
    const session = sessions.find((s) => s.timetableId === slot.id);
    const room = displayLocation(slot.room, slot.className);

    if (session?.scannedAt) {
      const isLate =
        session.punctuality === PunctualityStatus.LATE ||
        session.punctuality === PunctualityStatus.VERY_LATE;
      events.push({
        at: formatClock(session.scannedAt),
        isoAt: session.scannedAt.toISOString(),
        type: isLate ? 'LATE_CHECK_IN' : 'CHECK_IN',
        message: isLate
          ? `${slot.teacherName} checked in late`
          : `${slot.teacherName} checked in`,
        teacher: slot.teacherName,
        room,
        className: slot.className,
        subject: slot.subjectName,
      });
    } else if (session?.status === LessonSessionStatus.MISSED) {
      events.push({
        at: slot.startTime,
        isoAt: `${opts.date}T${slot.startTime}:00`,
        type: 'MISSING',
        message: `${slot.teacherName} did not check in`,
        teacher: slot.teacherName,
        room,
        className: slot.className,
        subject: slot.subjectName,
      });
    }

    if (session?.completedAt) {
      events.push({
        at: formatClock(session.completedAt),
        isoAt: session.completedAt.toISOString(),
        type: 'CHECK_OUT',
        message: `${slot.teacherName} checked out`,
        teacher: slot.teacherName,
        room,
        className: slot.className,
        subject: slot.subjectName,
      });
    } else if (
      session?.scannedAt &&
      settings.alertMissingCheckOutEnabled &&
      session.status !== LessonSessionStatus.COMPLETED
    ) {
      events.push({
        at: slot.endTime,
        isoAt: `${opts.date}T${slot.endTime}:00`,
        type: 'MISSING_CHECKOUT',
        message: `${slot.teacherName} missing check-out`,
        teacher: slot.teacherName,
        room,
        className: slot.className,
        subject: slot.subjectName,
      });
    }

    const status = session?.scannedAt
      ? session.punctuality === PunctualityStatus.LATE ||
        session.punctuality === PunctualityStatus.VERY_LATE
        ? 'LATE'
        : session.status === LessonSessionStatus.COMPLETED
          ? 'COMPLETED'
          : 'ON_TIME'
      : session?.status === LessonSessionStatus.MISSED
        ? 'MISSING'
        : 'FREE';

    mapRooms.push({
      id: slot.id,
      label: room,
      className: slot.className,
      subject: slot.subjectName,
      teacher: slot.teacherName,
      status,
      periodLabel: formatPeriodLabel(index),
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }

  events.push({
    at: periodEnd,
    isoAt: `${opts.date}T${periodEnd}:00`,
    type: 'PERIOD_END',
    message: 'Period completed',
  });

  events.sort((a, b) => String(a.isoAt).localeCompare(String(b.isoAt)));

  return {
    date: opts.date,
    day,
    periodLabel: opts.periodLabel,
    startTime: periodStart,
    endTime: periodEnd,
    events,
    mapRooms,
  };
}

export async function liveHistory(
  organizationId: string,
  opts?: {
    term?: string;
    academicYear?: string;
    date?: string;
    className?: string;
    teacherName?: string;
    status?: string;
    limit?: number;
  }
) {
  const lessonDate = opts?.date
    ? dateOnly(new Date(`${opts.date}T12:00:00`))
    : dateOnly();
  const day = opts?.date
    ? DAY_NAMES[new Date(`${opts.date}T12:00:00`).getDay()]
    : todayName();

  const slots = await prisma.academicTimetable.findMany({
    where: {
      organizationId,
      dayOfWeek: day,
      ...(opts?.term ? { term: opts.term } : {}),
      ...(opts?.academicYear
        ? { academicYear: { in: academicYearVariants(opts.academicYear) } }
        : {}),
      ...(opts?.className ? { className: opts.className } : {}),
      ...(opts?.teacherName
        ? { teacherName: { contains: opts.teacherName, mode: 'insensitive' } }
        : {}),
    },
    orderBy: { startTime: 'asc' },
  });

  const sessions = await prisma.lessonSession.findMany({
    where: {
      organizationId,
      lessonDate,
      timetableId: { in: slots.map((s) => s.id) },
    },
    include: { attendance: true },
  });

  const rows = slots.map((slot, index) => {
    const session = sessions.find((s) => s.timetableId === slot.id);
    const liveStatus = session?.scannedAt
      ? session.punctuality === PunctualityStatus.LATE ||
        session.punctuality === PunctualityStatus.VERY_LATE
        ? 'LATE'
        : session.status === LessonSessionStatus.COMPLETED
          ? 'COMPLETED'
          : 'ON_TIME'
      : session?.status === LessonSessionStatus.MISSED
        ? 'NOT_CHECKED_IN'
        : 'NOT_CHECKED_IN';

    const rowStatus = opts?.status && opts.status !== 'ALL' ? liveStatus : liveStatus;

    return {
      sessionId: session?.id ?? null,
      timetableId: slot.id,
      date: lessonDate.toISOString().slice(0, 10),
      periodLabel: formatPeriodLabel(index),
      startTime: slot.startTime,
      endTime: slot.endTime,
      teacher: slot.teacherName,
      subject: slot.subjectName,
      className: slot.className,
      room: displayLocation(slot.room, slot.className),
      checkIn: formatClock(session?.scannedAt),
      checkOut: formatClock(session?.completedAt),
      durationMinutes: sessionDurationMinutes(session?.scannedAt, session?.completedAt),
      status: rowStatus,
      punctuality: session?.punctuality ?? 'NOT_STARTED',
      qrVerified: session?.qrVerified ?? false,
      scanDevice: session?.scanDevice ?? null,
      studentsMarked: session?.attendance.length ?? 0,
    };
  }).filter((row) => !opts?.status || opts.status === 'ALL' || row.status === opts.status);

  const onTime = rows.filter((r) => r.status === 'ON_TIME' || r.status === 'COMPLETED').length;
  const late = rows.filter((r) => r.status === 'LATE').length;
  const missing = rows.filter((r) => r.status === 'NOT_CHECKED_IN').length;
  const lateMinutes = rows
    .filter((r) => r.status === 'LATE' && r.checkIn)
    .map((r) => minutesLateFromStart(r.startTime, new Date(`${r.date}T${r.checkIn}:00`)))
    .filter((n) => n > 0);
  const avgDelayMinutes =
    lateMinutes.length > 0
      ? Math.round(lateMinutes.reduce((a, b) => a + b, 0) / lateMinutes.length)
      : 0;

  const teacherStatsMap = new Map<
    string,
    { teacher: string; total: number; onTime: number; late: number; missing: number }
  >();
  for (const row of rows) {
    const stat = teacherStatsMap.get(row.teacher) ?? {
      teacher: row.teacher,
      total: 0,
      onTime: 0,
      late: 0,
      missing: 0,
    };
    stat.total += 1;
    if (row.status === 'ON_TIME' || row.status === 'COMPLETED') stat.onTime += 1;
    else if (row.status === 'LATE') stat.late += 1;
    else stat.missing += 1;
    teacherStatsMap.set(row.teacher, stat);
  }

  const teacherStats = [...teacherStatsMap.values()]
    .map((t) => ({
      ...t,
      onTimeRate: t.total > 0 ? Math.round((t.onTime / t.total) * 100) : 0,
    }))
    .sort((a, b) => b.onTimeRate - a.onTimeRate);

  const mapRooms = rows.map((row) => ({
    id: row.timetableId,
    label: row.room,
    className: row.className,
    subject: row.subject,
    teacher: row.teacher,
    status:
      row.status === 'NOT_CHECKED_IN'
        ? 'MISSING'
        : row.status === 'LATE'
          ? 'LATE'
          : row.status === 'COMPLETED'
            ? 'COMPLETED'
            : 'ON_TIME',
    periodLabel: row.periodLabel,
    startTime: row.startTime,
    endTime: row.endTime,
  }));

  return {
    date: lessonDate.toISOString().slice(0, 10),
    day,
    summary: {
      periods: rows.length,
      onTime,
      late,
      missing,
      avgDelayMinutes,
      verificationRate:
        rows.length > 0
          ? Math.round((rows.filter((r) => r.qrVerified).length / rows.length) * 1000) / 10
          : 0,
    },
    rows: rows.slice(0, opts?.limit ?? 200),
    teacherStats,
    mapRooms,
  };
}

export async function teacherAnalytics(organizationId: string, teacherUserId?: string) {
  const where = {
    organizationId,
    ...(teacherUserId ? { teacherUserId } : {}),
  };
  const sessions = await prisma.lessonSession.findMany({ where });
  const assigned = await prisma.academicTimetable.count({
    where: { organizationId, ...(teacherUserId ? { teacherUserId } : {}) },
  });
  const completed = sessions.filter((s) => s.status === LessonSessionStatus.COMPLETED).length;
  const onTime = sessions.filter(
    (s) =>
      s.punctuality === PunctualityStatus.ON_TIME || s.punctuality === PunctualityStatus.EARLY
  ).length;
  const late = sessions.filter(
    (s) =>
      s.punctuality === PunctualityStatus.LATE || s.punctuality === PunctualityStatus.VERY_LATE
  ).length;
  const missed = sessions.filter((s) => s.status === LessonSessionStatus.MISSED).length;
  const qr = sessions.filter((s) => s.qrVerified).length;
  const att = sessions.filter((s) => s.attendanceDone).length;
  const denom = Math.max(1, sessions.length);

  return {
    lessonsAssigned: assigned,
    lessonsCompleted: completed,
    onTimePercent: Math.round((onTime / denom) * 100),
    lateArrivals: late,
    missedLessons: missed,
    qrVerificationRate: Math.round((qr / denom) * 100),
    attendanceCompletionRate: Math.round((att / denom) * 100),
  };
}

export async function listNotifications(organizationId: string, audience?: string) {
  return prisma.smartNotification.findMany({
    where: {
      organizationId,
      ...(audience ? { audience } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
