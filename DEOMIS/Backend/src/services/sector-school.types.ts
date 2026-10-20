export type SchoolStatus = 'normal' | 'monitoring' | 'attention' | 'offline';

export type OnboardingBadge = 'ready' | 'no_attendance' | 'no_students' | 'partial';

export interface SectorSchool {
  id: string;
  name: string;
  code: string;
  sectorName?: string;
  genderDistribution?: { MALE?: number; FEMALE?: number; OTHER?: number };
  students: number;
  studentsPresent: number;
  studentsAbsent: number;
  staffTotal: number;
  staffPresent: number;
  studentAttendancePct: number;
  staffAttendancePct: number;
  status: SchoolStatus;
  firstAttendanceTime: string | null;
  lastSync: string | null;
  deviceOnline: boolean;
  internetOnline: boolean;
  alertCount: number;
  lateArrivals: number;
  reporting: boolean;
  onboarding: OnboardingBadge;
  morningCompliant: boolean;
  lat: number;
  lng: number;
  coordinatesSource: 'gps' | 'fallback';
  flags: string[];
  deviceBatteryPct: number | null;
  deviceReaderStatus: string;
  /** Student Management breakdown (optional, for intelligence screens). */
  studentsByClass?: { label: string; value: number }[];
  studentsByCategory?: { label: string; value: number }[];
}

export function aggregateFromSchools(schools: SectorSchool[]) {
  const totalStudents = schools.reduce((s, x) => s + x.students, 0);
  const studentsPresent = schools.reduce((s, x) => s + x.studentsPresent, 0);
  const studentsAbsent = schools.reduce((s, x) => s + x.studentsAbsent, 0);
  const staffTotal = schools.reduce((s, x) => s + x.staffTotal, 0);
  const staffPresent = schools.reduce((s, x) => s + x.staffPresent, 0);
  const lateArrivals = schools.reduce((s, x) => s + x.lateArrivals, 0);
  const notReporting = schools.filter((x) => !x.reporting).length;
  const attention = schools.filter((x) => x.status === 'attention' || x.status === 'offline').length;

  const attendancePercentage =
    totalStudents > 0 ? Math.round((studentsPresent / totalStudents) * 1000) / 10 : 0;
  const staffAttendancePercentage =
    staffTotal > 0 ? Math.round((staffPresent / staffTotal) * 1000) / 10 : 0;

  return {
    totalSchools: schools.length,
    totalStudents,
    totalStaff: staffTotal,
    studentsPresent,
    studentsAbsent,
    staffPresent,
    staffAbsent: staffTotal - staffPresent,
    lateArrivals,
    attendancePercentage,
    staffAttendancePercentage,
    schoolsNotReporting: notReporting,
    schoolsRequiringAttention: attention,
  };
}

export function flatTrend(base: number, points: number): number[] {
  const v = Math.round(Math.min(100, Math.max(0, base)) * 10) / 10;
  return Array.from({ length: points }, () => v);
}

export function dataQualitySummary(schools: SectorSchool[]) {
  const reporting = schools.filter((s) => s.reporting).length;
  return {
    schoolsReporting: `${reporting}/${schools.length}`,
    completeRecords: schools.filter((s) => s.reporting && s.deviceOnline).length,
    delayedRecords: schools.filter((s) => s.reporting && !s.internetOnline).length,
    deviceOffline: schools.filter((s) => !s.deviceOnline).length,
    invalidScans: schools.reduce((s, x) => s + x.alertCount, 0),
    duplicateScans: 0,
    manualCorrections: 0,
  };
}

export function attendanceInsight(schools: SectorSchool[]) {
  const affected = schools.filter((s) => s.studentAttendancePct < 93).length;
  const offline = schools.filter((s) => !s.deviceOnline).length;
  const reporting = schools.filter((s) => s.reporting).length;
  const completeness =
    schools.length > 0 ? Math.round((reporting / schools.length) * 1000) / 10 : 0;

  return {
    headline:
      affected > 0
        ? `${affected} school(s) are below 93% student attendance today.`
        : 'Student attendance across the sector is within normal range today.',
    deltaPct: 0,
    affectedSchools: affected,
    affectedLevels: [] as string[],
    dataCompletenessPct: completeness,
    deviceProblems: offline,
    followUpRequired: affected > 0 || offline > 0,
  };
}

export function buildNotifications(schools: SectorSchool[]) {
  const items: {
    id: string;
    level: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    at: string;
  }[] = [];
  const now = new Date().toISOString();

  for (const s of schools.filter((x) => !x.reporting).slice(0, 3)) {
    items.push({
      id: `nr-${s.id}`,
      level: 'critical',
      title: 'Attendance Alert',
      message: `${s.name} has not submitted morning attendance records today.`,
      at: now,
    });
  }
  for (const s of schools.filter((x) => !x.deviceOnline).slice(0, 3)) {
    items.push({
      id: `dev-${s.id}`,
      level: 'warning',
      title: 'Device Alert',
      message: `No online attendance reader reported for ${s.name}.`,
      at: now,
    });
  }
  if (schools.some((x) => x.studentAttendancePct < 88)) {
    items.push({
      id: 'trend-low',
      level: 'info',
      title: 'Trend Alert',
      message: 'One or more schools show student attendance below 88% today.',
      at: now,
    });
  }
  return items.slice(0, 8);
}
