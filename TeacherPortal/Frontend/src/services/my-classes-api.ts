import { api } from './api';

function unwrap<T>(payload: { success?: boolean; data: T }): T {
  return payload.data;
}

export type MyClassItem = {
  id: string;
  name: string;
  stream?: string | null;
  label: string;
  category?: string | null;
  studentCount?: number;
  roles: Array<'HEAD' | 'TEACHING'>;
  subjects?: string[];
  headTeacherName?: string | null;
};

export type MyClassStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  gender?: string | null;
  photoUrl?: string | null;
  rollNumber?: string | null;
  className?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
};

export type MyClassesResponse = {
  linked: boolean;
  teacherName: string | null;
  classes: MyClassItem[];
};

export function myClassesApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  return fallback;
}

export async function fetchMyClasses(params?: { term?: string; academicYear?: string }) {
  const { data } = await api.get<{ success: boolean; data: MyClassesResponse }>('/my-classes', { params });
  return unwrap(data);
}

export async function fetchMyClassStudents(
  classId: string,
  className: string,
  academicYear?: string
) {
  const { data } = await api.get<{ success: boolean; data: MyClassStudent[] }>(
    `/my-classes/${classId}/students`,
    { params: { className, academicYear } }
  );
  return unwrap(data);
}

export type GateAttendanceRecord = {
  id: string;
  studentCode?: string | null;
  studentName: string;
  status: string;
  lessonDate: string;
  entryTime?: string | null;
  exitTime?: string | null;
  gateName?: string | null;
  direction?: string;
};

export type ClassShuleCardRow = {
  studentId: string;
  studentCode: string;
  fullName: string;
  photoUrl?: string | null;
  rollNumber?: string | null;
  gender?: string | null;
  record: GateAttendanceRecord | null;
  termAttendanceRate: number | null;
  termPresentDays: number;
  termLateDays: number;
  termRecordDays: number;
};

export async function fetchClassGateAttendance(
  classId: string,
  className: string,
  params?: { date?: string; from?: string; to?: string; q?: string; term?: string; academicYear?: string }
) {
  const { data } = await api.get<{
    success: boolean;
    data: {
      rows?: ClassShuleCardRow[];
      records: GateAttendanceRecord[];
      serviceAvailable?: boolean;
      period?: { date: string; from: string | null; to: string | null };
    };
  }>(`/my-classes/${classId}/gate-attendance`, { params: { className, ...params } });
  const payload = unwrap(data);
  return {
    rows: payload.rows ?? [],
    records: payload.records,
    serviceAvailable: payload.serviceAvailable !== false,
    period: payload.period,
  };
}

export type DisciplineCaseRecord = {
  id: string;
  caseNumber: string;
  studentCode?: string | null;
  studentName: string;
  className: string;
  category: string;
  severity: string;
  status: string;
  incidentDate: string;
  description?: string | null;
};

export async function fetchClassDiscipline(
  classId: string,
  className: string,
  params?: { status?: string; search?: string; term?: string; academicYear?: string }
) {
  const { data } = await api.get<{
    success: boolean;
    data: { cases: DisciplineCaseRecord[]; serviceAvailable?: boolean };
  }>(`/my-classes/${classId}/discipline`, { params: { className, ...params } });
  const payload = unwrap(data);
  return { cases: payload.cases, serviceAvailable: payload.serviceAvailable !== false };
}

export type ClassAttendanceRow = {
  id: string;
  studentCode: string;
  fullName: string;
  rollNumber?: string | null;
  status: string;
  notes?: string | null;
};

export type ClassAttendanceSession = {
  id: string;
  sessionDate: string;
  term: string;
  academicYear: string;
  status: string;
  sessionNotes?: string | null;
  rows: ClassAttendanceRow[];
  counts: { total: number; present: number; late: number; absent: number; excused: number; unmarked: number; marked: number; rate: number };
};

export async function fetchClassAttendanceSession(
  classId: string,
  params: { className: string; classLabel?: string; sessionDate: string; academicYear: string; term: string }
) {
  const { data } = await api.get<{ success: boolean; data: ClassAttendanceSession }>(
    `/my-classes/${classId}/class-attendance`,
    { params }
  );
  return unwrap(data);
}

export async function saveClassAttendanceDraft(
  sessionId: string,
  body: { rows?: Array<{ studentCode: string; status: string; notes?: string | null }>; sessionNotes?: string }
) {
  const { data } = await api.patch<{ success: boolean; data: ClassAttendanceSession }>(
    `/my-classes/class-attendance/${sessionId}`,
    body
  );
  return unwrap(data);
}

export async function completeClassAttendance(sessionId: string) {
  const { data } = await api.post<{ success: boolean; data: ClassAttendanceSession }>(
    `/my-classes/class-attendance/${sessionId}/complete`
  );
  return unwrap(data);
}
