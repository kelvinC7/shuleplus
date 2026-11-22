export type LanguageCode = 'en' | 'rw' | 'fr' | 'lg' | 'pt' | 'sw' | 'rn';

export interface SubjectItem {
  name: string;
  score: number;
  teacher: string;
  comment: string;
  midterm?: number;
  endterm?: number;
  assignments?: number;
}

export interface HomeworkItem {
  id: string;
  day: string;
  month: string;
  subject: string;
  title: string;
  dueText: string;
  status: 'pending' | 'submitted' | 'graded';
  instructions?: string;
  tagColor?: string;
  score?: string;
}

export interface AttendanceDay {
  day: number;
  status: 'P' | 'A' | 'L' | 'E'; // Present, Absent, Late, Excused
  time?: string;
  dateStr?: string;
}

export interface BusDetails {
  n: string;
  route: string;
  pick: string;
  drv: string;
}

export interface TodayLesson {
  what: string;
  with: string;
  where: string;
  time: string;
  period: string;
}

export interface WalletTransaction {
  id: string;
  title: string;
  category: 'canteen' | 'shop' | 'library' | 'topup';
  date: string;
  amount: number;
  isCredit: boolean;
  ref: string;
}

export interface SpendLimits {
  daily: number;
  weekly: number;
  termly: number;
  canteenEnabled: boolean;
  shopEnabled: boolean;
}

export interface DisciplineRecord {
  id: string;
  date: string;
  type: string; // 'MERIT' | 'INFRACTION' | 'SANCTION' | 'CONDUCT_NOTE'
  category?: string; // 'Academics' | 'Leadership' | 'Uniform' | 'Punctuality' | 'Sports' | 'Civics'
  description: string;
  points: number; // positive for merit, negative for penalty
  status: string; // 'RECORDED' | 'RESOLVED' | 'COMMENDED'
  sanction?: string;
  recordedBy?: string;
}

export interface PermissionRecord {
  id: string;
  type: string; // 'EXEUNT' | 'SICK_BAY' | 'WEEKEND_PASS' | 'FAMILY_EMERGENCY'
  departureDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  destination: string;
  reason: string;
  status: 'APPROVED' | 'ACTIVE' | 'RETURNED' | 'OVERDUE';
}

export interface Child {
  id: string;
  n: string; // Full name
  first: string;
  cls: string;
  lvl: string;
  code: string; // School code
  sdms: string; // SDMS code
  cardno: string; // ShuleCard number
  ct: string; // Class teacher
  card: number; // Card balance in RWF
  lastTop?: [string, number];
  fees?: number; // Unused for payment, but kept in student profile
  att: number; // Attendance rate %
  avg: number; // Marks average %
  prev: number;
  trend: number[];
  cls_avg: number[];
  rank: string;
  conduct: number;
  type: 'Boarder' | 'Day scholar';
  dorm?: string;
  patron?: string;
  bus?: BusDetails;
  guardians?: string[];
  dob?: string;
  gender?: string;
  nationality?: string;
  nationalId?: string;
  admissionDate?: string;
  house?: string;
  stream?: string;
  photo?: string | null;
  role?: string;
  gpa?: number;
  disciplineRecords?: DisciplineRecord[];
  permissions?: PermissionRecord[];
  medical?: {
    bloodGroup?: string;
    genotype?: string;
    allergies?: string[];
    chronicConditions?: string;
  };
  today?: TodayLesson;
  subj: SubjectItem[];
  hw: HomeworkItem[];
  attendanceMonth?: AttendanceDay[];
  limits?: SpendLimits;
  transactions?: WalletTransaction[];
}

export interface ParentUser {
  id?: string;
  n: string;
  first?: string;
  ph: string;
  phone?: string;
  email?: string;
  avatar?: string;
  organizationId?: string;
}

export interface SchoolTrip {
  id: string;
  kid: string;
  title: string;
  short: string;
  date: string;
  due: string;
  fee: number;
  paid: number;
  ref: string;
  approved: string;
  consented: boolean;
  place?: string;
  depart?: string;
  ret?: string;
  students?: number;
  staff?: number;
  consentDetails?: {
    guardianName: string;
    phone: string;
    medicalNotes: string;
    emergencyContact: string;
  };
  itinerary: Array<{ time: string; activity: string }>;
  whatToPack: string[];
  safety: string[];
  items?: Array<{ name: string; amount: number }>;
  dayUpdates?: Array<{ time: string; title: string; desc: string; author: string }>;
}

export interface SavingsGoal {
  id: string;
  kid: string;
  name: string;
  target: number;
  saved: number;
  weekly: number;
  category: 'trip' | 'gear' | 'education' | 'general';
  deadline: string;
  auto?: boolean;
  by?: string;
}

export interface UniformOrder {
  id: string;
  kidId: string;
  type: 'uniform' | 'shoes';
  items: Array<{ name: string; size: string; qty: number; price: number }>;
  total: number;
  deliveryMethod: 'school' | 'store' | 'home';
  deliveryAddress?: string;
  status: 'Order placed' | 'Packed' | 'Delivered' | 'Collected';
  orderDate: string;
  expectedDelivery: string;
  trackingNumber: string;
  paymentPlan?: 'full' | 'instalments';
  exchange?: {
    item: string;
    oldSize: string;
    newSize: string;
    status: string;
    requestedDate: string;
  };
}

export interface Circular {
  id: string;
  title: string;
  date: string;
  category: string;
  body: string;
  author: string;
  urgent?: boolean;
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  sender: 'parent' | 'teacher';
  senderName: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface TeacherThread {
  id: string;
  teacherName: string;
  teacherRole: string;
  subject?: string;
  avatarColor: string;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: 'academic' | 'attendance' | 'homework' | 'circular' | 'wallet' | 'fees' | 'discipline' | 'shulekit' | 'babyeyi' | 'studentmanagement' | 'general' | string;
  data?: any;
  createdAt?: string;
}

export interface BabyeyiData {
  schoolName: string;
  academicYear: string;
  term: string;
  termDates: Array<{ label: string; date: string }>;
  requirements: Array<{ name: string; qty: number | string }>;
  feesReference: Array<{ item: string; amount: number }>;
}
