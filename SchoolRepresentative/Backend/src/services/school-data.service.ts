import type { AuthState } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import {
  iamGet,
  type IamSchool,
  type IamOverview,
  type IamAttendance,
  type IamFeesOverview,
  type IamAcademics,
  type IamFinancePayroll,
  type IamStudentRow,
  type IamStaffRow,
  type IamAlert,
} from '../clients/iam.client';
import {
  DEMO_SCHOOLS,
  DEMO_OVERVIEW,
  DEMO_ATTENDANCE,
  DEMO_FEES,
  DEMO_ACADEMICS,
  DEMO_FINANCE_PAYROLL,
  DEMO_STUDENTS,
  DEMO_STAFF,
  DEMO_ALERTS,
  DEMO_ACADEMIC_CONTEXT,
  DEMO_MARKS,
  DEMO_TIMETABLE_ENTRIES,
} from '../demo/demo-data';
import { moduleData, type AcademicMarkRow, type ModuleStudent, type TimetableRow } from './module-data.service';

export interface Scoped {
  organizationId?: string;
  academicYear?: string;
  term?: string;
}

export interface ConsoleStudentRow {
  id: string;
  organizationId: string;
  schoolName: string;
  studentCode: string;
  fullName: string;
  className: string | null;
  classId: string | null;
  gender: 'M' | 'F' | null;
  academicYear: string | null;
  attendanceToday: string;
  attendanceRate: number;
}

export interface StudentFilters {
  organizationId?: string;
  search?: string;
  className?: string;
  academicYear?: string;
  gender?: string;
  status?: string;
}

export interface MarksFilters {
  organizationId?: string;
  academicYear?: string;
  term?: string;
  className?: string;
  course?: string;
}

export interface TimetableFilters {
  organizationId?: string;
  academicYear?: string;
  term?: string;
  className?: string;
  teacherId?: string;
}

export interface ConsoleTimetableEntry {
  id: string;
  organizationId: string;
  schoolName: string;
  className: string;
  subject: string;
  teacherId: string;
  teacher: string;
  room: string | null;
  day: string;
  startTime: string;
  endTime: string;
}

function scopeOf(auth: AuthState, organizationId?: string): string | undefined {
  if (!organizationId || organizationId === 'all') return undefined;
  return organizationId;
}

function filterSchools(schools: IamSchool[], organizationId?: string): IamSchool[] {
  if (!organizationId || organizationId === 'all') return schools;
  return schools.filter((s) => s.id === organizationId);
}

function genderOf(value: unknown): 'M' | 'F' | null {
  const g = String(value ?? '').trim().toUpperCase();
  if (g.startsWith('F')) return 'F';
  if (g.startsWith('M')) return 'M';
  return null;
}

function rateOf(attendance: string): number {
  if (attendance === 'present') return 98;
  if (attendance === 'late') return 92;
  return 0;
}

/** Best-effort attendance merge from IAM (gate data lives outside Student Management). */
async function attendanceByCode(auth: AuthState, organizationId?: string): Promise<Map<string, string>> {
  try {
    const rows = await iamGet<IamStudentRow[]>(auth, '/students', { organizationId });
    return new Map(rows.map((r) => [r.studentCode, r.attendanceToday]));
  } catch {
    return new Map();
  }
}

async function liveStudents(auth: AuthState, filters: StudentFilters): Promise<ConsoleStudentRow[]> {
  const schools = await schoolData.schools(auth, { organizationId: filters.organizationId });
  const attendance = await attendanceByCode(auth, filters.organizationId);

  const lists = await Promise.all(
    schools.map(async (school) => {
      const students: ModuleStudent[] = await moduleData.studentManagement.students(school.id, {
        academicYear: filters.academicYear,
      });
      return students.map((st): ConsoleStudentRow => {
        const attendanceToday = attendance.get(st.studentCode) ?? 'unknown';
        return {
          id: st.id,
          organizationId: school.id,
          schoolName: school.name,
          studentCode: st.studentCode,
          fullName: st.fullName,
          className: st.className ?? null,
          classId: st.classId ?? null,
          gender: genderOf(st.gender),
          academicYear: st.academicYear ?? null,
          attendanceToday,
          attendanceRate: rateOf(attendanceToday),
        };
      });
    })
  );
  return lists.flat();
}

