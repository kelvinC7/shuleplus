/**
 * Demo dataset - mirrors the IAM representative API response shapes.
 *
 * Used ONLY when the console runs with ALLOW_DEMO=true and no IAM token
 * is present (review/demo mode). Every response is tagged
 * meta.mode = "demo" and the UI displays a "Demo data" badge.
 *
 * Figures follow the St Matthew's console prototype so the full portal
 * can be reviewed end-to-end before IAM module provisioning is complete.
 */

// ── helpers ──────────────────────────────────────────────────────────

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function rand(seed: string): () => number {
  let s = hash(seed);
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// ── branches (IAM listSchools shape) ─────────────────────────────────

export interface DemoSchool {
  id: string;
  name: string;
  slug: string;
  organizationCode: string;
  status: string;
  logoUrl: string | null;
  district: string | null;
  sector: string | null;
  managerName: string | null;
  managerPhone: string | null;
  licensedModules: string[];
  students: number;
  staff: number;
  access: string;
  lastActivity: string;
  metricsSource: string;
  performance: { attendance: number; academic: number; schoolFees: number };
}

const BRANCH_SEED: Array<[string, string, string, number, number, number, number, number, number, string]> = [
  // id, name, level, students, staff, present, attPct, feesPct, academic, manager
  ['km', 'Kamembe Main', 'Nursery & Primary · Day', 920, 46, 891, 96.8, 81, 71.2, 'Jeanne Mukamurenzi'],
  ['kn', 'Kamembe N&P', 'Nursery & Primary · Day', 540, 28, 516, 95.6, 74, 69.4, 'Eric Nkurunziza'],
  ['ks', 'Kamembe Secondary', 'O-Level · Boarding', 610, 41, 602, 98.7, 69, 58.2, 'Olivier Hakizimana'],
  ['ga', 'Gashonga', 'Nursery & Primary · Day', 310, 17, 287, 92.6, 63, 62.8, 'Peace Umuhoza'],
  ['ny', 'Nyamasheke', 'Nursery & Primary · Day', 470, 24, 452, 96.2, 77, 70.6, 'Divine Habiyaremye'],
  ['nt', 'Ntendezi', 'Day & Boarding', 280, 16, 259, 92.5, 58, 64.9, 'Claude Ntwari'],
];

export const DEMO_SCHOOLS: DemoSchool[] = BRANCH_SEED.map(
  ([id, name, level, students, staff, present, attPct, feesPct, academic, manager]) => ({
    id: `demo-${id}`,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    organizationCode: `SM-${id.toUpperCase()}`,
    status: 'ACTIVE',
    logoUrl: null,
    district: 'Rusizi',
    sector: level.includes('Boarding') ? 'Nkanka' : 'Kamembe',
    managerName: manager,
    managerPhone: '+250 788 61' + String(100 + hash(id) % 100) + ' ' + String(100 + hash(name) % 900),
    licensedModules: ['academic', 'attendance', 'school-fees', 'hr', 'timetable', 'transport'],
    students,
    staff,
    access: 'View & Reports',
    lastActivity: new Date(Date.now() - (hash(id) % 72) * 3600_000).toISOString(),
    metricsSource: 'demo',
    performance: {
      attendance: attPct,
      academic,
      schoolFees: feesPct,
    },
  })
);

// ── attendance metrics (IAM getAttendance shape) ─────────────────────

export const DEMO_ATTENDANCE = {
  summary: {
    studentRate: 95.5,
    staffRate: 93.5,
    lateArrivals: 34,
    rfidEventsToday: 2951,
  },
  bySchool: DEMO_SCHOOLS.map((s) => ({
    organizationId: s.id,
    name: s.name,
    studentRate: s.performance.attendance,
    staffRate: Math.min(100, s.performance.attendance + 1.5),
  })),
  weeklyTrend: [
    { day: 'Mon', student: 2918, staff: 88 },
    { day: 'Tue', student: 2940, staff: 87 },
    { day: 'Wed', student: 2959, staff: 86 },
    { day: 'Thu', student: 2931, staff: 89 },
    { day: 'Fri', student: 2947, staff: 90 },
  ],
  metricsSource: 'demo',
};

// ── school fees overview (SchoolFeesRepOverview shape) ───────────────

const TOTAL_BILLED = 312_000_000; // RWF, term
const TOTAL_COLLECTED = 243_400_000;

export const DEMO_FEES = {
  currency: 'RWF',
  summary: {
    totalExpected: TOTAL_BILLED,
    totalCollected: TOTAL_COLLECTED,
    outstanding: TOTAL_BILLED - TOTAL_COLLECTED,
    collectionRate: Math.round((TOTAL_COLLECTED / TOTAL_BILLED) * 1000) / 10,
    studentStatus: { paid: 1684, partial: 892, unpaid: 412, overdue: 142 },
  },
  bySchool: DEMO_SCHOOLS.map((s) => {
    const expected = Math.round((s.students / 3130) * TOTAL_BILLED);
    const rate = s.performance.schoolFees / 100;
    const collected = Math.round(expected * rate);
    return {
      organizationId: s.id,
      name: s.name,
      expected,
      collected,
      outstanding: expected - collected,
      rate: s.performance.schoolFees,
      studentsWithOutstanding: Math.round(s.students * 0.24),
    };
  }),
  collectionByCategory: [
    { category: 'Tuition', expected: 224_000_000, collected: 181_600_000, outstanding: 42_400_000 },
    { category: 'Boarding', expected: 56_000_000, collected: 39_200_000, outstanding: 16_800_000 },
    { category: 'Other fees', expected: 32_000_000, collected: 22_600_000, outstanding: 9_400_000 },
  ],
  collectionTrend: [
    { date: 'W1', amount: 46_200_000 },
    { date: 'W2', amount: 52_800_000 },
    { date: 'W3', amount: 61_500_000 },
    { date: 'W4', amount: 58_400_000 },
    { date: 'W5', amount: 24_500_000 },
  ],
  statusDistribution: [
    { status: 'paid', count: 1684 },
    { status: 'partial', count: 892 },
    { status: 'unpaid', count: 412 },
    { status: 'overdue', count: 142 },
  ],
  health: 'needs_attention',
  studentsWithOutstanding: 1446,
  metricsSource: 'demo',
};

// ── finance & payroll (IAM getFinancePayroll shape) ──────────────────

export const DEMO_FINANCE_PAYROLL = {
  totals: {
    feesCollected: TOTAL_COLLECTED,
    feesOutstanding: TOTAL_BILLED - TOTAL_COLLECTED,
    payrollTotal: 68_900_000,
  },
  bySchool: DEMO_SCHOOLS.map((s) => {
    const fees = DEMO_FEES.bySchool.find((f) => f.organizationId === s.id)!;
    return {
      organizationId: s.id,
      name: s.name,
      feesCollected: fees.collected,
      feesOutstanding: fees.outstanding,
      payrollTotal: Math.round((s.staff / 172) * 68_900_000),
      budgetUsedPct: 58 + (hash(s.id) % 34),
      collectionRate: fees.rate,
    };
  }),
  payrollVisibility: 'aggregated',
  metricsSource: 'demo',
};

// ── academics (IAM getAcademics shape) ───────────────────────────────

export const DEMO_ACADEMICS = {
  summary: {
    averageMarks: 64.8,
    passRate: 82,
    examsPending: 12,
    resultsPublished: 6,
  },
  bySchool: DEMO_SCHOOLS.map((s) => ({
    organizationId: s.id,
    name: s.name,
    averageMarks: s.performance.academic,
    passRate: Math.min(95, s.performance.academic + 20),
    atRiskStudents: 8 + (hash(s.id) % 26),
  })),
  chart: DEMO_SCHOOLS.map((s) => ({
    name: s.name.length > 18 ? `${s.name.slice(0, 16)}…` : s.name,
    average: s.performance.academic,
    passRate: Math.min(95, s.performance.academic + 20),
  })),
  metricsSource: 'demo',
};

// ── overview (IAM getOverview shape) ────────────────────────────────

export const DEMO_OVERVIEW = {
  filters: { academicYear: '2026-2027', term: 'Term 3', organizationId: 'all' },
  summary: {
    assignedSchools: DEMO_SCHOOLS.length,
    totalStudents: DEMO_SCHOOLS.reduce((a, s) => a + s.students, 0),
    totalStaff: DEMO_SCHOOLS.reduce((a, s) => a + s.staff, 0),
    averageAttendance: DEMO_ATTENDANCE.summary.studentRate,
    openAlerts: 3,
  },
  schoolPerformance: DEMO_SCHOOLS.map((s) => ({
    organizationId: s.id,
    name: s.name,
    academicScore: s.performance.academic,
    passRate: Math.min(95, s.performance.academic + 20),
    attendanceRate: s.performance.attendance,
  })),
  financial: DEMO_FINANCE_PAYROLL.bySchool.map((f) => ({
    organizationId: f.organizationId,
    name: f.name,
    feesCollected: f.feesCollected,
    feesOutstanding: f.feesOutstanding,
    payrollTotal: f.payrollTotal,
  })),
  lastUpdated: new Date().toISOString(),
  metricsSource: 'demo',
};

// ── students directory (IAM getStudentsDirectory shape) ─────────────

const FIRST = [
  'Keza', 'Ishimwe', 'Mugisha', 'Uwase', 'Habimana', 'Ingabire', 'Niyonzima', 'Umutoni',
  'Kalisa', 'Mutoni', 'Gatete', 'Iradukunda', 'Byiringiro', 'Uwimana', 'Nkusi', 'Mutesi',
  'Shema', 'Kayitesi', 'Bizimana', 'Ndahimana', 'Tuyishime', 'Mugwaneza', 'Rwema', 'Aline',
];
const LAST = [
  'Ineza', 'Eric', 'Olivier', 'Diane', 'Kevin', 'Sandra', 'Brian', 'Joy', 'Innocent', 'Fabrice',
  'Grace', 'Divine', 'Belyse', 'Yves', 'Claudine', 'Patrick', 'Sandrine', 'Josiane', 'Fiacre', 'Emmanuel',
];
const CLASSES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

export interface DemoStudent {
  id: string;
  organizationId: string;
  schoolName: string;
  studentCode: string;
  fullName: string;
  className: string | null;
  classId?: string | null;
  gender: 'M' | 'F';
  academicYear: string;
  attendanceToday: string;
  attendanceRate: number;
}

export const DEMO_STUDENTS: DemoStudent[] = (() => {
  const rows: DemoStudent[] = [];
  for (const school of DEMO_SCHOOLS) {
    const perSchool = Math.min(40, Math.round(school.students / 14)); // representative sample page
    for (let i = 0; i < perSchool; i++) {
      const r = rand(`${school.id}-${i}`);
      const first = FIRST[Math.floor(r() * FIRST.length)];
      const last = LAST[Math.floor(r() * LAST.length)];
      const cls = school.name.includes('Secondary')
        ? `${CLASSES[Math.floor(r() * 6)]}${'ABCD'[Math.floor(r() * 4)]}`
        : `${CLASSES[6 + Math.floor(r() * 6)]}${'ABCD'[Math.floor(r() * 4)]}`;
      const attRoll = r();
      const attendanceToday = attRoll > 0.94 ? 'absent' : attRoll > 0.88 ? 'late' : 'present';
      const genderRoll = r();
      rows.push({
        id: `demo-stu-${school.id}-${i}`,
        organizationId: school.id,
        schoolName: school.name,
        studentCode: `SM${school.organizationCode.slice(-2)}${String(1000 + i).slice(1)}`,
        fullName: `${first} ${last}`,
        className: cls,
        classId: cls,
        gender: genderRoll > 0.48 ? 'F' : 'M',
        academicYear: r() > 0.88 ? '2025-2026' : '2026-2027',
        attendanceToday,
        attendanceRate: attendanceToday === 'absent' ? 0 : attendanceToday === 'late' ? 92 : 98,
      });
    }
  }
  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return rows;
})();

// ── staff directory (IAM getStaffDirectory shape) ───────────────────

const DEPARTMENTS = ['Mathematics', 'English', 'Kinyarwanda', 'French', 'Physics', 'Chemistry', 'Biology', 'ICT', 'Geography', 'History', 'Entrepreneurship', 'Sports', 'Administration', 'Support'];
const STAFF_FIRST = ['Patrick', 'Alice', 'Ange', 'Eric', 'Jeanne', 'Olivier', 'Divine', 'Peace', 'Claude', 'Josiane', 'Bosco', 'Fiacre', 'Josiane', 'Grace', 'Eric', 'Jean', 'Claudine', 'Sandrine'];
const STAFF_LAST = ['Rukundo', 'Uwase', 'Mukamana', 'Nkurunziza', 'Mukamurenzi', 'Hakizimana', 'Habiyaremye', 'Umuhoza', 'Ntwari', 'Uwera', 'Manzi', 'Ndahiro', 'Ingabire', 'Mutesi', 'Shema', 'Mugisha', 'Kayitesi', 'Nyirahabimana'];

export interface DemoStaff {
  id: string;
  organizationId: string;
  schoolName: string;
  employeeCode: string;
  fullName: string;
  department: string;
  role: string;
  attendanceToday: string;
  attendanceRate: number;
}

export const DEMO_STAFF: DemoStaff[] = (() => {
  const rows: DemoStaff[] = [];
  for (const school of DEMO_SCHOOLS) {
    const perSchool = Math.min(24, Math.round(school.staff / 2));
    for (let i = 0; i < perSchool; i++) {
      const r = rand(`staff-${school.id}-${i}`);
      const dept = DEPARTMENTS[Math.floor(r() * DEPARTMENTS.length)];
      const first = STAFF_FIRST[Math.floor(r() * STAFF_FIRST.length)];
      const last = STAFF_LAST[Math.floor(r() * STAFF_LAST.length)];
      const attRoll = r();
      const attendanceToday = attRoll > 0.95 ? 'absent' : attRoll > 0.9 ? 'late' : 'present';
      rows.push({
        id: `demo-stf-${school.id}-${i}`,
        organizationId: school.id,
        schoolName: school.name,
        employeeCode: `E${String(100 + hash(`${school.id}${i}`) % 900)}`,
        fullName: `${first} ${last}`,
        department: dept,
        role: dept === 'Administration' ? 'Deputy Head' : dept === 'Support' ? 'Support staff' : `Teacher · ${dept}`,
        attendanceToday,
        attendanceRate: attendanceToday === 'absent' ? 0 : 94,
      });
    }
  }
  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return rows;
})();

// ── alerts (IAM listAlerts shape) ───────────────────────────────────

export const DEMO_ALERTS = [
  {
    id: 'demo-alert-1',
    type: 'academics',
    title: 'S2B Chemistry has no teacher assigned',
    message: 'Kamembe Secondary · S2B Chemistry lessons have no assigned teacher this week.',
    severity: 'warning',
    status: 'OPEN',
    organizationId: 'demo-ks',
    schoolName: 'Kamembe Secondary',
    createdAt: new Date(Date.now() - 40 * 60_000).toISOString(),
  },
  {
    id: 'demo-alert-2',
    type: 'finance',
    title: 'Boarding expenditure exceeds budget',
    message: 'Kamembe Secondary · Boarding food costs are 8% over plan this term.',
    severity: 'warning',
    status: 'OPEN',
    organizationId: 'demo-ks',
    schoolName: 'Kamembe Secondary',
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 'demo-alert-3',
    type: 'security',
    title: 'One CCTV camera is offline',
    message: 'Kamembe Main · Dining hall camera (CAM-24) is offline. Technician notified.',
    severity: 'info',
    status: 'OPEN',
    organizationId: 'demo-km',
    schoolName: 'Kamembe Main',
    createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
  },
];

// ── academic context (years/terms) ───────────────────────────────────

export const DEMO_ACADEMIC_CONTEXT = {
  academicYears: [
    { id: '2026-2027', label: '2026–2027' },
    { id: '2025-2026', label: '2025–2026' },
  ],
  terms: [
    { id: 'Term 3', label: 'Term 3' },
    { id: 'Term 2', label: 'Term 2' },
    { id: 'Term 1', label: 'Term 1' },
  ],
};

// ── teaching / timetable / operations (console-derived) ──────────────

export const PERIODS = [
  { id: 1, label: 'P1', time: '07:40–08:20' },
  { id: 2, label: 'P2', time: '08:20–09:00' },
  { id: 3, label: 'P3', time: '09:00–09:40' },
  { id: 0, label: 'Break', time: '09:40–10:00' },
  { id: 4, label: 'P4', time: '10:00–10:40' },
  { id: 5, label: 'P5', time: '10:40–11:20' },
  { id: 6, label: 'P6', time: '11:20–12:00' },
  { id: 0, label: 'Lunch', time: '12:00–13:00' },
  { id: 7, label: 'P7', time: '13:00–13:40' },
  { id: 8, label: 'P8', time: '13:40–14:20' },
];

export const CURRENT_PERIOD = 4;

export interface DemoClassSession {
  classId: string;
  className: string;
  subject: string;
  teacher: string;
  room: string;
  students: number;
  present: number;
  status: 'teaching' | 'cover' | 'gap' | 'late' | 'exam';
  coverTeacher?: string;
  topic: string;
}

export const DEMO_TEACHING_NOW: DemoClassSession[] = (() => {
  const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'History', 'Biology', 'Geography', 'ICT', 'Kinyarwanda', 'Entrepreneurship'];
  const teachers = DEMO_STAFF.filter((s) => s.role.startsWith('Teacher'));
  const sessions: DemoClassSession[] = [];
  const levels = ['S1', 'S2', 'S3'];
  let idx = 0;
  for (const lvl of levels) {
    for (const s of ['A', 'B', 'C', 'D']) {
      const r = rand(`tt-${lvl}${s}`);
      const subject = subjects[idx % subjects.length];
      const teacher = teachers[idx % teachers.length]?.fullName ?? 'Unassigned';
      const roll = r();
      const students = 38 + Math.floor(r() * 14);
      const status: DemoClassSession['status'] =
        lvl === 'S2' && s === 'B' && subject === 'Chemistry'
          ? 'gap'
          : roll > 0.9
            ? 'exam'
            : roll > 0.78
              ? 'cover'
              : roll > 0.7
                ? 'late'
                : 'teaching';
      sessions.push({
        classId: `${lvl}${s}`,
        className: `${lvl}${s}`,
        subject,
        teacher,
        room: `R${100 + idx}`,
        students,
        present: status === 'gap' ? students - 3 : Math.round(students * (0.92 + r() * 0.07)),
        status,
        coverTeacher: status === 'cover' ? teachers[(idx + 7) % teachers.length]?.fullName : undefined,
        topic: `${subject} · unit ${(idx % 8) + 1}`,
      });
      idx++;
    }
  }
  return sessions;
})();

