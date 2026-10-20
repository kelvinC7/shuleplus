/**
 * SMS Bulk API client.
 *
 * Currently backed by in-memory mock data so the SuperAdmin module is fully
 * usable end-to-end. Swap the `resolve` helpers for real HTTP calls against the
 * SMS Bulk backend when it ships — the exported method shapes are the contract.
 */

export interface SmsStudentParent {
  id: string;
  name: string;
  relationship: 'Father' | 'Mother' | 'Guardian' | 'Primary' | 'Secondary';
  phone: string;
  verified: boolean;
  smsEnabled: boolean;
}

export interface SmsStudent {
  id: string;
  studentCode: string;
  sdmsCode: string;
  name: string;
  gender: 'M' | 'F';
  school: string;
  district: string;
  className: string;
  academicYear: string;
  term: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRANSFERRED' | 'GRADUATED';
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'DEADLINE_SOON';
  parents: SmsStudentParent[];
}

export interface SmsMessage {
  id: string;
  to: string;
  student: string;
  type: 'Fee' | 'Attendance' | 'Discipline' | 'Announcement' | 'Gate' | 'Academic';
  campaign?: string;
  senderId: string;
  body: string;
  parts: number;
  status: 'DELIVERED' | 'PENDING' | 'FAILED';
  failureReason?: string;
  sentAt: string;
  scheduledAt?: string;
  cost: number;
}