function applyStudentFilters(rows: ConsoleStudentRow[], filters: StudentFilters): ConsoleStudentRow[] {
  let out = rows;
  if (filters.className) out = out.filter((r) => r.className === filters.className);
  if (filters.academicYear) out = out.filter((r) => r.academicYear === filters.academicYear);
  if (filters.gender === 'M' || filters.gender === 'F') out = out.filter((r) => r.gender === filters.gender);
  if (filters.status) out = out.filter((r) => r.attendanceToday === filters.status);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter((r) =>
      `${r.fullName} ${r.studentCode} ${r.className ?? ''} ${r.schoolName}`.toLowerCase().includes(q)
    );
  }
  return out;
}

function groupBy<T>(rows: T[], keyOf: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  return map;
}

function aggregateMarks(rows: AcademicMarkRow[]) {
  const pct = (list: AcademicMarkRow[]) => (list.length ? list.reduce((a, r) => a + r.percentage, 0) / list.length : 0);
  const passRate = (list: AcademicMarkRow[]) =>
    list.length ? (list.filter((r) => r.percentage >= 50).length / list.length) * 100 : 0;
  const summarise = (list: AcademicMarkRow[]) => ({
    average: Math.round(pct(list) * 10) / 10,
    passRate: Math.round(passRate(list) * 10) / 10,
    entries: list.length,
    students: new Set(list.map((r) => r.studentId)).size,
  });

  return {
    summary: {
      ...summarise(rows),
      exams: new Set(rows.map((r) => r.exam)).size,
    },
    byClass: [...groupBy(rows, (r) => r.className).entries()]
      .map(([className, list]) => ({ className, ...summarise(list) }))
      .sort((a, b) => a.className.localeCompare(b.className)),
    byCourse: [...groupBy(rows, (r) => r.course).entries()]
      .map(([course, list]) => ({ course, ...summarise(list) }))
      .sort((a, b) => b.average - a.average),
  };
}

async function liveMarks(auth: AuthState, filters: MarksFilters): Promise<AcademicMarkRow[]> {
  const schools = await schoolData.schools(auth, { organizationId: filters.organizationId });
  const lists = await Promise.all(
    schools.map(async (school) => {
      const data = await moduleData.academic.marks(school.id, {
        academicYear: filters.academicYear,
        term: filters.term,
      });
      return data.rows.map((r) => ({ ...r, schoolName: school.name, organizationId: school.id }));
    })
  );
  return lists.flat();
}

function applyMarkFilters(rows: AcademicMarkRow[], filters: MarksFilters): AcademicMarkRow[] {
  let out = rows;
  if (filters.academicYear) out = out.filter((r) => r.academicYear === filters.academicYear);
  if (filters.term) out = out.filter((r) => r.term === filters.term);
  if (filters.className) out = out.filter((r) => r.className === filters.className);
  if (filters.course) out = out.filter((r) => r.course === filters.course);
  return out;
}

function toTimetableEntry(row: TimetableRow, schoolName: string, organizationId: string): ConsoleTimetableEntry {
  return {
    id: row.id,
    organizationId,
    schoolName,
    className: row.className,
    subject: row.subjectName,
    teacherId: row.teacherUserId ?? row.teacherName,
    teacher: row.teacherName,
    room: row.room ?? null,
    day: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
  };
}

