import { api } from '@/services/api';
import type {
  ExamCatalog,
  ExamCatalogClass,
  ExamDashboard,
  ExamReports,
  ExamSession,
  ExamTimeSlot,
  ExamDay,
  ExamRoom,
  InvigilatorSettings,
  SeatingStrategy,
} from './exam-types';

function data<T>(res: { data: { data: T } }) {
  return res.data.data;
}

export async function fetchExamCatalog(params?: { academicYear?: string; term?: string }) {
  const res = await api.get('/exam-sessions/catalog', { params });
  return data(res) as ExamCatalog;
}

export async function fetchExamDashboard(params?: { academicYear?: string; term?: string }) {
  const res = await api.get('/exam-sessions/dashboard', { params });
  return data(res) as ExamDashboard;
}

export async function listExamSessions(params?: { academicYear?: string; term?: string; status?: string }) {
  const res = await api.get('/exam-sessions', { params });
  return data(res) as ExamSession[];
}

export async function createExamSession(body: {
  name: string;
  academicYear: string;
  term: string;
  examType: string;
  startDate: string;
  endDate: string;
  generateAutomatically?: boolean;
}) {
  const res = await api.post('/exam-sessions', body);
  return data(res) as ExamSession;
}

export async function getExamSession(id: string) {
  const res = await api.get(`/exam-sessions/${id}`);
  return data(res) as ExamSession;
}

export async function saveExamSetup(id: string, body: {
  name?: string;
  examType?: string;
  startDate?: string;
  endDate?: string;
  maxExamsPerDay?: number;
  majorGapSessions?: number;
  classes?: Array<{ classId: string; className: string; studentCount: number; selected: boolean }>;
  courses?: Array<{ classId: string; subjectName: string; durationMinutes: number; selected: boolean; isMajor?: boolean }>;
  rooms?: ExamRoom[];
  timeSlots?: ExamTimeSlot[];
  days?: ExamDay[];
  invigilatorSettings?: Partial<InvigilatorSettings>;
}) {
  const res = await api.put(`/exam-sessions/${id}/setup`, body);
  return data(res) as ExamSession;
}

export async function generateExamTimetable(id: string) {
  const res = await api.post(`/exam-sessions/${id}/generate`);
  return data(res) as ExamSession;
}

export async function generateExamSeating(id: string, body?: { scheduleIds?: string[]; strategy?: SeatingStrategy }) {
  const res = await api.post(`/exam-sessions/${id}/seating`, body ?? {});
  return data(res) as ExamSession;
}

export async function moveExamSeat(id: string, body: { seatId: string; roomName: string; seatCode: string; swap?: boolean }) {
  const res = await api.post(`/exam-sessions/${id}/seats/move`, body);
  return data(res) as ExamSession;
}

export type InvigilatorGenerateResult = {
  session: ExamSession;
  uncovered: Array<{ className: string; subjectName: string; room: string; date: string; slot: string }>;
  advice: string[];
  staffing: { available: number; needed: number; perRoom: number; peakRooms: number; shortfall: number };
};

export async function generateInvigilators(id: string) {
  const res = await api.post(`/exam-sessions/${id}/invigilators`);
  return data(res) as InvigilatorGenerateResult;
}

export async function setRoomInvigilators(id: string, body: {
  scheduleId: string;
  roomName: string;
  invigilatorIds: string[];
  lock?: boolean;
}) {
  const res = await api.post(`/exam-sessions/${id}/invigilators/room`, body);
  return data(res) as ExamSession;
}

export async function fetchInvigilatorDirectory(id: string) {
  const res = await api.get(`/exam-sessions/${id}/invigilators/directory`);
  return data(res) as Array<{
    id: string;
    name: string;
    subjects: string[];
    classes: string[];
    assigned: number;
    locked: number;
    checkedIn: number;
    userId?: string | null;
    email?: string | null;
    source?: string;
    hasAccount?: boolean;
  }>;
}

export async function fetchInvigilatorStaff() {
  const res = await api.get('/exam-sessions/invigilator-staff');
  return data(res) as Array<{
    id: string;
    name: string;
    email?: string | null;
    userId?: string | null;
    source: string;
    hasAccount: boolean;
  }>;
}

export async function fetchExamOrgUsers() {
  const res = await api.get('/exam-sessions/org-users');
  return data(res) as Array<{
    id: string;
    name: string;
    email: string;
    roles: string[];
    modules: string[];
    position?: string | null;
  }>;
}

export async function addInvigilatorStaff(body: {
  name: string;
  email?: string;
  password?: string;
  existingUserId?: string;
  phone?: string;
}) {
  const res = await api.post('/exam-sessions/invigilator-staff', body);
  return data(res) as { staff: unknown; account: { created: boolean; existing: boolean; email: string | null; userId: string } | null };
}

export type InvigilatorDeskRoom = {
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
  scheduleIds: string[];
  examPhase?: 'UPCOMING' | 'LIVE' | 'COMPLETED';
};

export type InvigilatorDeskStudent = {
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string;
  roomName: string;
  seatCode: string;
  scheduleId: string;
  subjectName: string;
  photoUrl?: string | null;
  status: string;
  checkInAt?: string | null;
  submitAt?: string | null;
  exitAt?: string | null;
  method?: string | null;
  examAllowed?: boolean;
  examDecision?: string;
  financialStatus?: string | null;
  feeBalance?: number | null;
  exceptionReason?: string | null;
};

export async function fetchInvigilatorDesk() {
  const res = await api.get('/exam-invigilator/me');
  return data(res) as {
    actor: { userId: string; email: string | null; name: string };
    organizationName?: string;
    rooms: InvigilatorDeskRoom[];
  };
}