export const FREE_TEACHERS = [
  { name: 'Olivier Hakizimana', subjects: ['Mathematics', 'Physics'], role: 'Deputy Head', periodsToday: 2 },
  { name: 'Claude Ntwari', subjects: ['Physics', 'Chemistry'], role: 'Teacher', periodsToday: 3 },
  { name: 'Josiane Uwera', subjects: ['Biology'], role: 'Teacher', periodsToday: 1 },
  { name: 'Grace Mutesi', subjects: ['English'], role: 'Teacher', periodsToday: 2 },
];

export const DEMO_TIMETABLE_WEEK = (() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const grid: Record<string, Record<string, DemoClassSession | undefined>> = {};
  for (const day of days) {
    grid[day] = {};
    for (const session of DEMO_TEACHING_NOW) {
      const r = rand(`${day}-${session.classId}`);
      grid[day][session.classId] = {
        ...session,
        subject: subjects2(rand(`${day}-${session.classId}-sub`)),
        teacher: teachers2(rand(`${day}-${session.classId}-t`)),
        status: r() > 0.95 ? 'gap' : 'teaching',
      };
    }
  }
  return { days, periods: PERIODS, grid };
})();

function subjects2(r: () => number) {
  const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'ICT', 'Kinyarwanda'];
  return subjects[Math.floor(r() * subjects.length)];
}
function teachers2(r: () => number) {
  const teachers = DEMO_STAFF.filter((s) => s.role.startsWith('Teacher'));
  return teachers[Math.floor(r() * teachers.length)]?.fullName ?? 'Unassigned';
}

