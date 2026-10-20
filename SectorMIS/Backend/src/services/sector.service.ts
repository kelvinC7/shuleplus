import { FollowUpPriority, FollowUpStatus, Prisma } from '../generated/prisma';
import { prisma } from '../config/database';
import {
  fetchBatchHistory,
  fetchChronicAbsenceSummary,
  fetchSchoolAttendanceDetail,
  fetchSectorDataQuality,
  fetchSecurityAlerts,
} from '../clients/attendance.client';
import { notificationClient } from '../clients/notification.client';
import { sectorDataService } from './sector-data.service';
import { sectorSettingsService } from './sector-settings.service';
import {
  aggregateFromSchools,
  attendanceInsight,
  buildNotifications,
  dataQualitySummary,
  type SectorSchool,
} from './sector-school.types';

type CachedSector = {
  at: number;
  sectorName: string;
  schoolIds: string[];
  schools: SectorSchool[];
  settings: Awaited<ReturnType<typeof sectorSettingsService.get>>;
};

const CACHE_MS = 45_000;

function cacheKey(userId: string, organizationRef: string) {
  return `${userId}:${organizationRef}`;
}

function sectorLabel(sectorName: string, tenant?: { organizationName?: string | null }) {
  return sectorName || tenant?.organizationName || 'Sector';
}

function timeLabelNow() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function daysForRange(range: string) {
  if (range === 'week') return 7;
  if (range === 'month') return 30;
  if (range === 'term') return 90;
  if (range === 'year') return 365;
  return 1;
}

export class SectorService {
  private cache = new Map<string, CachedSector>();

  invalidateCache(userId?: string, organizationRef?: string) {
    if (userId && organizationRef) this.cache.delete(cacheKey(userId, organizationRef));
    else this.cache.clear();
  }

  private async load(userId: string, organizationRef: string) {
    const key = cacheKey(userId, organizationRef);
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit;

    const loaded = await sectorDataService.loadForUser(userId, organizationRef);
    const entry: CachedSector = {
      at: Date.now(),
      sectorName: loaded.sectorName,
      schoolIds: loaded.schoolIds,
      schools: loaded.schools,
      settings: loaded.settings,
    };
    this.cache.set(key, entry);
    return entry;
  }

  async getSettings(organizationRef: string) {
    return sectorSettingsService.get(organizationRef);
  }

  async updateSettings(organizationRef: string, patch: Parameters<typeof sectorSettingsService.update>[1]) {
    return sectorSettingsService.update(organizationRef, patch);
  }