export interface SmsCampaign {
  id: string;
  name: string;
  status: 'COMPLETED' | 'SCHEDULED' | 'DRAFT' | 'SENDING' | 'CANCELLED';
  recipients: number;
  sent: number;
  delivered: number;
  failed: number;
  cost: number;
  messageType: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface SmsScheduled {
  id: string;
  name: string;
  audience: string;
  recipients: number;
  date: string;
  time: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT';
}

export interface SmsTemplate {
  id: string;
  name: string;
  category: 'Fees' | 'Academic' | 'Attendance' | 'Gate' | 'Discipline' | 'Announcements' | 'Events' | 'Congratulations' | 'Exams' | 'Parent';
  body: string;
  usage: number;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface SmsAutomation {
  id: string;
  name: string;
  trigger: string;
  schedule: string;
  audience: string;
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
}

export interface SmsCreditHistory {
  id: string;
  date: string;
  action: string;
  credits: number;
  balanceAfter: number;
}

export interface SmsSenderId {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  used: number;
}

export interface SmsAuditEntry {
  id: string;
  actor: string;
  action: string;
  detail: string;
  date: string;
}

export interface SmsDashboard {
  kpis: {
    sentToday: number;
    delivered: number;
    pending: number;
    failed: number;
    credits: number;
    parentsReached: number;
  };
  monthly: { sent: number; delivered: number; failed: number; cost: number; creditsConsumed: number; deliveryRate: number; failedRate: number };
  dailySeries: { date: string; sent: number; delivered: number }[];
  weeklySeries: { label: string; sent: number }[];
  byPurpose: { label: string; value: number; color: string }[];
  bySchool: { school: string; sent: number }[];
  recentCampaigns: SmsCampaign[];
  scheduled: SmsScheduled[];
  failedMessages: SmsMessage[];
}

export interface SmsProviderStatus {
  name: string;
  connected: boolean;
  apiStatus: string;
  senderId: string;
  balance: number;
  deliveryRate: number;
  costPerCredit: number;
}

export interface SmsSettings {
  provider: SmsProviderStatus;
  senderIds: SmsSenderId[];
  auditLog: SmsAuditEntry[];
}

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

const PARENTS = [
  { name: 'Jean Pierre', relationship: 'Father', phone: '+250 788 123 456' },
  { name: 'Marie Claire', relationship: 'Mother', phone: '+250 722 654 321' },
  { name: 'Eric Niyonzima', relationship: 'Guardian', phone: '+250 733 555 789' },
  { name: 'Alice Uwase', relationship: 'Mother', phone: '+250 789 222 444' },
  { name: 'Patrick Hakizimana', relationship: 'Father', phone: '+250 730 111 999' },
  { name: 'Diane Mukamana', relationship: 'Guardian', phone: '+250 798 777 333' },
  { name: 'Emmanuel Nshimiyimana', relationship: 'Father', phone: '+250 735 888 222' },
  { name: 'Claudine Ingabire', relationship: 'Mother', phone: '+250 799 333 111' },
] as const;

const FIRST_NAMES = ['Jean Claude', 'Alice', 'Eric', 'Diane', 'Patrick', 'Claudine', 'Emmanuel', 'Sandrine', 'Olivier', 'Josiane', 'Dieudonné', 'Aline', 'Fabrice', 'Chantal', 'Yves', 'Laetitia', 'Innocent', 'Gladys'];
const LAST_NAMES = ['Uwimana', 'Habimana', 'Mugisha', 'Uwase', 'Niyonzima', 'Mukamana', 'Nsengimana', 'Ingabire', 'Nshimiyimana', 'Mutesi', 'Bizimana', 'Uwineza'];
const SCHOOLS = [
  { name: 'ABC School', district: 'Kigali' },
  { name: 'Ecole Primaire Gahanga', district: 'Kicukiro' },
  { name: 'Bugesera Boarding School', district: 'Bugesera' },
  { name: 'GS Rwamagana', district: 'Rwamagana' },
  { name: 'College Nyarugenge', district: 'Nyarugenge' },
  { name: 'Ecole Secondaire Musanze', district: 'Musanze' },
];
const CLASSES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4'];
const YEARS = ['2025–2026', '2026–2027'];

function random<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildStudents(count: number): SmsStudent[] {
  const out: SmsStudent[] = [];
  for (let i = 0; i < count; i += 1) {
    const school = random(SCHOOLS);
    const name = `${random(FIRST_NAMES)} ${random(LAST_NAMES)}`;
    const p1 = random(PARENTS);
    const p2 = random(PARENTS);
    const parents: SmsStudentParent[] = [
      { id: `${i}-p1`, name: p1.name, relationship: p1.relationship, phone: p1.phone, verified: Math.random() > 0.12, smsEnabled: Math.random() > 0.08 },
    ];
    if (Math.random() > 0.45 && p2.name !== p1.name) {
      parents.push({ id: `${i}-p2`, name: p2.name, relationship: p2.relationship, phone: p2.phone, verified: Math.random() > 0.15, smsEnabled: Math.random() > 0.1 });
    }
    out.push({
      id: `stu-${i + 1}`,
      studentCode: `SCH-2026-${String(430 + i).padStart(5, '0')}`,
      sdmsCode: `SDMS-${String(9800 + i).padStart(6, '0')}`,
      name,
      gender: Math.random() > 0.5 ? 'M' : 'F',
      school: school.name,
      district: school.district,
      className: random(CLASSES),
      academicYear: random(YEARS),
      term: 'Term 1',
      status: Math.random() > 0.9 ? 'INACTIVE' : 'ACTIVE',
      paymentStatus: ['PAID', 'PARTIAL', 'UNPAID', 'DEADLINE_SOON'][Math.floor(Math.random() * 4)] as SmsStudent['paymentStatus'],
      parents,
    });
  }
  return out;
}

const STUDENTS = buildStudents(46);

const MSG_TYPES = ['Fee', 'Attendance', 'Discipline', 'Announcement', 'Gate', 'Academic'] as const;
const FAIL_REASONS = ['Invalid number', 'Number unreachable', 'Provider rejected', 'Network error', 'Opted out'];

function buildMessages(count: number): SmsMessage[] {
  const out: SmsMessage[] = [];
  const day = new Date('2026-08-15T10:32:00');
  for (let i = 0; i < count; i += 1) {
    const student = random(STUDENTS);
    const type = random(MSG_TYPES);
    const status: SmsMessage['status'] = Math.random() < 0.04 ? 'PENDING' : Math.random() < 0.08 ? 'FAILED' : 'DELIVERED';
    out.push({
      id: `msg-${1000 + i}`,
      to: random(PARENTS).phone,
      student: student.name,
      type,
      campaign: Math.random() > 0.5 ? 'August Fee Reminder' : undefined,
      senderId: 'SHULEPLUS',
      body:
        type === 'Fee'
          ? `Dear parent, ${student.name} has an outstanding balance. Please contact ${student.school}.`
          : type === 'Attendance'
            ? `Dear parent, ${student.name} was marked absent from school today.`
            : `Dear parent, this is a message about ${student.name}.`,
      parts: 1,
      status,
      failureReason: status === 'FAILED' ? random(FAIL_REASONS) : undefined,
      sentAt: new Date(day.getTime() - i * 3_600_000).toISOString(),
      cost: 9,
    });
  }
  return out;
}

const MESSAGES = buildMessages(64);

const CAMPAIGNS: SmsCampaign[] = [
  { id: 'cmp-1', name: 'School Fees Reminder — August', status: 'COMPLETED', recipients: 12450, sent: 12450, delivered: 11980, failed: 470, cost: 12450, messageType: 'Fee', completedAt: '2026-08-15T09:00:00Z', createdAt: '2026-08-01T08:00:00Z' },
  { id: 'cmp-2', name: 'Term 1 Opening Announcement', status: 'SCHEDULED', recipients: 8900, sent: 0, delivered: 0, failed: 0, cost: 0, messageType: 'Announcement', scheduledAt: '2026-08-20T08:30:00Z', createdAt: '2026-08-14T14:00:00Z' },
  { id: 'cmp-3', name: 'P5 Exam Results Release', status: 'DRAFT', recipients: 0, sent: 0, delivered: 0, failed: 0, cost: 0, messageType: 'Academic', createdAt: '2026-08-13T11:00:00Z' },
  { id: 'cmp-4', name: 'Parent-Teacher Conference Invite', status: 'SENDING', recipients: 6120, sent: 3450, delivered: 3210, failed: 240, cost: 3450, messageType: 'Announcement', createdAt: '2026-08-12T09:30:00Z' },
  { id: 'cmp-5', name: 'Discipline Incident Follow-up', status: 'COMPLETED', recipients: 245, sent: 245, delivered: 238, failed: 7, cost: 245, messageType: 'Discipline', completedAt: '2026-08-10T16:00:00Z', createdAt: '2026-08-09T10:00:00Z' },
];

const SCHEDULED: SmsScheduled[] = [
  { id: 'sch-1', name: 'Term 1 Opening Announcement', audience: 'All Parents', recipients: 8900, date: '20 Aug 2026', time: '08:30 AM', status: 'SCHEDULED' },
  { id: 'sch-2', name: 'Fee Deadline Reminder', audience: 'Parents → Unpaid → P5', recipients: 1240, date: '22 Aug 2026', time: '09:00 AM', status: 'SCHEDULED' },
  { id: 'sch-3', name: 'Gate Check-out Notifications', audience: 'Parents → Gate enabled', recipients: 430, date: '18 Aug 2026', time: '04:30 PM', status: 'SCHEDULED' },
  { id: 'sch-4', name: 'Sports Day Invitation', audience: 'All Students', recipients: 15300, date: '25 Aug 2026', time: '10:00 AM', status: 'SCHEDULED' },
];

const TEMPLATES: SmsTemplate[] = [
  { id: 'tpl-1', name: 'Fee Reminder', category: 'Fees', body: 'Dear {{parent_name}}, this is a reminder that {{student_name}} has an outstanding balance of {{balance}} FRW.', usage: 3210, status: 'ACTIVE' },
  { id: 'tpl-2', name: 'Payment Confirmation', category: 'Fees', body: 'Dear {{parent_name}}, payment of {{amount}} FRW for {{student_name}} has been received. Thank you.', usage: 1840, status: 'ACTIVE' },
  { id: 'tpl-3', name: 'Absent Today', category: 'Attendance', body: 'Dear {{parent_name}}, {{student_name}} was marked absent from school today, {{date}}.', usage: 765, status: 'ACTIVE' },
  { id: 'tpl-4', name: 'Check-out Notice', category: 'Gate', body: 'Dear Parent, {{student_name}} has checked out of {{school_name}} at {{time}}.', usage: 430, status: 'ACTIVE' },
  { id: 'tpl-5', name: 'Incident Notification', category: 'Discipline', body: 'Dear Parent, an incident involving {{student_name}} was recorded today. Please contact the school.', usage: 205, status: 'ACTIVE' },
  { id: 'tpl-6', name: 'Exam Results Available', category: 'Exams', body: "Dear {{parent_name}}, {{student_name}}'s {{term}} results are now available on the Parent Portal.", usage: 1120, status: 'ACTIVE' },
  { id: 'tpl-7', name: 'School Reopening', category: 'Announcements', body: 'Dear {{parent_name}}, {{school_name}} reopens on {{date}}. We look forward to seeing {{student_name}}.', usage: 980, status: 'ACTIVE' },
  { id: 'tpl-8', name: 'Congratulations — Honor Roll', category: 'Congratulations', body: 'Congratulations! {{student_name}} has been named to the Honor Roll for {{term}}.', usage: 310, status: 'ACTIVE' },
];

const AUTOMATIONS: SmsAutomation[] = [
  { id: 'aut-1', name: 'Fee Reminder (7 days before)', trigger: 'Outstanding balance', schedule: '7 days before deadline', audience: 'Parents → Unpaid fees', enabled: true, lastRun: '2026-08-08T08:00:00Z', nextRun: '2026-08-15T08:00:00Z' },
  { id: 'aut-2', name: 'Fee Reminder (2 days before)', trigger: 'Outstanding balance', schedule: '2 days before deadline', audience: 'Parents → Unpaid fees', enabled: true, nextRun: '2026-08-18T08:00:00Z' },
  { id: 'aut-3', name: 'Payment Confirmation', trigger: 'Payment received', schedule: 'Immediate', audience: 'Parents → New payment', enabled: true, lastRun: '2026-08-15T09:12:00Z', nextRun: 'On event' },
  { id: 'aut-4', name: 'Absence Notification', trigger: 'Student absent', schedule: 'Immediate', audience: 'Parents → Absent student', enabled: true, lastRun: '2026-08-15T08:45:00Z', nextRun: 'On event' },
  { id: 'aut-5', name: 'Gate Check-out', trigger: 'Student leaves campus', schedule: 'Immediate', audience: 'Parents → Gate enabled', enabled: false, nextRun: 'On event' },
];

const CREDIT_HISTORY: SmsCreditHistory[] = [
  { id: 'ch-1', date: '2026-08-15', action: 'Campaign: August Fee Reminder', credits: -12450, balanceAfter: 48495 },
  { id: 'ch-2', date: '2026-08-14', action: 'Top-up — NESA bulk credit', credits: 40000, balanceAfter: 60945 },
  { id: 'ch-3', date: '2026-08-14', action: 'Test SMS (2)', credits: -2, balanceAfter: 20945 },
  { id: 'ch-4', date: '2026-08-12', action: 'Campaign: Parent-Teacher Invite', credits: -6120, balanceAfter: 20947 },
  { id: 'ch-5', date: '2026-08-10', action: 'Campaign: Discipline Follow-up', credits: -245, balanceAfter: 27067 },
  { id: 'ch-6', date: '2026-08-01', action: 'Top-up — school provisioning', credits: 20000, balanceAfter: 27312 },
];

const SENDER_IDS: SmsSenderId[] = [
  { id: 'sid-1', name: 'SHULEPLUS', status: 'APPROVED', used: 48210 },
  { id: 'sid-2', name: 'ABC SCHOOL', status: 'APPROVED', used: 3210 },
  { id: 'sid-3', name: 'BABAYEI', status: 'PENDING', used: 0 },
];

const AUDIT_LOG: SmsAuditEntry[] = [
  { id: 'aud-1', actor: 'Admin Ishimwe', action: 'Sent 12,450 SMS', detail: 'Campaign: August Fee Reminder', date: '2026-08-15 — 10:32 AM' },
  { id: 'aud-2', actor: 'Admin Ishimwe', action: 'Exported contacts', detail: 'Students & Parents directory → CSV (8,240 rows)', date: '2026-08-15 — 09:58 AM' },
  { id: 'aud-3', actor: 'SuperAdmin NESA', action: 'Viewed student profile', detail: 'Jean Claude · SCH-2026-00451', date: '2026-08-15 — 09:41 AM' },
  { id: 'aud-4', actor: 'Admin Ishimwe', action: 'Scheduled SMS', detail: 'Campaign: Term 1 Opening — Aug 20 08:30 AM', date: '2026-08-14 — 02:15 PM' },
  { id: 'aud-5', actor: 'Admin Ishimwe', action: 'Changed template', detail: 'Fee Reminder — body updated', date: '2026-08-14 — 11:03 AM' },
  { id: 'aud-6', actor: 'SuperAdmin NESA', action: 'Changed provider settings', detail: 'Sender ID → SHULEPLUS', date: '2026-08-13 — 04:47 PM' },
];

const DAILY = [
  { date: '09 Aug', sent: 9200, delivered: 9100 },
  { date: '10 Aug', sent: 10800, delivered: 10600 },
  { date: '11 Aug', sent: 12400, delivered: 12150 },
  { date: '12 Aug', sent: 9900, delivered: 9720 },
  { date: '13 Aug', sent: 11600, delivered: 11300 },
  { date: '14 Aug', sent: 13200, delivered: 12900 },
  { date: '15 Aug', sent: 12480, delivered: 11920 },
];
const WEEKLY = [
  { label: 'W1', sent: 32000 },
  { label: 'W2', sent: 41000 },
  { label: 'W3', sent: 38500 },
  { label: 'W4', sent: 46800 },
];

const PROVIDER: SmsProviderStatus = {
  name: 'AfroBulkSMS',
  connected: true,
  apiStatus: 'Operational',
  senderId: 'SHULEPLUS',
  balance: 48495,
  deliveryRate: 95.4,
  costPerCredit: 9,
};

export interface AudienceFilters {
  school: string;
  district: string;
  sector: string;
  category: string;
  program: string;
  educationLevel: string;
  student: string;
  academicYear: string;
  term: string;
  className: string;
  gender: string;
  status: string;
  relation: string;
  phoneVerified: string;
  smsEnabled: string;
  trigger: string;
}

export const EMPTY_FILTERS: AudienceFilters = {
  school: '',
  district: '',
  sector: '',
  category: '',
  program: '',
  educationLevel: '',
  student: '',
  academicYear: '',
  term: '',
  className: '',
  gender: '',
  status: '',
  relation: '',
  phoneVerified: '',
  smsEnabled: '',
  trigger: '',
};

const TRIGGERS = [
  { label: 'Fee Status → Unpaid fees', value: 'unpaid' },
  { label: 'Fee Status → Partial payment', value: 'partial' },
  { label: 'Fee Status → Fully paid', value: 'paid' },
  { label: 'Fee Status → Deadline approaching', value: 'deadline' },
  { label: 'Attendance → Absent today', value: 'absent-today' },
  { label: 'Attendance → Late students', value: 'late' },
  { label: 'Attendance → Absent 3+ days', value: 'absent-3' },
  { label: 'Discipline → Disciplinary incidents', value: 'discipline' },
];

function estimateAudience(audience: string, filters: AudienceFilters): number {
  let base = audience === 'student' ? 1 : 0;
  if (audience === 'parents' || audience === 'allParents') base = 8240;
  if (audience === 'students' || audience === 'allStudents') base = 15300;
  if (audience === 'school') base = 4200;
  if (audience === 'class') base = 1284;
  if (audience === 'district') base = 3100;
  if (audience === 'sector') base = 980;
  if (audience === 'academicYear') base = 22100;
  if (audience === 'custom') base = 610;
  if (filters.school) base = Math.max(6, Math.round(base * 0.45));
  if (filters.district) base = Math.max(4, Math.round(base * 0.32));
  if (filters.sector) base = Math.max(3, Math.round(base * 0.18));
  if (filters.className) base = Math.max(3, Math.round(base * 0.12));
  if (filters.gender) base = Math.max(2, Math.round(base * 0.5));
  if (filters.status === 'INACTIVE') base = Math.max(2, Math.round(base * 0.1));
  if (filters.smsEnabled === 'yes') base = Math.max(2, Math.round(base * 0.94));
  if (filters.phoneVerified === 'yes') base = Math.max(2, Math.round(base * 0.9));
  if (filters.trigger) base = TRIGGERS.some((t) => t.value === filters.trigger) ? Math.max(3, Math.round(base * 0.2)) : base;
  return base;
}

export const smsBulkApi = {
  async dashboard(): Promise<SmsDashboard> {
    await delay();
    const delivered = 11920;
    const failed = 240;
    const pending = 320;
    const sentToday = 12480;
    return {
      kpis: { sentToday, delivered, pending, failed, credits: 48495, parentsReached: 8240 },
      monthly: {
        sent: 146800,
        delivered: 139900,
        failed: 3180,
        cost: 1321200,
        creditsConsumed: 146800,
        deliveryRate: 95.3,
        failedRate: 2.2,
      },
      dailySeries: DAILY,
      weeklySeries: WEEKLY,
      byPurpose: [
        { label: 'Fees', value: 38, color: '#fcb038' },
        { label: 'Attendance', value: 17, color: '#0a0f5c' },
        { label: 'Discipline', value: 8, color: '#ef4444' },
        { label: 'Announcements', value: 21, color: '#0ea5e9' },
        { label: 'Gate', value: 9, color: '#10b981' },
        { label: 'Academic', value: 7, color: '#8b5cf6' },
      ],
      bySchool: SCHOOLS.map((s) => ({ school: s.name, sent: Math.round((Math.random() * 8000) + 3000) })),
      recentCampaigns: CAMPAIGNS.slice(0, 4),
      scheduled: SCHEDULED.slice(0, 3),
      failedMessages: MESSAGES.filter((m) => m.status === 'FAILED').slice(0, 5),
    };
  },

  async students(params?: { search?: string; district?: string; school?: string }): Promise<SmsStudent[]> {
    await delay();
    let rows = [...STUDENTS];
    if (params?.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter((s) => s.name.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q) || s.sdmsCode.toLowerCase().includes(q));
    }
    if (params?.district) rows = rows.filter((s) => s.district === params.district);
    if (params?.school) rows = rows.filter((s) => s.school === params.school);
    return rows;
  },

