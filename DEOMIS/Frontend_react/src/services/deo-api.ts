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
  return getData<unknown>('/deo/morning');
}

export function fetchDistrictSectors() {
  return getData<
    Array<{
      sectorName: string;
      schoolCount: number;
      totalStudents: number;
      studentAttendancePct: number;
      staffAttendancePct: number;
      schoolsNotReporting: number;
    }>
  >('/deo/sectors');
}

export function fetchSchools() {
  return getData<SchoolRecord[]>('/deo/schools');
}

export function fetchSchoolProfile(schoolId: string) {
  return getData<
    SchoolRecord & {
      classes: { name: string; attendancePct: number; enrolled?: number; present?: number; late?: number; absent?: number }[];
      genderDistribution?: { MALE?: number; FEMALE?: number; OTHER?: number };
      chronicAbsentees?: Array<{ studentCode: string; studentName: string; className: string | null }>;
      device: Record<string, unknown>;
    }
  >(`/deo/schools/${schoolId}`);
}

export function fetchAttentionSchools() {
  return getData<unknown[]>('/deo/attention');
}

export function fetchDeviceHealth() {
  return getData<unknown[]>('/deo/devices');
}

export function fetchDataQuality() {
  return getData<Record<string, number | string>>('/deo/data-quality');
}

export function fetchAnalytics(range: string) {
  return getData<unknown>('/deo/analytics', { range });
}

export function fetchStudentIntelligence() {
  return getData<Record<string, unknown>>('/deo/students');
}

export function fetchStaffIntelligence() {
  return getData<Record<string, unknown>>('/deo/staff');
}

export function fetchDistrictMap() {
  return getData<SchoolMapPoint[]>('/deo/map');
}

export function fetchIntegrityAlerts() {
  return getData<unknown[]>('/deo/integrity');
}

export function fetchDailyReport() {
  return getData<Record<string, unknown>>('/deo/reports/daily');
}

export async function downloadDailyReportPdf() {
  const res = await api.get('/deo/reports/daily.pdf', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `district-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function fetchDeoSettings() {
  return getData<SeiSettings>('/deo/settings');
}

export function updateDeoSettings(body: Partial<SeiSettings>) {
  return api.patch('/deo/settings', body).then((r) => r.data.data as SeiSettings);
}

export function searchDistrict(q: string) {
  return getData<{ schools: SchoolRecord[]; cases: FollowUpCase[] }>('/deo/search', { q });
}

export function notifyCriticalAlerts(body?: { phone?: string }) {
  return api.post('/deo/notifications/critical', body ?? {}).then((r) => r.data.data);
}

export function fetchFollowUpCases() {
  return getData<FollowUpCase[]>('/deo/follow-up');
}

export function createFollowUpCase(body: {
  schoolId: string;
  schoolName: string;
  issue: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}) {
  return api.post('/deo/follow-up', body).then((r) => r.data.data as FollowUpCase);
}

export function updateFollowUpCase(caseId: string, body: Partial<FollowUpCase> & { comment?: string }) {
  return api.patch(`/deo/follow-up/${caseId}`, body).then((r) => r.data.data as FollowUpCase);
}

export function fetchSchoolVisits() {
  return getData<SchoolVisit[]>('/deo/visits');
}

export function startSchoolVisit(body: { schoolId: string; schoolName: string }) {
  return api.post('/deo/visits', body).then((r) => r.data.data as SchoolVisit);
}

export function updateSchoolVisit(
  visitId: string,
  body: { observations?: Record<string, unknown>; report?: Record<string, unknown>; complete?: boolean }
) {
  return api.patch(`/deo/visits/${visitId}`, body).then((r) => r.data.data as SchoolVisit);
}
