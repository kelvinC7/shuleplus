import { env } from '../config/env';

export interface AttendanceStudent {
  studentId?: string | null;
  studentCode: string;
  studentName: string | null;
  className: string | null;
  cardNumber: string | null;
}

export interface AttendanceSummary {
  monthlyPresent: number;
  monthlyAbsent: number;
  monthlyLate: number;
  monthlyExcused: number;
  attendanceRate: number;
}

export interface AttendanceRecordView {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  notes: string | null;
  cardNumber?: string | null;
  gateName?: string | null;
  source?: string | null;
}

export interface StudentAttendance {
  student: AttendanceStudent;
  summary: AttendanceSummary;
  records: AttendanceRecordView[];
}

function uniqueCodes(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))];
}

export class AttendanceApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = env.ATTENDANCE_API_URL;
    this.serviceKey = env.SERVICE_API_KEY;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': this.serviceKey,
        'x-source-service': 'parentmis',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`Attendance module API ${res.status}: ${text}`);
    }

    const json: any = await res.json();
    return json.data ?? json;
  }

  async getStudentAttendance(
    organizationId: string,
    studentCodes: string | string[]
  ): Promise<StudentAttendance> {
    const codes = uniqueCodes(Array.isArray(studentCodes) ? studentCodes : [studentCodes]);
    const params = new URLSearchParams({ organizationId, studentCodes: codes.join(',') });
    if (codes[0]) params.set('studentCode', codes[0]);
    return this.request<StudentAttendance>('GET', `/service/attendance?${params.toString()}`);
  }

  async recordExcusedAbsence(organizationId: string, data: {
    studentCode: string;
    studentId?: string;
    date: string;
    reason?: string;
    studentName?: string;
    className?: string;
  }): Promise<AttendanceRecordView> {
    return this.request<AttendanceRecordView>('POST', '/service/attendance/absence', {
      organizationId,
      ...data,
    });
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

export const attendanceApi = new AttendanceApiClient();
