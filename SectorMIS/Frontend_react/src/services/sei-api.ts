import { api } from '@/services/api';
import type {
  CommandDashboard,
  FollowUpCase,
  SchoolMapPoint,
  SchoolRecord,
  SchoolVisit,
  SeiSettings,
} from '@/types';

async function getData<T>(path: string, params?: Record<string, string>) {
  const res = await api.get(path, { params });
  return res.data.data as T;
}

export function fetchCommandDashboard() {
  return getData<CommandDashboard>('/dashboard');
}

export function fetchMorningSituation() {
  return getData<{
    schools: Array<{
      id: string;
      name: string;
      status: import('@/types').SchoolStatus;
      onboarding?: string;
      morningCompliant?: boolean;
      studentAttendancePct: number;
      staffAttendancePct: number;
      firstAttendanceTime: string | null;
      lastSync: string | null;
      deviceOnline: boolean;
      internetOnline: boolean;
      alertStatus: string;
    }>;
    counts: Record<string, number>;
    compliance?: { compliant: number; late: number; notReporting: number };
    morningCutoffTime?: string;
    timeLabel: string;
  }>('/sei/morning');
}

export function fetchSchools() {
  return getData<SchoolRecord[]>('/sei/schools');
}

export function fetchSchoolProfile(schoolId: string) {
  return getData<
    SchoolRecord & {
      classes: { name: string; attendancePct: number; enrolled?: number; present?: number; late?: number; absent?: number }[];
      chronicAbsentees?: Array<{ studentCode: string; studentName: string; className: string | null }>;
      device: Record<string, unknown>;
    }
  >(`/sei/schools/${schoolId}`);
}

export function fetchAttentionSchools() {
  return getData<
    Array<{
      id: string;
      name: string;
      status: string;
      onboarding?: string;
      reasons: string[];
      studentAttendancePct: number;
      staffAttendancePct: number;
    }>
  >('/sei/attention');
}

export function fetchDeviceHealth() {
  return getData<unknown[]>('/sei/devices');
}

export function fetchDataQuality() {
  return getData<Record<string, number | string>>('/sei/data-quality');
}

export function fetchAnalytics(range: string) {
  return getData<{
    range: string;
    today: Record<string, number>;
    trends: Record<string, number[]> & { dates?: string[] };
  }>('/sei/analytics', { range });
}

export function fetchStudentIntelligence() {
  return getData<Record<string, unknown>>('/sei/students');
}

export function fetchStaffIntelligence() {
  return getData<Record<string, unknown>>('/sei/staff');
}

export function fetchSectorMap() {
  return getData<SchoolMapPoint[]>('/sei/map');
}

export function fetchIntegrityAlerts() {
  return getData<unknown[]>('/sei/integrity');
}

export function fetchDailyReport() {
  return getData<Record<string, unknown>>('/sei/reports/daily');
}

export async function downloadDailyReportPdf() {
  const res = await api.get('/sei/reports/daily.pdf', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sector-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function fetchSeiSettings() {
  return getData<SeiSettings>('/sei/settings');
}

export function updateSeiSettings(body: Partial<SeiSettings>) {
  return api.patch('/sei/settings', body).then((r) => r.data.data as SeiSettings);
}

export function searchSector(q: string) {
  return getData<{ schools: SchoolRecord[]; cases: FollowUpCase[] }>('/sei/search', { q });
}

export function notifyCriticalAlerts(body?: { phone?: string }) {
  return api.post('/sei/notifications/critical', body ?? {}).then((r) => r.data.data);
}

export function fetchFollowUpCases() {
  return getData<FollowUpCase[]>('/sei/follow-up');
}

export function createFollowUpCase(body: {
  schoolId: string;
  schoolName: string;
  issue: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}) {
  return api.post('/sei/follow-up', body).then((r) => r.data.data as FollowUpCase);
}

export function updateFollowUpCase(
  caseId: string,
  body: {
    status?: FollowUpCase['status'];
    priority?: string;
    assignedTo?: string;
    issue?: string;
    comment?: string;
    followUpDate?: string;
  }
) {
  return api.patch(`/sei/follow-up/${caseId}`, body).then((r) => r.data.data as FollowUpCase);
}

export function fetchSchoolVisits() {
  return getData<SchoolVisit[]>('/sei/visits');
}

export function startSchoolVisit(body: { schoolId: string; schoolName: string }) {
  return api.post('/sei/visits', body).then((r) => r.data.data as SchoolVisit);
}

export function updateSchoolVisit(
  visitId: string,
  body: { observations?: Record<string, unknown>; report?: Record<string, unknown>; complete?: boolean }
) {
  return api.patch(`/sei/visits/${visitId}`, body).then((r) => r.data.data as SchoolVisit);
}
