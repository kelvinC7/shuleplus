import { env } from '../config/env';

type ServiceJson<T> = { success?: boolean; data?: T };

async function feesFetch<T>(
  organizationId: string,
  segment: string,
  query?: Record<string, string | number | undefined>
): Promise<T | null> {
  const base = env.SCHOOL_FEES_API_URL.replace(/\/$/, '');
  const url = new URL(`${base}/service/representative/${segment}`);
  url.searchParams.set('organizationId', organizationId);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.PLATFORM_SERVICE_KEY,
        'x-source-service': 'iam-representative',
      },
    });
    const body = (await response.json().catch(() => ({}))) as ServiceJson<T>;
    if (!response.ok) return null;
    return (body.data ?? null) as T | null;
  } catch {
    return null;
  }
}

export type SchoolFeesRepOverview = {
  currency: string;
  summary: {
    totalExpected: number;
    totalCollected: number;
    outstanding: number;
    collectionRate: number;
    studentStatus: { paid: number; partial: number; unpaid: number; overdue: number };
  };
  collectionByCategory: Array<{ category: string; expected: number; collected: number; outstanding: number }>;
  collectionTrend: Array<{ date: string; amount: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  health: 'on_track' | 'needs_attention' | 'critical';
  studentsWithOutstanding: number;
};

export type SchoolFeesRepTransactionPage = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: Array<{
    id: string;
    receiptNumber: string | null;
    paymentNumber: string;
    paidAt: string;
    schoolId: string;
    studentName: string;
    studentCode: string;
    academicYear: string | null;
    term: string | null;
    feeCategory: string;
    amount: number;
    method: string;
    reference: string | null;
    status: string;
    recordedBy: string;
  }>;
};

export type SchoolFeesRepBalancePage = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: Array<{
    id: string;
    studentId: string;
    studentCode: string;
    studentName: string;
    className: string;
    schoolId: string;
    expected: number;
    paid: number;
    balance: number;
    status: string;
    lastPaymentAt: string;
    academicYear: string;
    term: string;
  }>;
};

export type SchoolFeesFilterOptions = {
  academicYears: string[];
  terms: string[];
  classes: string[];
  feeCategories: Array<{ code: string; name: string }>;
  paymentMethods: string[];
};

export type SchoolFeesClassAnalytics = {
  currency: string;
  metricsSource: 'school-fees-portal' | 'empty' | 'unavailable';
  summary: {
    students: number;
    paid: number;
    partial: number;
    unpaid: number;
    overdue: number;
    expected: number;
    collected: number;
    outstanding: number;
    overdueAmount: number;
    exempted: number;
    collectionRate: number;
  };
  byClass: Array<{
    className: string;
    organizationId?: string;
    schoolName?: string;
    students: number;
    paid: number;
    partial: number;
    unpaid: number;
    overdue: number;
    expected: number;
    collected: number;
    outstanding: number;
    collectionRate: number;
  }>;
  chartStatusByClass: Array<{
    className: string;
    Paid: number;
    Partial: number;
    Unpaid: number;
    Overdue: number;
  }>;
  chartCollectionByClass: Array<{
    className: string;
    expected: number;
    collected: number;
    outstanding: number;
  }>;
  integrationNotes?: Array<{ schoolName: string; detail: string }>;
};

export const schoolFeesModuleClient = {
  overview(organizationId: string, query?: Record<string, string | undefined>) {
    return feesFetch<SchoolFeesRepOverview>(organizationId, 'overview', query);
  },
  transactions(organizationId: string, query?: Record<string, string | number | undefined>) {
    return feesFetch<SchoolFeesRepTransactionPage>(organizationId, 'transactions', query);
  },
  balances(organizationId: string, query?: Record<string, string | number | undefined>) {
    return feesFetch<SchoolFeesRepBalancePage>(organizationId, 'balances', query);
  },
  filterOptions(organizationId: string) {
    return feesFetch<SchoolFeesFilterOptions>(organizationId, 'filter-options');
  },
  classAnalytics(organizationId: string, query?: Record<string, string | undefined>) {
    return feesFetch<SchoolFeesClassAnalytics>(organizationId, 'class-analytics', query);
  },
  feeStructures(organizationId: string, query?: Record<string, string | undefined>) {
    return feesFetch<{
      integrationSource: string;
      items: Array<{
        id: string;
        name: string;
        code: string;
        academicYear: string;
        term: string;
        className: string | null;
        status: string;
        totalAmount: number;
        itemCount: number;
        billsGenerated: number;
        updatedAt: string;
        items: Array<{
          id: string;
          name: string;
          amount: number;
          category: string;
          categoryCode: string;
          source: string;
          itemType: string;
        }>;
        hasBabyeyiItems: boolean;
        hasSchoolItems: boolean;
      }>;
    }>(organizationId, 'fee-structures', query);
  },
  studentBills(organizationId: string, query?: Record<string, string | number | undefined>) {
    return feesFetch<{
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      summary: {
        paid: number;
        partial: number;
        unpaid: number;
        overdue: number;
        totalBills: number;
      };
      items: Array<{
        id: string;
        billNumber: string;
        studentId: string;
        studentCode: string;
        studentName: string;
        className: string;
        academicYear: string;
        term: string;
        status: string;
        grossAmount: number;
        netAmount: number;
        paidAmount: number;
        balance: number;
        dueDate: string | null;
        billedAt: string;
        structureName: string | null;
        structureCode: string | null;
        lineItemCount: number;
        paymentCount: number;
        schoolId: string;
      }>;
    }>(organizationId, 'student-bills', query);
  },
};