  async search(userId: string, organizationRef: string, q: string) {
    const query = q.trim().toLowerCase();
    const { schools } = await this.load(userId, organizationRef);
    if (!query) return { schools: schools.slice(0, 20), cases: [] as unknown[] };

    const matchedSchools = schools.filter(
      (s) => s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query)
    );

    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: organizationRef, status: 'ACTIVE' },
    });
    const cases = tenant
      ? await prisma.followUpCase.findMany({
          where: {
            tenantId: tenant.id,
            OR: [
              { schoolName: { contains: q, mode: 'insensitive' } },
              { issue: { contains: q, mode: 'insensitive' } },
              { caseNumber: { contains: q, mode: 'insensitive' } },
            ],
          },
          take: 15,
        })
      : [];

    return { schools: matchedSchools.slice(0, 20), cases };
  }

  async commandDashboard(userId: string, organizationRef: string) {
    const meta = await this.getTenantMeta(organizationRef);
    const { sectorName, schools, settings } = await this.load(userId, organizationRef);
    const totals = aggregateFromSchools(schools);
    const insight = attendanceInsight(schools);
    const notifications = buildNotifications(schools);
    const compliant = schools.filter((s) => s.morningCompliant).length;

    return {
      sector: sectorLabel(sectorName, meta),
      organizationName: meta.organizationName,
      date: new Date().toISOString().slice(0, 10),
      autoRefreshSeconds: settings.autoRefreshSeconds ?? 120,
      morningCutoffTime: settings.morningCutoffTime ?? '08:00',
      ...totals,
      insight,
      notifications,
      morningSummary: {
        timeLabel: timeLabelNow(),
        normal: schools.filter((s) => s.status === 'normal').length,
        monitoring: schools.filter((s) => s.status === 'monitoring').length,
        attention: schools.filter((s) => s.status === 'attention' || s.status === 'offline').length,
        compliant,
        notCompliant: schools.filter((s) => s.reporting && !s.morningCompliant).length,
        notReporting: schools.filter((s) => !s.reporting).length,
      },
    };
  }

  async morningSituation(userId: string, organizationRef: string) {
    const meta = await this.getTenantMeta(organizationRef);
    const { sectorName, schools, settings } = await this.load(userId, organizationRef);
    return {
      sector: sectorLabel(sectorName, meta),
      timeLabel: `${timeLabelNow()} · Sector Attendance Status`,
      morningCutoffTime: settings.morningCutoffTime ?? '08:00',
      compliance: {
        compliant: schools.filter((s) => s.morningCompliant).length,
        late: schools.filter((s) => s.reporting && !s.morningCompliant).length,
        notReporting: schools.filter((s) => !s.reporting).length,
      },
      schools: schools.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        onboarding: s.onboarding,
        morningCompliant: s.morningCompliant,
        studentAttendancePct: s.studentAttendancePct,
        staffAttendancePct: s.staffAttendancePct,
        firstAttendanceTime: s.firstAttendanceTime,
        lastSync: s.lastSync,
        deviceOnline: s.deviceOnline,
        internetOnline: s.internetOnline,
        alertStatus: s.alertCount > 0 ? `${s.alertCount} alert(s)` : 'Clear',
      })),
      counts: {
        normal: schools.filter((s) => s.status === 'normal').length,
        monitoring: schools.filter((s) => s.status === 'monitoring').length,
        attention: schools.filter((s) => s.status === 'attention' || s.status === 'offline').length,
      },
    };
  }

  async listSchools(userId: string, organizationRef: string) {
    const { schools } = await this.load(userId, organizationRef);
    return schools;
  }

  async schoolProfile(userId: string, organizationRef: string, schoolId: string) {
    const schools = await this.listSchools(userId, organizationRef);
    const school = schools.find((s) => s.id === schoolId);
    if (!school) return null;

    const detail = await fetchSchoolAttendanceDetail(schoolId);
    const classes =
      detail?.classes?.length
        ? detail.classes.map((c) => ({
            name: c.name,
            attendancePct: c.attendancePct,
            enrolled: c.records,
            present: c.present,
            late: c.late,
            absent: c.absent,
          }))
        : (school.studentsByClass ?? []).map((c) => ({
            name: c.label,
            attendancePct: school.studentAttendancePct,
            enrolled: c.value,
            present: 0,
            late: 0,
            absent: 0,
          }));

    return {
      ...school,
      classes,
      chronicAbsentees: detail?.chronicAbsentees ?? [],
      device: {
        online: school.deviceOnline,
        lastSync: school.lastSync,
        internet: school.internetOnline,
        batteryPct: school.deviceBatteryPct,
        readerStatus: school.deviceReaderStatus,
        scansToday: school.studentsPresent + school.lateArrivals,
        clockSync: school.deviceOnline ? 'OK' : 'Mismatch',
      },
    };
  }

  async attentionRequired(userId: string, organizationRef: string) {
    const schools = await this.listSchools(userId, organizationRef);
    return schools
      .filter((s) => s.flags.length > 0 || s.status !== 'normal')
      .map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        onboarding: s.onboarding,
        reasons: s.flags,
        studentAttendancePct: s.studentAttendancePct,
        staffAttendancePct: s.staffAttendancePct,
      }));
  }

  async deviceHealth(userId: string, organizationRef: string) {
    const schools = await this.listSchools(userId, organizationRef);
    return schools.map((s) => ({
      schoolId: s.id,
      schoolName: s.name,
      onboarding: s.onboarding,
      online: s.deviceOnline,
      lastSync: s.lastSync,
      internet: s.internetOnline,
      batteryPct: s.deviceBatteryPct,
      readerStatus: s.deviceReaderStatus,
      scansToday: s.studentsPresent + s.lateArrivals,
      clockStatus: s.deviceOnline ? 'Synchronized' : 'Drift detected',
    }));
  }

  async dataQuality(userId: string, organizationRef: string) {
    const { schoolIds, schools } = await this.load(userId, organizationRef);
    const base = dataQualitySummary(schools);
    const metrics = await fetchSectorDataQuality(schoolIds);
    return {
      ...base,
      invalidScans: metrics?.unresolvedAlerts ?? base.invalidScans,
      manualCorrections: metrics?.manualCorrectionsToday ?? 0,
    };
  }

  async analytics(userId: string, organizationRef: string, range: string) {
    const { schoolIds, schools } = await this.load(userId, organizationRef);
    const agg = aggregateFromSchools(schools);
    const days = daysForRange(range);
    const history = schoolIds.length ? await fetchBatchHistory(schoolIds, days) : null;
    const studentTrend = history?.series.map((p) => p.attendanceRate) ?? [agg.attendancePercentage];
    const staffTrend = studentTrend.map((v) => Math.min(100, v + 2));
    return {
      range,
      today: {
        studentAttendancePct: agg.attendancePercentage,
        staffAttendancePct: agg.staffAttendancePercentage,
        lateArrivals: agg.lateArrivals,
      },
      trends: {
        student: studentTrend,
        staff: staffTrend,
        absence: studentTrend.map((v) => Math.round((100 - v) * 10) / 10),
        late: history?.series.map((p) => p.late) ?? [agg.lateArrivals],
        dates: history?.series.map((p) => p.date) ?? [],
      },
    };
  }

  async studentIntelligence(userId: string, organizationRef: string) {
    const { schoolIds, schools } = await this.load(userId, organizationRef);
    const chronic = schoolIds.length ? await fetchChronicAbsenceSummary(schoolIds, 3) : null;

    const byGradeMap = new Map<string, number>();
    for (const s of schools) {
      for (const cat of s.studentsByCategory ?? []) {
        byGradeMap.set(cat.label, (byGradeMap.get(cat.label) ?? 0) + cat.value);
      }
    }
    const sectorAvg =
      schools.reduce((sum, sc) => sum + sc.studentAttendancePct * sc.students, 0) /
      Math.max(schools.reduce((sum, sc) => sum + sc.students, 0), 1);
    const byGrade = [...byGradeMap.entries()].map(([grade, count]) => ({
      grade,
      attendancePct: Math.round(sectorAvg * 10) / 10,
      enrolled: count,
    }));

    const chronicStudents: Array<{
      studentName: string;
      studentCode: string;
      className: string | null;
      schoolId?: string;
    }> = [];
    for (const row of chronic?.bySchool ?? []) {
      const r = row as {
        organizationId?: string;
        students?: Array<{ studentName: string; studentCode: string; className: string | null }>;
      };
      for (const st of r.students ?? []) {
        chronicStudents.push({ ...st, schoolId: r.organizationId });
      }
    }

    return {
      absentToday: schools.reduce((s, x) => s + x.studentsAbsent, 0),
      consecutiveAbsences: chronic?.total ?? 0,
      frequentAbsenteeism: schools.filter((x) => x.studentAttendancePct < 88).length,
      lateArrivals: schools.reduce((s, x) => s + x.lateArrivals, 0),
      chronicStudents: chronicStudents.slice(0, 100),
      bySchool: schools.map((s) => ({
        schoolId: s.id,
        schoolName: s.name,
        attendancePct: s.studentAttendancePct,
        absent: s.studentsAbsent,
      })),
      byGrade,
    };
  }

  async staffIntelligence(userId: string, organizationRef: string) {
    const schools = await this.listSchools(userId, organizationRef);
    const staffTotal = schools.reduce((s, x) => s + x.staffTotal, 0);
    const staffPresent = schools.reduce((s, x) => s + x.staffPresent, 0);
    const rate = staffTotal > 0 ? Math.round((staffPresent / staffTotal) * 1000) / 10 : 0;
    return {
      teachersPresent: staffPresent,
      teachersAbsent: Math.max(0, staffTotal - staffPresent),
      lateTeachers: schools.reduce((s, x) => s + (x.staffAttendancePct < 95 ? 1 : 0), 0),
      administrativeStaff: { present: staffPresent, total: staffTotal },
      supportStaff: { present: 0, total: 0 },
      approvedLeave: 0,
      unrecordedAttendance: schools.filter((s) => !s.reporting).length,
      punctualityTrend: Array.from({ length: 7 }, () => rate),
      bySchool: schools.map((s) => ({
        schoolId: s.id,
        schoolName: s.name,
        staffAttendancePct: s.staffAttendancePct,
        present: s.staffPresent,
        total: s.staffTotal,
      })),
    };
  }

  async sectorMap(userId: string, organizationRef: string) {
    const schools = await this.listSchools(userId, organizationRef);
    return schools.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      lat: s.lat,
      lng: s.lng,
      coordinatesSource: s.coordinatesSource,
      studentAttendancePct: s.studentAttendancePct,
      staffAttendancePct: s.staffAttendancePct,
      deviceOnline: s.deviceOnline,
      lastSync: s.lastSync,
      alerts: s.alertCount,
      onboarding: s.onboarding,
    }));
  }

  async integrity(userId: string, organizationRef: string) {
    const schools = await this.listSchools(userId, organizationRef);
    const alerts = (
      await Promise.all(
        schools.map(async (s) => {
          const rows = await fetchSecurityAlerts(s.id, 5);
          return rows.map((r) => ({
            id: r.id,
            schoolId: s.id,
            schoolName: s.name,
            type: r.type,
            summary: r.message,
            severity: String(r.severity).toLowerCase(),
            recordedAt: r.createdAt,
          }));
        })
      )
    ).flat();
    return alerts.slice(0, 80);
  }

  async dailyReport(userId: string, organizationRef: string) {
    const dash = await this.commandDashboard(userId, organizationRef);
    const schools = await this.listSchools(userId, organizationRef);
    const observations: string[] = [];
    if (dash.morningSummary.notReporting > 0) {
      observations.push(`${dash.morningSummary.notReporting} school(s) have not reported attendance today.`);
    }
    if (dash.morningSummary.notCompliant > 0) {
      observations.push(`${dash.morningSummary.notCompliant} school(s) submitted after the morning cutoff.`);
    }
    if (dash.schoolsRequiringAttention > 0) {
      observations.push(`${dash.schoolsRequiringAttention} school(s) require attention (attendance or devices).`);
    }
    if (!observations.length) observations.push('All schools in scope reported attendance data for today.');
    return {
      title: 'SHULE+ SECTOR ATTENDANCE REPORT',
      date: dash.date,
      sector: dash.sector,
      schools: dash.totalSchools,
      students: dash.totalStudents,
      studentAttendancePct: dash.attendancePercentage,
      staffAttendancePct: dash.staffAttendancePercentage,
      schoolsRequiringAttention: dash.schoolsRequiringAttention,
      schoolsNotReporting: dash.schoolsNotReporting,
      morningCompliant: dash.morningSummary.compliant,
      observations,
      schoolsDetail: schools,
    };
  }

  async notifyCritical(userId: string, organizationRef: string, officerEmail: string, phone?: string) {
    const dash = await this.commandDashboard(userId, organizationRef);
    const critical = dash.notifications.filter((n) => n.level === 'critical').slice(0, 5);
    if (!critical.length) return { sent: false, reason: 'no critical alerts' };
    const body = critical.map((n) => `${n.title}: ${n.message}`).join('\n');
    const settings = await sectorSettingsService.get(organizationRef);
    let emailed = false;
    let sms = false;
    if (settings.notificationRules?.emailEnabled !== false && notificationClient.isEnabled()) {
      await notificationClient.sendEmail({
        to: officerEmail,
        subject: `SEI critical attendance · ${dash.sector}`,
        body,
      });
      emailed = true;
    }
    if (settings.notificationRules?.smsEnabled && phone?.trim() && notificationClient.isEnabled()) {
      await notificationClient.sendSms({ to: phone.trim(), body: body.slice(0, 320) });
      sms = true;
    }
    return { sent: emailed || sms, emailed, sms };
  }

  private async getTenantMeta(organizationRef: string) {
    const tenant = await prisma.tenant.findFirst({
      where: { organizationId: organizationRef, status: 'ACTIVE' },
    });
    if (!tenant) return { sector: null, organizationName: 'SEI Workspace' };
    return tenant;
  }

  async listFollowUpCases(tenantId: string) {
    return prisma.followUpCase.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createFollowUpCase(
    tenantId: string,
    input: {
      schoolId: string;
      schoolName: string;
      issue: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      assignedTo?: string;
    }
  ) {
    const count = await prisma.followUpCase.count({ where: { tenantId } });
    const caseNumber = `SEI-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return prisma.followUpCase.create({
      data: {
        tenantId,
        caseNumber,
        schoolId: input.schoolId,
        schoolName: input.schoolName,
        issue: input.issue,
        priority: input.priority,
        assignedTo: input.assignedTo ?? 'School Manager',
        status: 'OPEN',
      },
    });
  }

  async updateFollowUpCase(
    tenantId: string,
    caseId: string,
    input: {
      status?: FollowUpStatus;
      priority?: FollowUpPriority;
      assignedTo?: string;
      issue?: string;
      comment?: string;
      followUpDate?: string;
    }
  ) {
    const existing = await prisma.followUpCase.findFirst({ where: { id: caseId, tenantId } });
    if (!existing) return null;
    const comments = Array.isArray(existing.comments) ? [...(existing.comments as object[])] : [];
    if (input.comment?.trim()) {
      comments.push({ at: new Date().toISOString(), text: input.comment.trim() });
    }
    return prisma.followUpCase.update({
      where: { id: caseId },
      data: {
        status: input.status ?? undefined,
        priority: input.priority ?? undefined,
        assignedTo: input.assignedTo ?? undefined,
        issue: input.issue ?? undefined,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
        comments,
      },
    });
  }

  async listSchoolVisits(tenantId: string) {
    return prisma.schoolVisit.findMany({ where: { tenantId }, orderBy: { startedAt: 'desc' }, take: 50 });
  }

  async startSchoolVisit(tenantId: string, schoolId: string, schoolName: string) {
    return prisma.schoolVisit.create({ data: { tenantId, schoolId, schoolName } });
  }

  async updateSchoolVisit(
    tenantId: string,
    visitId: string,
    input: {
      observations?: Record<string, unknown>;
      report?: Record<string, unknown>;
      complete?: boolean;
    }
  ) {
    const visit = await prisma.schoolVisit.findFirst({ where: { id: visitId, tenantId } });
    if (!visit) return null;
    return prisma.schoolVisit.update({
      where: { id: visitId },
      data: {
        observations: (input.observations ?? undefined) as Prisma.InputJsonValue | undefined,
        report: (input.report ?? undefined) as Prisma.InputJsonValue | undefined,
        completedAt: input.complete ? new Date() : undefined,
      },
    });
  }
}

export const sectorService = new SectorService();
