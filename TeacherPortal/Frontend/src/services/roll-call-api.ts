import { api } from './api';
import type {
  RollCallClassOption,
  RollCallDashboard,
  RollCallSessionDetail,
  RollCallSessionSummary,
  RollCallTemplate,
} from '@/types/roll-call';

function unwrap<T>(payload: { success?: boolean; data: T }): T {
  return payload.data;
}

export async function fetchRollCallDashboard(date?: string): Promise<RollCallDashboard> {
  const { data } = await api.get<{ success: boolean; data: RollCallDashboard }>(
    '/roll-call/dashboard',
    { params: date ? { date } : undefined }
  );
  return unwrap(data);
}

export async function fetchRollCallClasses(): Promise<RollCallClassOption[]> {
  const { data } = await api.get<{ success: boolean; data: RollCallClassOption[] }>(
    '/roll-call/classes'
  );
  return unwrap(data);
}

export async function fetchRollCallTemplates(): Promise<RollCallTemplate[]> {
  const { data } = await api.get<{ success: boolean; data: RollCallTemplate[] }>(
    '/roll-call/templates'
  );
  return unwrap(data);
}

export async function fetchRollCallSessions(params?: {
  className?: string;
  attendanceType?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}): Promise<RollCallSessionSummary[]> {
  const { data } = await api.get<{ success: boolean; data: RollCallSessionSummary[] }>(
    '/roll-call/sessions',
    { params }
  );
  return unwrap(data);
}

export async function fetchRollCallSession(sessionId: string): Promise<RollCallSessionDetail> {
  const { data } = await api.get<{ success: boolean; data: RollCallSessionDetail }>(
    `/roll-call/sessions/${sessionId}`
  );
  return unwrap(data);
}

export async function createRollCallSession(body: {
  name: string;
  classId: string;
  className: string;
  classLabel?: string;
  sessionDate: string;
  startTime?: string;
  attendanceType?: string;
  academicYear?: string;
  term?: string;
  repeatRule?: string;
}): Promise<RollCallSessionDetail> {
  const { data } = await api.post<{ success: boolean; data: RollCallSessionDetail }>(
    '/roll-call/sessions',
    body
  );
  return unwrap(data);
}

export async function saveRollCallDraft(
  sessionId: string,
  body: {
    sessionNotes?: string;
    rows?: Array<{
      studentCode: string;
      status: string;
      reason?: string | null;
      arrivalTime?: string | null;
      notes?: string | null;
    }>;
  }
): Promise<RollCallSessionDetail> {
  const { data } = await api.patch<{ success: boolean; data: RollCallSessionDetail }>(
    `/roll-call/sessions/${sessionId}`,
    body
  );
  return unwrap(data);
}

export async function completeRollCall(
  sessionId: string,
  body?: { allowIncomplete?: boolean; rows?: unknown[] }
): Promise<RollCallSessionDetail> {
  const { data } = await api.post<{ success: boolean; data: RollCallSessionDetail }>(
    `/roll-call/sessions/${sessionId}/complete`,
    body ?? {}
  );
  return unwrap(data);
}

export function rollCallApiError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}

export function rollCallIncompleteCounts(err: unknown): Record<string, number> | null {
  const data = (err as { response?: { data?: { data?: { counts?: Record<string, number> } } } })
    ?.response?.data?.data?.counts;
  return data ?? null;
}
