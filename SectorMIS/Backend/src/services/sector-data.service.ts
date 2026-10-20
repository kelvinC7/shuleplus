import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  countTeachingStaff,
  fetchSeiScope,
  listRegisteredSchools,
  type RegisteredSchool,
} from '../clients/iam.client';
import { fetchBatchDashboardSummaries, type SmDashboardSummary } from '../clients/student-management.client';
import { fetchBatchSnapshots, type SectorSnapshotRow } from '../clients/attendance.client';
import type { OnboardingBadge, SchoolStatus, SectorSchool } from './sector-school.types';
import { isMorningCompliant, parseSettings, sectorSettingsService } from './sector-settings.service';

function hashCoord(seed: string, axis: 'lat' | 'lng'): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const n = Math.abs(h % 1000) / 1000;
  return axis === 'lat' ? -2.2 + n * 0.25 : 29.5 + n * 0.35;
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function deriveStatus(input: {
  deviceOnline: boolean;
  reporting: boolean;
  studentPct: number;
  staffPct: number;
}): { status: SchoolStatus; flags: string[] } {
  const flags: string[] = [];
  if (!input.deviceOnline) flags.push('Device offline');
  if (!input.reporting) flags.push('School not reporting');
  if (input.studentPct < 88) flags.push('High absenteeism');
  if (input.staffPct < 90) flags.push('High staff absence');
  if (input.studentPct < 93 && input.studentPct >= 88) flags.push('Below target attendance');

  let status: SchoolStatus = 'normal';
  if (!input.deviceOnline) status = 'offline';
  else if (input.studentPct < 88 || input.staffPct < 90) status = 'attention';
  else if (input.studentPct < 93 || !input.reporting) status = 'monitoring';

  return { status, flags };
}

function resolveOnboarding(
  smEnrollments: number,
  snap: SectorSnapshotRow | undefined
): OnboardingBadge {
  if (!snap?.attendanceTenant) return 'no_attendance';
  if (smEnrollments <= 0) return 'no_students';
  if (!snap.daySummary) return 'partial';
  return 'ready';
}

function buildSchoolFromBatch(
  org: RegisteredSchool,
  index: number,
  sm: SmDashboardSummary | undefined,
  snap: SectorSnapshotRow | undefined,
  staffTotalIam: number,
  morningCutoff: string
): SectorSchool {
  const attendance = snap?.daySummary ?? null;
  const students = sm?.activeEnrollments ?? sm?.studentCount ?? 0;
  const present = attendance?.kpis.present ?? 0;
  const late = attendance?.kpis.late ?? 0;
  const studentsPresent = present + late;
  const studentsAbsent = Math.max(0, students - studentsPresent);

  const staffPresent = attendance?.kpis.staffPresent ?? 0;
  const staffTaps = attendance?.kpis.staffTaps ?? 0;
  const staffTotal = Math.max(staffTotalIam, staffTaps, staffPresent);

  const studentAttendancePct =
    students > 0
      ? Math.round((studentsPresent / students) * 1000) / 10
      : (attendance?.kpis.attendanceRate ?? 0);
  const staffAttendancePct =
    staffTotal > 0
      ? Math.round((staffPresent / staffTotal) * 1000) / 10
      : (attendance?.kpis.staffAttendanceRate ?? 0);

  const devicesOnline = (attendance?.kpis.devicesOnline ?? 0) > 0;
  const deviceOnline = devicesOnline;
  const internetOnline = deviceOnline;
  const reporting =
    (attendance?.studentRecordCount ?? 0) > 0 ||
    studentsPresent > 0 ||
    (attendance?.kpis.devicesOnline ?? 0) > 0;

  const onboarding = resolveOnboarding(students, snap);
  const firstAttendanceTime = attendance?.firstAttendanceTime ?? null;
  const morningCompliant =
    onboarding === 'ready' && reporting && isMorningCompliant(firstAttendanceTime, morningCutoff);

  const { status, flags } = deriveStatus({
    deviceOnline,
    reporting,
    studentPct: studentAttendancePct,
    staffPct: staffAttendancePct,
  });
  if (onboarding === 'no_attendance') flags.push('Attendance not provisioned');
  if (onboarding === 'no_students') flags.push('No student enrollments');
  if (!morningCompliant && reporting) flags.push('Late morning submission');

  const primaryDevice =
    attendance?.devices?.find((d) => d.status === 'ONLINE') ?? attendance?.devices?.[0];
  const lastSync = formatTime(attendance?.lastDeviceSync ?? primaryDevice?.lastSeenAt ?? null);

  const hasGps = org.lat != null && org.lng != null && Number.isFinite(org.lat) && Number.isFinite(org.lng);

  return {
    id: org.id,
    name: org.name,
    code: org.organizationCode ?? org.id.slice(0, 8).toUpperCase(),
    students,
    studentsPresent,
    studentsAbsent,
    staffTotal,
    staffPresent,
    studentAttendancePct,
    staffAttendancePct,
    status,
    firstAttendanceTime,
    lastSync,
    deviceOnline,
    internetOnline,
    alertCount: attendance?.kpis.securityAlerts ?? flags.length,
    lateArrivals: late,
    reporting,
    onboarding,
    morningCompliant,
    lat: hasGps ? org.lat! : hashCoord(org.id, 'lat') + index * 0.0001,
    lng: hasGps ? org.lng! : hashCoord(org.id, 'lng') + index * 0.0001,
    coordinatesSource: hasGps ? 'gps' : 'fallback',
    flags,
    deviceBatteryPct: primaryDevice?.batteryPercent ?? null,
    deviceReaderStatus: primaryDevice?.status ?? (deviceOnline ? 'ONLINE' : 'OFFLINE'),
    studentsByClass: sm?.studentsByClass?.map((c) => ({ label: c.label, value: c.value })),
    studentsByCategory: sm?.studentsByCategory,
  };
}

