import { env } from '../config/env';

export interface ParentMarkRecord {
  id: string;
  assessmentId?: string;
  title: string;
  subject: string;
  type: string;
  score: number;
  maxScore: number;
  percentage: number | null;
  grade: string | null | undefined;
  date: string | null;
  term: string;
  academicYear: string;
  status: string;
}

export interface ParentScheduleItem {
  id: string;
  title: string;
  subject: string;
  type: string;
  date: string | null;
  term: string;
  academicYear: string;
  status: string;
  maxScore: number;
  hasPublishedMark?: boolean;
  code?: string | null;
  className?: string | null;
}

export interface ParentAcademicModulePayload {
  student: { id: string; fullName: string; className: string | null };
  filters: { academicYear: string; term: string; years: string[]; terms: string[] };
  publishedMarks: ParentMarkRecord[];
  schedule: ParentScheduleItem[];
}

export class AcademicModuleApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = env.ACADEMIC_API_URL;
    this.serviceKey = env.SERVICE_API_KEY;
  }

  enabled(): boolean {
    return Boolean(this.baseUrl?.trim());
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': this.serviceKey,
        'x-source-service': 'parentmis',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`Academic module API ${res.status}: ${text}`);
    }

    const json = (await res.json()) as { data?: T };
    return json.data ?? (json as unknown as T);
  }

  async getParentAcademics(
    organizationId: string,
    studentCode: string,
    academicYear?: string,
    term?: string,
    className?: string
  ): Promise<ParentAcademicModulePayload> {
    const q = new URLSearchParams({
      organizationId,
      studentCode,
    });
    if (academicYear) q.set('academicYear', academicYear);
    if (term) q.set('term', term);
    if (className) q.set('className', className);
    return this.request<ParentAcademicModulePayload>(`/service/parent-academics?${q.toString()}`);
  }

  async listReportPublications(
    organizationId: string,
    query: { academicYear?: string; term?: string; search?: string }
  ) {
    const q = new URLSearchParams({ organizationId });
    if (query.academicYear) q.set('academicYear', query.academicYear);
    if (query.term) q.set('term', query.term);
    if (query.search) q.set('search', query.search);
    return this.request<
      Array<{
        id: string;
        studentId: string;
        classId: string;
        className: string | null;
        studentName: string | null;
        studentCode: string | null;
        academicYear: string;
        term: string;
        publishedAt: string;
      }>
    >(`/service/report-card/publications?${q.toString()}`);
  }

  async getParentReportCard(
    organizationId: string,
    query: {
      studentCode: string;
      classId: string;
      academicYear: string;
      term: string;
      studentId?: string;
    }
  ) {
    const q = new URLSearchParams({ organizationId });
    q.set('studentCode', query.studentCode);
    q.set('classId', query.classId);
    q.set('academicYear', query.academicYear);
    q.set('term', query.term);
    if (query.studentId) q.set('studentId', query.studentId);
    return this.request<{ publication: unknown; report: unknown }>(
      `/service/report-card/parent?${q.toString()}`
    );
  }
}

export const academicModuleApi = new AcademicModuleApiClient();