  async student(id: string): Promise<SmsStudent | undefined> {
    await delay(120);
    return STUDENTS.find((s) => s.id === id);
  },

  async studentSmsHistory(studentId: string): Promise<SmsMessage[]> {
    await delay(120);
    const student = STUDENTS.find((s) => s.id === studentId);
    return MESSAGES.filter((m) => !student || m.student === student.name).slice(0, 12);
  },

  async listMessages(params?: { status?: string; search?: string; type?: string }): Promise<SmsMessage[]> {
    await delay();
    let rows = [...MESSAGES];
    if (params?.status) rows = rows.filter((m) => m.status === params.status);
    if (params?.type) rows = rows.filter((m) => m.type === params.type);
    if (params?.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter((m) => m.student.toLowerCase().includes(q) || m.to.includes(q));
    }
    return rows.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  },

  async campaigns(): Promise<SmsCampaign[]> {
    await delay();
    return CAMPAIGNS;
  },

  async scheduled(): Promise<SmsScheduled[]> {
    await delay();
    return SCHEDULED;
  },

  async templates(): Promise<SmsTemplate[]> {
    await delay();
    return TEMPLATES;
  },

  async automations(): Promise<SmsAutomation[]> {
    await delay();
    return AUTOMATIONS;
  },

  async credits(): Promise<{ balance: number; usedToday: number; usedMonth: number; history: SmsCreditHistory[] }> {
    await delay();
    return { balance: 48495, usedToday: 12480, usedMonth: 146800, history: CREDIT_HISTORY };
  },

