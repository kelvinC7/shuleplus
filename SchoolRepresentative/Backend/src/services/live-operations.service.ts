import type { AuthState } from '../middleware/auth.middleware';
import { DEMO_STAFF, DEMO_STUDENTS } from '../demo/demo-data';
import { schoolData } from './school-data.service';
import {
  moduleData,
  type AttendanceTapRow,
  type LessonSessionRow,
  type ModuleStudent,
  type StaffRosterRow,
} from './module-data.service';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end && out.length < 62; t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const isStaffLevel = (level: string | null) => Boolean(level?.startsWith('STAFF:'));
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  return h * 60 + (m || 0);
};

export interface AttendanceReportQuery {
  organizationId?: string;
  from: string;
  to: string;
  className?: string;
  search?: string;
}

interface PersonAttendance {
  id: string;
  organizationId: string;
  schoolName: string;
  name: string;
  code: string;
  group: string;
  presentDates: Set<string>;
  lastEntry: string | null;
  lastExit: string | null;
  latest: 'present' | 'late' | 'absent';
}

function demoAttendanceReport(query: AttendanceReportQuery) {
  const days = daysBetween(query.from, query.to);
  const students = DEMO_STUDENTS.filter(
    (s) =>
      (!query.organizationId || query.organizationId === 'all' || s.organizationId === query.organizationId) &&
      (!query.className || s.className === query.className)
  );
  const staff = DEMO_STAFF.filter(
    (s) => !query.organizationId || query.organizationId === 'all' || s.organizationId === query.organizationId
  );
  const dailyFor = (date: string, base: number) => {
    const wobble = (date.charCodeAt(9) + date.charCodeAt(6)) % 5;
    return Math.min(99, base - 1 + wobble * 0.6);
  };
  const studentBase = students.length ? students.reduce((a, s) => a + s.attendanceRate, 0) / students.length : 0;
  const staffBase = staff.length ? staff.reduce((a, s) => a + s.attendanceRate, 0) / staff.length : 0;
  const daily = days.map((date) => ({
    date,
    studentRate: Math.round(dailyFor(date, studentBase) * 10) / 10,
    staffRate: Math.round(dailyFor(date, staffBase) * 10) / 10,
  }));
  const rows = students.map((s) => ({
    id: s.id,
    organizationId: s.organizationId,
    schoolName: s.schoolName,
    code: s.studentCode,
    name: s.fullName,
    group: s.className ?? 'Unassigned',
    presentDays: Math.round((days.length * s.attendanceRate) / 100),
    schoolDays: days.length,
    rate: s.attendanceRate,
    lastEntry: null,
    lastExit: null,
    status: s.attendanceToday,
  }));
  const staffRows = staff.map((s) => ({
    id: s.id,
    organizationId: s.organizationId,
    schoolName: s.schoolName,
    code: s.employeeCode,
    name: s.fullName,
    group: s.role,
    presentDays: Math.round((days.length * s.attendanceRate) / 100),
    schoolDays: days.length,
    rate: s.attendanceRate,
    lastEntry: null,
    lastExit: null,
    status: s.attendanceToday,
  }));
  const latest = daily[daily.length - 1];
  return {
    range: { from: query.from, to: query.to, days: days.length },
    kpis: {
      studentRate: latest ? Math.round(daily.reduce((a, d) => a + d.studentRate, 0) / daily.length * 10) / 10 : 0,
      staffRate: latest ? Math.round(daily.reduce((a, d) => a + d.staffRate, 0) / daily.length * 10) / 10 : 0,
      studentsTotal: students.length,
      staffTotal: staff.length,
      studentsPresent: students.filter((s) => s.attendanceToday === 'present' || s.attendanceToday === 'late').length,
      staffPresent: staff.filter((s) => s.attendanceToday === 'present' || s.attendanceToday === 'late').length,
      late: students.filter((s) => s.attendanceToday === 'late').length,
      absent: students.filter((s) => s.attendanceToday === 'absent').length,
    },
    daily,
    byClass: classSummary(rows),
    students: rows,
    staff: staffRows,
    classes: [...new Set(students.map((s) => s.className ?? 'Unassigned'))].sort(),
  };
}

