/** Response shapes from the Director Console API (/api/director). */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { mode?: 'live' | 'demo' } & Record<string, unknown>;
  message?: string;
}

export interface ConsoleUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mode: 'live' | 'demo';
}

export interface Branch {
  id: string;
  name: string;
  organizationCode: string;
  district: string | null;
  sector: string | null;
  managerName: string | null;
  managerPhone: string | null;
  students: number;
  staff: number;
  logoUrl?: string | null;
  status?: string;
  issues?: string[];
  performance?: { attendance: number; academic: number; schoolFees: number } | null;
  fees?: { collected: number; outstanding: number; rate: number } | null;
}

export interface Period {
  id: string;
  label: string;
}

export interface ConsoleContext {
  user: ConsoleUser;
  branches: Branch[];
  academicYears: Period[];
  terms: Period[];
  counts: {
    pendingApprovals: number;
    unreadNotifications: number;
    openTasks: number;
    overdueTasks: number;
  };
  moduleSlug: string;
}

export interface OverviewData {
  greeting: { period: string; week: string; user: string };
  summary: {
    assignedSchools: number;
    totalStudents: number;
    totalStaff: number;
    averageAttendance: number;
    openAlerts: number;
    feesCollected: number;
    feesBilled: number;
    feesOutstanding: number;
    feesCollectionRate: number;
    pendingApprovals: number;
    approvalsDueToday: number;
    unreadNotifications: number;
    healthScore: number;
  };
  schoolPerformance: Array<{
    organizationId: string;
    name: string;
    academicScore: number;
    passRate: number;
    attendanceRate: number;
  }>;
  financial: Array<{
    organizationId: string;
    name: string;
    feesCollected: number;
    feesOutstanding: number;
    payrollTotal: number;
  }>;
  attendance: {
    summary: { studentRate: number; staffRate: number; lateArrivals: number; rfidEventsToday: number };
    weeklyTrend: Array<{ day: string; student: number; staff: number }>;
    bySchool: Array<{ organizationId: string; name: string; studentRate: number; staffRate: number }>;
  } | null;
  feesTrend: Array<{ date: string; amount: number }>;
  feesStatusDistribution: Array<{ status: string; count: number }>;
  attention: Array<{
    severity: 'urgent' | 'warning' | 'info';
    title: string;
    body: string;
    link: string;
    category: string;
  }>;
  teaching: {
    period: string;
    time: string;
    sessions: number;
    teaching: number;
    cover: number;
    gaps: number;
    late: number;
    exam: number;
  };
  tasks: { open: number; inProgress: number; completed: number; overdue: number };
  metricsSource: string;
  lastUpdated: string;
}