export async function fetchInvigilatorRoom(params: { roomName: string; sessionId?: string; examDate?: string; slotCode?: string }) {
  const res = await api.get('/exam-invigilator/room', { params });
  return data(res) as { room: InvigilatorDeskRoom; students: InvigilatorDeskStudent[] };
}

export async function fetchInvigilatorLists() {
  const res = await api.get('/exam-invigilator/lists');
  return data(res) as {
    actor: { userId: string; email: string | null; name: string };
    rooms: Array<{
      room: InvigilatorDeskRoom;
      students: InvigilatorDeskStudent[];
      allowed: number;
      blocked: number;
    }>;
  };
}

export async function invigilatorDeskEntry(body: {
  roomName: string;
  sessionId?: string;
  examDate?: string;
  slotCode?: string;
  studentCode?: string;
  studentId?: string;
  method?: 'MANUAL' | 'QR' | 'RFID';
}) {
  const res = await api.post('/exam-invigilator/entry', body, { skipToast: true });
  return data(res) as {
    already: boolean;
    attendance?: { fullName?: string; checkInAt?: string | null; studentCode?: string };
    message?: string;
    eligibility?: { allowed?: boolean; status?: string; financialStatus?: string; reason?: string | null; balance?: number };
  };
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

export async function invigilatorDeskEligibility(body: { studentCode: string; academicYear?: string; term?: string }) {
  const res = await api.post('/exam-invigilator/eligibility', body, { skipToast: true });
  return data(res) as ExamEligibilityCheck;
}

export async function invigilatorDeskExit(body: {
  roomName: string;
  sessionId?: string;
  examDate?: string;
  slotCode?: string;
  studentCode?: string;
  studentId?: string;
  method?: 'MANUAL' | 'QR' | 'RFID';
}) {
  const res = await api.post('/exam-invigilator/exit', body);
  return data(res);
}

export async function overrideInvigilator(id: string, body: {
  dutyId?: string;
  scheduleId: string;
  roomName: string;
  invigilatorId: string;
  invigilatorName: string;
  lock?: boolean;
}) {
  const res = await api.post(`/exam-sessions/${id}/invigilators/override`, body);
  return data(res) as ExamSession;
}

export async function checkInInvigilator(id: string, body: { dutyId: string; method?: 'MANUAL' | 'QR' | 'RFID' }) {
  const res = await api.post(`/exam-sessions/${id}/invigilators/check-in`, body);
  return data(res) as ExamSession;
}

export async function replaceInvigilator(id: string, body: { dutyId: string; invigilatorId?: string; invigilatorName?: string }) {
  const res = await api.post(`/exam-sessions/${id}/invigilators/replace`, body);
  return data(res) as ExamSession;
}

export async function moveExamSchedule(id: string, body: { scheduleId: string; examDate: string; slotCode: string }) {
  const res = await api.post(`/exam-sessions/${id}/move`, body);
  return data(res) as ExamSession;
}

export async function rescheduleExam(id: string, body: { scheduleId: string; examDate?: string; slotCode?: string }) {
  const res = await api.post(`/exam-sessions/${id}/reschedule`, body);
  return data(res) as { recommended: { date: string; slot: string; startTime: string; endTime: string }; session: ExamSession };
}

export async function publishExamSession(id: string) {
  const res = await api.post(`/exam-sessions/${id}/publish`);
  return data(res) as ExamSession;
}

export async function updateExamStatus(id: string, status: string) {
  const res = await api.post(`/exam-sessions/${id}/status`, { status });
  return data(res) as ExamSession;
}

export async function fetchExamLive(id: string) {
  const res = await api.get(`/exam-sessions/${id}/live`);
  return data(res) as ExamSession['schedules'];
}

export async function fetchExamReports(id: string) {
  const res = await api.get(`/exam-sessions/${id}/reports`);
  return data(res) as ExamReports;
}

export async function resolveExamConflict(id: string, conflictId: string) {
  const res = await api.post(`/exam-sessions/${id}/conflicts/${conflictId}/resolve`);
  return data(res) as ExamSession;
}

export async function resolveAllExamConflicts(id: string) {
  const res = await api.post(`/exam-sessions/${id}/conflicts/resolve-all`);
  return data(res) as {
    session: ExamSession;
    resolved: number;
    remaining: number;
    actions: string[];
    advice: string[];
  };
}

export async function deleteExamSession(id: string) {
  const res = await api.delete(`/exam-sessions/${id}`);
  return data(res);
}

export async function startExam(scheduleId: string) {
  const res = await api.post(`/exam-sessions/schedules/${scheduleId}/start`);
  return data(res);
}

export async function examCheckIn(body: { scheduleId: string; studentId?: string; studentCode?: string; roomName?: string; method?: 'MANUAL' | 'QR' | 'RFID' }) {
  const res = await api.post('/exam-sessions/attendance/check-in', body);
  return data(res) as { already: boolean; attendance: unknown; message?: string };
}

export async function examSubmit(body: { scheduleId: string; studentId?: string; studentCode?: string; earlyReason?: string; method?: 'MANUAL' | 'QR' | 'RFID' }) {
  const res = await api.post('/exam-sessions/attendance/submit', body);
  return data(res);
}

export async function examExit(body: { scheduleId: string; studentId?: string; studentCode?: string }) {
  const res = await api.post('/exam-sessions/attendance/exit', body);
  return data(res);
}

export function examApiError(err: unknown) {
  const e = err as { response?: { data?: { message?: string; error?: string; details?: ExamBlockDetails } }; message?: string };
  return e.response?.data?.message || e.response?.data?.error || e.message || 'Something went wrong';
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

export function examApiDetails(err: unknown): ExamBlockDetails | undefined {
  const e = err as { response?: { data?: { details?: ExamBlockDetails } } };
  return e.response?.data?.details;
}
