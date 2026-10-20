import { env } from '../config/env';

export interface AcademicSubjectGrade {
  subject: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
  rank: number;
}

export interface AcademicTerm {
  term: string;
  academicYear: string;
  gpa: number;
  classRank: number;
  totalStudents: number;
  subjects: AcademicSubjectGrade[];
}

export interface UpcomingExam {
  id: string;
  subject: string;
  date: string;
  type: string;
  term?: string;
  academicYear?: string;
  status?: string;
}

export interface MarkRecord {
  id: string;
  title: string;
  subject: string;
  type: string;
  score: number;
  maxScore: number;
  percentage: number | null;
  grade: string;
  date: string;
  term: string;
  academicYear: string;
  status: string;
}

export interface StudentAcademics {
  student: {
    id: string;
    fullName: string | null;
    className: string | null;
    stream: string | null;
  };
  terms: AcademicTerm[];
  upcomingExams: UpcomingExam[];
  markRecords?: MarkRecord[];
  filters?: {
    years: string[];
    termsByYear: Record<string, string[]>;
  };
}

export class AcademicsApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = env.STUDENT_MANAGEMENT_API_URL;
    this.serviceKey = env.SERVICE_API_KEY;
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
      throw new Error(`Student Management module API ${res.status}: ${text}`);
    }

    const json: any = await res.json();
    return json.data ?? json;
  }

  async getStudentAcademics(
    organizationId: string,
    studentCode: string
  ): Promise<StudentAcademics> {
    return this.request<StudentAcademics>(
      `/service/academics?organizationId=${encodeURIComponent(organizationId)}&studentCode=${encodeURIComponent(studentCode)}`
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/api\/?$/, '')}/api/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const academicsApi = new AcademicsApiClient();
