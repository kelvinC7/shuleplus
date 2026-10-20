import { env } from '../config/env';

export type SchoolBranding = {
  schoolName: string;
  organizationCode?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  logoUrl?: string | null;
  stampUrl?: string | null;
  signatureUrl?: string | null;
};

export interface ParentFeeSummary {
  branding?: SchoolBranding | null;
  studentName?: string | null;
  studentCode?: string | null;
  className?: string | null;
  academicYear?: string | null;
  term?: string | null;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  currency: string;
  statements: {
    id: string;
    term: string;
    academicYear?: string;
    billNumber?: string;
    description: string;
    items?: Array<{ description: string; amount: number }>;
    amount: number;
    paid: number;
    balance: number;
    status: string;
    dueDate: string | null;
  }[];
  payments: {
    id: string;
    date: string;
    description: string;
    amount: number;
    method: string;
    reference: string | null;
    receiptUrl: string | null;
    receiptNumber?: string | null;
    studentName?: string;
    studentCode?: string;
    className?: string | null;
    academicYear?: string | null;
    term?: string | null;
    remainingBalance?: number;
    previousBalance?: number;
    lineItems?: Array<{ description: string; amount: number }>;
  }[];
}

export class FeesApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = env.SCHOOL_FEES_API_URL;
    this.serviceKey = env.SERVICE_API_KEY;
  }

  private async request<T>(path: string, organizationId?: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': this.serviceKey,
        'x-source-service': 'parentmis',
        ...(organizationId ? { 'x-organization-id': organizationId } : {}),
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`School Fees module API ${res.status}: ${text}`);
    }

    const json: any = await res.json();
    return json.data ?? json;
  }

  async getParentFeeSummary(
    organizationId: string,
    studentCodes: string | string[]
  ): Promise<ParentFeeSummary> {
    const codes = (Array.isArray(studentCodes) ? studentCodes : [studentCodes])
      .map((s) => String(s ?? '').trim())
      .filter(Boolean);
    const params = new URLSearchParams({ organizationId });
    if (codes.length) {
      params.set('studentCodes', codes.join(','));
      params.set('studentCode', codes[0]);
      params.set('studentId', codes[0]);
    }
    return this.request<ParentFeeSummary>(
      `/service/parent-fees-summary?${params.toString()}`,
      organizationId
    );
  }

  async getParentTransactions(
    organizationId: string,
    studentCodes: string[],
    academicYear?: string,
    term?: string
  ) {
    const params = new URLSearchParams({
      organizationId,
      studentCodes: studentCodes.join(','),
    });
    if (academicYear) params.set('academicYear', academicYear);
    if (term) params.set('term', term);
    return this.request<{
      currency: string;
      totalPaid: number;
      thisTermPaid: number;
      outstanding: number;
      transactions: number;
      students: Array<{ studentId: string; studentCode: string; studentName: string; className: string; academicYear: string; term: string }>;
      years: string[];
      terms: string[];
      payments: Array<Record<string, unknown>>;
    }>(`/service/parent-fees-transactions?${params.toString()}`, organizationId);
  }

  async getPublicReceipt(receiptNumber: string) {
    const res = await fetch(
      `${this.baseUrl}/public/receipts/${encodeURIComponent(receiptNumber)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) {
      throw new Error(`Receipt ${receiptNumber} was not found`);
    }
    const json = (await res.json()) as { data?: unknown };
    return json.data ?? json;
  }

  async getReportCardAccess(
    organizationId: string,
    query: {
      studentId?: string;
      studentCode?: string;
      className?: string;
      academicYear: string;
      term: string;
    }
  ) {
    const params = new URLSearchParams({ organizationId });
    if (query.studentId) params.set('studentId', query.studentId);
    if (query.studentCode) params.set('studentCode', query.studentCode);
    if (query.className) params.set('className', query.className);
    params.set('academicYear', query.academicYear);
    params.set('term', query.term);
    return this.request<{
      published: boolean;
      allowed: boolean;
      message?: string | null;
      balance?: number;
      paymentStatus?: string;
      hasActiveLoan?: boolean;
    }>(`/service/report-card-access?${params.toString()}`, organizationId);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const feesApi = new FeesApiClient();
