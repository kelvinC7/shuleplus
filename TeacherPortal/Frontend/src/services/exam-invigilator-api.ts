import { api } from './api';

function unwrap<T>(payload: { success?: boolean; data: T }): T {
  return payload.data;
}

export type InvigilatorRoom = {
  key: string;
  sessionId: string;
  sessionName: string;
  sessionStatus: string;
  academicYear: string;
  term: string;
  examDate: string;
  slotCode: string;
  startTime: string;
  endTime: string;
  roomName: string;
  subjectName: string;
  classNames: string[];
  studentCount: number;
};

export type InvigilatorStudent = {
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string;
  roomName: string;
  seatCode: string;
  scheduleId: string;
  subjectName: string;
  status: string;
  checkInAt?: string | null;
  submitAt?: string | null;
  exitAt?: string | null;
  examAllowed?: boolean;
  examDecision?: string;
  financialStatus?: string | null;
  feeBalance?: number | null;
  exceptionReason?: string | null;
};

export function examInvigilatorApiError(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'response' in err) {
    const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg) return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function fetchMyExamRooms() {
  const { data } = await api.get('/examinations/me');
  return unwrap<{ actor: { name: string; email: string | null }; rooms: InvigilatorRoom[] }>(data);
}

export async function fetchExamRoom(params: {
  roomName: string;
  sessionId?: string;
  examDate?: string;
  slotCode?: string;
}) {
  const { data } = await api.get('/examinations/room', { params });
  return unwrap<{ room: InvigilatorRoom; students: InvigilatorStudent[] }>(data);
}

export type ExamRoomList = {
  room: InvigilatorRoom;
  students: InvigilatorStudent[];
  allowed: number;
  blocked: number;
};

export async function fetchExamLists() {
  const { data } = await api.get('/examinations/lists');
  return unwrap<{ actor: { name: string; email: string | null }; rooms: ExamRoomList[] }>(data);
}

export async function markExamEntry(body: {
  roomName: string;
  sessionId?: string;
  examDate?: string;
  slotCode?: string;
  studentCode?: string;
  studentId?: string;
  method?: 'MANUAL' | 'QR';
}) {
  const { data } = await api.post('/examinations/entry', body);
  return unwrap<{
    already: boolean;
    attendance: { fullName?: string; checkInAt?: string | null; studentCode?: string } | unknown;
    message?: string;
    eligibility?: { allowed?: boolean; status?: string; financialStatus?: string; reason?: string | null; balance?: number };
  }>(data);
}

export type ExamBlockDetails = {
  code?: string;
  studentName?: string;
  studentCode?: string;
  className?: string;
  balance?: number;
  status?: string;
  financialStatus?: string;
  reason?: string;
  message?: string;
};

export function examInvigilatorApiDetails(err: unknown): ExamBlockDetails | undefined {
  if (err && typeof err === 'object' && 'response' in err) {
    return (err as { response?: { data?: { details?: ExamBlockDetails } } }).response?.data?.details;
  }
  return undefined;
}

export type ExamEligibilityCheck = {
  studentCode: string;
  published: boolean;
  allowed: boolean;
  status: string;
  studentName?: string;
  className?: string;
  examName?: string;
  roomName?: string;
  subjectName?: string;
  academicYear?: string;
  term?: string;
  financialStatus?: string;
  balance?: number;
  reason?: string | null;
  note?: string | null;
  versionLabel?: string | null;
  message?: string;
};

export async function checkExamEligibility(body: { studentCode: string; academicYear?: string; term?: string }) {
  const { data } = await api.post('/examinations/eligibility', body);
  return unwrap<ExamEligibilityCheck>(data);
}

export async function markExamExit(body: {
  roomName: string;
  sessionId?: string;
  examDate?: string;
  slotCode?: string;
  studentCode?: string;
  studentId?: string;
  method?: 'MANUAL' | 'QR';
}) {
  const { data } = await api.post('/examinations/exit', body);
  return unwrap(data);
}
