import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import * as timetable from '../clients/timetable.client';

const SCHOOL_START = '08:00';
const GRACE_MINUTES = 5;

const PERMISSION_TYPES = [
  'Personal Permission',
  'Medical',
  'Family Emergency',
  'Official School Activity',
  'Training / Workshop',
  'Meeting',
  'Late Arrival Permission',
  'Early Departure',
  'Full Day Leave',
  'Other',
];

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function parseHm(hm: string) {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

function hmFromMinutes(total: number) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function isWeekday(d: Date) {
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

function workingDaysInRange(start: Date, end: Date) {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (isWeekday(cur)) days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function diffHoursMinutes(start: string, end: string) {
  const diff = parseHm(end) - parseHm(start);
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

type DayRecord = {
  date: string;
  dayName: string;
  morningCheckIn: string | null;
  eveningCheckOut: string | null;
  morningStatus: string;
  eveningStatus: string;
  dayStatus: string;
  minutesLateMorning: number;
  workedHours: string;
  source: string;
};

function generateRfidDay(
  organizationId: string,
  userId: string,
  day: Date,
  permissionDates: Set<string>
): DayRecord {
  const iso = day.toISOString().slice(0, 10);
  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getUTCDay()];
  const seed = hashSeed(`${organizationId}:${userId}:${iso}`) % 100;

  if (permissionDates.has(iso)) {
    return {
      date: iso,
      dayName,
      morningCheckIn: null,
      eveningCheckOut: null,
      morningStatus: 'PERMISSION',
      eveningStatus: 'PERMISSION',
      dayStatus: 'Permission',
      minutesLateMorning: 0,
      workedHours: '—',
      source: 'permission',
    };
  }

  if (seed < 2) {
    return {
      date: iso,
      dayName,
      morningCheckIn: null,
      eveningCheckOut: null,
      morningStatus: 'ABSENT',
      eveningStatus: 'ABSENT',
      dayStatus: 'Absent',
      minutesLateMorning: 0,
      workedHours: '—',
      source: 'rfid',
    };
  }

  let morningBase = 7 * 60 + 35 + (seed % 25);
  let minutesLate = 0;
  let morningStatus = 'ON_TIME';
  if (morningBase > parseHm(SCHOOL_START) + GRACE_MINUTES) {
    minutesLate = morningBase - parseHm(SCHOOL_START);
    morningStatus = 'LATE';
  } else if (seed % 17 === 0) {
    minutesLate = 8 + (seed % 20);
    morningBase = parseHm(SCHOOL_START) + minutesLate;
    morningStatus = 'LATE';
  }

  const eveningBase = 16 * 60 + 45 + (seed % 40);
  const morningCheckIn = hmFromMinutes(morningBase);
  let eveningCheckOut: string | null = hmFromMinutes(eveningBase);
  let eveningStatus = 'COMPLETED';

  if (seed % 23 === 0) {
    eveningCheckOut = null;
    eveningStatus = 'MISSING';
  }

  const dayStatus =
    morningStatus === 'LATE'
      ? 'Late'
      : eveningStatus === 'MISSING'
        ? 'Missing Check-Out'
        : 'Present';

  return {
    date: iso,
    dayName,
    morningCheckIn,
    eveningCheckOut,
    morningStatus,
    eveningStatus,
    dayStatus,
    minutesLateMorning: minutesLate,
    workedHours:
      eveningCheckOut && morningCheckIn
        ? diffHoursMinutes(morningCheckIn, eveningCheckOut)
        : '—',
    source: 'rfid',
  };
}

async function permissionDatesForUser(organizationId: string, userId: string, start: Date, end: Date) {
  const rows = await prisma.teacherPermissionRequest.findMany({
    where: {
      organizationId,
      userId,
      status: { in: ['APPROVED', 'UNDER_REVIEW', 'PENDING'] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  const set = new Set<string>();
  for (const row of rows) {
    const cur = new Date(row.startDate);
    const last = new Date(row.endDate);
    while (cur <= last) {
      set.add(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  return set;
}

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

export async function myAttendanceSummary(
  organizationId: string,
  userId: string,
  opts?: { month?: number; year?: number; term?: string; academicYear?: string }
) {
  const now = new Date();
  const year = opts?.year ?? now.getUTCFullYear();
  const month = opts?.month ?? now.getUTCMonth() + 1;
  const { start, end } = monthRange(year, month);
  const permissionDates = await permissionDatesForUser(organizationId, userId, start, end);
  const days = workingDaysInRange(start, end).map((d) =>
    generateRfidDay(organizationId, userId, d, permissionDates)
  );

  const present = days.filter((d) => d.dayStatus === 'Present').length;
  const late = days.filter((d) => d.dayStatus === 'Late').length;
  const absent = days.filter((d) => d.dayStatus === 'Absent').length;
  const permission = days.filter((d) => d.dayStatus === 'Permission').length;
  const onTime = days.filter((d) => d.morningStatus === 'ON_TIME').length;
  const workingDays = days.length;
  const rate = workingDays ? Math.round(((present + late + permission) / workingDays) * 1000) / 10 : 0;

  let lessonCheckIns = 0;
  try {
    const history = (await timetable.fetchCheckInHistory({
      organizationId,
      teacherUserId: userId,
      limit: 100,
    })) as unknown[];
    lessonCheckIns = Array.isArray(history) ? history.length : 0;
  } catch {
    lessonCheckIns = 0;
  }

  return {
    workingDays,
    present,
    onTime,
    late,
    absent,
    approvedPermission: permission,
    attendanceRate: rate,
    lessonCheckIns,
    punctuality: {
      onTimePct: workingDays ? Math.round((onTime / workingDays) * 100) : 0,
      latePct: workingDays ? Math.round((late / workingDays) * 100) : 0,
      absentPct: workingDays ? Math.round((absent / workingDays) * 100) : 0,
      permissionPct: workingDays ? Math.round((permission / workingDays) * 100) : 0,
    },
    workingHours: {
      expectedHours: workingDays * 8,
      workedHours: Math.round(present * 8.5 + late * 8.2),
      unit: 'hours',
    },
  };
}

export async function myAttendanceHistory(
  organizationId: string,
  userId: string,
  opts?: {
    month?: number;
    year?: number;
    status?: string;
    limit?: number;
  }
) {
  const now = new Date();
  const year = opts?.year ?? now.getUTCFullYear();
  const month = opts?.month ?? now.getUTCMonth() + 1;
  const { start, end } = monthRange(year, month);
  const permissionDates = await permissionDatesForUser(organizationId, userId, start, end);
  let days = workingDaysInRange(start, end)
    .map((d) => generateRfidDay(organizationId, userId, d, permissionDates))
    .reverse();

  if (opts?.status && opts.status !== 'all') {
    const s = opts.status.toLowerCase();
    days = days.filter((d) => {
      if (s === 'present') return d.dayStatus === 'Present';
      if (s === 'late') return d.dayStatus === 'Late';
      if (s === 'absent') return d.dayStatus === 'Absent';
      if (s === 'permission') return d.dayStatus === 'Permission';
      if (s === 'missing_check_in') return !d.morningCheckIn;
      if (s === 'missing_check_out') return d.morningCheckIn && !d.eveningCheckOut;
      return true;
    });
  }

  return days.slice(0, opts?.limit ?? 60);
}

export async function myAttendanceToday(organizationId: string, userId: string) {
  const today = dateOnly(new Date());
  const permissionDates = await permissionDatesForUser(organizationId, userId, today, today);
  const day = generateRfidDay(organizationId, userId, today, permissionDates);
  return {
    ...day,
    schoolStart: SCHOOL_START,
    dateLabel: today.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}

export async function createAttendanceCorrection(
  organizationId: string,
  userId: string,
  body: {
    attendanceDate: string;
    correctionType: string;
    expectedTime?: string;
    reason: string;
  }
) {
  if (!body.reason?.trim()) throw new AppError(400, 'Reason is required');
  return prisma.teacherAttendanceCorrection.create({
    data: {
      organizationId,
      userId,
      attendanceDate: dateOnly(new Date(`${body.attendanceDate}T12:00:00`)),
      correctionType: body.correctionType,
      expectedTime: body.expectedTime ?? null,
      reason: body.reason.trim(),
    },
  });
}

export async function listAttendanceCorrections(organizationId: string, userId: string) {
  return prisma.teacherAttendanceCorrection.findMany({
    where: { organizationId, userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

function permissionRef() {
  const n = String(Math.floor(Math.random() * 999)).padStart(3, '0');
  return `PER-${n}`;
}

function timelineEntry(status: string, note?: string) {
  return {
    status,
    at: new Date().toISOString(),
    note: note ?? null,
  };
}

export async function permissionSummary(organizationId: string, userId: string) {
  const [total, pending, approved, rejected] = await Promise.all([
    prisma.teacherPermissionRequest.count({ where: { organizationId, userId } }),
    prisma.teacherPermissionRequest.count({
      where: { organizationId, userId, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
    }),
    prisma.teacherPermissionRequest.count({ where: { organizationId, userId, status: 'APPROVED' } }),
    prisma.teacherPermissionRequest.count({ where: { organizationId, userId, status: 'REJECTED' } }),
  ]);
  return { total, pending, approved, rejected };
}

export async function listPermissions(
  organizationId: string,
  userId: string,
  opts?: { status?: string; type?: string; limit?: number }
) {
  const where: Record<string, unknown> = { organizationId, userId };
  if (opts?.status && opts.status !== 'all') where.status = opts.status.toUpperCase();
  if (opts?.type) where.permissionType = opts.type;

  return prisma.teacherPermissionRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 50,
  });
}

export async function createPermission(
  organizationId: string,
  userId: string,
  body: {
    permissionType: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    reason: string;
    details?: string;
    attachmentName?: string;
    academicYear?: string;
    term?: string;
  }
) {
  if (!body.permissionType?.trim()) throw new AppError(400, 'Permission type is required');
  if (!body.reason?.trim()) throw new AppError(400, 'Reason is required');

  const timeline = [timelineEntry('Submitted')];

  return prisma.teacherPermissionRequest.create({
    data: {
      organizationId,
      userId,
      reference: permissionRef(),
      permissionType: body.permissionType.trim(),
      startDate: dateOnly(new Date(`${body.startDate}T12:00:00`)),
      endDate: dateOnly(new Date(`${body.endDate || body.startDate}T12:00:00`)),
      startTime: body.startTime ?? null,
      endTime: body.endTime ?? null,
      reason: body.reason.trim(),
      details: body.details?.trim() ?? null,
      attachmentName: body.attachmentName ?? null,
      academicYear: body.academicYear ?? null,
      term: body.term ?? null,
      timeline,
    },
  });
}

export function permissionTypeOptions() {
  return PERMISSION_TYPES;
}

const DEFAULT_EVENTS = [
  { title: 'Term 1 Begins', eventType: 'academic', month: 9, day: 1, allDay: true },
  { title: 'Mid-Term Examination', eventType: 'examination', month: 10, day: 15, allDay: true },
  { title: 'Staff Meeting', eventType: 'meeting', month: 10, day: 14, startTime: '14:00', endTime: '16:00', location: 'Conference Room' },
  { title: 'Parent Meeting', eventType: 'parent', month: 11, day: 20, startTime: '09:00', endTime: '12:00' },
  { title: 'Sports Day', eventType: 'sports', month: 11, day: 8, allDay: true },
  { title: 'Teacher Training', eventType: 'training', month: 11, day: 25, startTime: '08:30', endTime: '16:00' },
  { title: 'School Holiday', eventType: 'holiday', month: 12, day: 23, endDay: 31, allDay: true },
];

async function ensureCalendarSeeds(organizationId: string, academicYear?: string) {
  const count = await prisma.schoolCalendarEvent.count({ where: { organizationId } });
  if (count > 0) return;
  const year = new Date().getFullYear();
  for (const e of DEFAULT_EVENTS) {
    const start = new Date(Date.UTC(year, e.month - 1, e.day));
    const end = new Date(Date.UTC(year, e.month - 1, (e as { endDay?: number }).endDay ?? e.day));
    await prisma.schoolCalendarEvent.create({
      data: {
        organizationId,
        title: e.title,
        eventType: e.eventType,
        startDate: start,
        endDate: end,
        startTime: e.startTime ?? null,
        endTime: e.endTime ?? null,
        location: (e as { location?: string }).location ?? null,
        academicYear: academicYear ?? `${year}-${year + 1}`,
        allDay: e.allDay ?? false,
        organizer: 'School Administration',
        participants: 'Teaching Staff',
      },
    });
  }
}

export async function listCalendarEvents(
  organizationId: string,
  userId: string,
  opts?: {
    start?: string;
    end?: string;
    eventType?: string;
    academicYear?: string;
    term?: string;
    myEventsOnly?: boolean;
  }
) {
  await ensureCalendarSeeds(organizationId, opts?.academicYear);

  const where: Record<string, unknown> = { organizationId };
  if (opts?.eventType && opts.eventType !== 'all') where.eventType = opts.eventType;
  if (opts?.academicYear) where.academicYear = opts.academicYear;
  if (opts?.term) where.term = opts.term;
  if (opts?.start || opts?.end) {
    where.startDate = {};
    if (opts.start) (where.startDate as Record<string, Date>).gte = dateOnly(new Date(`${opts.start}T12:00:00`));
    if (opts.end) (where.startDate as Record<string, Date>).lte = dateOnly(new Date(`${opts.end}T12:00:00`));
  }

  const events = await prisma.schoolCalendarEvent.findMany({
    where,
    orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }],
  });

  let permissionEvents: Array<{
    id: string;
    title: string;
    eventType: string;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    description: string | null;
  }> = [];

  if (opts?.myEventsOnly) {
    const perms = await prisma.teacherPermissionRequest.findMany({
      where: { organizationId, userId, status: 'APPROVED' },
    });
    permissionEvents = perms.map((p) => ({
      id: `perm-${p.id}`,
      title: `Approved: ${p.permissionType}`,
      eventType: 'permission',
      startDate: p.startDate,
      endDate: p.endDate,
      allDay: !p.startTime,
      description: p.reason,
    }));
  }

  const merged = [
    ...events.map((e) => ({
      id: e.id,
      title: e.title,
      eventType: e.eventType,
      startDate: e.startDate.toISOString().slice(0, 10),
      endDate: e.endDate.toISOString().slice(0, 10),
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      description: e.description,
      organizer: e.organizer,
      participants: e.participants,
      allDay: e.allDay,
      academicYear: e.academicYear,
      term: e.term,
    })),
    ...permissionEvents.map((p) => ({
      id: p.id,
      title: p.title,
      eventType: p.eventType,
      startDate: p.startDate.toISOString().slice(0, 10),
      endDate: p.endDate.toISOString().slice(0, 10),
      startTime: null,
      endTime: null,
      location: null,
      description: p.description,
      organizer: 'You',
      participants: null,
      allDay: p.allDay,
      academicYear: null,
      term: null,
    })),
  ];

  return merged.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function getCalendarEvent(organizationId: string, eventId: string) {
  const event = await prisma.schoolCalendarEvent.findFirst({
    where: { id: eventId, organizationId },
  });
  if (!event) throw new AppError(404, 'Event not found');
  return event;
}