// ── marks by class / course (Academic module service shape) ──────────

export interface DemoMarkRow {
  id: string;
  organizationId: string;
  schoolName: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  course: string;
  exam: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  academicYear: string;
  term: string;
  date: string;
}

const MARK_SUBJECTS = [
  'Mathematics',
  'English',
  'Kinyarwanda',
  'Physics',
  'Chemistry',
  'Biology',
  'Geography',
  'History',
  'ICT',
];

const MARK_EXAMS = [
  { name: 'Mid-term assessment', term: 'Term 3', weight: 0 },
  { name: 'Continuous assessment', term: 'Term 3', weight: 1 },
  { name: 'End of term examination', term: 'Term 2', weight: 2 },
];

export function gradeFromScore(score: number): string {
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'B-';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

export const DEMO_MARKS: DemoMarkRow[] = (() => {
  const rows: DemoMarkRow[] = [];
  for (const school of DEMO_SCHOOLS) {
    const students = DEMO_STUDENTS.filter((s) => s.organizationId === school.id).slice(0, 16);
    for (const student of students) {
      const r = rand(`marks-${student.id}`);
      const subjects = [...MARK_SUBJECTS].sort(() => r() - 0.5).slice(0, 3);
      for (const course of subjects) {
        for (const exam of MARK_EXAMS) {
          const score = Math.round(44 + r() * 52);
          rows.push({
            id: `demo-mark-${student.id}-${course}-${exam.weight}`,
            organizationId: school.id,
            schoolName: school.name,
            studentId: student.id,
            studentName: student.fullName,
            studentCode: student.studentCode,
            className: student.className ?? 'Unassigned',
            course,
            exam: exam.name,
            score,
            maxScore: 100,
            percentage: score,
            grade: gradeFromScore(score),
            academicYear: student.academicYear,
            term: exam.term,
            date: new Date(Date.UTC(2026, exam.term === 'Term 2' ? 6 : 9, 10 + exam.weight)).toISOString(),
          });
        }
      }
    }
  }
  return rows;
})();

// ── timetable entries (Timetable module service shape) ───────────────

export interface DemoTimetableEntry {
  id: string;
  organizationId: string;
  schoolName: string;
  classKey: string;
  className: string;
  subject: string;
  teacher: string;
  teacherUserId: string;
  room: string;
  students: number;
  present: number;
  status: 'teaching' | 'cover' | 'gap' | 'late' | 'exam';
  topic: string;
  day: string;
  period: string;
  startTime: string;
  endTime: string;
  academicYear: string;
  term: string;
}

const TT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TT_SUBJECTS = [
  'Mathematics',
  'English',
  'Kinyarwanda',
  'Physics',
  'Chemistry',
  'Biology',
  'Geography',
  'History',
  'ICT',
  'Entrepreneurship',
];
const TT_PERIODS = PERIODS.filter((p) => p.label.startsWith('P'));

export const DEMO_TIMETABLE_ENTRIES: DemoTimetableEntry[] = (() => {
  const entries: DemoTimetableEntry[] = [];
  for (const school of DEMO_SCHOOLS) {
    const classNames = [...new Set(
      DEMO_STUDENTS.filter((s) => s.organizationId === school.id)
        .map((s) => s.className)
        .filter((c): c is string => Boolean(c))
    )].slice(0, 6);
    const teachers = DEMO_STAFF.filter(
      (s) => s.organizationId === school.id && s.role.startsWith('Teacher')
    );
    for (const className of classNames) {
      for (const day of TT_DAYS) {
        for (const period of TT_PERIODS) {
          const r = rand(`tt2-${school.id}-${className}-${day}-${period.label}`);
          const subject = TT_SUBJECTS[Math.floor(r() * TT_SUBJECTS.length)];
          const roll = r();
          const status: DemoTimetableEntry['status'] =
            roll > 0.975 ? 'gap' : roll > 0.94 ? 'late' : roll > 0.9 ? 'exam' : 'teaching';
          const teacher =
            status === 'gap'
              ? 'Unassigned'
              : teachers[Math.floor(r() * teachers.length)]?.fullName ?? 'Unassigned';
          const students = 32 + Math.floor(r() * 18);
          const [startTime, endTime] = period.time.split('–');
          entries.push({
            id: `demo-tt-${school.id}-${className}-${day}-${period.label}`,
            organizationId: school.id,
            schoolName: school.name,
            classKey: `${school.id}::${className}`,
            className,
            subject,
            teacher,
            teacherUserId: teacher.toLowerCase().replace(/\s+/g, '-'),
            room: `R${100 + Math.floor(r() * 12)}`,
            students,
            present: status === 'gap' ? 0 : Math.round(students * (0.9 + r() * 0.09)),
            status,
            topic: `${subject} · unit ${1 + Math.floor(r() * 8)}`,
            day,
            period: period.label,
            startTime: startTime ?? '07:40',
            endTime: endTime ?? '08:20',
            academicYear: '2026-2027',
            term: 'Term 3',
          });
        }
      }
    }
  }
  return entries;
})();

// ── live campus ──────────────────────────────────────────────────────

export const DEMO_CAMERAS = [
  ['Gate A · Main entrance', 'Gates'], ['Gate B · Side entrance', 'Gates'],
  ['Boarding house', 'Dormitories'], ['Library', 'Classrooms'],
  ['Science lab', 'Classrooms'], ['Dining hall', 'Dining'],
  ['Bus park', 'Transport'], ['Playground', 'Grounds'],
].map(([name, zone], i) => ({
  id: i + 1,
  name,
  zone,
  branchId: 'demo-km',
  online: i !== 5,
  resolution: '1080p',
  encryption: 'AES-256',
}));

export const DEMO_GUARDS = [
  { name: 'Innocent Mugisha', post: 'Head of security', phone: '+250788610100', onDuty: true },
  { name: 'Emmanuel Ndayisaba', post: 'Gate A', phone: '+250788610101', onDuty: true },
  { name: 'Fabrice Nzeyimana', post: 'Gate B', phone: '+250788610102', onDuty: true },
  { name: 'Jean Bosco Habimana', post: 'Boarding', phone: '+250788610103', onDuty: false },
];

export const DEMO_BUSES = [
  { id: 1, name: 'Bus 1', route: 'Kamembe town', status: 'on_route', progress: 72, etaMin: 8, studentsOnBoard: 38, driver: 'Alphonse M.', minder: 'Chantal U.' },
  { id: 2, name: 'Bus 2', route: 'Nkanka', status: 'late', progress: 55, etaMin: 18, studentsOnBoard: 41, driver: 'Mutuelle K.', minder: 'Sandrine N.' },
  { id: 3, name: 'Bus 3', route: 'Gihundwe', status: 'on_route', progress: 80, etaMin: 5, studentsOnBoard: 36, driver: 'Innocent H.', minder: 'Peace U.' },
  { id: 4, name: 'Bus 4', route: 'Nkombo', status: 'on_route', progress: 40, etaMin: 20, studentsOnBoard: 33, driver: 'Eric M.', minder: 'Joy A.' },
  { id: 5, name: 'Bus 5', route: 'Bugarama', status: 'on_route', progress: 63, etaMin: 11, studentsOnBoard: 40, driver: 'Patrick N.', minder: 'Divine K.' },
  { id: 6, name: 'Bus 6', route: 'Giheke', status: 'on_route', progress: 90, etaMin: 3, studentsOnBoard: 29, driver: 'Claude I.', minder: 'Belyse M.' },
  { id: 7, name: 'Bus 7', route: 'Depot', status: 'parked', progress: 0, etaMin: 0, studentsOnBoard: 0, driver: 'Fiacre N.', minder: '—' },
];

// ── school services ──────────────────────────────────────────────────

export const DEMO_SERVICES = {
  shuleKit: {
    enrolledPct: 65,
    learners: 1240,
    subscribers: 812,
    deadline: '15 Nov',
    plans: [
      { name: 'Pay in full', count: 214 },
      { name: 'Instalment savings', count: 371 },
      { name: 'ShuleKit Credit', count: 227 },
    ],
    bySchool: DEMO_SCHOOLS.map((s) => ({
      organizationId: s.id,
      name: s.name,
      enrolledPct: 48 + (hash(s.id) % 32),
    })),
  },
  shuleMart: {
    creditLimit: 50_000_000,
    used: 34_200_000,
    monthlyDue: 4_850_000,
    accounts: [
      { id: 'SMA-1', name: 'Science laboratory fit-out', principal: 18_000_000, months: 12, monthly: 1_620_000, paid: 6, status: 'active' },
      { id: 'SMA-2', name: 'Dining hall equipment', principal: 9_400_000, months: 8, monthly: 1_235_000, paid: 3, status: 'active' },
      { id: 'SMA-3', name: 'Classroom furniture', principal: 6_800_000, months: 10, monthly: 748_000, paid: 2, status: 'active' },
    ],
    applications: [
      { id: 'SMP-1', name: 'ICT lab expansion', amount: 12_500_000, tenureMonths: 12, stage: 'Credit review' },
      { id: 'SMP-2', name: 'Sports ground equipment', amount: 4_800_000, tenureMonths: 6, stage: 'Submitted' },
    ],
  },
  uniforms: {
    openOrders: 38,
    readyForPickup: 12,
    stockItems: 124,
    recentOrders: [
      { id: 'UO-214', student: 'Keza Ineza', class: 'S3B', items: 6, total: 48_000, status: 'Ready' },
      { id: 'UO-213', student: 'Ishimwe Eric', class: 'S1A', items: 4, total: 32_000, status: 'Packing' },
      { id: 'UO-212', student: 'Mutoni Aline', class: 'S3C', items: 5, total: 40_000, status: 'Ready' },
      { id: 'UO-211', student: 'Niyonzima Brian', class: 'S5A', items: 6, total: 52_000, status: 'Paid' },
    ],
  },
  dining: {
    mealsToday: 640,
    boarders: 610,
    menu: ['Breakfast · Porridge & bread', 'Lunch · Rice, beans, vegetables', 'Supper · Posho & greens'],
    weeklyMeals: [
      { day: 'Mon', meals: 618 }, { day: 'Tue', meals: 625 },
      { day: 'Wed', meals: 640 }, { day: 'Thu', meals: 612 }, { day: 'Fri', meals: 640 },
    ],
  },
  shuleTrip: {
    pending: 1,
    upcoming: [
      {
        id: 'TR-088',
        title: 'S3 study trip to Nyungwe National Park',
        date: '14 Nov',
        students: 86,
        staff: 6,
        buses: 2,
        status: 'AWAITING_DIRECTOR',
        notes: 'Safety plan attached. Needs district approval after the Director.',
      },
    ],
    past: [
      { id: 'TR-071', title: 'S5 career visit · Kigali', date: '3 Oct', students: 52, staff: 4, status: 'COMPLETED' },
    ],
  },
};

// ── communication ────────────────────────────────────────────────────

export const DEMO_PARENT_ACCOUNTS = {
  total: 2204,
  verified: 1986,
  linkedStudents: 3130,
  activeThisWeek: 1102,
  enquiries: [
    { id: 'PE-1', parent: 'Mrs. Uwimana', topic: 'Term 3 fees plan', received: '10 min ago', status: 'open' },
    { id: 'PE-2', parent: 'Mr. Habiyaremye', topic: 'S2 PE cover plan', received: '1 h ago', status: 'assigned' },
    { id: 'PE-3', parent: 'District office', topic: 'Inspection visit confirmed', received: 'Yesterday', status: 'closed' },
  ],
};

export const DEMO_CHATS = [
  { id: 'CH-1', with: 'Mrs. Uwimana (parent)', last: 'Asking about Term 3 fees plan', time: '10 min', unread: true, assigned: 'Secretary' },
  { id: 'CH-2', with: 'Mr. Habiyaremye (staff)', last: 'Cover plan for S2 PE', time: '1 h', unread: true, assigned: 'Director of Studies' },
  { id: 'CH-3', with: 'District office', last: 'Inspection visit confirmed', time: 'Yesterday', unread: false, assigned: 'Director' },
  { id: 'CH-4', with: 'S3A parents group', last: 'Mid-term results discussion', time: '2 d', unread: false, assigned: 'Class teacher' },
];

export const DEMO_CIRCULARS = [
  { id: 'CI-018', title: 'Babyeyi: Term 1 2027 fees and requirements', audience: '3,130 families · 6 schools', status: 'AWAITING_DIRECTOR', submittedBy: 'Claudine N., Secretary', submittedAt: new Date(Date.now() - 26 * 3600_000).toISOString() },
  { id: 'CI-017', title: 'Term 3 mid-term results release', audience: 'All parents', status: 'PUBLISHED', submittedBy: 'Director of Studies', submittedAt: new Date(Date.now() - 5 * 86400_000).toISOString() },
  { id: 'CI-016', title: 'Parents meeting · Kamembe Secondary', audience: 'S4–S6 parents', status: 'PUBLISHED', submittedBy: 'Head of School', submittedAt: new Date(Date.now() - 9 * 86400_000).toISOString() },
];

export const BROADCAST_TEMPLATES = [
  {
    id: 'fee-reminder',
    name: 'Fee reminder',
    body: 'Dear {ParentName}, this is a reminder that {StudentName} ({Class}) has a fee balance. Please arrange payment before {DueDate}. — St Matthew’s Schools',
  },
  {
    id: 'meeting-invite',
    name: 'Staff meeting invitation',
    body: 'Dear {StaffName}, you are invited to a staff meeting on {Date} at {Time} in {Venue}. Agenda: {Agenda}. Please confirm attendance.',
  },
  {
    id: 'trip-consent',
    name: 'Trip consent request',
    body: 'Dear {ParentName}, {StudentName} ({Class}) is invited to a study trip on {Date}. Reply YES by {DueDate} to give consent.',
  },
  {
    id: 'general-notice',
    name: 'General notice',
    body: 'Dear parents, {Message}. Thank you. — St Matthew’s Schools',
  },
];

export const AUDIENCE_OPTIONS = [
  { id: 'all-parents', label: 'All parents', recipients: 2204, channels: ['app', 'sms'] },
  { id: 'primary-parents', label: 'Primary parents', recipients: 1560, channels: ['app', 'sms'] },
  { id: 'secondary-parents', label: 'Secondary parents', recipients: 610, channels: ['app', 'sms'] },
  { id: 'all-staff', label: 'All staff', recipients: 172, channels: ['app', 'email'] },
  { id: 'board-parents', label: 'Boarding parents', recipients: 590, channels: ['app', 'sms'] },
];
