export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface SchoolAcademicSettings {
  academicYears: string[];
  terms: string[];
  currentAcademicYear: string | null;
  currentTerm: string | null;
}

export interface DashboardData {
  student: StudentInfo;
  linkedStudents: LinkedStudent[];
  attendance: AttendanceSummary;
  academics: AcademicSummary;
  fees: FeeSummary;
  wallet: WalletSummary;
  recentActivities: ActivityLog[];
  organization?: { name: string };
  schoolAcademic?: SchoolAcademicSettings;
}

export interface LinkedStudent {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  shuleCode: string;
  className: string;
  stream: string;
  avatarUrl: string | null;
  relationship: string;
  isPrimary: boolean;
}

export interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  class: string;
  stream: string;
  shuleCode: string;
  cardNumber: string;
  classTeacher: string;
  house: string;
  transportRoute: string;
  admissionDate: string;
  isBoarding: boolean;
  avatarUrl: string | null;
}

export interface AttendanceSummary {
  todayStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'NONE';
  checkInTime: string | null;
  checkOutTime?: string | null;
  monthlyPresent: number;
  monthlyAbsent: number;
  monthlyLate: number;
  monthlyExcused: number;
  attendanceRate: number;
}

export interface AcademicSummary {
  currentGPA: number;
  classRank: number;
  totalStudents: number;
  term: string;
  academicYear: string;
  topSubjects: SubjectGrade[];
  upcomingExams: UpcomingExam[];
  disciplineScore: number;
}

export interface SubjectGrade {
  subject: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
  rank: number;
}

export interface UpcomingExam {
  id: string;
  subject: string;
  date: string;
  type: string;
}

export interface FeeSummary {
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  currency: string;
  currentTerm: string;
  feeStatements: FeeStatement[];
  recentPayments: FeePayment[];
}

export interface FeeStatement {
  id: string;
  term: string;
  description: string;
  amount: number;
  paid: number;
  balance: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
  dueDate: string;
}

export interface FeePayment {
  id: string;
  date: string;
  description: string;
  amount: number;
  method: string;
  reference: string;
  receiptUrl: string | null;
}

export interface WalletSummary {
  balance: number;
  currency: string;
  cardNumber: string;
  lastTopUp: string | null;
  lastTopUpAmount: number | null;
  recentTransactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  balanceAfter: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  metadata: any;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  notes: string | null;
}

export interface Message {
  id: string;
  from: string;
  fromRole: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  attachments: string[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  author: string;
}

export interface TeacherContact {
  id: string;
  name: string;
  subject: string;
  role: string;
  phone: string;
  email: string;
}

export interface SampleRecord {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