async function liveTimetable(auth: AuthState, filters: TimetableFilters): Promise<ConsoleTimetableEntry[]> {
  const schools = await schoolData.schools(auth, { organizationId: filters.organizationId });
  const lists = await Promise.all(
    schools.map(async (school) => {
      const rows = await moduleData.timetable.entries(school.id, {
        academicYear: filters.academicYear,
        term: filters.term,
      });
      return rows.map((r) => toTimetableEntry(r, school.name, school.id));
    })
  );
  return lists.flat();
}

export const schoolData = {
  async schools(auth: AuthState, scoped?: Scoped): Promise<IamSchool[]> {
    const organizationId = scopeOf(auth, scoped?.organizationId);
    if (auth.mode === 'demo') {
      return filterSchools(DEMO_SCHOOLS as unknown as IamSchool[], organizationId);
    }
    const schools = await iamGet<IamSchool[]>(auth, '/schools', {
      academicYear: scoped?.academicYear,
      term: scoped?.term,
      includePerformance: '1',
    });
    return filterSchools(schools, organizationId);
  },

  async overview(auth: AuthState, scoped?: Scoped): Promise<IamOverview> {
    const organizationId = scopeOf(auth, scoped?.organizationId);
    if (auth.mode === 'demo') {
      const schools = filterSchools(DEMO_SCHOOLS as unknown as IamSchool[], organizationId);
      return {
        ...DEMO_OVERVIEW,
        filters: {
          academicYear: scoped?.academicYear ?? DEMO_OVERVIEW.filters.academicYear,
          term: scoped?.term ?? DEMO_OVERVIEW.filters.term,
          organizationId: organizationId ?? 'all',
        },
        summary: {
          assignedSchools: schools.length,
          totalStudents: schools.reduce((a, s) => a + s.students, 0),
          totalStaff: schools.reduce((a, s) => a + s.staff, 0),
          averageAttendance:
            Math.round((schools.reduce((a, s) => a + s.performance!.attendance, 0) / schools.length) * 10) / 10,
          openAlerts: DEMO_OVERVIEW.summary.openAlerts,
        },
        schoolPerformance: schools.map((s) => ({
          organizationId: s.id,
          name: s.name,
          academicScore: s.performance!.academic,
          passRate: Math.min(95, s.performance!.academic + 20),
          attendanceRate: s.performance!.attendance,
        })),
        financial: schools.map((s) => {
          const fees = DEMO_FEES.bySchool.find((f) => f.organizationId === s.id)!;
          return {
            organizationId: s.id,
            name: s.name,
            feesCollected: fees.collected,
            feesOutstanding: fees.outstanding,
            payrollTotal: Math.round((s.staff / 172) * DEMO_FINANCE_PAYROLL.totals.payrollTotal),
          };
        }),
        lastUpdated: new Date().toISOString(),
        metricsSource: 'demo',
      };
    }
    return iamGet<IamOverview>(auth, '/overview', {
      organizationId: scoped?.organizationId,
      academicYear: scoped?.academicYear,
      term: scoped?.term,
    });
  },

  async attendance(auth: AuthState, organizationId?: string): Promise<IamAttendance> {
    if (auth.mode === 'demo') {
      const orgId = scopeOf(auth, organizationId);
      const schools = filterSchools(DEMO_SCHOOLS as unknown as IamSchool[], orgId);
      if (orgId && schools.length) {
        const s = schools[0];
        return {
          summary: {
            studentRate: s.performance!.attendance,
            staffRate: Math.min(100, s.performance!.attendance + 1.5),
            lateArrivals: Math.round(s.students * 0.012),
            rfidEventsToday: s.students - Math.round(s.students * 0.02),
          },
          bySchool: DEMO_ATTENDANCE.bySchool.filter((b) => b.organizationId === orgId),
          weeklyTrend: DEMO_ATTENDANCE.weeklyTrend,
          metricsSource: 'demo',
        };
      }
      return { ...DEMO_ATTENDANCE, metricsSource: 'demo' };
    }
    return iamGet<IamAttendance>(auth, '/attendance', { organizationId });
  },

  async fees(auth: AuthState, scoped?: Scoped): Promise<IamFeesOverview> {
    if (auth.mode === 'demo') {
      const organizationId = scopeOf(auth, scoped?.organizationId);
      if (!organizationId) return DEMO_FEES;
      const schools = filterSchools(DEMO_SCHOOLS as unknown as IamSchool[], organizationId);
      if (!schools.length) {
        throw new AppError(403, 'Branch not assigned to this representative');
      }
      const bySchool = DEMO_FEES.bySchool.filter((f) => f.organizationId === organizationId);
      const summary = {
        totalExpected: bySchool.reduce((a, s) => a + s.expected, 0),
        totalCollected: bySchool.reduce((a, s) => a + s.collected, 0),
        outstanding: bySchool.reduce((a, s) => a + s.outstanding, 0),
        collectionRate: bySchool[0].rate,
        studentStatus: { paid: 0, partial: 0, unpaid: 0, overdue: 0 },
      };
      return { ...DEMO_FEES, summary, bySchool, metricsSource: 'demo' };
    }
    return iamGet<IamFeesOverview>(auth, '/finance/school-fees', {
      organizationId: scoped?.organizationId,
      academicYear: scoped?.academicYear,
      term: scoped?.term,
    });
  },

  async academics(auth: AuthState, organizationId?: string): Promise<IamAcademics> {
    if (auth.mode === 'demo') {
      const orgId = scopeOf(auth, organizationId);
      if (!orgId) return DEMO_ACADEMICS;
      const schools = filterSchools(DEMO_SCHOOLS as unknown as IamSchool[], orgId);
      if (!schools.length) throw new AppError(403, 'Branch not assigned to this representative');
      const s = schools[0];
      return {
        summary: {
          averageMarks: s.performance!.academic,
          passRate: Math.min(95, s.performance!.academic + 20),
          examsPending: 2,
          resultsPublished: 1,
        },
        bySchool: DEMO_ACADEMICS.bySchool.filter((b) => b.organizationId === orgId),
        chart: DEMO_ACADEMICS.chart.filter((_, i) => DEMO_SCHOOLS[i]?.id === orgId),
        metricsSource: 'demo',
      };
    }
    return iamGet<IamAcademics>(auth, '/academics', { organizationId });
  },

  async financePayroll(auth: AuthState, organizationId?: string): Promise<IamFinancePayroll> {
    if (auth.mode === 'demo') {
      const orgId = scopeOf(auth, organizationId);
      if (!orgId) return DEMO_FINANCE_PAYROLL;
      const bySchool = DEMO_FINANCE_PAYROLL.bySchool.filter((b) => b.organizationId === orgId);
      return {
        totals: {
          feesCollected: bySchool.reduce((a, s) => a + s.feesCollected, 0),
          feesOutstanding: bySchool.reduce((a, s) => a + s.feesOutstanding, 0),
          payrollTotal: bySchool.reduce((a, s) => a + s.payrollTotal, 0),
        },
        bySchool,
        payrollVisibility: DEMO_FINANCE_PAYROLL.payrollVisibility,
        metricsSource: 'demo',
      };
    }
    return iamGet<IamFinancePayroll>(auth, '/finance-payroll', { organizationId });
  },

  /** Student directory: live from Student Management, demo only when unauthenticated. */
  async students(auth: AuthState, filters: StudentFilters): Promise<ConsoleStudentRow[]> {
    const organizationId = scopeOf(auth, filters.organizationId);
    if (auth.mode === 'demo') {
      let rows = DEMO_STUDENTS as unknown as ConsoleStudentRow[];
      if (organizationId) rows = rows.filter((r) => r.organizationId === organizationId);
      return applyStudentFilters(rows, filters);
    }
    const rows = await liveStudents(auth, { ...filters, organizationId });
    return applyStudentFilters(rows, filters);
  },

  filterStudents(rows: ConsoleStudentRow[], filters: StudentFilters): ConsoleStudentRow[] {
    return applyStudentFilters(rows, filters);
  },

  /** Marks: live from Academic module (marks-overview), demo only when unauthenticated. */
  async marks(auth: AuthState, filters: MarksFilters) {
    const organizationId = scopeOf(auth, filters.organizationId);
    const all: AcademicMarkRow[] =
      auth.mode === 'demo'
        ? (DEMO_MARKS as unknown as AcademicMarkRow[]).filter(
            (r) => !organizationId || r.organizationId === organizationId
          )
        : await liveMarks(auth, { ...filters, organizationId });

    const filterOptions = {
      classes: [...new Set(all.map((r) => r.className))].sort(),
      courses: [...new Set(all.map((r) => r.course))].sort(),
      academicYears: [...new Set(all.map((r) => r.academicYear))].sort().reverse(),
      terms: [...new Set(all.map((r) => r.term))].sort(),
    };
    const rows = applyMarkFilters(all, { ...filters, organizationId });
    return { filterOptions, rows, ...aggregateMarks(rows) };
  },

  /** Timetable: live from Timetable module, demo only when unauthenticated. */
  async timetable(auth: AuthState, filters: TimetableFilters) {
    const organizationId = scopeOf(auth, filters.organizationId);
    let all: ConsoleTimetableEntry[];
    if (auth.mode === 'demo') {
      all = DEMO_TIMETABLE_ENTRIES.filter((e) => !organizationId || e.organizationId === organizationId).map(
        (e): ConsoleTimetableEntry => ({
          id: e.id,
          organizationId: e.organizationId,
          schoolName: e.schoolName,
          className: e.className,
          subject: e.subject,
          teacherId: e.teacherUserId,
          teacher: e.teacher,
          room: e.room,
          day: e.day,
          startTime: e.startTime,
          endTime: e.endTime,
        })
      );
    } else {
      all = await liveTimetable(auth, { ...filters, organizationId });
    }

    let entries = all;
    if (filters.className) entries = entries.filter((e) => e.className === filters.className);
    if (filters.teacherId) entries = entries.filter((e) => e.teacherId === filters.teacherId);

    const teachers = new Map<string, string>();
    for (const e of all) if (e.teacherId && e.teacher) teachers.set(e.teacherId, e.teacher);

    return {
      entries,
      filterOptions: {
        classes: [...new Set(all.map((e) => e.className))].sort(),
        teachers: [...teachers.entries()]
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      },
    };
  },

  async staff(
    auth: AuthState,
    query: { organizationId?: string; search?: string; department?: string; status?: string }
  ): Promise<IamStaffRow[]> {
    if (auth.mode === 'demo') {
      let rows = DEMO_STAFF as unknown as IamStaffRow[];
      if (query.organizationId && query.organizationId !== 'all') {
        rows = rows.filter((r) => r.organizationId === query.organizationId);
      }
      if (query.search) {
        const q = query.search.toLowerCase();
        rows = rows.filter((r) =>
          `${r.fullName} ${r.employeeCode} ${r.department} ${r.role}`.toLowerCase().includes(q)
        );
      }
      if (query.department) rows = rows.filter((r) => r.department === query.department);
      if (query.status) rows = rows.filter((r) => r.attendanceToday === query.status);
      return rows;
    }
    return iamGet<IamStaffRow[]>(auth, '/staff', query);
  },

  async alerts(auth: AuthState, organizationId?: string): Promise<IamAlert[]> {
    if (auth.mode === 'demo') {
      const orgId = scopeOf(auth, organizationId);
      if (!orgId) return DEMO_ALERTS;
      return DEMO_ALERTS.filter((a) => a.organizationId === orgId);
    }
    return iamGet<IamAlert[]>(auth, '/alerts', { organizationId });
  },

  async academicContext(auth: AuthState, organizationId?: string) {
    if (auth.mode === 'demo') return DEMO_ACADEMIC_CONTEXT;
    return iamGet<unknown>(auth, '/academic-context', { organizationId });
  },
};