function classSummary(rows: Array<{ group: string; rate: number }>) {
  const map = new Map<string, { className: string; total: number; rateSum: number }>();
  for (const r of rows) {
    const item = map.get(r.group) ?? { className: r.group, total: 0, rateSum: 0 };
    item.total += 1;
    item.rateSum += r.rate;
    map.set(r.group, item);
  }
  return [...map.values()]
    .map((c) => ({ className: c.className, total: c.total, rate: Math.round((c.rateSum / c.total) * 10) / 10 }))
    .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
}

/** Students and staff attendance over a date range, from Attendance tap records (entry/exit cards). */
export async function attendanceReport(auth: AuthState, query: AttendanceReportQuery) {
  if (auth.mode === 'demo') return demoAttendanceReport(query);

  const days = daysBetween(query.from, query.to);
  const schools = await schoolData.schools(auth, { organizationId: query.organizationId });

  const perSchool = await Promise.all(
    schools.map(async (school) => {
      const [students, records, staff] = await Promise.all([
        moduleData.studentManagement.students(school.id, {}),
        moduleData.attendance.records(school.id, { from: query.from, to: query.to }),
        moduleData.staff.roster(school.id),
      ]);
      return { school, students, records, staff };
    })
  );

  const schoolDaySet = new Set<string>();
  const studentRows: PersonAttendance[] = [];
  const staffRows: PersonAttendance[] = [];
  const dailyStudents = new Map<string, number>();
  const dailyStaff = new Map<string, number>();
  let studentsTotal = 0;
  let staffTotal = 0;
  let lateEvents = 0;

  for (const { school, students, records, staff } of perSchool) {
    for (const r of records) schoolDaySet.add(r.lessonDate.slice(0, 10));
    studentsTotal += students.length;
    staffTotal += staff.length;

    const tapsByCode = new Map<string, AttendanceTapRow[]>();
    const staffTaps = new Map<string, AttendanceTapRow[]>();
    for (const r of records) {
      if (isStaffLevel(r.level)) {
        const key = norm(r.studentName);
        staffTaps.set(key, [...(staffTaps.get(key) ?? []), r]);
      } else {
        if (r.status?.toUpperCase().includes('LATE')) lateEvents += 1;
        const key = r.studentCode ?? norm(r.studentName);
        tapsByCode.set(key, [...(tapsByCode.get(key) ?? []), r]);
      }
    }

    const build = (
      id: string,
      name: string,
      code: string,
      group: string,
      taps: AttendanceTapRow[] | undefined
    ): PersonAttendance => {
      const presentDates = new Set<string>();
      let lastEntry: string | null = null;
      let lastExit: string | null = null;
      let latestDate = '';
      let latest: PersonAttendance['latest'] = 'absent';
      for (const t of taps ?? []) {
        const date = t.lessonDate.slice(0, 10);
        if (t.entryTime) presentDates.add(date);
        if (t.entryTime && (!lastEntry || t.entryTime > lastEntry)) lastEntry = t.entryTime;
        if (t.exitTime && (!lastExit || t.exitTime > lastExit)) lastExit = t.exitTime;
        if (date >= latestDate && t.entryTime) {
          latestDate = date;
          latest = t.status?.toUpperCase().includes('LATE') ? 'late' : 'present';
        }
      }
      return {
        id,
        organizationId: school.id,
        schoolName: school.name,
        name,
        code,
        group,
        presentDates,
        lastEntry,
        lastExit,
        latest,
      };
    };

    for (const st of students as ModuleStudent[]) {
      const row = build(st.id, st.fullName, st.studentCode, st.className ?? 'Unassigned', tapsByCode.get(st.studentCode));
      studentRows.push(row);
      for (const d of row.presentDates) dailyStudents.set(d, (dailyStudents.get(d) ?? 0) + 1);
    }
    for (const sf of staff as StaffRosterRow[]) {
      const row = build(sf.id, sf.fullName, sf.employeeNumber ?? '', sf.position ?? 'Staff', staffTaps.get(norm(sf.fullName)));
      staffRows.push(row);
      for (const d of row.presentDates) dailyStaff.set(d, (dailyStaff.get(d) ?? 0) + 1);
    }
  }

  const schoolDays = [...schoolDaySet].sort();
  const schoolDayCount = schoolDays.length;
  const visibleDays = schoolDayCount ? schoolDays : days;

  const toRow = (p: PersonAttendance) => {
    const presentDays = [...p.presentDates].filter((d) => schoolDaySet.has(d)).length;
    return {
      id: p.id,
      organizationId: p.organizationId,
      schoolName: p.schoolName,
      code: p.code,
      name: p.name,
      group: p.group,
      presentDays,
      schoolDays: schoolDayCount,
      rate: pct(presentDays, schoolDayCount),
      lastEntry: p.lastEntry,
      lastExit: p.lastExit,
      status: p.latest,
    };
  };

  const students = studentRows.map(toRow).filter((s) => {
    if (query.className && s.group !== query.className) return false;
    if (query.search) {
      const q = query.search.toLowerCase();
      return `${s.name} ${s.code} ${s.group}`.toLowerCase().includes(q);
    }
    return true;
  });

  const staff = staffRows.map(toRow);

  const daily = visibleDays.map((date) => ({
    date,
    studentRate: pct(dailyStudents.get(date) ?? 0, studentsTotal),
    staffRate: pct(dailyStaff.get(date) ?? 0, staffTotal),
    studentsPresent: dailyStudents.get(date) ?? 0,
    staffPresent: dailyStaff.get(date) ?? 0,
  }));

  const latestDay = daily[daily.length - 1];
  const avg = (values: number[]) => (values.length ? Math.round((values.reduce((a, v) => a + v, 0) / values.length) * 10) / 10 : 0);

  return {
    range: { from: query.from, to: query.to, days: schoolDayCount },
    kpis: {
      studentRate: avg(daily.map((d) => d.studentRate)),
      staffRate: avg(daily.map((d) => d.staffRate)),
      studentsTotal,
      staffTotal,
      studentsPresent: latestDay?.studentsPresent ?? 0,
      staffPresent: latestDay?.staffPresent ?? 0,
      late: lateEvents,
      absent: Math.max(0, studentsTotal - (latestDay?.studentsPresent ?? 0)),
    },
    daily,
    byClass: classSummary(students),
    students,
    staff,
    classes: [...new Set(studentRows.map((s) => s.group))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  };
}

export interface TeachingNowSession {
  id: string;
  organizationId: string;
  schoolName: string;
  classId: string;
  className: string;
  subject: string;
  teacher: string;
  room: string | null;
  students: number;
  present: number;
  status: 'teaching' | 'gap' | 'late' | 'scheduled';
  topic: string;
  time: string;
  startedAt: string | null;
  attendanceDone: boolean;
  teacherCheckedIn: boolean;
}

/** Live lessons in the current period, joined from Timetable (schedule + started sessions) and Attendance (gate taps). */
export async function teachingNow(auth: AuthState, organizationId?: string) {
  const now = new Date();
  const date = localDate(now);
  const weekday = WEEKDAYS[now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const schools = await schoolData.schools(auth, { organizationId });
  const perSchool = await Promise.all(
    schools.map(async (school) => {
      const [entries, sessions, records, students] = await Promise.all([
        moduleData.timetable.entries(school.id, { dayOfWeek: weekday }),
        moduleData.lessons.sessions(school.id, date),
        moduleData.attendance.records(school.id, { date }),
        moduleData.studentManagement.students(school.id, {}),
      ]);
      return { school, entries, sessions, records, students };
    })
  );

  const slotMap = new Map<string, { start: string; end: string }>();
  for (const { entries } of perSchool) {
    for (const e of entries) slotMap.set(`${e.startTime}-${e.endTime}`, { start: e.startTime, end: e.endTime });
  }
  const slots = [...slotMap.values()].sort((a, b) => a.start.localeCompare(b.start));
  const currentIndex = slots.findIndex((s) => minutes(s.start) <= nowMin && nowMin < minutes(s.end));
  const current = currentIndex >= 0 ? slots[currentIndex] : null;

  const sessions: TeachingNowSession[] = [];
  if (current) {
    for (const { school, entries, sessions: lessons, records, students } of perSchool) {
      const checkedInStaff = new Set(
        records.filter((r) => isStaffLevel(r.level) && r.entryTime).map((r) => norm(r.studentName))
      );
      const checkedInStudents = new Set(
        records.filter((r) => !isStaffLevel(r.level) && r.entryTime).map((r) => r.studentCode ?? norm(r.studentName))
      );

      for (const e of entries.filter((x) => x.startTime === current.start && x.endTime === current.end)) {
        const lesson = lessons.find(
          (l) => l.className === e.className && l.scheduledStart.slice(0, 5) === e.startTime
        ) as LessonSessionRow | undefined;
        const roster = students.filter((s) => s.className === e.className);
        const present = roster.filter((s) => checkedInStudents.has(s.studentCode)).length;
        const started = Boolean(lesson?.startedAt);
        const late = started && (lesson?.punctuality ?? '').toUpperCase().includes('LATE');
        const status: TeachingNowSession['status'] = started
          ? late
            ? 'late'
            : 'teaching'
          : nowMin > minutes(e.startTime) + 5
            ? 'gap'
            : 'scheduled';
        sessions.push({
          id: `${school.id}:${e.id}`,
          organizationId: school.id,
          schoolName: school.name,
          classId: e.className,
          className: e.className,
          subject: e.subjectName,
          teacher: e.teacherName,
          room: e.room ?? null,
          students: roster.length,
          present,
          status,
          topic: lesson?.periodLabel ?? '',
          time: `${e.startTime}–${e.endTime}`,
          startedAt: lesson?.startedAt ?? null,
          attendanceDone: Boolean(lesson?.attendanceDone),
          teacherCheckedIn: checkedInStaff.has(norm(e.teacherName)),
        });
      }
    }
  }

  const count = (status: TeachingNowSession['status']) => sessions.filter((s) => s.status === status).length;

  return {
    date,
    currentPeriod: current
      ? { id: currentIndex + 1, label: `P${currentIndex + 1}`, time: `${current.start}–${current.end}` }
      : null,
    periods: slots.map((s, i) => ({ id: i + 1, label: `P${i + 1}`, time: `${s.start}–${s.end}` })),
    summary: {
      total: sessions.length,
      teaching: count('teaching'),
      gap: count('gap'),
      late: count('late'),
      scheduled: count('scheduled'),
      cover: 0,
      exam: 0,
    },
    sessions,
  };
}

/** Students of one class with today's gate status (entry/exit cards). */
export async function classAttendanceToday(auth: AuthState, organizationId: string, className: string) {
  const date = localDate();
  if (auth.mode === 'demo') {
    const rows = DEMO_STUDENTS.filter((s) => s.organizationId === organizationId && s.className === className);
    return {
      date,
      className,
      students: rows.map((s) => ({
        id: s.id,
        studentCode: s.studentCode,
        fullName: s.fullName,
        status: s.attendanceToday,
        entryTime: null,
        exitTime: null,
      })),
    };
  }
  const [students, records] = await Promise.all([
    moduleData.studentManagement.students(organizationId, {}),
    moduleData.attendance.records(organizationId, { date }),
  ]);
  const byCode = new Map<string, AttendanceTapRow>();
  for (const r of records) {
    if (!isStaffLevel(r.level) && r.studentCode) byCode.set(r.studentCode, r);
  }
  return {
    date,
    className,
    students: students
      .filter((s) => s.className === className)
      .map((s) => {
        const tap = byCode.get(s.studentCode);
        const status = !tap?.entryTime ? 'absent' : tap.status?.toUpperCase().includes('LATE') ? 'late' : 'present';
        return {
          id: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
          status,
          entryTime: tap?.entryTime ?? null,
          exitTime: tap?.exitTime ?? null,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
  };
}
