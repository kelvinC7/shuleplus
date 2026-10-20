import { api } from './api';
import type {
  Assessment,
  AssessmentStatistics,
  TeacherDashboardData,
  AssessmentTemplate,
  GradingScale,
  GradingDashboard,
  StudentListItem,
} from '@/types/assessment';

function unwrap<T>(payload: { success?: boolean; data: T }): T {
  return payload.data;
}

export function assessmentApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function fetchAssessmentDashboard(params?: {
  academicYear?: string;
  term?: string;
}): Promise<TeacherDashboardData> {
  const { data } = await api.get<{ success: boolean; data: TeacherDashboardData }>(
    '/assessments/teacher-dashboard',
    { params },
  );
  return unwrap(data);
}

export async function fetchAssessments(params?: {
  status?: string;
  subjectId?: string;
  classId?: string;
  academicYear?: string;
  term?: string;
  mine?: string;
}): Promise<Assessment[]> {
  const { data } = await api.get<{ success: boolean; data: Assessment[] }>(
    '/assessments',
    { params },
  );
  return unwrap(data);
}

export async function fetchAssessment(id: string): Promise<Assessment> {
  const { data } = await api.get<{ success: boolean; data: Assessment }>(`/assessments/${id}`);
  return unwrap(data);
}

export async function fetchAssessmentStatistics(id: string): Promise<AssessmentStatistics> {
  const { data } = await api.get<{ success: boolean; data: AssessmentStatistics }>(
    `/assessments/${id}/statistics`,
  );
  return unwrap(data);
}

export async function createAssessment(body: {
  title: string;
  subjectId?: string;
  subjectName?: string;
  classId: string;
  className?: string;
  templateId?: string;
  componentId?: string;
  maxMark?: number;
  assessmentDate?: string;
  duration?: string;
  description?: string;
  academicYear: string;
  term: string;
}): Promise<Assessment> {
  const { data } = await api.post<{ success: boolean; data: Assessment }>(
    '/assessments',
    body,
  );
  return unwrap(data);
}

export async function updateAssessmentStatus(
  id: string,
  status: string,
): Promise<Assessment> {
  const { data } = await api.put<{ success: boolean; data: Assessment }>(
    `/assessments/${id}/status`,
    { status },
  );
  return unwrap(data);
}

export async function fetchAssessmentMarks(assessmentId: string): Promise<unknown[]> {
  const { data } = await api.get<{ success: boolean; data: unknown[] }>(
    `/assessments/${assessmentId}/marks`,
  );
  return unwrap(data);
}

export async function enterAssessmentMarks(
  assessmentId: string,
  marks: Array<{
    studentId: string;
    studentCode?: string;
    fullName?: string;
    score: number;
    markStatus?: string;
    remarks?: string;
  }>,
): Promise<unknown> {
  const { data } = await api.post<{ success: boolean; data: unknown }>(
    `/assessments/${assessmentId}/marks`,
    { marks },
  );
  return unwrap(data);
}

export async function requestMarkCorrection(
  assessmentId: string,
  body: { studentId: string; currentScore: number; requestedScore: number; reason: string },
): Promise<unknown> {
  const { data } = await api.post<{ success: boolean; data: unknown }>(
    `/assessments/${assessmentId}/corrections`,
    body,
  );
  return unwrap(data);
}

// ── Assessment Templates ─────────────────────────────────

export async function fetchAssessmentTemplates(params?: {
  status?: string;
  academicYear?: string;
  term?: string;
  academicLevel?: string;
}): Promise<AssessmentTemplate[]> {
  const { data } = await api.get<{ success: boolean; data: AssessmentTemplate[] }>(
    '/assessment-templates',
    { params },
  );
  return unwrap(data);
}

// ── Grading ──────────────────────────────────────────────

export async function fetchGradingDashboard(params?: {
  academicYear?: string;
  term?: string;
}): Promise<GradingDashboard> {
  const { data } = await api.get<{ success: boolean; data: GradingDashboard }>(
    '/grading/dashboard',
    { params },
  );
  return unwrap(data);
}

export async function fetchGradingScale(academicLevel?: string): Promise<GradingScale[]> {
  const { data } = await api.get<{ success: boolean; data: GradingScale[] }>(
    '/grading/grading-scale',
    { params: academicLevel ? { academicLevel } : undefined },
  );
  return unwrap(data);
}

export async function fetchReportCard(
  studentId: string,
  classId: string,
  academicYear: string,
  term?: string,
): Promise<unknown> {
  const { data } = await api.get<{ success: boolean; data: unknown }>(
    `/grading/report-card/${studentId}/${classId}/${academicYear}`,
    { params: term ? { term } : undefined },
  );
  return unwrap(data);
}

export async function calculateAssessmentResult(assessmentId: string): Promise<unknown> {
  const { data } = await api.get<{ success: boolean; data: unknown }>(
    `/grading/calculate/${assessmentId}`,
  );
  return unwrap(data);
}

export async function calculateFinalResults(
  templateId: string,
  classId: string,
  subjectId: string,
): Promise<unknown> {
  const { data } = await api.post<{ success: boolean; data: unknown }>(
    `/grading/calculate-final/${templateId}/${classId}/${subjectId}`,
  );
  return unwrap(data);
}

export async function fetchPendingCorrections(): Promise<unknown[]> {
  const { data } = await api.get<{ success: boolean; data: unknown[] }>(
    '/grading/corrections',
  );
  return unwrap(data);
}

// ── Students for mark entry ──────────────────────────────

export async function fetchClassStudents(classId: string, className?: string): Promise<StudentListItem[]> {
  const { data } = await api.get<{ success: boolean; data: StudentListItem[] }>(
    `/my-classes/${classId}/students`,
    { params: className ? { className } : undefined },
  );
  return unwrap(data);
}