export interface BriefingData {
  date: string;
  headline: string;
  sections: Array<{
    id: string;
    title: string;
    items: Array<{ label: string; detail: string; severity: string; link: string }>;
  }>;
  metricsSource: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApprovalItem {
  id: string;
  organizationId: string | null;
  reference: string;
  category: string;
  type?: string;
  title: string;
  requester: string;
  requestedBy?: string;
  requesterRole: string | null;
  branch?: string;
  organizationName?: string;
  amount: number | null;
  currency: string;
  description: string;
  summary?: string;
  dueDate: string | null;
  priority: string;
  workflowSteps: Array<{ name: string; status: string }>;
  attachments: Array<{ name: string; kind: string }>;
  status: string;
  createdAt: string;
  updatedAt: string;
  decisionHistory?: Array<{
    action: string;
    reason: string | null;
    comment: string | null;
    decidedByName: string;
    createdAt: string;
  }>;
}

export interface ApprovalList {
  items: ApprovalItem[];
  pagination: Pagination;
  summary?: {
    pending?: number;
    urgent?: number;
    decidedToday?: number;
  };
  stats?: {
    pending: number;
    approved: number;
    rejected: number;
    changes: number;
    pendingAmount: number;
    dueToday: number;
  };
  categories: Array<{ id: string; label: string }>;
}

export interface PersonRow {
  id: string;
  organizationId: string;
  schoolName: string;
  studentCode?: string;
  employeeCode?: string;
  fullName: string;
  className: string | null;
  department?: string;
  role?: string;
  gender?: 'M' | 'F' | null;
  academicYear?: string | null;
  attendanceToday: string;
  attendanceRate: number;
  /** Legacy / alternate field names some endpoints still return */
  email?: string;
  name?: string;
  class?: string;
  branch?: string;
  status?: string;
  guardianName?: string;
  parentName?: string;
  guardianPhone?: string;
  phone?: string;
}

export interface StudentsData {
  items: PersonRow[];
  pagination: Pagination;
  filterOptions: { classes: string[]; academicYears: string[]; genders: Array<'M' | 'F'> };
  summary: { total: number; boys: number; girls: number; present: number; late: number; absent: number; classes?: number; active?: number };
  filters?: { classes?: string[]; levels?: string[] };
  byClass: Array<{ className: string; boys: number; girls: number; total: number }>;
}

export interface StaffData {
  items: PersonRow[];
  pagination: Pagination;
  filterOptions: { departments: string[] };
  summary: { total: number; present: number; late: number; absent: number };
}

export interface HrData {
  summary: {
    totalEmployees: number;
    teachingStaff: number;
    supportStaff: number;
    directorySample: number;
    teaching: number;
    support: number;
    absentToday: number;
    onLeave: number;
    staffAttendanceRate: number;
    payrollTotal: number;
    attendanceRate?: number;
    monthlyPayroll?: number;
  };
  departments?: string[];
  bySchool: Array<{
    organizationId: string;
    name: string;
    feesCollected: number;
    feesOutstanding: number;
    payrollTotal: number;
    budgetUsedPct: number;
    collectionRate: number;
  }>;
  leaves: Array<{ name: string; role: string; dates: string; cover: string; status: string }>;
  payroll: { visibility: string; total: number; nextRun: string; staffCount: number } | null;
}

export interface AcademicsData {
  summary: {
    averageMarks?: number;
    average?: number;
    passRate?: number;
    examsPending?: number;
    resultsPublished?: number;
    students?: number;
    entries?: number;
  };
  bySchool?: Array<{
    organizationId: string;
    name: string;
    averageMarks?: number;
    average?: number;
    passRate?: number;
    atRiskStudents?: number;
  }>;
  levels?: Array<{ level: string; average: number }>;
  subjects?: Array<{ subject?: string; name?: string; average?: number; completion?: number }>;
  watchlist?: Array<{
    id: string;
    initials: string;
    name: string;
    detail: string;
    severity: string;
    action: string;
  }>;
  markingCompletion?: Array<{ organizationId: string; name: string; pct: number }>;
  riskDetection?: {
    active: boolean;
    flags: Array<{
      branch: string;
      klass: string;
      subject: string;
      previousAverage: number;
      currentAverage: number;
      affectedStudents: number;
      teacher: string;
      intervention: string;
    }>;
  };
  trend?: Array<{ label?: string; period?: string; average?: number; score?: number }>;
  filters?: { classes?: string[]; courses?: string[] };
  results?: Array<{
    id?: string;
    className?: string;
    class?: string;
    subject?: string;
    average?: number;
    score?: number;
    passRate?: number;
    status?: string;
  }>;
  classes?: Array<{
    id?: string;
    className?: string;
    class?: string;
    subject?: string;
    average?: number;
    score?: number;
    passRate?: number;
    status?: string;
  }>;
}

export interface AttendanceData {
  summary: { studentRate: number; staffRate: number; lateArrivals: number; rfidEventsToday: number };
  bySchool: Array<{ organizationId: string; name: string; studentRate: number; staffRate: number }>;
  weeklyTrend: Array<{ day: string; student: number; staff: number }>;
  byClass: Array<{ klass: string; total: number; present: number; rate: number }>;
  chronic: Array<{ name: string; klass: string; absences: number; window: string; lastContact: string }>;
  captureSources: Array<{ source: string; status: string; eventsToday?: number; submitted?: string; busesReporting?: number }>;
}

export interface DisciplineData {
  summary: { open: number; resolvedThisTerm: number; serious: number; positiveNotes: number; high?: number; resolved?: number; positive?: number };
  cases: Array<{
    id: string;
    title: string;
    branch: string;
    category: string;
    severity: string;
    status: string;
    reportedAt: string;
    openedAt?: string;
    notes?: string;
    owner: string;
  }>;
  positive: { notesThisTerm: number; topClasses: string[] };
}

export interface FeesData {
  currency: string;
  summary: {
    totalExpected: number;
    totalCollected: number;
    outstanding: number;
    collectionRate: number;
    studentStatus: { paid: number; partial: number; unpaid: number; overdue: number };
  };
  bySchool?: Array<{
    organizationId: string;
    name: string;
    expected: number;
    collected: number;
    outstanding: number;
    rate: number;
    studentsWithOutstanding?: number;
  }>;
  collectionByCategory: Array<{ category: string; expected: number; collected: number; outstanding: number }>;
  byCategory?: Array<{ name?: string; category: string; expected: number; collected: number; outstanding: number }>;
  collectionTrend: Array<{ date: string; amount: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  health: string;
  studentsWithOutstanding: number;
  payrollTotal?: number;
}

export interface BudgetData {
  summary: {
    totalPlanned: number;
    totalActual: number;
    remaining: number;
    utilizationPct: number;
    overBudgetLines: number;
    payrollTotal: number;
    planned?: number;
    actual?: number;
  };
  lines: Array<{
    vote: string;
    planned: number;
    actual: number;
    department: string;
    pct: number;
    status: string;
  }>;
  cashFlow: Array<{ month: string; inflow: number; outflow: number }>;
  pendingPurchaseOrders: number;
}

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  body: string;
  severity: string;
  organizationId: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsData {
  items: NotificationItem[];
  unread: number;
  categories: Array<{ id: string; label: string }>;
}

export interface Incident {
  id: string;
  organizationId: string | null;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentsData {
  items: Incident[];
  summary: { open: number; investigating: number; resolved: number; urgent: number };
}

export interface ClassSession {
  classId: string;
  className: string;
  subject: string;
  teacher: string;
  room: string;
  students: number;
  present: number;
  status: 'teaching' | 'cover' | 'gap' | 'late' | 'exam' | 'scheduled';
  coverTeacher?: string;
  topic: string;
  organizationId?: string;
  schoolName?: string;
  time?: string;
  startedAt?: string | null;
  attendanceDone?: boolean;
  teacherCheckedIn?: boolean;
}

export interface TeachingNowData {
  currentPeriod: { id: number; label: string; time: string };
  periods: Array<{ id: number; label: string; time: string }>;
  summary: { total: number; teaching: number; cover: number; gap: number; late: number; exam: number; gaps?: number; period?: string | number; time?: string };
  sessions: ClassSession[];
  items?: ClassSession[];
  freeTeachers: Array<{ name: string; subjects: string[]; role: string; periodsToday: number }>;
  recentCovers: Array<{
    id: string;
    classId: string;
    subject: string;
    period: string;
    absentTeacher: string;
    coverTeacher: string;
    createdAt: string;
  }>;
}

export interface AttendancePersonRow {
  id: string;
  schoolName: string;
  code: string;
  name: string;
  group: string;
  presentDays: number;
  schoolDays: number;
  rate: number;
  lastEntry: string | null;
  lastExit: string | null;
  status: string;
}

export interface AttendanceReportData {
  range: { from: string; to: string; days: number };
  kpis: {
    studentRate: number;
    staffRate: number;
    studentsTotal: number;
    staffTotal: number;
    studentsPresent: number;
    staffPresent: number;
    late: number;
    absent: number;
  };
  daily: Array<{ date: string; studentRate: number; staffRate: number; studentsPresent?: number; staffPresent?: number }>;
  byClass: Array<{ className: string; total: number; rate: number }>;
  students: AttendancePersonRow[];
  staff: AttendancePersonRow[];
  classes: string[];
  /** Legacy / alternate shapes the page falls back to */
  trend?: any[];
  weeklyTrend?: any[];
  items?: any[];
  records?: any[];
  summary?: Record<string, any>;
  sources?: Array<{ name: string; pct: number }>;
}

export interface ClassAttendanceData {
  date: string;
  className: string;
  students: Array<{
    id: string;
    studentCode: string;
    fullName: string;
    status: string;
    entryTime: string | null;
    exitTime: string | null;
  }>;
}

export interface TimetableEntry {
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

export interface TimetableData {
  days: string[];
  slots: Array<{ start: string; end: string }>;
  entries: TimetableEntry[];
  filterOptions: { classes: string[]; teachers: Array<{ id: string; name: string }> };
  teacherLoad: Array<{ id: string; name: string; periods: number; classes: number }>;
  summary: { entries: number; classes: number; teachers: number; subjects: number };
}

export interface AcademicMarkRow {
  id: string;
  organizationId: string;
  schoolName?: string;
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

export interface MarksData {
  filterOptions: { classes: string[]; courses: string[]; academicYears: string[]; terms: string[] };
  summary: { average: number; passRate: number; entries: number; students: number; exams: number };
  byClass: Array<{ className: string; average: number; passRate: number; entries: number; students: number }>;
  byCourse: Array<{ course: string; average: number; passRate: number; entries: number; students: number }>;
  rows: AcademicMarkRow[];
  pagination: Pagination;
}

export interface TransportData {
  summary: {
    registered: number;
    onRoute: number;
    delayed: number;
    parked: number;
    studentsOnBoard: number;
  };
  buses: Array<{
    id: number;
    name: string;
    route: string;
    status: string;
    progress: number;
    etaMin: number;
    studentsOnBoard: number;
    driver: string;
    minder: string;
  }>;
  mapCenter: { lat: number; lng: number };
  maintenance: Array<{ bus: string; item: string; due: string; status: string }>;
}

export interface LiveCampusData {
  summary: { total: number; online: number; offline: number };
  cameras: Array<{ id: number; name: string; zone: string; branchId: string; online: boolean; resolution: string; encryption: string; streamUrl?: string }>;
  zones: Array<{ zone: string; total: number; online: number }>;
  guards: Array<{ name: string; post: string; phone: string; onDuty: boolean }>;
  accessNote: string;
  incidents?: any[];
}

export interface BroadcastRow {
  id: string;
  audience: string;
  channels: string[];
  subject: string;
  message: string;
  recipientCount: number;
  smsCost: number;
  status: string;
  scheduledFor: string | null;
  sentByName: string;
  createdAt: string;
}

export interface BroadcastsData {
  history: BroadcastRow[];
  templates: Array<{ id: string; name: string; body: string }>;
  audiences: Array<{ id: string; label: string; recipients: number; channels: string[] }>;
  stats: { sentThisWeek: number; recipientsThisWeek: number; avgReadRate: number };
}

export interface ParentsData {
  summary: {
    total: number;
    verified: number;
    verifiedPct: number;
    linkedStudents: number;
    activeThisWeek: number;
    engagementPct: number;
    appPct?: number;
  };
  enquiries: Array<{ id: string; parent: string; topic: string; received: string; status: string }>;
}

export interface MessagesData {
  summary: { unread: number; escalations: number };
  chats: Array<{ id: string; with: string; last: string; time: string; unread: boolean; assigned: string }>;
}

export interface CircularItem {
  id: string;
  title: string;
  audience: string;
  status: string;
  submittedBy: string;
  submittedAt: string;
  body?: string | null;
  publishedAt?: string | null;
}

export interface CircularsData {
  summary: { awaitingDirector: number; published: number; draft?: number };
  items: CircularItem[];
}

export interface ServicesData {
  /** Legacy / alternate shapes the services page falls back to */
  summary?: Record<string, any>;
  kit?: any[];
  mart?: any[];
  trips?: any[];
  overview: {
    shuleKitEnrolledPct: number;
    shuleKitDeadline: string;
    shuleMartUsed: number;
    shuleMartLimit: number;
    uniformsOpenOrders: number;
    diningMealsToday: number;
    tripsPending: number;
  };
  shuleKit: {
    enrolledPct: number;
    learners: number;
    subscribers: number;
    deadline: string;
    plans: Array<{ name: string; count: number }>;
    bySchool: Array<{ organizationId: string; name: string; enrolledPct: number }>;
  };
  shuleMart: {
    creditLimit: number;
    used: number;
    monthlyDue: number;
    accounts: Array<{ id: string; name: string; principal: number; months: number; monthly: number; paid: number; status: string }>;
    applications: Array<{ id: string; name: string; amount: number; tenureMonths: number; stage: string }>;
  };
  uniforms: {
    openOrders: number;
    readyForPickup: number;
    stockItems: number;
    recentOrders: Array<{ id: string; student: string; class: string; items: number; total: number; status: string }>;
  };
  dining: {
    mealsToday: number;
    boarders: number;
    menu: string[];
    weeklyMeals: Array<{ day: string; meals: number }>;
  };
  shuleTrip: {
    pending: number;
    upcoming: Array<{
      id: string;
      title: string;
      date: string;
      students: number;
      staff: number;
      buses: number;
      status: string;
      notes: string;
    }>;
    past: Array<{ id: string; title: string; date: string; students: number; staff: number; status: string }>;
  };
}

export interface TaskItem {
  id: string;
  organizationId: string | null;
  title: string;
  description: string | null;
  owner: string;
  ownerRole: string | null;
  priority: string;
  category: string;
  dueDate: string | null;
  status: string;
  progress: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TasksData {
  items: TaskItem[];
  pagination: Pagination;
  stats: { open: number; inProgress: number; completed: number; overdue: number; total: number };
}

export interface MeetingItem {
  id: string;
  organizationId: string | null;
  title: string;
  description: string | null;
  agenda: string[];
  location: string | null;
  meetingDate: string;
  startTime: string | null;
  endTime: string | null;
  participants: string[];
  status: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingsData {
  items: MeetingItem[];
  pagination: Pagination;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  module: string;
  targetType: string;
  targetId: string;
  summary: string;
  organizationId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface AuditData {
  items: AuditEvent[];
  pagination: Pagination;
  modules: string[];
}

export interface SearchGroup {
  id: string;
  label: string;
  items: Array<{ id: string; title: string; subtitle: string; href: string }>;
}

export interface SearchData {
  query: string;
  groups: SearchGroup[];
}

export interface ReportsData {
  categories: Array<{ id: string; label: string; href: string }>;
  formats: string[];
  recent: Array<{ id: string; name: string; category: string; generatedAt: string; format: string; url?: string; title?: string; createdAt?: string; date?: string }>;
  note: string;
}

export interface UnifiedRequest {
  id: string;
  source: 'transport' | 'procurement';
  kind: 'change' | 'issue' | 'purchase';
  module: 'Transport' | 'ProcurementMIS';
  title: string;
  subtitle: string;
  type?: string;
  requester: string;
  status: string;
  priority: string;
  amount?: number | null;
  currency?: string | null;
  date: string | null;
  description?: string;
  meta: Record<string, unknown>;
}

export interface RequestsData {
  items: UnifiedRequest[];
  summary: { total: number; pending: number; transport: number; procurement: number };
}

export interface BranchesData {
  branches: Branch[];
  comparison: {
    students: number;
    staff: number;
    averageAttendance: number;
    averageFees: number;
    averageAcademic: number;
  };
}