export type SectorLoadResult = {
  sectorName: string;
  organizationRef: string;
  settings: ReturnType<typeof parseSettings>;
  schoolIds: string[];
  schools: SectorSchool[];
};

async function loadOrgsForTenant(organizationRef: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { organizationId: organizationRef, status: 'ACTIVE' },
  });
  if (!tenant?.sector) return { orgs: [] as RegisteredSchool[], settings: parseSettings(null) };
  const orgs = await listRegisteredSchools({ sectorName: tenant.sector, limit: 500 });
  return { orgs, settings: parseSettings(tenant.settings) };
}

export class SectorDataService {
  async loadForTenant(organizationRef: string): Promise<SectorLoadResult> {
    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: organizationRef, status: 'ACTIVE' },
    });
    const { orgs, settings } = await loadOrgsForTenant(organizationRef);
    return this.buildLoadResult(orgs, settings, tenant?.sector ?? 'Sector', organizationRef);
  }

  private async buildLoadResult(
    orgs: RegisteredSchool[],
    settings: ReturnType<typeof parseSettings>,
    sectorName: string,
    organizationRef: string
  ): Promise<SectorLoadResult> {
    const ids = orgs.map((o) => o.id);
    const [smMap, snapshots] = await Promise.all([
      fetchBatchDashboardSummaries(ids),
      fetchBatchSnapshots(ids),
    ]);
    const snapMap = new Map(snapshots.map((s) => [s.organizationId, s]));
    const staffCounts = await Promise.all(
      orgs.map(async (org) => ({ id: org.id, count: await countTeachingStaff(org.id) }))
    );
    const staffMap = new Map(staffCounts.map((s) => [s.id, s.count]));
    const schools = orgs.map((org, index) =>
      buildSchoolFromBatch(
        org,
        index,
        smMap.get(org.id),
        snapMap.get(org.id),
        staffMap.get(org.id) ?? 0,
        settings.morningCutoffTime ?? '08:00'
      )
    );
    return { sectorName, organizationRef, settings, schoolIds: ids, schools };
  }

  async loadForUser(userId: string, organizationRef: string): Promise<SectorLoadResult> {
    const scope = await fetchSeiScope(userId);
    if (!scope) {
      throw new AppError(403, 'SEI officer profile not found. Contact platform administrator.');
    }

    let orgs = await listRegisteredSchools({
      sectorId: scope.sectorId,
      districtId: scope.districtId,
      provinceId: scope.provinceId,
      sectorName: scope.sectorName,
    });

    if (!orgs.length && scope.sectorName) {
      orgs = await listRegisteredSchools({
        districtId: scope.districtId,
        sectorName: scope.sectorName,
      });
    }

    const settings = await sectorSettingsService.get(organizationRef);
    return this.buildLoadResult(orgs, settings, scope.sectorName, organizationRef);
  }
}

export const sectorDataService = new SectorDataService();
