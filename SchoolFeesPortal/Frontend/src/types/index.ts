export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardKpis {
  totalExpectedRevenue: number;
  totalExpectedRevenueLabel: string;
  totalCollections: number;
  totalCollectionsLabel: string;
  todayCollections: number;
  todayCollectionsLabel: string;
  weeklyCollections: number;
  weeklyCollectionsLabel: string;
  monthlyCollections: number;
  monthlyCollectionsLabel: string;
  annualCollections: number;
  annualCollectionsLabel: string;
  outstandingBalances: number;
  outstandingLabel: string;
  pendingPayments: number;
  refundedPayments: number;
  overpayments: number;
  scholarshipsAllocated: number;
  scholarshipsLabel: string;
  discountsApplied: number;
  activeInstallments: number;
  paymentSuccessRate: number;
  collectionPerformance: number;
  avgProcessingMinutes: number;
  totalStudents: number;
  paidStudents: number;
  partiallyPaidStudents: number;
  unpaidStudents: number;
  studentsWithOutstanding: number;
  studentsOnInstallments: number;
  scholarshipStudents: number;
  sponsoredStudents: number;
  newlyBilledStudents: number;
  studentsWithHolds: number;
  activeBills: number;
  activeStructures: number;
}

export interface DashboardSummary {
  organizationName: string;
  kpis: DashboardKpis;
  revenueTrend: { label: string; value: number }[];
  paymentMethods: { method: string; amount: number; label: string }[];
  collectionProgress: {
    percentage: number;
    remaining: number;
    expected: number;
    collected: number;
    successRate: number;
  };
  outstandingWidget: {
    total: number;
    totalLabel: string;
    highestClasses: { name: string; amount: number; label: string }[];
    topStudents: { name: string; className: string; balance: number; label: string }[];
    overdueCount: number;
    holds: number;
  };
  recentPayments: {
    id: string;
    studentName: string;
    className?: string | null;
    amount: number;
    amountLabel: string;
    method: string;
    status: string;
    paidAt: string;
  }[];
  recentReceipts: {
    id: string;
    receiptNumber: string;
    studentName: string;
    amount: number;
    amountLabel: string;
    issuedAt: string;
  }[];
  notifications: {
    id: string;
    title: string;
    message: string;
    channel: string;
    sentAt: string;
    isRead: boolean;
  }[];
  aiInsights: string[];
  calendar: { date: string; label: string; type: string }[];
  activities: { type: string; label: string; at: string; amount?: string }[];
}

export interface FeeStructureItemInput {
  categoryId?: string;
  name: string;
  amount: number;
  itemType?: 'MANDATORY' | 'OPTIONAL';
  source?: 'SCHOOL' | 'BABYEYI';
  paymentType?: string;
  externalKey?: string;
}

export interface FeeStructureItem extends FeeStructureItemInput {
  id: string;
  category?: { id: string; name: string; code: string };
}

export interface FeeStructure {
  id: string;
  name: string;
  code: string;
  academicYear: string;
  term: string;
  schoolLevel?: string | null;
  className?: string | null;
  boardingType?: string | null;
  status: string;
  totalAmount: number;
  version: number;
  source?: 'SCHOOL' | 'BABYEYI' | 'MIXED';
  itemCount?: number;
  updatedAt?: string;
  items?: FeeStructureItem[];
}

export interface StudentBill {
  id: string;
  billNumber: string;
  studentName: string;
  studentCode: string;
  className: string;
  academicYear: string;
  term: string;
  status: string;
  netAmount: number;
  paidAmount: number;
  balance: number;
  dueDate?: string | null;
  billedAt: string;
}

export interface PaymentRow {
  id: string;
  paymentNumber: string;
  studentName: string;
  className?: string | null;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  receipt?: { receiptNumber: string } | null;
}
