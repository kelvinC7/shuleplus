import { env } from '../config/env';

export type ParentPeriodStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'EXCUSED'
  | 'SICK'
  | 'SCHOOL_ACTIVITY'
  | null;

export interface ParentWeekSlot {
  id: string;
  timetableId: string;
  period: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string | null;
  attendanceStatus: ParentPeriodStatus;
  attendanceDone: boolean;
  sessionId: string | null;
  sessionStatus: string | null;
  lessonStarted: boolean;
}

export interface ParentWeekDay {
  date: string;
  day: string;
  dayIndex: number;
  slots: ParentWeekSlot[];
}

export interface ParentStudentWeek {
  source: 'timetable';
  term: string;
  academicYear: string;
  className: string;
  studentCode: string;
  weekStart: string;
  weekEnd: string;
  days: ParentWeekDay[];
  summary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    unmarked: number;
    total: number;
  };
}

export class TimetableApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = env.TIMETABLE_API_URL;
    this.serviceKey = env.SERVICE_API_KEY;
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': this.serviceKey,
        'x-source-service': 'parentmis',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`Timetable API ${res.status}: ${text}`);
    }

    const json = (await res.json()) as { data?: T };
    return (json.data ?? json) as T;
  }

  async getStudentWeek(params: {
    organizationId: string;
    studentCode: string;
    className: string;
    from: string;
    to: string;
    term?: string;
    academicYear?: string;
  }): Promise<ParentStudentWeek> {
    const q = new URLSearchParams({
      organizationId: params.organizationId,
      studentCode: params.studentCode,
      className: params.className,
      from: params.from,
      to: params.to,
    });
    if (params.term) q.set('term', params.term);
    if (params.academicYear) q.set('academicYear', params.academicYear);
    return this.request<ParentStudentWeek>(`/internal/parent/student-week?${q.toString()}`);
  }

  async listClassTeachers(params: {
    organizationId: string;
    className: string;
    term?: string;
    academicYear?: string;
  }) {
    const q = new URLSearchParams({
      organizationId: params.organizationId,
      className: params.className,
    });
    if (params.term) q.set('term', params.term);
    if (params.academicYear) q.set('academicYear', params.academicYear);
    return this.request<{
      term: string;
      academicYear: string;
      className: string;
      teachers: Array<{
        teacherUserId: string;
        teacherName: string;
        subjects: string[];
        phone: string | null;
        email: string | null;
      }>;
    }>(`/internal/class/teachers?${q.toString()}`);
  }
}

export const timetableApi = new TimetableApiClient();