  async provider(): Promise<SmsProviderStatus> {
    await delay(120);
    return PROVIDER;
  },

  async senderIds(): Promise<SmsSenderId[]> {
    await delay(120);
    return SENDER_IDS;
  },

  async auditLog(): Promise<SmsAuditEntry[]> {
    await delay(120);
    return AUDIT_LOG;
  },

  estimateAudience(audience: string, filters: AudienceFilters): number {
    return estimateAudience(audience, filters);
  },

  sendSms(input: { audience: string; filters: AudienceFilters; recipients: number; body: string; when: 'now' | 'schedule' | 'draft' | 'test'; scheduledDate?: string; scheduledTime?: string; testNumber?: string }): Promise<{ id: string; queued: number; body: string }> {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ id: `send-${Date.now()}`, queued: input.recipients, body: input.body }), 700);
    });
  },

  retryFailed(ids: string[]): Promise<{ retried: number }> {
    return new Promise((resolve) => setTimeout(() => resolve({ retried: ids.length }), 500));
  },
};

export const SMS_TRIGGERS = TRIGGERS;
export const SMS_DISTRICTS = Array.from(new Set(SCHOOLS.map((s) => s.district)));
export const SMS_SCHOOLS = SCHOOLS.map((s) => s.name);
export const SMS_CLASSES = CLASSES;
export const SMS_YEARS = YEARS;
