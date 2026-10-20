export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
  name?: string;
}

export type CircularStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

export interface PaymentLine {
  name: string;
  amount: number;
  pay_channel: 'school' | 'babyeyi';
}

export interface RequirementLine {
  item: string;
  description?: string;
  quantity?: string;
  /**
   * Payment type for ShuleKit integration:
   * - `school` = Paid to School Account (checkbox on) — school fee with unitPrice; NOT imported to Standard Kits.
   * - `babyeyi` = Other Requirement (checkbox off) — imported to Standard Kits; price set by Super Admin.
   */
  pay_channel: 'school' | 'babyeyi';
  unitPrice?: number;
  cost?: number;
}

export interface BankAccount {
  bank_name: string;
  account_no: string;
  account_name: string;
  is_primary?: boolean;
}

export interface LeaderContact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
}

export interface AnnouncementItem {
  title: string;
  detail?: string;
}

export interface I18nTriplet {
  en: string;
  rw: string;
  fr: string;
}

/** content_i18n v1 bundle — auto-translated (EN -> RW/FR) narrative fields, with manual Hindura overrides. */
export interface ContentI18nBundle {
  v: 1;
  sourceLang: 'en';
  generatedAt: string;
  status: 'pending' | 'complete' | 'partial' | 'failed' | 'manual';
  parentMessage: I18nTriplet;
  payments: Array<{ name: I18nTriplet }>;
  requirements: Array<{ item: I18nTriplet; description: I18nTriplet }>;
  otherInfos: Array<{ item: I18nTriplet }>;
  classReqs: Array<{ item: I18nTriplet }>;
  leaders: Array<{ role: I18nTriplet }>;
}

export interface Circular {
  id: string;
  organizationId: string;
  academicYear: string;
  term: string;
  educationLevel?: string;
  className: string;
  classes: string[];
  schoolCategory: string;
  ownershipType: string;
  feeTargetStudents: string;
  province?: string;
  district?: string;
  sector?: string;
  language: string;
  parentMessage?: string;
  contentI18n?: Partial<ContentI18nBundle>;
  translationStatus?: string;
  payments: PaymentLine[];
  requirements: RequirementLine[];
  banks: BankAccount[];
  classReqs: Array<{ item: string }>;
  otherInfos: Array<{ item: string }>;
  announcements?: AnnouncementItem[];
  includeAnnouncements?: boolean;
  /** Custom header text (church, P.O. Box, phone, email, etc.) — replaces the default ministry header. */
  includeSchoolDescription?: boolean;
  descriptionLines?: string[];
  leaders: LeaderContact[];
  status: CircularStatus;
  version: number;
  totalFee: number;
  nesaLimit?: number;
  requestIncrease: boolean;
  increaseReason?: string;
  authorName?: string;
  publishedAt?: string;
  publishedBy?: string;
  qrHash?: string;
  qrCodePath?: string;
  downloadCount: number;
  viewCount: number;
  qrScanCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
  activities?: CircularActivity[];
  approvals?: CircularApproval[];
  comments?: CircularComment[];
  versions?: CircularVersion[];
}

export interface CircularActivity {
  id: string;
  eventType: string;
  description: string;
  actorName?: string;
  createdAt: string;
}

export interface CircularApproval {
  id: string;
  stage: string;
  action: string;
  approverName?: string;
  reason?: string;
  notes?: string;
  actedAt?: string;
}

export interface CircularComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface CircularVersion {
  id: string;
  version: number;
  changeType: string;
  changedByName?: string;
  createdAt: string;
}

export interface SchoolProfile {
  id: string;
  schoolName: string;
  schoolCode?: string;
  ownershipType: string;
  academicYear: string;
  principalName?: string;
  province?: string;
  district?: string;
  sector?: string;
  logoPath?: string;
  stampPath?: string;
  signaturePath?: string;
  otherLogoPath?: string;
  themeColor: string;
  verificationStatus: string;
  schoolStatus: string;
}

export interface DashboardSummary {
  organizationName: string;
  schoolProfile: SchoolProfile | null;
  kpis: {
    todayCirculars: number;
    todayDelta: string;
    published: number;
    pending: number;
    drafts: number;
    rejected: number;
    qrScans: number;
    totalCirculars: number;
    unreadNotifications: number;
  };
  timeline: Array<{
    id: string;
    time: string;
    description: string;
    eventType: string;
    className?: string;
  }>;
  charts: {
    monthlyStats: Array<{ month: string; created: number; scans: number }>;
    statusBreakdown: Array<{ status: string; count: number }>;
    paymentDistribution: Array<{ name: string; amount: number }>;
    qrTrend: Array<{ month: string; scans: number }>;
    classYearBreakdown: Array<{
      academicYear: string;
      className: string;
      count: number;
      totalFee: number;
    }>;
  };
}

export interface Template {
  id: string;
  name: string;
  category: string;
  schoolType: string;
  description?: string;
  isFavorite: boolean;
  usageCount: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  circularId?: string;
}

export interface WizardFormState {
  academicYear: string;
  term: string;
  educationLevel: string;
  className: string;
  classes: string[];
  schoolCategory: string;
  ownershipType: string;
  feeTargetStudents: string;
  province: string;
  district: string;
  sector: string;
  language: string;
  parentMessage: string;
  payments: PaymentLine[];
  requirements: RequirementLine[];
  banks: BankAccount[];
  classReqs: Array<{ item: string }>;
  otherInfos: Array<{ item: string }>;
  includeAnnouncements: boolean;
  announcements: AnnouncementItem[];
  includeSchoolDescription: boolean;
  descriptionLines: string[];
  leaders: LeaderContact[];
  requestIncrease: boolean;
  increaseReason: string;
  increaseDesc: string;
}

export const EMPTY_WIZARD_FORM: WizardFormState = {
  academicYear: '',
  term: '',
  educationLevel: '',
  className: '',
  classes: [],
  schoolCategory: 'Public',
  ownershipType: 'Government',
  feeTargetStudents: 'public',
  province: '',
  district: '',
  sector: '',
  language: 'en',
  parentMessage: '',
  payments: [],
  requirements: [],
  banks: [],
  classReqs: [],
  otherInfos: [],
  includeAnnouncements: false,
  announcements: [],
  includeSchoolDescription: false,
  descriptionLines: [],
  leaders: [],
  requestIncrease: false,
  increaseReason: '',
  increaseDesc: '',
};
