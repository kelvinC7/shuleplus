import {
  AttendanceStatus,
  CardStatus,
  DeviceSchoolLinkStatus,
  DeviceStatus,
  NotificationChannel,
  PermissionStatus,
  PermissionType,
  TapDirection,
  AlertSeverity,
  Prisma,
} from "../generated/prisma";
import { randomBytes } from "crypto";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import {
  computeAttendanceDisplay,
  lateThresholdMinutes,
  staffDepartmentFromLevel,
  staffRoleFromLevel,
} from "../utils/attendance-display.util";
import {
  fetchStudentByRfidUid,
  fetchStudentByIdentity,
  fetchSmParents,
  isStudentManagementEnabled,
  fetchStudentManagementDashboardSummary,
  lookupRfidOwner,
  type SmStudent,
  type SmParent,
} from "../clients/student-management.client";
import {
  fetchStaffByRfidUid,
  fetchStaffApprovedLeaveToday,
  countOrganizationStaffRoster,
  isStaffIntegrationEnabled,
  lookupStaffByRfidGlobally,
  type StaffMember,
  type RfidStaffHit,
} from "../clients/staff-integration.client";
import { isDisciplineIntegrationEnabled, tryDisciplinePermissionExit } from "../clients/discipline.client";
import { fetchAcademicContext } from "../clients/academic-settings.client";
import { isPresentStatus, resolvePeriod } from "../utils/attendance-period";
import { parentMisClient } from "../clients/parent-mis.client";
import { notificationClient } from "../clients/notification.client";
import { notifyStaffAttendanceTap } from "../clients/ticha-portal-push.client";
import { writeAudit } from "./seed.service";

function uniqueCodes(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean))];
}

function studentIdentityWhere(codes: string[]) {
  return {
    OR: [{ studentCode: { in: codes } }, { studentId: { in: codes } }],
  };
}

const ATTENDANCE_TZ = "Africa/Kigali";

function kigaliParts(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: ATTENDANCE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** School calendar day in Africa/Kigali, stored as UTC midnight of that Y-M-D. */
function dateOnly(d = new Date()) {
  const { year, month, day } = kigaliParts(d);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Inclusive start / exclusive end of the current Kigali calendar day (UTC instants). */
function kigaliDayBounds(d = new Date()) {
  const { year, month, day } = kigaliParts(d);
  // Kigali is UTC+2 year-round (no DST)
  const start = new Date(Date.UTC(year, month - 1, day) - 2 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function parseHm(hm: string) {
  const [h, m] = String(hm || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Current minutes since midnight in Africa/Kigali. */
function nowMinutes(d = new Date()) {
  const { hour, minute } = kigaliParts(d);
  return hour * 60 + minute;
}

/** Rwanda-safe phone key: last 9 digits (e.g. 796898894). */
function phoneKey(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 9) return digits;
  return digits.slice(-9);
}


type ScheduleSettings = {
  schoolStarts: string;
  lateStarts: string;
  schoolEnds: string;
  maxExitTime: string;
  attendanceClosingTime: string;
  enableLateDetection: boolean;
  graceMinutes?: number;
};

function resolveTapDirection(
  ctx: {
    settings: { exitOpensAt?: string | null; schoolEnds: string; maxExitTime: string };
    resolvedSchoolEnds: string;
    nowMin: number;
  },
  record: { entryTime?: Date | null; exitTime?: Date | null } | null,
  input: {
    direction?: TapDirection | string;
    device?: { direction: TapDirection } | null;
  }
): TapDirection {
  const raw = String(input.direction ?? "").toUpperCase();
  if (raw === TapDirection.ENTRY || raw === "ENTRY") return TapDirection.ENTRY;
  if (raw === TapDirection.EXIT || raw === "EXIT") return TapDirection.EXIT;

  // Already checked in → next tap is checkout (single reader or second scan)
  if (record?.entryTime && !record?.exitTime) {
    return TapDirection.EXIT;
  }

  if (input.device?.direction === TapDirection.EXIT) {
    if (!record?.entryTime) {
      const exitOpensAt = resolveExitOpensAt(ctx.settings, ctx.resolvedSchoolEnds);
      if (
        isExitWindowOpen(exitOpensAt, ctx.settings.maxExitTime, ctx.nowMin) &&
        ctx.nowMin >= parseHm(exitOpensAt)
      ) {
        return TapDirection.EXIT;
      }
      return TapDirection.ENTRY;
    }
    return TapDirection.EXIT;
  }

  if (input.device?.direction === TapDirection.ENTRY) {
    return TapDirection.ENTRY;
  }

  // Single reader: after exit opens, first tap with no entry today → checkout (dismissal)
  if (!record?.entryTime && !record?.exitTime) {
    const exitOpensAt = resolveExitOpensAt(ctx.settings, ctx.resolvedSchoolEnds);
    if (
      isExitWindowOpen(exitOpensAt, ctx.settings.maxExitTime, ctx.nowMin) &&
      ctx.nowMin >= parseHm(exitOpensAt)
    ) {
      return TapDirection.EXIT;
    }
  }

  return TapDirection.ENTRY;
}

function isEntryWindowOpen(settings: ScheduleSettings, nowMin: number) {
  const start = parseHm(settings.schoolStarts);
  const closing = parseHm(settings.attendanceClosingTime);
  const end = parseHm(settings.schoolEnds);

  if (closing > start) {
    return nowMin <= closing;
  }

  return nowMin < end;
}

const HM_RE = /^\d{2}:\d{2}$/;

function normalizeHmField(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).trim().slice(0, 5);
  return HM_RE.test(s) ? s : null;
}

/** API + HTML time inputs expect HH:mm (24h). */
export function serializeAttendanceSettings<T extends Record<string, unknown>>(row: T) {
  return {
    ...row,
    exitOpensAt: normalizeHmField(row.exitOpensAt) ?? null,
    schoolStarts: normalizeHmField(row.schoolStarts) ?? row.schoolStarts,
    lateStarts: normalizeHmField(row.lateStarts) ?? row.lateStarts,
    schoolEnds: normalizeHmField(row.schoolEnds) ?? row.schoolEnds,
    maxExitTime: normalizeHmField(row.maxExitTime) ?? row.maxExitTime,
    attendanceClosingTime:
      normalizeHmField(row.attendanceClosingTime) ?? row.attendanceClosingTime,
    weekendStart: normalizeHmField(row.weekendStart) ?? row.weekendStart,
  };
}

/** Gate checkout opens at Attendance Settings → Exit opens, else resolved school end for that person/day. */
function resolveExitOpensAt(
  settings: { exitOpensAt?: string | null; schoolEnds: string },
  resolvedSchoolEnds: string
): string {
  const custom = settings.exitOpensAt?.trim();
  if (custom && HM_RE.test(custom)) return custom;
  return resolvedSchoolEnds;
}

/** Exit taps (incl. second scan on one reader) allowed only between exit opens and latest exit. */
function isExitWindowOpen(exitOpensAt: string, maxExitTime: string, nowMin: number) {
  const opens = parseHm(exitOpensAt);
  const closes = parseHm(maxExitTime);
  if (opens <= closes) {
    return nowMin >= opens && nowMin <= closes;
  }
  // Overnight window (unusual): open after exitOpens OR before maxExit next day
  return nowMin >= opens || nowMin <= closes;
}

function formatSchoolForSms(schoolName: string): string {
  return (schoolName.trim() || "Ishuri").toLocaleUpperCase("en-US");
}

function buildBilingualSms(
  kind: "entry" | "exit" | "absent" | "permission_exit",
  studentName: string,
  timeStr: string,
  schoolName: string,
  className?: string | null
) {
  const school = formatSchoolForSms(schoolName);
  if (kind === "entry") {
    return (
      `ShulePlus : ${school}: Umwana wawe ${studentName} yageze ku ishuri saa ${timeStr}. Yinjiye akoresheje ShuleCard.\n` +
      `English: Your child ${studentName} arrived at ${school} at ${timeStr} using ShuleCard.`
    );
  }
  if (kind === "exit") {
    return (
      `ShulePlus : ${school}: Umwana wawe ${studentName} yasohotse ku ishuri saa ${timeStr}. Yifashishije ShuleCard.\n` +
      `English: Your child ${studentName} left ${school} at ${timeStr} using ShuleCard.`
    );  
  }
  if (kind === "permission_exit") {
    return (
      `ShulePlus : ${school}: Umwana wawe ${studentName} yasohotse ku ishuri saa ${timeStr} kubera uruhushya rwemewe.\n` +
      `English: Your child ${studentName} left ${school} at ${timeStr} under approved permission.`
    );
  }
  const classSuffix = className ? ` (${className})` : "";
  return (
    `ShulePlus : ${school}: Umwana wawe ${studentName} ntiyaje ku ishuri uyu munsi${classSuffix}. Hamagara ishuri niba bitari bisanzwe.\n` +
    `English: Your child ${studentName} was absent from ${school} today${classSuffix}. Please contact the school if unexpected.`
  );
}

function buildBilingualParentMessage(
  kind: "entry" | "exit" | "absent" | "permission_exit",
  studentName: string,
  dateStr: string,
  timeStr: string,
  schoolName: string,
  className?: string | null
) {
  const school = schoolName.trim() || "Ishuri";
  const cls = className || "N/A";
  if (kind === "entry") {
    return (
      `ShulePlus : ${school}: Umwana wawe ${studentName} yageze ku ishuri saa ${timeStr} (${dateStr}, ${cls}). Yinjiye akoresheje ShuleCard. ` +
      `English: Your child ${studentName} arrived at ${school} at ${timeStr} on ${dateStr} using ShuleCard.`
    );
  }
  if (kind === "exit") {
    return (
      `ShulePlus : ${school}: Umwana wawe ${studentName} yasohotse ku ishuri saa ${timeStr} (${dateStr}). Yifashishije ShuleCard. ` +
      `English: Your child ${studentName} left ${school} at ${timeStr} on ${dateStr} using ShuleCard.`
    );
  }
  if (kind === "permission_exit") {
    return (
      `ShulePlus : ${school}: Umwana wawe ${studentName} yasohotse saa ${timeStr} (${dateStr}) kubera uruhushya rwemewe. ` +
      `English: Your child ${studentName} left ${school} at ${timeStr} on ${dateStr} under approved permission.`
    );
  }
  return (
    `ShulePlus : ${school}: Umwana wawe ${studentName} ntiyaje ku ishuri ku itariki ${dateStr} (${cls}). Hamagara ishuri niba bitari bisanzwe. ` +
    `English: Your child ${studentName} was marked absent from ${school} on ${dateStr}. Please contact the school if unexpected.`
  );
}

function gateReasonFromError(statusCode: number, message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already checked in")) return "ALREADY_CHECKED_IN";
  if (lower.includes("already checked out")) return "ALREADY_CHECKED_OUT";
  if (lower.includes("entry window closed")) return "ENTRY_CLOSED";
  if (lower.includes("exit not open")) return "EXIT_NOT_OPEN";
  if (lower.includes("exit window closed")) return "EXIT_CLOSED";
  const reasonByCode: Record<number, string> = {
    404: "UNKNOWN_CARD",
    403: "ACCESS_DENIED",
    429: "DUPLICATE_TAP",
    400: "REJECTED",
  };
  return reasonByCode[statusCode] ?? "REJECTED";
}

export function generateDeviceApiKey() {
  return `att_${randomBytes(16).toString("hex")}`;
}

export async function getOrCreateSettings(organizationId: string) {
  const settings = await prisma.attendanceSettings.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId, enableSms: true },
  });

  // Keep year/term (and school name when empty) aligned with Org Admin Academic Settings
  try {
    const academic = await fetchAcademicContext(organizationId);
    const tenant = await prisma.tenant.findFirst({
      where: { organizationId },
      select: { organizationName: true },
    });
    const nextYear = academic.currentAcademicYear ?? settings.academicYear;
    const nextTerm = academic.currentTerm ?? settings.term;
    const nextSchool =
      settings.schoolName?.trim() && settings.schoolName !== "School"
        ? settings.schoolName
        : tenant?.organizationName ?? settings.schoolName;

    if (
      nextYear !== settings.academicYear ||
      nextTerm !== settings.term ||
      nextSchool !== settings.schoolName
    ) {
      const synced = await prisma.attendanceSettings.update({
        where: { organizationId },
        data: {
          academicYear: nextYear,
          term: nextTerm,
          ...(nextSchool ? { schoolName: nextSchool } : {}),
        },
      });
      return serializeAttendanceSettings(synced) as typeof synced;
    }
  } catch {
    /* IAM optional */
  }

  return serializeAttendanceSettings(settings) as typeof settings;
}

/** Super Admin / service: ensure gate SMS channel is on for this school. */
export async function enableAttendanceSmsChannel(organizationId: string) {
  await getOrCreateSettings(organizationId);
  return prisma.attendanceSettings.update({
    where: { organizationId },
    data: { enableSms: true },
  });
}

export async function updateSettings(organizationId: string, body: Record<string, unknown>) {
  await getOrCreateSettings(organizationId);
  const updated = await prisma.attendanceSettings.update({
    where: { organizationId },
    data: {
      ...(body.enableEntry !== undefined ? { enableEntry: Boolean(body.enableEntry) } : {}),
      ...(body.enableExit !== undefined ? { enableExit: Boolean(body.enableExit) } : {}),
      ...(body.enableLateDetection !== undefined
        ? { enableLateDetection: Boolean(body.enableLateDetection) }
        : {}),
      ...(body.enableParentNotify !== undefined
        ? { enableParentNotify: Boolean(body.enableParentNotify) }
        : {}),
      ...(body.enableSms !== undefined ? { enableSms: Boolean(body.enableSms) } : {}),
      ...(body.enableEmail !== undefined ? { enableEmail: Boolean(body.enableEmail) } : {}),
      ...(body.enableWhatsapp !== undefined ? { enableWhatsapp: Boolean(body.enableWhatsapp) } : {}),
      ...(body.enablePush !== undefined ? { enablePush: Boolean(body.enablePush) } : {}),
      ...(body.enableWeekend !== undefined ? { enableWeekend: Boolean(body.enableWeekend) } : {}),
      ...(body.enableHoliday !== undefined ? { enableHoliday: Boolean(body.enableHoliday) } : {}),
      ...(body.enableTeacherNotify !== undefined
        ? { enableTeacherNotify: Boolean(body.enableTeacherNotify) }
        : {}),
      ...(body.enableAutoReports !== undefined
        ? { enableAutoReports: Boolean(body.enableAutoReports) }
        : {}),
      ...(body.schoolStarts !== undefined ? { schoolStarts: String(body.schoolStarts) } : {}),
      ...(body.lateStarts !== undefined ? { lateStarts: String(body.lateStarts) } : {}),
      ...(body.schoolEnds !== undefined ? { schoolEnds: String(body.schoolEnds) } : {}),
      ...(body.exitOpensAt !== undefined
        ? { exitOpensAt: normalizeHmField(body.exitOpensAt) }
        : {}),
      ...(body.maxExitTime !== undefined ? { maxExitTime: String(body.maxExitTime) } : {}),
      ...(body.weekendStart !== undefined ? { weekendStart: String(body.weekendStart) } : {}),
      ...(body.attendanceClosingTime !== undefined
        ? { attendanceClosingTime: String(body.attendanceClosingTime) }
        : {}),
      ...(body.graceMinutes !== undefined ? { graceMinutes: Number(body.graceMinutes) } : {}),
      ...(body.academicYear !== undefined ? { academicYear: String(body.academicYear) } : {}),
      ...(body.term !== undefined ? { term: String(body.term) } : {}),
      ...(body.schoolName !== undefined ? { schoolName: String(body.schoolName) } : {}),
    },
  });
  return serializeAttendanceSettings(updated) as typeof updated;
}

function resolveEntryStatus(settings: ScheduleSettings, at: Date = new Date(), isStaff = false) {
  if (!settings.enableLateDetection) return AttendanceStatus.PRESENT;
  const now = nowMinutes(at);
  const threshold = lateThresholdMinutes(
    {
      schoolStarts: settings.schoolStarts,
      lateStarts: settings.lateStarts,
      schoolEnds: settings.schoolEnds,
      attendanceClosingTime: settings.attendanceClosingTime,
      graceMinutes: settings.graceMinutes ?? 0,
      enableLateDetection: settings.enableLateDetection,
    },
    isStaff
  );
  if (now <= threshold) return AttendanceStatus.PRESENT;
  return AttendanceStatus.LATE;
}

async function queueParentNotify(
  organizationId: string,
  studentName: string,
  studentId: string | null | undefined,
  kind: "entry" | "exit" | "absent" | "permission_exit",
  when: Date,
  className?: string | null,
  extra?: {
    studentCode?: string | null;
    cardNumber?: string | null;
    gateName?: string | null;
    status?: string | null;
  }
): Promise<{ status: "SENT" | "FAILED" | "SKIPPED"; detail: string; phones: number }> {
  let settings = await getOrCreateSettings(organizationId);
  const sendParentApp = settings.enableParentNotify;

  // Parent Super Admin "SMS On" is the consent control. Org enableSms must be on for gate SMS.
  // Heal older tenants that still have enableSms=false (historical default).
  if (!settings.enableSms) {
    settings = await prisma.attendanceSettings.update({
      where: { organizationId },
      data: { enableSms: true },
    });
  }
  const sendSms = settings.enableSms;
  if (!sendParentApp && !sendSms) {
    return { status: "SKIPPED", detail: "Parent notifications disabled in settings", phones: 0 };
  }

  const tenant = await prisma.tenant.findFirst({
    where: { organizationId },
    select: { organizationName: true },
  });
  const schoolName = (settings.schoolName || tenant?.organizationName || "Ishuri").trim();

  const dateStr = when.toLocaleDateString("en-GB", {
    timeZone: ATTENDANCE_TZ,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeStr = when.toLocaleTimeString("en-GB", {
    timeZone: ATTENDANCE_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const message = buildBilingualParentMessage(kind, studentName, dateStr, timeStr, schoolName, className);
  const smsBody = buildBilingualSms(kind, studentName, timeStr, schoolName, className);

  const title =
    kind === "entry"
      ? "Student Arrival"
      : kind === "exit"
        ? "Student Departure"
        : kind === "permission_exit"
          ? "Permission Exit"
          : "Student Absent";

  // One SMS blast per student per kind per school day (blocks spam from retries / multi-parent dupes)
  const { start: dayStart, end: dayEnd } = kigaliDayBounds(when);
  const alreadySentToday = await prisma.parentNotification.findFirst({
    where: {
      organizationId,
      studentName: { equals: studentName, mode: "insensitive" },
      channel: NotificationChannel.SMS,
      title,
      status: "SENT",
      sentAt: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true },
  });
  if (alreadySentToday && sendSms) {
    return {
      status: "SENT",
      detail: "SMS already sent for this student today",
      phones: 0,
    };
  }

  async function logSmsOutcome(status: "SENT" | "FAILED" | "SKIPPED", detail: string) {
    try {
      await prisma.parentNotification.create({
        data: {
          organizationId,
          studentName,
          channel: NotificationChannel.SMS,
          title,
          message: detail,
          sentAt: new Date(),
          status,
        },
      });
    } catch {
      /* ignore */
    }
  }

  let resolvedStudentId = studentId ?? null;
  let smParents: SmParent[] = [];

  if (isStudentManagementEnabled()) {
    if (resolvedStudentId) {
      smParents = await fetchSmParents(organizationId, resolvedStudentId);
    }
    // Fallback: resolve student by code or RFID when card.studentId is missing/stale
    if (!smParents.length) {
      const identity = extra?.studentCode || resolvedStudentId || extra?.cardNumber;
      if (identity) {
        const student =
          (extra?.cardNumber
            ? await fetchStudentByRfidUid(organizationId, extra.cardNumber)
            : null) ??
          (await fetchStudentByIdentity(organizationId, String(identity)));
        if (student) {
          resolvedStudentId = student.id;
          smParents = await fetchSmParents(organizationId, student.id);
          // Last resort: student roster parent phone
          if (!smParents.length && student.parentPhone) {
            smParents = [
              {
                id: `roster-${student.id}`,
                fullName: student.parentName || "Parent",
                phone: student.parentPhone,
                smsEnabled: true,
              },
            ];
          }
        }
      }
    }
  }

  // Never blast all school parents — SM list must be scoped to one student
  if (smParents.length > 5) {
    console.warn(
      `[Attendance] Truncating SMS list from ${smParents.length} to first 5 parents for ${studentName}`
    );
    smParents = smParents.slice(0, 5);
  }

  const localParentWhere: {
    organizationId: string;
    deletedAt: null;
    OR?: Array<Record<string, unknown>>;
  } = {
    organizationId,
    deletedAt: null,
  };
  if (resolvedStudentId || extra?.studentCode) {
    localParentWhere.OR = [
      ...(resolvedStudentId ? [{ studentId: resolvedStudentId }] : []),
      ...(extra?.studentCode ? [{ studentCode: extra.studentCode }] : []),
    ];
  } else {
    localParentWhere.OR = [{ studentName: { equals: studentName, mode: "insensitive" as const } }];
  }

  const localParents = await prisma.parentContact.findMany({ where: localParentWhere });

  const localParentIds = new Set(localParents.map((p) => p.id));
  const smsPhonesSent = new Set<string>();
  let sentCount = 0;
  let failCount = 0;
  let lastError = "";

  async function sendSmsToPhone(phone: string, parentId?: string | null) {
    const key = phoneKey(phone);
    if (!key || smsPhonesSent.has(key)) return;
    smsPhonesSent.add(key);

    try {
      const res = await notificationClient.sendSms({
        to: phone,
        body: smsBody,
        metadata: {
          type: "attendance",
          kind,
          studentId: resolvedStudentId,
          studentName,
          organizationId,
          parentId: parentId ?? null,
          schoolName,
        },
      });

      const delivered = Boolean(res?.delivered);
      if (delivered) sentCount += 1;
      else {
        failCount += 1;
        lastError = "SMS provider did not confirm delivery";
      }

      // parentId must be Attendance ParentContact id (FK). Never pass SM/roster ids.
      const safeParentId = parentId && localParentIds.has(parentId) ? parentId : undefined;

      await prisma.parentNotification.create({
        data: {
          organizationId,
          parentId: safeParentId,
          studentName,
          channel: NotificationChannel.SMS,
          title,
          message: smsBody,
          sentAt: new Date(),
          status: delivered ? "SENT" : "FAILED",
        },
      });
    } catch (err) {
      failCount += 1;
      lastError = err instanceof Error ? err.message : "SMS send failed";
      console.warn(`[Attendance] SMS failed for ${phone}:`, lastError);
      try {
        const safeParentId = parentId && localParentIds.has(parentId) ? parentId : undefined;
        await prisma.parentNotification.create({
          data: {
            organizationId,
            parentId: safeParentId,
            studentName,
            channel: NotificationChannel.SMS,
            title,
            message: smsBody,
            sentAt: new Date(),
            status: "FAILED",
          },
        });
      } catch {
        /* ignore log insert errors */
      }
    }
  }

  if (sendSms && notificationClient.isEnabled()) {
    for (const parent of smParents) {
      if (!parent.phone || parent.smsEnabled === false) continue;
      await sendSmsToPhone(parent.phone, parent.id);
    }

    for (const p of localParents) {
      if (!p.phone || !p.notifySms) continue;
      await sendSmsToPhone(p.phone, p.id);
    }

    if (smsPhonesSent.size === 0) {
      console.warn(
        `[Attendance] No SMS recipients for ${studentName} (${resolvedStudentId ?? "no-id"}) - check parent phone + SMS On`
      );
      await logSmsOutcome("SKIPPED", "No parent with SMS On and a phone number");
      return {
        status: "SKIPPED",
        detail: "No parent with SMS On and a phone number",
        phones: 0,
      };
    }
  } else if (sendSms) {
    console.warn("[Attendance] SMS enabled but NOTIFICATION_SERVICE_URL is not configured");
    await logSmsOutcome("FAILED", "Notification service not configured");
    return {
      status: "FAILED",
      detail: "Notification service not configured",
      phones: 0,
    };
  }

  if (sendParentApp) {
    const eventType = kind === "entry" ? "RFID_ENTRY" : kind === "exit" ? "RFID_EXIT" : "ABSENT";
    const notification = await parentMisClient.ingestAttendanceEvent({
      organizationId,
      studentId: resolvedStudentId,
      studentCode: extra?.studentCode ?? resolvedStudentId,
      studentName,
      title,
      body: message.replace(/\n+/g, " ").trim(),
      eventType,
      priority: kind === "absent" ? "IMPORTANT" : "NORMAL",
      link: "/attendance",
      metadata: {
        kind,
        className: className || null,
        cardNumber: extra?.cardNumber ?? null,
        gateName: extra?.gateName ?? null,
        status: extra?.status ?? null,
        schoolName,
        at: when.toISOString(),
      },
    });
    if (notification?.matched === 0) {
      console.warn(`[Attendance] No ParentMIS recipients matched for ${studentName} (${extra?.studentCode ?? resolvedStudentId})`);
    }
  }

  if (!sendSms) {
    return { status: "SKIPPED", detail: "SMS disabled in settings", phones: 0 };
  }
  if (sentCount > 0 && failCount === 0) {
    return { status: "SENT", detail: `SMS sent to ${sentCount} parent(s)`, phones: sentCount };
  }
  if (sentCount > 0) {
    return {
      status: "SENT",
      detail: `SMS sent to ${sentCount}; ${failCount} failed`,
      phones: sentCount,
    };
  }
  return {
    status: "FAILED",
    detail: lastError || "SMS not delivered",
    phones: 0,
  };
}

export async function dashboard(organizationId: string) {
  const today = dateOnly();
  const [
    totalCards,
    activeCards,
    lostCards,
    blockedCards,
    expiredCards,
    pendingCards,
    devicesOnline,
    devicesOffline,
    todayRecords,
    pendingPermissions,
    alerts,
    settings,
    enrolledStudentCount,
    enrolledStaffCount,
    studentManagementSummary,
    staffRosterCount,
  ] = await Promise.all([
    prisma.rfidCard.count({ where: { organizationId, deletedAt: null } }),
    prisma.rfidCard.count({ where: { organizationId, deletedAt: null, status: CardStatus.ACTIVE } }),
    prisma.rfidCard.count({ where: { organizationId, deletedAt: null, status: CardStatus.LOST } }),
    prisma.rfidCard.count({ where: { organizationId, deletedAt: null, status: CardStatus.BLOCKED } }),
    prisma.rfidCard.count({ where: { organizationId, deletedAt: null, status: CardStatus.EXPIRED } }),
    prisma.rfidCard.count({ where: { organizationId, deletedAt: null, status: CardStatus.PENDING } }),
    prisma.rfidDevice.count({ where: { organizationId, deletedAt: null, status: DeviceStatus.ONLINE } }),
    prisma.rfidDevice.count({ where: { organizationId, deletedAt: null, status: DeviceStatus.OFFLINE } }),
    prisma.attendanceRecord.findMany({ where: { organizationId, lessonDate: today } }),
    prisma.permissionRequest.count({
      where: { organizationId, status: PermissionStatus.PENDING },
    }),
    prisma.securityAlert.count({ where: { organizationId, resolved: false } }),
    getOrCreateSettings(organizationId),
    countEnrolledPeople(organizationId, "STUDENT"),
    countEnrolledPeople(organizationId, "STAFF"),
    isStudentManagementEnabled()
      ? fetchStudentManagementDashboardSummary(organizationId)
      : Promise.resolve(null),
    isStaffIntegrationEnabled()
      ? countOrganizationStaffRoster(organizationId)
      : Promise.resolve(0),
  ]);

  const isStaffRecord = (level: string | null | undefined) => Boolean(level?.startsWith("STAFF:"));
  const studentToday = todayRecords.filter((r) => !isStaffRecord(r.level));
  const staffToday = todayRecords.filter((r) => isStaffRecord(r.level));

  const summarizeDay = (rows: typeof todayRecords) => {
    const attended = new Set<string>();
    const entries = new Set<string>();
    const late = new Set<string>();
    const inside = new Set<string>();
    const exited = new Set<string>();
    for (const r of rows) {
      const key = attendancePersonKey(r);
      const hasEntry = Boolean(r.entryTime);
      const hasExit = Boolean(r.exitTime);
      if (hasEntry || hasExit) attended.add(key);
      if (hasEntry) entries.add(key);
      if (hasExit) exited.add(key);
      if (r.status === AttendanceStatus.LATE) late.add(key);
      if (hasEntry && !hasExit) inside.add(key);
    }
    const attendedCount = attended.size;
    return {
      attended: attendedCount,
      entries: entries.size,
      onTimePresent: Math.max(0, attendedCount - late.size),
      late: late.size,
      inside: inside.size,
      exited: exited.size,
    };
  };

  const studentSummary = summarizeDay(studentToday);
  const staffSummary = summarizeDay(staffToday);

  const smStudentTotal = studentManagementSummary?.studentCount ?? 0;
  const enrolledStudents =
    smStudentTotal > 0 ? smStudentTotal : enrolledStudentCount;
  const staffRosterTotal = staffRosterCount;
  const enrolledStaff =
    staffRosterTotal > 0 ? staffRosterTotal : enrolledStaffCount;
  const present = studentSummary.attended;
  const studentEntries = studentSummary.entries;
  const late = studentSummary.late;
  const absent = Math.max(0, enrolledStudents - present);
  const exited = studentSummary.exited;
  const inside = studentSummary.inside;
  const onTimePresent = studentSummary.onTimePresent;

  const staffPresent = staffSummary.attended;
  const staffLate = staffSummary.late;
  const staffInside = staffSummary.inside;
  const staffExited = staffSummary.exited;

  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(today);
  dayEnd.setHours(23, 59, 59, 999);

  const [smsSentToday, smsFailedToday] = await Promise.all([
    prisma.parentNotification.count({
      where: {
        organizationId,
        channel: NotificationChannel.SMS,
        status: "SENT",
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.parentNotification.count({
      where: {
        organizationId,
        channel: NotificationChannel.SMS,
        status: "FAILED",
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    }),
  ]);

  const recentTaps = [...todayRecords]
    .sort((a, b) => {
      const ta = a.entryTime ?? a.exitTime ?? a.createdAt;
      const tb = b.entryTime ?? b.exitTime ?? b.createdAt;
      return tb.getTime() - ta.getTime();
    })
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      studentName: r.studentName,
      studentCode: r.studentCode,
      className: r.className,
      status: r.status,
      direction: r.direction,
      entryTime: r.entryTime?.toISOString() ?? null,
      exitTime: r.exitTime?.toISOString() ?? null,
      lessonDate: r.lessonDate.toISOString().slice(0, 10),
      personType: isStaffRecord(r.level) ? ("STAFF" as const) : ("STUDENT" as const),
    }));

  const rate = dailyAttendanceRatePercent(present, enrolledStudents);
  const staffRate = dailyAttendanceRatePercent(staffPresent, enrolledStaff);

  return {
    organizationName: settings.schoolName || "School",
    academicYear: settings.academicYear,
    term: settings.term,
    kpis: {
      totalCards,
      activeCards,
      lostCards,
      blockedCards,
      expiredCards,
      pendingCards,
      present,
      studentEntries,
      onTimePresent,
      late,
      absent,
      exited,
      inside,
      enrolledStudents,
      enrolledStudentsRoster: smStudentTotal,
      enrolledStudentCards: enrolledStudentCount,
      enrolledStaff,
      enrolledStaffRoster: staffRosterTotal,
      enrolledStaffCards: enrolledStaffCount,
      staffPresent,
      staffLate,
      staffInside,
      staffExited,
      staffTaps: staffToday.length,
      pendingPermissions,
      devicesOnline,
      devicesOffline,
      securityAlerts: alerts,
      attendanceRate: rate,
      staffAttendanceRate: staffRate,
      smsSentToday,
      smsFailedToday,
    },
    recentTaps,
  };
}

export async function liveMonitor(
  organizationId: string,
  query?: {
    date?: string;
    from?: string;
    to?: string;
    academicYear?: string;
    term?: string;
    className?: string;
    q?: string;
    personType?: string;
  }
) {
  const data = await dashboard(organizationId);
  const academic = await fetchAcademicContext(organizationId);
  const period = resolvePeriod(query, academic);
  const isSingleDay = period.from === period.to;
  const movementLimit = isSingleDay ? 80 : 200;
  const [devicesRaw, permissions, alerts, movementListed, recentSms] = await Promise.all([
    prisma.rfidDevice.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.permissionRequest.findMany({
      where: { organizationId, status: PermissionStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.securityAlert.findMany({
      where: { organizationId, resolved: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    listAttendance(organizationId, {
      ...(isSingleDay ? { date: period.from } : { from: period.from, to: period.to }),
      className: query?.className,
      q: query?.q,
      personType: query?.personType,
    }).then((rows) => rows.slice(0, movementLimit)),
    prisma.parentNotification.findMany({
      where: { organizationId, channel: NotificationChannel.SMS },
      orderBy: { sentAt: "desc" },
      take: 80,
    }),
  ]);
  const devices = await syncDevicePresence(devicesRaw);
  const { enrichMovementRecords } = await import("./people.service");
  const movementSerialized = await serializeAttendanceRecordsForApi(organizationId, movementListed);
  const movementEnriched = await enrichMovementRecords(organizationId, movementListed);
  const movement = movementEnriched.map((row, index) => ({
    ...row,
    ...movementSerialized[index],
    personType:
      movementSerialized[index]?.personType ??
      (row.level?.startsWith("STAFF:") ? ("STAFF" as const) : ("STUDENT" as const)),
  }));

  const smsByStudent = new Map<string, { status: string; detail: string; sentAt: string }>();
  for (const n of recentSms) {
    const key = n.studentName.trim().toLowerCase();
    if (smsByStudent.has(key)) continue;
    smsByStudent.set(key, {
      status: n.status,
      detail: n.message || n.title,
      sentAt: (n.sentAt ?? n.createdAt ?? new Date()).toISOString(),
    });
  }

  const movementWithSms = movement.map((m) => {
    const sms = smsByStudent.get(m.studentName.trim().toLowerCase());
    return sms ? { ...m, parentSms: sms } : m;
  });

  return {
    ...data,
    devices,
    permissions,
    alerts,
    movement: movementWithSms,
    refreshedAt: new Date().toISOString(),
    filterPeriod: period.label,
  };
}

/** Devices with no heartbeat for this long are shown Offline (must be > heartbeat interval). */
const DEVICE_ONLINE_WINDOW_MS = 75 * 1000;

function presenceStatus(lastSeenAt: Date | null | undefined, current: DeviceStatus): DeviceStatus {
  if (current === DeviceStatus.DISABLED) return DeviceStatus.DISABLED;
  if (!lastSeenAt) return DeviceStatus.OFFLINE;
  return Date.now() - lastSeenAt.getTime() <= DEVICE_ONLINE_WINDOW_MS
    ? DeviceStatus.ONLINE
    : DeviceStatus.OFFLINE;
}

async function syncDevicePresence<T extends { id: string; status: DeviceStatus; lastSeenAt: Date | null }>(
  devices: T[]
): Promise<T[]> {
  const updates: Promise<unknown>[] = [];
  const next = devices.map((d) => {
    const status = presenceStatus(d.lastSeenAt, d.status);
    if (status !== d.status && d.status !== DeviceStatus.DISABLED) {
      updates.push(
        prisma.rfidDevice.update({
          where: { id: d.id },
          data: { status },
        })
      );
    }
    return { ...d, status };
  });
  if (updates.length) await Promise.all(updates);
  return next;
}


/* ─── Cards ─────────────────────────────────────────────── */

export async function listCards(
  organizationId: string,
  query?: { status?: string; q?: string; page?: number; limit?: number }
) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
  const where = {
    organizationId,
    deletedAt: null as null,
    ...(query?.status ? { status: query.status as CardStatus } : {}),
    ...(query?.q
      ? {
          OR: [
            { cardNumber: { contains: query.q, mode: "insensitive" as const } },
            { studentName: { contains: query.q, mode: "insensitive" as const } },
            { studentCode: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, data] = await Promise.all([
    prisma.rfidCard.count({ where }),
    prisma.rfidCard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function createCard(
  organizationId: string,
  input: {
    cardNumber: string;
    studentId?: string;
    studentCode?: string;
    studentName?: string;
    className?: string;
    level?: string;
    isTemporary?: boolean;
    expiresAt?: string;
    activate?: boolean;
  },
  actorUserId?: string
) {
  const cardNumber = input.cardNumber.trim().toUpperCase();
  if (!cardNumber) throw new AppError(400, "cardNumber is required");

  const dup = await prisma.rfidCard.findFirst({
    where: { organizationId, cardNumber, deletedAt: null },
  });
  if (dup) throw new AppError(409, "Duplicate card number detected");

  const status = input.activate === false ? CardStatus.PENDING : CardStatus.ACTIVE;
  const card = await prisma.rfidCard.create({
    data: {
      organizationId,
      cardNumber,
      uid: cardNumber,
      studentId: input.studentId || input.studentCode,
      studentCode: input.studentCode,
      studentName: input.studentName,
      className: input.className,
      level: input.level,
      isTemporary: Boolean(input.isTemporary),
      status: input.isTemporary ? CardStatus.TEMPORARY : status,
      issuedAt: new Date(),
      activatedAt: status === CardStatus.ACTIVE || input.isTemporary ? new Date() : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      qrPayload: `RFID:${cardNumber}|STUDENT:${input.studentCode || input.studentId || ""}`,
    },
  });

  await prisma.cardHistory.create({
    data: {
      organizationId,
      cardId: card.id,
      action: "REGISTERED",
      detail: `Card ${cardNumber} registered`,
      actorUserId,
    },
  });
  await writeAudit(organizationId, "card.register", {
    actorUserId,
    entityType: "card",
    entityId: card.id,
  });
  return card;
}

export async function bulkCreateCards(
  organizationId: string,
  rows: Array<Record<string, unknown>>,
  actorUserId?: string
) {
  const created = [];
  const errors: Array<{ row: number; message: string }> = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const card = await createCard(
        organizationId,
        {
          cardNumber: String(r.cardNumber ?? r.card_number ?? ""),
          studentCode: (r.studentCode ?? r.student_code) as string | undefined,
          studentName: (r.studentName ?? r.student_name) as string | undefined,
          className: (r.className ?? r.class_name) as string | undefined,
          level: r.level as string | undefined,
          activate: true,
        },
        actorUserId
      );
      created.push(card);
    } catch (e) {
      errors.push({
        row: i + 1,
        message: e instanceof AppError ? e.message : "Failed",
      });
    }
  }
  return { imported: created.length, failed: errors.length, errors, data: created };
}

export async function updateCardStatus(
  organizationId: string,
  id: string,
  status: CardStatus,
  reason?: string,
  actorUserId?: string
) {
  const card = await prisma.rfidCard.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!card) throw new AppError(404, "Card not found");

  const data: Record<string, unknown> = { status };
  if (status === CardStatus.BLOCKED) {
    data.blockedAt = new Date();
    data.blockedReason = reason;
  }
  if (status === CardStatus.LOST) data.lostAt = new Date();
  if (status === CardStatus.ACTIVE) data.activatedAt = new Date();

  const updated = await prisma.rfidCard.update({ where: { id }, data });
  await prisma.cardHistory.create({
    data: {
      organizationId,
      cardId: id,
      action: status,
      detail: reason || `Status → ${status}`,
      actorUserId,
    },
  });
  return updated;
}

export async function requestCardReplacement(
  organizationId: string,
  oldCardId: string,
  reason?: string,
  requestedBy?: string
) {
  const old = await prisma.rfidCard.findFirst({
    where: { id: oldCardId, organizationId, deletedAt: null },
  });
  if (!old) throw new AppError(404, "Card not found");
  await updateCardStatus(organizationId, oldCardId, CardStatus.LOST, reason || "Replacement requested");
  return prisma.cardReplacement.create({
    data: {
      organizationId,
      oldCardId,
      reason,
      requestedBy,
      status: "PENDING",
    },
  });
}

export async function listReplacements(organizationId: string) {
  return prisma.cardReplacement.findMany({
    where: { organizationId },
    include: { oldCard: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function cardHistory(organizationId: string, cardId: string) {
  return prisma.cardHistory.findMany({
    where: { organizationId, cardId },
    orderBy: { createdAt: "desc" },
  });
}

/* ─── Devices ───────────────────────────────────────────── */

async function resolveDeviceByApiKey(apiKey: string) {
  const key = apiKey.trim();
  if (!key) throw new AppError(401, "Missing API key");

  const device = await prisma.rfidDevice.findFirst({
    where: { apiKey: key, deletedAt: null },
  });
  if (!device) throw new AppError(401, "Invalid API key");
  if (device.status === DeviceStatus.DISABLED) throw new AppError(403, "Device is disabled");
  return device;
}

function deviceCodePrefix(organizationCode?: string) {
  return (
    String(organizationCode ?? "GATE")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase() || "GATE"
  );
}

/** UUID + legacy rows stored under organization_code (e.g. 23001). */
function organizationIdAliases(canonicalId: string, organizationCode?: string): string[] {
  return [...new Set([canonicalId, organizationCode?.trim()].filter(Boolean))] as string[];
}

async function expandAliasesFromDevicePrefix(aliases: string[], organizationCode?: string) {
  const prefix = deviceCodePrefix(organizationCode);
  const legacy = await prisma.rfidDevice.findMany({
    where: { deviceCode: { startsWith: `${prefix}_` } },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });
  return [...new Set([...aliases, ...legacy.map((r) => r.organizationId)])];
}

async function resolveOrganizationAliases(organizationId: string, organizationCode?: string) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ organizationId }, { organizationCode: organizationId }],
      status: "ACTIVE",
    },
    select: { organizationId: true, organizationCode: true },
  });
  const canonicalId = tenant?.organizationId ?? organizationId;
  const orgCode = organizationCode?.trim() || tenant?.organizationCode || undefined;
  const baseAliases = organizationIdAliases(canonicalId, orgCode);
  const aliases = await expandAliasesFromDevicePrefix(baseAliases, orgCode);
  return { canonicalId, aliases, organizationCode: orgCode };
}

function whereDeviceCodeAcrossSchool(aliases: string[], deviceCode: string) {
  return {
    deviceCode,
    OR: aliases.map((organizationId) => ({ organizationId })),
  };
}

/** Same device_code must not exist under any organization_id (legacy drift used duplicate org keys). */
async function findDeviceByCodeGlobal(deviceCode: string) {
  return prisma.rfidDevice.findFirst({
    where: { deviceCode },
  });
}

export async function getDeviceConfig(apiKey: string) {
  const device = await resolveDeviceByApiKey(apiKey);

  // Scale offline tap buffer to school size (registered student/staff cards).
  // *2 covers entry+exit the same day while offline; clamp for small/large schools.
  const registeredPeople = await prisma.rfidCard.count({
    where: {
      organizationId: device.organizationId,
      deletedAt: null,
      status: { in: [CardStatus.ACTIVE, CardStatus.PENDING] },
    },
  });
  const offlineQueueCapacity = Math.min(
    5000,
    Math.max(800, registeredPeople * 2 + 200)
  );

  return {
    deviceId: device.deviceCode,
    name: device.name,
    wifiSsid: device.wifiSsid ?? "",
    wifiPassword: device.wifiPassword ?? "",
    gateUrl: "https://attendance-api.shuleplus.rw/api/gate_attendance",
    gateBatchUrl: "https://attendance-api.shuleplus.rw/api/gate_attendance/batch",
    configUrl: "https://attendance-api.shuleplus.rw/api/device_config",
    heartbeatUrl: "https://attendance-api.shuleplus.rw/api/device_heartbeat",
    registeredPeople,
    /** Max taps the gate may store offline before dropping oldest. */
    offlineQueueCapacity,
  };
}

export async function deviceHeartbeat(
  apiKey: string,
  input: { ip?: string; rssi?: number | null }
) {
  const device = await resolveDeviceByApiKey(apiKey);
  const rssi =
    typeof input.rssi === "number" && Number.isFinite(input.rssi) ? Math.round(input.rssi) : null;

  const updated = await prisma.rfidDevice.update({
    where: { id: device.id },
    data: {
      status: DeviceStatus.ONLINE,
      lastSeenAt: new Date(),
      ...(rssi !== null ? { signalQuality: `${rssi} dBm` } : {}),
    },
  });

  return {
    deviceId: updated.deviceCode,
    status: updated.status,
    ip: input.ip ?? null,
    rssi,
  };
}

function normalizeKeyPart(value: unknown) {
  const s = String(value ?? "").trim();
  return s || null;
}
function normalizeEmailKey(value: unknown) {
  const s = normalizeKeyPart(value);
  return s ? s.toLowerCase() : null;
}

async function ensurePrimaryDeviceLink(deviceId: string, organizationId: string) {
  await prisma.rfidDeviceSchool.upsert({
    where: { deviceId_organizationId: { deviceId, organizationId } },
    create: { deviceId, organizationId, isPrimary: true, status: DeviceSchoolLinkStatus.ACTIVE },
    update: { isPrimary: true, status: DeviceSchoolLinkStatus.ACTIVE },
  });
}

async function getDeviceAllowedOrganizationIds(device: { id: string; organizationId: string }) {
  const links = await prisma.rfidDeviceSchool.findMany({
    where: { deviceId: device.id, status: DeviceSchoolLinkStatus.ACTIVE },
    select: { organizationId: true, isPrimary: true },
  });
  const ids = new Set<string>([device.organizationId]);
  for (const l of links) ids.add(l.organizationId);
  return [...ids];
}

async function getDeviceAllowedOrganizations(deviceId: string) {
  const device = await prisma.rfidDevice.findUnique({
    where: { id: deviceId },
    select: { id: true, organizationId: true, deletedAt: true },
  });
  if (!device || device.deletedAt) return [];
  return getDeviceAllowedOrganizationIds(device);
}

async function deviceSchoolLinksMap(deviceIds: string[]) {
  if (!deviceIds.length) return new Map<string, Array<{ organizationId: string; isPrimary: boolean; status: string }>>();
  const links = await prisma.rfidDeviceSchool.findMany({
    where: { deviceId: { in: deviceIds } },
    select: { deviceId: true, organizationId: true, isPrimary: true, status: true },
  });
  const map = new Map<string, Array<{ organizationId: string; isPrimary: boolean; status: string }>>();
  for (const l of links) {
    const arr = map.get(l.deviceId) ?? [];
    arr.push({ organizationId: l.organizationId, isPrimary: l.isPrimary, status: String(l.status) });
    map.set(l.deviceId, arr);
  }
  return map;
}

function decorateDeviceForOrg<T extends { id: string; organizationId: string }>(
  device: T,
  organizationId: string,
  links: Array<{ organizationId: string; isPrimary: boolean; status: string }>
) {
  const active = links.filter((l) => l.status === "ACTIVE");
  const linkedSchools = active.map((l) => l.organizationId);
  const linkedCount = linkedSchools.length || 1;
  const primaryOrg = active.find((l) => l.isPrimary)?.organizationId || device.organizationId;
  const isShared = linkedCount > 1;
  const isPrimaryForOrg = organizationId === primaryOrg || organizationId === device.organizationId;
  return {
    ...device,
    primaryOrganizationId: primaryOrg,
    linkedOrganizationIds: linkedSchools.length ? linkedSchools : [device.organizationId],
    linkedSchoolsCount: linkedCount,
    isShared,
    accessRole: isPrimaryForOrg ? "PRIMARY" : "SHARED",
  };
}

export async function listDevices(organizationId: string) {
  const { aliases } = await resolveOrganizationAliases(organizationId);
  const linkRows = await prisma.rfidDeviceSchool.findMany({
    where: { organizationId: { in: aliases }, status: DeviceSchoolLinkStatus.ACTIVE },
    select: { deviceId: true },
  });
  const linkedIds = [...new Set(linkRows.map((r) => r.deviceId))];
  const devices = await prisma.rfidDevice.findMany({
    where: {
      deletedAt: null,
      OR: [
        { organizationId: { in: aliases } },
        ...(linkedIds.length ? [{ id: { in: linkedIds } }] : []),
      ],
    },
    orderBy: { name: "asc" },
  });
  const synced = await syncDevicePresence(devices);
  const linksMap = await deviceSchoolLinksMap(synced.map((d) => d.id));
  return synced.map((d) => decorateDeviceForOrg(d, organizationId, linksMap.get(d.id) ?? []));
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}

async function findManagedDevice(organizationId: string, id: string) {
  const { aliases } = await resolveOrganizationAliases(organizationId);
  const device = await prisma.rfidDevice.findFirst({
    where: {
      id,
      deletedAt: null,
      OR: [
        { organizationId: { in: aliases } },
        { schoolLinks: { some: { organizationId: { in: aliases }, status: DeviceSchoolLinkStatus.ACTIVE } } },
      ],
    },
    include: { schoolLinks: true },
  });
  if (!device) throw new AppError(404, "Device not found");
  const primaryAliases = aliases;
  const isPrimaryManager = primaryAliases.includes(device.organizationId);
  return { device, aliases, isPrimaryManager };
}

export async function createDevice(
  organizationId: string,
  input: {
    deviceCode?: string;
    name: string;
    location?: string;
    gateName?: string;
    direction?: TapDirection;
    organizationCode?: string;
  }
) {
  const { canonicalId, organizationCode: orgCode } = await resolveOrganizationAliases(
    organizationId,
    input.organizationCode
  );
  const prefix = deviceCodePrefix(orgCode ?? input.organizationCode);
  const explicitCode = input.deviceCode?.trim()
    ? input.deviceCode.trim().toUpperCase()
    : undefined;

  const registerData = {
    name: input.name.trim(),
    location: input.location ?? "",
    gateName: input.gateName ?? input.location,
    apiKey: generateDeviceApiKey(),
    direction: input.direction ?? TapDirection.ENTRY,
    status: DeviceStatus.ONLINE,
    batteryPercent: 100,
    signalQuality: "Excellent",
    firmwareVersion: "1.0.0",
    lastSeenAt: new Date(),
    deletedAt: null as null,
    organizationId: canonicalId,
  };

  const persistDevice = async (deviceCode: string, existing: Awaited<ReturnType<typeof findDeviceByCodeGlobal>>) => {
    const device = existing
      ? await prisma.rfidDevice.update({
          where: { id: existing.id },
          data: registerData,
        })
      : await prisma.rfidDevice.create({
          data: {
            deviceCode,
            ...registerData,
          },
        });

    await prisma.rfidDeviceSchool.updateMany({
      where: { deviceId: device.id },
      data: { isPrimary: false },
    });
    await ensurePrimaryDeviceLink(device.id, canonicalId);

    await prisma.deviceLog.create({
      data: {
        organizationId: canonicalId,
        deviceId: device.id,
        event: "REGISTERED",
        detail: existing ? "Device re-registered after removal" : "Device registered",
      },
    });
    return device;
  };

  if (explicitCode) {
    const existing = await findDeviceByCodeGlobal(explicitCode);
    if (existing?.deletedAt == null) {
      throw new AppError(409, `Device code ${explicitCode} already exists`);
    }
    try {
      const device = await persistDevice(explicitCode, existing);
      const links = await prisma.rfidDeviceSchool.findMany({ where: { deviceId: device.id } });
      return decorateDeviceForOrg(device, canonicalId, links.map((l) => ({ organizationId: l.organizationId, isPrimary: l.isPrimary, status: String(l.status) })));
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new AppError(409, `Device code ${explicitCode} already exists`);
      }
      throw err;
    }
  }

  for (let seq = 1; seq <= 9999; seq++) {
    const deviceCode = `${prefix}_${String(seq).padStart(3, "0")}`;
    const existing = await findDeviceByCodeGlobal(deviceCode);
    if (existing?.deletedAt == null) continue;

    try {
      const device = await persistDevice(deviceCode, existing);
      const links = await prisma.rfidDeviceSchool.findMany({ where: { deviceId: device.id } });
      return decorateDeviceForOrg(device, canonicalId, links.map((l) => ({ organizationId: l.organizationId, isPrimary: l.isPrimary, status: String(l.status) })));
    } catch (err) {
      if (isPrismaUniqueViolation(err)) continue;
      throw err;
    }
  }

  throw new AppError(503, "No available device code for this school");
}

export async function listDeviceSchools(organizationId: string, deviceId: string) {
  const { device } = await findManagedDevice(organizationId, deviceId);
  const links = await prisma.rfidDeviceSchool.findMany({
    where: { deviceId: device.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  return links.map((l) => ({
    id: l.id,
    deviceId: l.deviceId,
    organizationId: l.organizationId,
    isPrimary: l.isPrimary,
    status: String(l.status),
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }));
}

export async function linkDeviceToSchool(
  actingOrganizationId: string,
  deviceId: string,
  targetOrganizationId: string
) {
  const targetOrg = String(targetOrganizationId || "").trim();
  if (!targetOrg) throw new AppError(400, "target school (organizationId) is required");
  const { device } = await findManagedDevice(actingOrganizationId, deviceId);
  if (targetOrg === device.organizationId) {
    await ensurePrimaryDeviceLink(device.id, device.organizationId);
  } else {
    await prisma.rfidDeviceSchool.upsert({
      where: { deviceId_organizationId: { deviceId: device.id, organizationId: targetOrg } },
      create: { deviceId: device.id, organizationId: targetOrg, isPrimary: false, status: DeviceSchoolLinkStatus.ACTIVE },
      update: { status: DeviceSchoolLinkStatus.ACTIVE },
    });
  }
  await prisma.deviceLog.create({
    data: {
      organizationId: actingOrganizationId,
      deviceId: device.id,
      event: "SCHOOL_LINKED",
      detail: `Linked school ${targetOrg}`,
    },
  });
  return listDeviceSchools(actingOrganizationId, deviceId);
}

export async function unlinkDeviceFromSchool(
  actingOrganizationId: string,
  deviceId: string,
  targetOrganizationId: string
) {
  const targetOrg = String(targetOrganizationId || "").trim();
  const { device } = await findManagedDevice(actingOrganizationId, deviceId);
  if (targetOrg === device.organizationId) {
    throw new AppError(400, "Primary school cannot be unlinked. Transfer or delete the device instead.");
  }
  await prisma.rfidDeviceSchool.updateMany({
    where: { deviceId: device.id, organizationId: targetOrg },
    data: { status: DeviceSchoolLinkStatus.INACTIVE },
  });
  await prisma.deviceLog.create({
    data: {
      organizationId: actingOrganizationId,
      deviceId: device.id,
      event: "SCHOOL_UNLINKED",
      detail: `Unlinked school ${targetOrg}`,
    },
  });
  return listDeviceSchools(actingOrganizationId, deviceId);
}

export async function rotateDeviceApiKey(organizationId: string, id: string) {
  const { device } = await findManagedDevice(organizationId, id);
  const updated = await prisma.rfidDevice.update({
    where: { id: device.id },
    data: { apiKey: generateDeviceApiKey() },
  });
  await prisma.deviceLog.create({
    data: { organizationId, deviceId: device.id, event: "API_KEY_ROTATED", detail: "Device API key regenerated" },
  });
  return { id: updated.id, deviceCode: updated.deviceCode, apiKey: updated.apiKey };
}

export async function updateDevice(
  organizationId: string,
  id: string,
  body: Record<string, unknown>
) {
  const { device } = await findManagedDevice(organizationId, id);
  const updated = await prisma.rfidDevice.update({
    where: { id: device.id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.location !== undefined ? { location: String(body.location) } : {}),
      ...(body.gateName !== undefined ? { gateName: String(body.gateName) } : {}),
      ...(body.status !== undefined ? { status: body.status as DeviceStatus } : {}),
      ...(body.direction !== undefined ? { direction: body.direction as TapDirection } : {}),
      ...(body.batteryPercent !== undefined ? { batteryPercent: Number(body.batteryPercent) } : {}),
      ...(body.signalQuality !== undefined ? { signalQuality: String(body.signalQuality) } : {}),
      ...(body.firmwareVersion !== undefined
        ? { firmwareVersion: String(body.firmwareVersion) }
        : {}),
      ...(body.wifiSsid !== undefined ? { wifiSsid: String(body.wifiSsid) } : {}),
      ...(body.wifiPassword !== undefined ? { wifiPassword: String(body.wifiPassword) } : {}),
      lastSeenAt: new Date(),
    },
  });
  const links = await prisma.rfidDeviceSchool.findMany({ where: { deviceId: updated.id } });
  return decorateDeviceForOrg(updated, organizationId, links.map((l) => ({ organizationId: l.organizationId, isPrimary: l.isPrimary, status: String(l.status) })));
}

export async function deleteDevice(organizationId: string, id: string) {
  const { device, isPrimaryManager } = await findManagedDevice(organizationId, id);
  if (!isPrimaryManager) {
    // Shared school removing its access: unlink instead of deleting physical device
    await unlinkDeviceFromSchool(organizationId, id, organizationId);
    return { id: device.id, deleted: false, unlinked: true };
  }
  await prisma.rfidDevice.update({
    where: { id: device.id },
    data: { deletedAt: new Date(), status: DeviceStatus.DISABLED },
  });
  await prisma.rfidDeviceSchool.updateMany({
    where: { deviceId: device.id },
    data: { status: DeviceSchoolLinkStatus.INACTIVE },
  });
  await prisma.deviceLog.create({
    data: { organizationId, deviceId: device.id, event: "DELETED", detail: "Device removed" },
  });
  return { id: device.id, deleted: true };
}

export async function testDevice(organizationId: string, id: string) {
  const device = await updateDevice(organizationId, id, {
    status: DeviceStatus.ONLINE,
    signalQuality: "Excellent",
  });
  await prisma.deviceLog.create({
    data: { organizationId, deviceId: id, event: "TEST", detail: "Device test OK" },
  });
  return device;
}

/* ─── Tap / Attendance ──────────────────────────────────── */

async function ensureCardFromStudentManagement(
  organizationId: string,
  cardNumber: string,
  student: SmStudent
) {
  const existing = await prisma.rfidCard.findFirst({
    where: { organizationId, cardNumber, deletedAt: null },
  });
  const profile = {
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.fullName,
    className: student.className ?? undefined,
    level: student.educationLevel ?? student.stream ?? undefined,
    uid: cardNumber,
    status: CardStatus.ACTIVE,
    notes: "owner:student",
  };
  if (existing) {
    return prisma.rfidCard.update({
      where: { id: existing.id },
      data: {
        ...profile,
        activatedAt: existing.activatedAt ?? new Date(),
      },
    });
  }
  return prisma.rfidCard.create({
    data: {
      organizationId,
      cardNumber,
      ...profile,
      issuedAt: new Date(),
      activatedAt: new Date(),
      qrPayload: `RFID:${cardNumber}|STUDENT:${student.studentCode}`,
    },
  });
}

async function ensureCardFromStaff(
  organizationId: string,
  cardNumber: string,
  staff: StaffMember
) {
  const existing = await prisma.rfidCard.findFirst({
    where: { organizationId, cardNumber, deletedAt: null },
  });
  const employeeCode = staff.employeeNumber ?? staff.id;
  const profile = {
    studentId: staff.id,
    studentCode: employeeCode,
    studentName: staff.fullName,
    className: staff.department ?? undefined,
    level: `STAFF:${staff.position ?? "Staff"}`,
    uid: cardNumber,
    status: CardStatus.ACTIVE,
    notes: `owner:staff|source:${staff.source}`,
  };
  if (existing) {
    return prisma.rfidCard.update({
      where: { id: existing.id },
      data: {
        ...profile,
        activatedAt: existing.activatedAt ?? new Date(),
      },
    });
  }
  return prisma.rfidCard.create({
    data: {
      organizationId,
      cardNumber,
      ...profile,
      issuedAt: new Date(),
      activatedAt: new Date(),
      qrPayload: `RFID:${cardNumber}|STAFF:${employeeCode}`,
    },
  });
}

function isStaffCard(card: { level?: string | null; notes?: string | null; qrPayload?: string | null }) {
  if (card.notes?.includes("owner:staff")) return true;
  if (card.level?.startsWith("STAFF:")) return true;
  if (card.qrPayload?.includes("|STAFF:")) return true;
  return false;
}

function attendancePersonKey(row: {
  studentId?: string | null;
  studentCode?: string | null;
  studentName?: string | null;
  id: string;
}) {
  const key = (row.studentId ?? row.studentCode ?? row.studentName ?? row.id).trim();
  return key || row.id;
}

function studentAttendedToday(status: AttendanceStatus) {
  return (
    isPresentStatus(status) ||
    status === AttendanceStatus.HALF_DAY ||
    status === AttendanceStatus.PERMISSION ||
    status === AttendanceStatus.EXCUSED
  );
}

function dailyAttendanceRatePercent(attended: number, enrolled: number): number {
  if (enrolled <= 0) return 0;
  const pct = (attended / enrolled) * 100;
  if (pct > 0 && pct < 1) return Math.round(pct * 10) / 10;
  return Math.min(100, Math.round(pct));
}

async function countEnrolledPeople(organizationId: string, kind: "STUDENT" | "STAFF") {
  const cards = await prisma.rfidCard.findMany({
    where: { organizationId, deletedAt: null, status: CardStatus.ACTIVE },
    select: {
      level: true,
      notes: true,
      qrPayload: true,
      studentId: true,
      studentCode: true,
      cardNumber: true,
    },
  });
  const filtered = cards.filter((c) =>
    kind === "STAFF" ? isStaffCard(c) : !isStaffCard(c)
  );
  return new Set(
    filtered.map((c) => (c.studentId ?? c.studentCode ?? c.cardNumber).trim()).filter(Boolean)
  ).size;
}

type TapCardSource = "local" | "student_management" | "staff_smart_access" | null;

function staffAccessMatchesHit(
  access: { iamUserId?: string | null; email?: string | null; externalId?: string | null; source?: string | null; staffKey: string },
  hit: RfidStaffHit
) {
  const hitIam = normalizeKeyPart(hit.iamUserId || (hit.source === "iam" ? hit.id : null));
  const hitEmail = normalizeEmailKey(hit.email);
  const hitExt = normalizeKeyPart(hit.employeeNumber || hit.code || hit.id);
  const hitSource = normalizeKeyPart(hit.source)?.toLowerCase();
  if (hitIam && normalizeKeyPart(access.iamUserId) === hitIam) return true;
  if (hitEmail && normalizeEmailKey(access.email) === hitEmail) return true;
  if (hitExt && normalizeKeyPart(access.externalId) === hitExt) {
    const aSrc = normalizeKeyPart(access.source)?.toLowerCase();
    if (!aSrc || !hitSource || aSrc === hitSource) return true;
  }
  // fallback staffKey patterns
  const key = String(access.staffKey || "");
  if (hitIam && key === `iam:${hitIam}`) return true;
  if (hitEmail && key === `email:${hitEmail}`) return true;
  if (hitExt && hitSource && key === `${hitSource}:${hitExt}`) return true;
  return false;
}

async function findStaffEligibleAllowedOrgs(allowedOrganizationIds: string[], hit: RfidStaffHit) {
  const allowed = new Set(allowedOrganizationIds);
  const candidates = new Set<string>();
  if (allowed.has(hit.organizationId)) candidates.add(hit.organizationId);

  const or: any[] = [];
  const iamId = normalizeKeyPart(hit.iamUserId || (hit.source === "iam" ? hit.id : null));
  const email = normalizeEmailKey(hit.email);
  const extId = normalizeKeyPart(hit.employeeNumber || hit.code || hit.id);
  const source = normalizeKeyPart(hit.source);
  const keys: string[] = [];
  if (iamId) { or.push({ iamUserId: iamId }); keys.push(`iam:${iamId}`); }
  if (email) { or.push({ email }); keys.push(`email:${email}`); }
  if (extId) {
    or.push({ externalId: extId });
    if (source) keys.push(`${source.toLowerCase()}:${extId}`);
  }
  if (keys.length) or.push({ staffKey: { in: keys } });

  if (or.length) {
    const rows = await prisma.attendanceStaffSchoolAccess.findMany({
      where: {
        organizationId: { in: allowedOrganizationIds },
        status: "ACTIVE",
        OR: or,
      },
      select: { organizationId: true, staffKey: true, iamUserId: true, email: true, externalId: true, source: true },
    });
    for (const r of rows) {
      if (staffAccessMatchesHit(r, hit)) candidates.add(r.organizationId);
    }
  }
  return [...candidates].filter((o) => allowed.has(o));
}

async function findTodayAttendanceRecord(
  organizationId: string,
  today: Date,
  card: {
    id: string;
    cardNumber: string;
    studentId?: string | null;
    studentCode?: string | null;
    studentName?: string | null;
  }
) {
  const or: Array<Record<string, unknown>> = [
    { cardId: card.id },
    { cardNumber: card.cardNumber },
  ];
  if (card.studentId) or.push({ studentId: card.studentId });
  if (card.studentCode) or.push({ studentCode: card.studentCode });
  const name = card.studentName?.trim();
  if (name) or.push({ studentName: { equals: name, mode: "insensitive" } });

  return prisma.attendanceRecord.findFirst({
    where: { organizationId, lessonDate: today, OR: or },
    orderBy: [{ entryTime: "desc" }, { updatedAt: "desc" }],
  });
}

async function resolveCardForTap(
  organizationId: string,
  cardNumber: string
): Promise<{
  card: Awaited<ReturnType<typeof prisma.rfidCard.findFirst>>;
  source: TapCardSource;
  staff: StaffMember | null;
}> {
  // Staff Smart Access (HR / Timetable / IAM) before students so a mis-tagged local card does not block staff taps.
  if (isStaffIntegrationEnabled()) {
    const staff = await fetchStaffByRfidUid(organizationId, cardNumber);
    if (staff) {
      const card = await ensureCardFromStaff(organizationId, cardNumber, staff);
      return { card, source: "staff_smart_access", staff };
    }
    // Shared-device / multi-school assignment: allow staff whose home RFID is in another school
    // but who are actively assigned to this organization.
    const hit = await lookupStaffByRfidGlobally(cardNumber).catch(() => null);
    if (hit) {
      const eligible = await findStaffEligibleAllowedOrgs([organizationId], hit);
      if (eligible.includes(organizationId)) {
        const assignedStaff = await fetchStaffByRfidUid(organizationId, cardNumber, { allowAssignedOrg: true });
        if (assignedStaff) {
          const card = await ensureCardFromStaff(organizationId, cardNumber, assignedStaff);
          return { card, source: "staff_smart_access", staff: assignedStaff };
        }
      }
    }
  }

  if (isStudentManagementEnabled()) {
    const student = await fetchStudentByRfidUid(organizationId, cardNumber);
    if (student) {
      const card = await ensureCardFromStudentManagement(organizationId, cardNumber, student);
      return { card, source: "student_management", staff: null };
    }
  }

  const local = await prisma.rfidCard.findFirst({
    where: { organizationId, cardNumber, deletedAt: null },
  });
  if (local) {
    if (isStaffCard(local)) {
      return { card: local, source: "local", staff: null };
    }
    if (isStaffIntegrationEnabled()) {
      const staff = await fetchStaffByRfidUid(organizationId, cardNumber);
      if (staff) {
        const card = await ensureCardFromStaff(organizationId, cardNumber, staff);
        return { card, source: "staff_smart_access", staff };
      }
      const hit = await lookupStaffByRfidGlobally(cardNumber).catch(() => null);
      if (hit) {
        const eligible = await findStaffEligibleAllowedOrgs([organizationId], hit);
        if (eligible.includes(organizationId)) {
          const assignedStaff = await fetchStaffByRfidUid(organizationId, cardNumber, { allowAssignedOrg: true });
          if (assignedStaff) {
            const card = await ensureCardFromStaff(organizationId, cardNumber, assignedStaff);
            return { card, source: "staff_smart_access", staff: assignedStaff };
          }
        }
      }
    }
    return { card: local, source: "local", staff: null };
  }

  return { card: null, source: null, staff: null };
}

export async function processTap(
  organizationId: string,
  input: {
    cardNumber: string;
    deviceCode?: string;
    direction?: TapDirection | string;
    /** Wall-clock time of the physical tap (offline sync). Defaults to now. */
    scannedAt?: Date | string;
  }
) {
  const settings = await getOrCreateSettings(organizationId);
  const cardNumber = input.cardNumber.trim().toUpperCase();
  const { card, source, staff } = await resolveCardForTap(organizationId, cardNumber);
  if (!card) {
    await prisma.securityAlert.create({
      data: {
        organizationId,
        severity: AlertSeverity.WARNING,
        title: "Unauthorized card tap",
        message: `Unknown card ${cardNumber} attempted access`,
        relatedType: "card",
      },
    });
    throw new AppError(
      404,
      isStudentManagementEnabled() || isStaffIntegrationEnabled()
        ? "Card not registered — assign Digital ID in Super Admin Smart Access (Students or Staff tab) first"
        : "Card not registered"
    );
  }

  const deniedStatuses: CardStatus[] = [
    CardStatus.BLOCKED,
    CardStatus.LOST,
    CardStatus.EXPIRED,
    CardStatus.INACTIVE,
  ];
  if (deniedStatuses.includes(card.status)) {
    await prisma.securityAlert.create({
      data: {
        organizationId,
        severity: AlertSeverity.CRITICAL,
        title: "Blocked / lost card tap",
        message: `Card ${cardNumber} (${card.status}) was presented`,
        relatedType: "card",
        relatedId: card.id,
      },
    });
    throw new AppError(403, `Card is ${card.status.toLowerCase()} — access denied`);
  }

  if (card.status === CardStatus.PENDING) {
    throw new AppError(403, "Card pending activation");
  }

  let device = input.deviceCode
    ? await prisma.rfidDevice.findFirst({
        where: {
          deviceCode: input.deviceCode.trim().toUpperCase(),
          deletedAt: null,
          OR: [
            { organizationId },
            { schoolLinks: { some: { organizationId, status: DeviceSchoolLinkStatus.ACTIVE } } },
          ],
        },
      })
    : null;

  if (device?.status === DeviceStatus.DISABLED) {
    throw new AppError(403, "Device is disabled");
  }

  const now =
    input.scannedAt instanceof Date
      ? input.scannedAt
      : typeof input.scannedAt === "string" && input.scannedAt.trim()
        ? new Date(input.scannedAt)
        : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new AppError(400, "Invalid scannedAt timestamp");
  }

  const today = dateOnly(now);
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: ATTENDANCE_TZ,
    weekday: "short",
  }).format(now);
  const isWeekend = weekdayStr === "Sat" || weekdayStr === "Sun";
  if (isWeekend && !settings.enableWeekend) {
    throw new AppError(400, "Weekend attendance is disabled");
  }

  let record = await findTodayAttendanceRecord(organizationId, today, {
    id: card.id,
    cardNumber: card.cardNumber,
    studentId: card.studentId,
    studentCode: card.studentCode,
    studentName: card.studentName,
  });

  const nowMin = nowMinutes(now);
  const staffCard = isStaffCard(card);

  const { resolveScheduleForContext } = await import("./attendance-schedule.service");
  const resolvedSchedule = await resolveScheduleForContext(organizationId, settings, {
    lessonDate: today,
    className: card.className,
    isStaff: staffCard,
  });
  const schedule: ScheduleSettings = {
    schoolStarts: resolvedSchedule.schoolStarts,
    lateStarts: resolvedSchedule.lateStarts,
    schoolEnds: resolvedSchedule.schoolEnds,
    maxExitTime: settings.maxExitTime,
    attendanceClosingTime: resolvedSchedule.attendanceClosingTime,
    enableLateDetection: resolvedSchedule.enableLateDetection,
    graceMinutes: resolvedSchedule.graceMinutes,
  };

  const direction = resolveTapDirection(
    {
      settings,
      resolvedSchoolEnds: schedule.schoolEnds,
      nowMin,
    },
    record,
    {
      direction: input.direction,
      device,
    }
  );

  if (direction === TapDirection.ENTRY && !settings.enableEntry) {
    throw new AppError(400, "Entry attendance is disabled");
  }
  if (direction === TapDirection.EXIT && !settings.enableExit) {
    throw new AppError(400, "Exit attendance is disabled");
  }

  let permissionExit = false;
  let permissionRef: string | undefined;
  const lessonDateIso = today.toISOString().slice(0, 10);

  if (direction === TapDirection.ENTRY) {
    if (record?.entryTime) {
      throw new AppError(
        400,
        staffCard
          ? "You already checked in today"
          : "You already checked in today"
      );
    }
    if (!isEntryWindowOpen(schedule, nowMin)) {
      throw new AppError(400, "Entry window closed. Please contact the school office.");
    }
  } else {
    if (record?.exitTime) {
      throw new AppError(
        400,
        staffCard
          ? "You already checked out today"
          : "You already checked out today"
      );
    }

    if (!staffCard && isDisciplineIntegrationEnabled()) {
      const perm = await tryDisciplinePermissionExit(organizationId, {
        studentId: card.studentId,
        studentCode: card.studentCode,
        gateLabel: device?.gateName ?? device?.name ?? undefined,
      });
      if (perm.allowed) {
        permissionExit = true;
        permissionRef = perm.referenceNumber;
      }
    }
    if (staffCard && isStaffIntegrationEnabled() && card.studentId) {
      const leave = await fetchStaffApprovedLeaveToday(organizationId, card.studentId, lessonDateIso);
      if (leave?.active) permissionExit = true;
    }

    const exitOpensAt = resolveExitOpensAt(settings, schedule.schoolEnds);
    if (!permissionExit && !isExitWindowOpen(exitOpensAt, settings.maxExitTime, nowMin)) {
      const opens = parseHm(exitOpensAt);
      if (nowMin < opens) {
        throw new AppError(
          400,
          `Exit not open yet. Checkouts start at ${exitOpensAt}.`
        );
      }
      throw new AppError(400, "Exit window closed. Please contact the school office.");
    }
  }

  // Anti double-tap within 30s (relative to scanned time)
  const recent = await prisma.attendanceRecord.findFirst({
    where: {
      organizationId,
      cardId: card.id,
      lessonDate: today,
      updatedAt: { gte: new Date(now.getTime() - 30_000) },
    },
  });
  if (recent) {
    await prisma.securityAlert.create({
      data: {
        organizationId,
        severity: AlertSeverity.INFO,
        title: "Multiple tap detected",
        message: `${card.studentName || cardNumber} tapped again within 30 seconds`,
        relatedType: "attendance",
        relatedId: recent.id,
      },
    });
    throw new AppError(429, "Multiple tap detected. Please wait a moment.");
  }

  let parentSms: { status: "SENT" | "FAILED" | "SKIPPED"; detail: string; phones: number } = {
    status: "SKIPPED",
    detail: "Staff taps do not send parent SMS",
    phones: 0,
  };

  if (direction === TapDirection.ENTRY) {
    const status = resolveEntryStatus(schedule, now, staffCard);
    if (record) {
      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          entryTime: now,
          status,
          direction: TapDirection.ENTRY,
          cardId: card.id,
          cardNumber: card.cardNumber,
          deviceId: device?.id,
          deviceCode: device?.deviceCode,
          gateName: device?.gateName,
        },
      });
    } else {
      record = await prisma.attendanceRecord.create({
        data: {
          organizationId,
          cardId: card.id,
          deviceId: device?.id,
          studentId: card.studentId,
          studentCode: card.studentCode,
          studentName: card.studentName || (staffCard ? "Unknown Staff" : "Unknown Student"),
          className: card.className,
          level: card.level,
          cardNumber: card.cardNumber,
          deviceCode: device?.deviceCode,
          gateName: device?.gateName,
          schoolName: settings.schoolName,
          academicYear: settings.academicYear,
          term: settings.term,
          direction: TapDirection.ENTRY,
          status,
          lessonDate: today,
          entryTime: now,
          isWeekend,
        },
      });
    }
    if (!staffCard) {
      try {
        parentSms = await queueParentNotify(
          organizationId,
          record.studentName,
          record.studentId,
          "entry",
          now,
          record.className,
          {
            studentCode: record.studentCode,
            cardNumber: record.cardNumber,
            gateName: record.gateName,
            status: record.status,
          }
        );
      } catch (err) {
        console.warn("[Attendance] Parent notify failed after entry:", err);
        parentSms = {
          status: "FAILED",
          detail: err instanceof Error ? err.message : "Parent notify failed",
          phones: 0,
        };
      }
    }
  } else {
    if (!record?.entryTime) {
      record =
        (await findTodayAttendanceRecord(organizationId, today, {
          id: card.id,
          cardNumber: card.cardNumber,
          studentId: card.studentId,
          studentCode: card.studentCode,
          studentName: card.studentName,
        })) ?? record;
    }
    if (!record?.entryTime) {
      // Exit without entry (no matching check-in for this school day)
      record = await prisma.attendanceRecord.create({
        data: {
          organizationId,
          cardId: card.id,
          deviceId: device?.id,
          studentId: card.studentId,
          studentCode: card.studentCode,
          studentName: card.studentName || (staffCard ? "Unknown Staff" : "Unknown Student"),
          className: card.className,
          level: card.level,
          cardNumber: card.cardNumber,
          deviceCode: device?.deviceCode,
          gateName: device?.gateName,
          schoolName: settings.schoolName,
          academicYear: settings.academicYear,
          term: settings.term,
          direction: TapDirection.EXIT,
          status: AttendanceStatus.EXITED_ONLY,
          lessonDate: today,
          exitTime: now,
          isWeekend,
        },
      });
    } else {
      const early = !permissionExit && nowMinutes(now) < parseHm(schedule.schoolEnds);
      const durationMins = Math.max(
        0,
        Math.round((now.getTime() - record.entryTime.getTime()) / 60000)
      );
      const exitStatus = permissionExit
        ? AttendanceStatus.PERMISSION
        : early
          ? AttendanceStatus.EARLY_DEPARTURE
          : AttendanceStatus.PRESENT;
      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          exitTime: now,
          durationMins,
          direction: TapDirection.EXIT,
          status: exitStatus,
          deviceId: device?.id ?? record.deviceId,
          deviceCode: device?.deviceCode ?? record.deviceCode,
          gateName: device?.gateName ?? record.gateName,
        },
      });
    }
    if (!staffCard) {
      try {
        parentSms = await queueParentNotify(
          organizationId,
          record.studentName,
          record.studentId,
          permissionExit ? "permission_exit" : "exit",
          now,
          record.className,
          {
            studentCode: record.studentCode,
            cardNumber: record.cardNumber,
            gateName: record.gateName,
            status: record.status,
          }
        );
      } catch (err) {
        console.warn("[Attendance] Parent notify failed after exit:", err);
        parentSms = {
          status: "FAILED",
          detail: err instanceof Error ? err.message : "Parent notify failed",
          phones: 0,
        };
      }
    }
  }

  await prisma.rfidCard.update({
    where: { id: card.id },
    data: { usageCount: { increment: 1 }, lastUsedAt: now },
  });

  if (device) {
    await prisma.rfidDevice.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        status: DeviceStatus.ONLINE,
        studentsToday: { increment: 1 },
      },
    });
  }

  if (staffCard) {
    const timeLabel = new Intl.DateTimeFormat("en-GB", {
      timeZone: ATTENDANCE_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now);
    void notifyStaffAttendanceTap({
      organizationId,
      direction: String(direction),
      staffName: record.studentName || staff?.fullName || card.studentName,
      timeLabel,
      iamUserId: staff?.teacherUserId || staff?.id || card.studentId || undefined,
      email: staff?.email || undefined,
      employeeCode: staff?.employeeNumber || card.studentCode || undefined,
    }).catch((err) => console.warn("[Attendance] Staff tap push notify failed", err));
  }

  return {
    access: "GRANTED",
    direction,
    permissionExit,
    permissionRef,
    notification:
      direction === TapDirection.ENTRY ? "green" : permissionExit ? "permission_exit" : "exit",
    student: {
      name: record.studentName,
      code: record.studentCode,
      className: record.className,
      level: record.level,
      cardNumber: card.cardNumber,
      source:
        source === "student_management" || source === "staff_smart_access" ? "smart_access" : "local",
      personType: staffCard ? "STAFF" : "STUDENT",
    },
    record,
    parentSms,
  };
}

/* Device gate API (Arduino / ESP32 RFID readers) - supports multi-school/shared devices */

async function resolveSharedTapTarget(input: {
  device: { id: string; organizationId: string; deviceCode: string; name: string; gateName?: string | null };
  allowedOrganizationIds: string[];
  cardNumber: string;
}): Promise<
  | { ok: true; organizationId: string; personType: "STUDENT" | "STAFF" }
  | { ok: false; reason: string; message: string }
> {
  const { allowedOrganizationIds, cardNumber } = input;
  const allowedSet = new Set(allowedOrganizationIds);

  // 1) Student (global owner school must be allowed)
  if (isStudentManagementEnabled()) {
    const owner = await lookupRfidOwner(cardNumber).catch(() => null);
    if (owner?.organizationId) {
      if (allowedSet.has(owner.organizationId)) {
        return { ok: true, organizationId: owner.organizationId, personType: "STUDENT" };
      }
      const cardSchool = owner.organizationName ?? owner.organizationCode ?? owner.organizationId;
      return {
        ok: false,
        reason: "NOT_AUTHORIZED_FOR_DEVICE",
        message: `Card belongs to ${cardSchool}, but this device is not linked to that school.`,
      };
    }
  }

  // 2) Staff (must map to exactly one allowed/eligible school)
  if (isStaffIntegrationEnabled()) {
    const hit = await lookupStaffByRfidGlobally(cardNumber).catch(() => null);
    if (hit) {
      const eligible = await findStaffEligibleAllowedOrgs(allowedOrganizationIds, hit);
      if (eligible.length === 1) {
        return { ok: true, organizationId: eligible[0], personType: "STAFF" };
      }
      if (eligible.length === 0) {
        return {
          ok: false,
          reason: "NOT_ASSIGNED_TO_LINKED_SCHOOL",
          message: "Staff member is not assigned to any school linked to this device. Assign the staff to the correct school or link the device.",
        };
      }
      return {
        ok: false,
        reason: "AMBIGUOUS_STAFF_SCHOOL",
        message: "Staff member is assigned to multiple schools linked to this device. Cannot determine attendance school; update device links or staff assignments so only one linked school applies.",
      };
    }
  }

  // 3) Local/shared cards fallback: resolve in each allowed org
  let matchedOrg = null;
  let matchedPersonType = "STUDENT";
  for (const orgId of allowedOrganizationIds) {
    const resolved = await resolveCardForTap(orgId, cardNumber).catch(() => null);
    if (resolved?.card) {
      if (matchedOrg && matchedOrg !== orgId) {
        return {
          ok: false,
          reason: "AMBIGUOUS_SCHOOL",
          message: "Card is valid in multiple schools linked to this device. Cannot determine attendance school; review assignments/links.",
        };
      }
      matchedOrg = orgId;
      matchedPersonType = isStaffCard(resolved.card) ? "STAFF" : "STUDENT";
    }
  }
  if (matchedOrg) return { ok: true, organizationId: matchedOrg, personType: matchedPersonType };

  return { ok: false, reason: "CARD_NOT_REGISTERED", message: "Card not registered for any school linked to this device." };
}

export async function deviceGateTap(input: {
  apiKey?: string;
  cardNumber?: string;
  cardUid?: string;
  direction?: string;
  scannedAt?: string;
  offline?: boolean;
  eventId?: string;
}) {
  const apiKey = String(input.apiKey ?? "").trim();
  if (!apiKey) throw new AppError(401, "Device key is required");

  const device = await prisma.rfidDevice.findFirst({
    where: { apiKey, deletedAt: null },
  });
  if (!device) throw new AppError(401, "Invalid device key");
  if (device.status === DeviceStatus.DISABLED) {
    return gateDenied("DEVICE_DISABLED", "Device is disabled", null);
  }

  const cardNumber = String(input.cardNumber ?? input.cardUid ?? "").trim().toUpperCase();
  if (!cardNumber) throw new AppError(400, "cardNumber is required");

  const eventId = typeof input.eventId === "string" ? input.eventId.trim().slice(0, 80) : "";

  // Idempotent replay: same eventId already processed -> success without double attendance
  if (eventId) {
    const prior = await prisma.gateSyncEvent.findUnique({ where: { eventId } });
    if (prior) {
      await prisma.rfidDevice.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date(), status: DeviceStatus.ONLINE },
      });
      return {
        allowed: true as const,
        duplicate: true as const,
        action: "DUPLICATE",
        status: "PRESENT",
        message: "Event already recorded",
        eventId,
        student: { name: "-", personType: "STUDENT" },
        personType: "STUDENT",
        device: { code: device.deviceCode, name: device.name, gate: device.gateName },
        time: new Date().toISOString(),
        offline: Boolean(input.offline),
      };
    }
  }

  const scannedAt =
    typeof input.scannedAt === "string" && input.scannedAt.trim()
      ? new Date(input.scannedAt)
      : new Date();
  if (Number.isNaN(scannedAt.getTime())) {
    throw new AppError(400, "Invalid scannedAt timestamp");
  }

  await prisma.rfidDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date(), status: DeviceStatus.ONLINE },
  });

  // Determine target school for this tap (supports multi-school/shared devices)
  const allowedOrganizationIds = await getDeviceAllowedOrganizationIds(device);
  let targetOrganizationId = device.organizationId;
  let targetPersonType = null;
  if (allowedOrganizationIds.length > 1) {
    const resolved = await resolveSharedTapTarget({
      device,
      allowedOrganizationIds,
      cardNumber,
    });
    if (!resolved.ok) {
      return gateDenied(resolved.reason, resolved.message, cardNumber);
    }
    targetOrganizationId = resolved.organizationId;
    targetPersonType = resolved.personType;
  } else if (allowedOrganizationIds.length === 1) {
    targetOrganizationId = allowedOrganizationIds[0];
  }

  try {
    const result = await processTap(targetOrganizationId, {
      cardNumber,
      deviceCode: device.deviceCode,
      direction: input.direction,
      scannedAt,
    });
    if (eventId) {
      await prisma.gateSyncEvent.create({
        data: {
          eventId,
          organizationId: targetOrganizationId,
          deviceId: device.id,
          cardNumber,
        },
      }).catch(() => {
        /* unique race - treat as duplicate success */
      });
    }
    const isExit = result.direction === TapDirection.EXIT;
    const studentName = result.student.name;
    const permissionExit = Boolean((result as { permissionExit?: boolean }).permissionExit);
    return {
      allowed: true as const,
      duplicate: false as const,
      action: isExit ? "EXIT" : "ENTRY",
      status: result.record.status,
      permissionExit,
      message: isExit
        ? permissionExit
          ? `${studentName} - exit (approved permission)`
          : `${studentName} checked out successfully`
        : `${studentName} checked in successfully`,
      eventId: eventId || undefined,
      student: result.student,
      personType: targetPersonType ?? result.student.personType ?? "STUDENT",
      device: { code: device.deviceCode, name: device.name, gate: device.gateName },
      time: scannedAt.toISOString(),
      offline: Boolean(input.offline),
      organizationId: targetOrganizationId,
    };
  } catch (err) {
    if (err instanceof AppError) {
      if (err.statusCode === 404 && (isStudentManagementEnabled() || isStaffIntegrationEnabled())) {
        const owner = isStudentManagementEnabled() ? await lookupRfidOwner(cardNumber) : null;
        if (owner && !allowedOrganizationIds.includes(owner.organizationId)) {
          const cardSchool = owner.organizationName ?? owner.organizationCode ?? "another school";
          return gateDenied(
            "NOT_AUTHORIZED_FOR_DEVICE",
            `Card belongs to ${cardSchool}, but this device is not linked to that school.`,
            cardNumber
          );
        }
        if (owner && allowedOrganizationIds.length <= 1 && owner.organizationId !== targetOrganizationId) {
          const deviceTenant = await prisma.tenant.findFirst({
            where: { organizationId: targetOrganizationId },
            select: { organizationName: true, organizationCode: true },
          });
          const cardSchool = owner.organizationName ?? owner.organizationCode ?? "another school";
          const deviceSchool = deviceTenant?.organizationName ?? deviceTenant?.organizationCode ?? "this gate device school";
          return gateDenied(
            "WRONG_SCHOOL",
            `Card belongs to ${cardSchool} but gate device is registered for ${deviceSchool}.`,
            cardNumber
          );
        }
      }
      return gateDenied(gateReasonFromError(err.statusCode, err.message), err.message, cardNumber);
    }
    throw err;
  }
}

/** Bulk sync of offline taps from ESP32 gate readers. */
export async function deviceGateTapBatch(input: {
  apiKey?: string;
  events?: Array<{
    cardNumber?: string;
    cardUid?: string;
    scannedAt?: string;
    direction?: string;
    eventId?: string;
  }>;
}) {
  const events = Array.isArray(input.events) ? input.events : [];
  if (!events.length) throw new AppError(400, "events array is required");
  if (events.length > 200) throw new AppError(400, "Maximum 200 events per batch");

  const results: Array<{
    index: number;
    cardNumber: string;
    eventId?: string;
    scannedAt?: string;
    allowed: boolean;
    duplicate?: boolean;
    reason?: string;
    message?: string;
    action?: string;
  }> = [];

  let accepted = 0;
  let rejected = 0;
  const ackedEventIds: string[] = [];
  /** Contiguous events from the front that were fully processed (OK or business reject). */
  let ackedPrefix = 0;
  let prefixOpen = true;
  let entryCount = 0;
  let exitCount = 0;
  let duplicateCount = 0;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const cardNumber = String(ev.cardNumber ?? ev.cardUid ?? "").trim().toUpperCase();
    const scannedAt = typeof ev.scannedAt === "string" ? ev.scannedAt : undefined;
    const eventId = typeof ev.eventId === "string" ? ev.eventId.trim() : undefined;
    try {
      const one = await deviceGateTap({
        apiKey: input.apiKey,
        cardNumber,
        scannedAt,
        direction: ev.direction,
        offline: true,
        eventId,
      });
      if (one.allowed) {
        accepted += 1;
        if (eventId) ackedEventIds.push(eventId);
        if (prefixOpen) ackedPrefix += 1;
        const dup = Boolean((one as { duplicate?: boolean }).duplicate);
        if (dup) duplicateCount += 1;
        else if (one.action === "EXIT") exitCount += 1;
        else if (one.action === "ENTRY") entryCount += 1;
        results.push({
          index: i,
          cardNumber,
          eventId,
          scannedAt: one.time,
          allowed: true,
          duplicate: dup,
          action: one.action,
          message: one.message,
        });
      } else {
        rejected += 1;
        // Business reject (unknown card, already out, etc.) is still "done" —
        // acknowledge so the gate does not retry the same tap forever.
        if (prefixOpen) ackedPrefix += 1;
        if (eventId) ackedEventIds.push(eventId);
        results.push({
          index: i,
          cardNumber,
          eventId,
          scannedAt,
          allowed: false,
          reason: one.reason,
          message: one.message,
        });
      }
    } catch (err) {
      rejected += 1;
      prefixOpen = false; // hard failure — stop acknowledging from here
      results.push({
        index: i,
        cardNumber,
        eventId,
        scannedAt,
        allowed: false,
        reason: "ERROR",
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  }

  const skipReasons = [
    ...new Set(results.filter((r) => !r.allowed && r.message).map((r) => r.message as string)),
  ].slice(0, 3);

  return {
    total: events.length,
    accepted,
    rejected,
    processed: accepted + rejected,
    entryCount,
    exitCount,
    duplicateCount,
    /** How many leading events the device may dequeue (order-preserving). */
    ackedPrefix,
    ackedEventIds,
    results,
    /** Human-readable summary for device Serial / ops. */
    summary:
      rejected === 0
        ? `Synced ${accepted} tap(s): ${entryCount} entry, ${exitCount} exit` +
          (duplicateCount ? `, ${duplicateCount} already saved` : "")
        : `Processed ${accepted + rejected}: ${accepted} saved (${entryCount} in / ${exitCount} out), ${rejected} skipped` +
          (skipReasons.length ? ` — ${skipReasons.join("; ")}` : ""),
  };
}

function gateDenied(reason: string, message: string, cardNumber: string | null) {
  return {
    allowed: false as const,
    reason,
    message,
    ...(cardNumber ? { cardNumber } : {}),
    time: new Date().toISOString(),
  };
}

const PARENT_STATUS_MAP: Record<AttendanceStatus, "PRESENT" | "LATE" | "ABSENT" | "EXCUSED"> = {
  PRESENT: "PRESENT",
  HALF_DAY: "PRESENT",
  ENTERED_ONLY: "PRESENT",
  EXITED_ONLY: "PRESENT",
  EARLY_DEPARTURE: "PRESENT",
  LATE: "LATE",
  ABSENT: "ABSENT",
  SUSPENDED: "ABSENT",
  EXCUSED: "EXCUSED",
  PERMISSION: "EXCUSED",
  WEEKEND: "PRESENT",
  HOLIDAY: "PRESENT",
};

function formatHm(d: Date | null): string | null {
  if (!d) return null;
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export async function studentAttendanceOverview(
  organizationId: string,
  studentCodes: string | string[]
) {
  const codes = uniqueCodes(Array.isArray(studentCodes) ? studentCodes : [studentCodes]);
  if (!codes.length) throw new AppError(400, "studentCode is required");

  const records = await prisma.attendanceRecord.findMany({
    where: { organizationId, ...studentIdentityWhere(codes) },
    orderBy: { lessonDate: "desc" },
  });

  const mapped = records
    .filter((r) => r.status !== AttendanceStatus.WEEKEND && r.status !== AttendanceStatus.HOLIDAY)
    .map((r) => ({
      id: r.id,
      date: r.lessonDate.toISOString(),
      checkInTime: formatHm(r.entryTime),
      checkOutTime: formatHm(r.exitTime),
      status: PARENT_STATUS_MAP[r.status] ?? "PRESENT",
      notes: r.notes,
      cardNumber: r.cardNumber,
      gateName: r.gateName,
      source: r.cardNumber ? "RFID" : "MANUAL",
    }));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRecords = mapped.filter((r) => new Date(r.date) >= monthStart);
  const monthlyPresent = monthRecords.filter((r) => r.status === "PRESENT").length;
  const monthlyAbsent = monthRecords.filter((r) => r.status === "ABSENT").length;
  const monthlyLate = monthRecords.filter((r) => r.status === "LATE").length;
  const monthlyExcused = monthRecords.filter((r) => r.status === "EXCUSED").length;
  const schoolDays = monthRecords.length;
  const attendanceRate =
    schoolDays > 0 ? Math.round(((monthlyPresent + monthlyLate) / schoolDays) * 100) : 0;

  const card = await prisma.rfidCard.findFirst({
    where: { organizationId, deletedAt: null, ...studentIdentityWhere(codes) },
  });

  let sm: SmStudent | null = null;
  if (isStudentManagementEnabled()) {
    for (const code of codes) {
      sm = await fetchStudentByIdentity(organizationId, code);
      if (sm) break;
    }
  }
  if (sm?.rfidUid && !card) {
    await ensureCardFromStudentManagement(organizationId, sm.rfidUid, sm).catch(() => null);
  }

  const syncedCard =
    card ??
    (sm?.rfidUid
      ? await prisma.rfidCard.findFirst({
          where: { organizationId, deletedAt: null, ...studentIdentityWhere(uniqueCodes([...codes, sm.id, sm.studentCode])) },
        })
      : null);

  return {
    student: {
      studentId: records[0]?.studentId || syncedCard?.studentId || sm?.id || codes[0],
      studentCode: records[0]?.studentCode || syncedCard?.studentCode || sm?.studentCode || codes[0],
      studentName: records[0]?.studentName || syncedCard?.studentName || sm?.fullName || null,
      className: records[0]?.className || syncedCard?.className || sm?.className || null,
      cardNumber: syncedCard?.cardNumber ?? records[0]?.cardNumber ?? sm?.rfidUid ?? null,
    },
    summary: { monthlyPresent, monthlyAbsent, monthlyLate, monthlyExcused, attendanceRate },
    records: mapped,
  };
}

export async function recordExcusedAbsence(
  organizationId: string,
  input: {
    studentCode: string;
    studentId?: string;
    date: string;
    reason?: string;
    studentName?: string;
    className?: string;
  }
) {
  const day = new Date(input.date);
  if (Number.isNaN(day.getTime())) throw new AppError(400, "Invalid date");
  const lessonDate = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
  const codes = uniqueCodes([input.studentCode, input.studentId]);

  const card = await prisma.rfidCard.findFirst({
    where: { organizationId, deletedAt: null, ...studentIdentityWhere(codes) },
  });

  const existing = await prisma.attendanceRecord.findFirst({
    where: { organizationId, lessonDate, ...studentIdentityWhere(codes) },
  });

  const data = {
    status: AttendanceStatus.EXCUSED,
    notes: input.reason || existing?.notes,
    studentName: card?.studentName || input.studentName || existing?.studentName || "Unknown Student",
    className: card?.className || input.className || existing?.className,
    level: card?.level ?? existing?.level,
    cardId: card?.id ?? existing?.cardId,
    cardNumber: card?.cardNumber ?? existing?.cardNumber,
  };

  if (existing) {
    return prisma.attendanceRecord.update({ where: { id: existing.id }, data });
  }

  return prisma.attendanceRecord.create({
    data: {
      organizationId,
      studentId: card?.studentId ?? input.studentId ?? input.studentCode,
      studentCode: card?.studentCode ?? input.studentCode,
      direction: TapDirection.ENTRY,
      lessonDate,
      ...data,
    },
  });
}

function isStaffAttendanceLevel(level: string | null | undefined) {
  return Boolean(level?.startsWith("STAFF:"));
}

function buildAttendanceRecordWhere(
  organizationId: string,
  query?: {
    date?: string;
    from?: string;
    to?: string;
    status?: string;
    className?: string;
    department?: string;
    staffRole?: string;
    checkoutStatus?: string;
    punctuality?: string;
    q?: string;
    personType?: string;
  }
) {
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (query?.from) {
    const from = new Date(query.from);
    dateFilter.gte = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()));
  }
  if (query?.to) {
    const to = new Date(query.to);
    dateFilter.lte = new Date(Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()));
  }
  if (!query?.from && !query?.to) {
    const day = query?.date ? new Date(query.date) : dateOnly();
    dateFilter.gte = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
    dateFilter.lte = dateFilter.gte;
  }

  const personFilter = query?.personType?.toUpperCase();

  const statusFilter = query?.status?.toUpperCase();
  const statusWhere =
    statusFilter === "PENDING_CHECKOUT"
      ? {
          entryTime: { not: null },
          exitTime: null,
          status: { notIn: [AttendanceStatus.ABSENT, AttendanceStatus.SUSPENDED] as AttendanceStatus[] },
        }
      : statusFilter
        ? { status: statusFilter as AttendanceStatus }
        : {};

  return {
    organizationId,
    lessonDate: dateFilter,
    ...statusWhere,
    ...(query?.className && personFilter !== "STAFF"
      ? { className: { contains: query.className.trim(), mode: "insensitive" as const } }
      : {}),
    ...(query?.department && personFilter === "STAFF"
      ? { className: { contains: query.department.trim(), mode: "insensitive" as const } }
      : {}),
    ...(query?.staffRole && personFilter === "STAFF"
      ? {
          AND: [
            { level: { startsWith: "STAFF:" } },
            { level: { contains: query.staffRole.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(query?.q
      ? {
          OR: [
            { studentName: { contains: query.q, mode: "insensitive" as const } },
            { studentCode: { contains: query.q, mode: "insensitive" as const } },
            { cardNumber: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(personFilter === "STAFF"
      ? { level: { startsWith: "STAFF:" } }
      : personFilter === "STUDENT"
        ? {
            OR: [{ level: null }, { NOT: { level: { startsWith: "STAFF:" } } }],
          }
        : {}),
  };
}

export async function listAttendance(
  organizationId: string,
  query?: {
    date?: string;
    from?: string;
    to?: string;
    status?: string;
    className?: string;
    q?: string;
    personType?: string;
  }
) {
  return prisma.attendanceRecord.findMany({
    where: buildAttendanceRecordWhere(organizationId, query),
    orderBy: [{ lessonDate: "desc" }, { entryTime: "desc" }, { createdAt: "desc" }],
  });
}

function withPersonType<T extends { level?: string | null }>(row: T) {
  return {
    ...row,
    personType: row.level?.startsWith("STAFF:") ? ("STAFF" as const) : ("STUDENT" as const),
  };
}

type AttendanceListQuery = {
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  className?: string;
  department?: string;
  staffRole?: string;
  checkoutStatus?: string;
  punctuality?: string;
  q?: string;
  personType?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
};

type RawAttendanceRecordRow = Awaited<ReturnType<typeof prisma.attendanceRecord.findMany>>[number];

/** Same row shape as Attendance → Records (includes schedule rules + display fields). */
export async function serializeAttendanceRecordsForApi(
  organizationId: string,
  rows: RawAttendanceRecordRow[]
) {
  if (!rows.length) return [];
  const settings = await getOrCreateSettings(organizationId);
  const { listActiveScheduleRules, resolveScheduleFromRules } = await import(
    "./attendance-schedule.service"
  );
  const scheduleRules = await listActiveScheduleRules(organizationId);

  return rows.map((row) => {
    const isStaff = Boolean(row.level?.startsWith("STAFF:"));
    const resolved = resolveScheduleFromRules(settings, scheduleRules, {
      lessonDate: row.lessonDate,
      className: row.className,
      isStaff,
    });
    const merged = {
      ...settings,
      schoolStarts: resolved.schoolStarts,
      lateStarts: resolved.lateStarts,
      schoolEnds: resolved.schoolEnds,
      attendanceClosingTime: resolved.attendanceClosingTime,
      enableLateDetection: resolved.enableLateDetection,
    };
    return serializeAttendanceRow(row, merged);
  });
}

function serializeAttendanceRow(
  row: RawAttendanceRecordRow,
  settings: Awaited<ReturnType<typeof getOrCreateSettings>>
) {
  const base = withPersonType(row);
  const isStaff = base.personType === "STAFF";
  const display = computeAttendanceDisplay(
    {
      status: row.status,
      entryTime: row.entryTime,
      exitTime: row.exitTime,
      lessonDate: row.lessonDate,
    },
    settings,
    { isStaff }
  );
  const department = isStaff ? staffDepartmentFromLevel(row.level, row.className) : null;
  const staffRole = isStaff ? staffRoleFromLevel(row.level) : null;

  return {
    ...base,
    lessonDate:
      row.lessonDate instanceof Date
        ? row.lessonDate.toISOString().slice(0, 10)
        : String(row.lessonDate).slice(0, 10),
    entryTime: row.entryTime?.toISOString() ?? null,
    exitTime: row.exitTime?.toISOString() ?? null,
    department,
    staffRole,
    groupLabel: isStaff ? department ?? "Staff" : row.className ?? "—",
    display,
    attendanceStatus: display.attendanceStatus,
    punctuality: display.punctuality,
    checkoutStatus: display.checkoutStatus,
    primaryBadge: display.primaryBadge,
    expectedArrival: display.expectedArrival,
    expectedDeparture: display.expectedDeparture,
  };
}

function filterByDisplayFields<T extends { display: ReturnType<typeof computeAttendanceDisplay> }>(
  rows: T[],
  query?: Pick<AttendanceListQuery, "checkoutStatus" | "punctuality">
) {
  let out = rows;
  if (query?.checkoutStatus) {
    const want = query.checkoutStatus.toUpperCase();
    out = out.filter((r) => r.display.checkoutStatus === want);
  }
  if (query?.punctuality) {
    const want = query.punctuality.toUpperCase();
    out = out.filter((r) => r.display.punctuality === want);
  }
  return out;
}

function attendanceOrderBy(sortBy?: string, sortDir?: string): Prisma.AttendanceRecordOrderByWithRelationInput[] {
  const dir = sortDir?.toLowerCase() === "asc" ? "asc" : "desc";
  switch (sortBy?.toLowerCase()) {
    case "name":
      return [{ studentName: dir }];
    case "class":
      return [{ className: dir }];
    case "checkin":
      return [{ entryTime: dir }];
    case "checkout":
      return [{ exitTime: dir }];
    case "status":
      return [{ status: dir }];
    default:
      return [{ lessonDate: dir }, { entryTime: dir }, { createdAt: dir }];
  }
}

export async function listAttendancePaged(organizationId: string, query?: AttendanceListQuery) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(query?.limit) || 25));
  const needsDisplayFilter = Boolean(query?.checkoutStatus || query?.punctuality);
  const where = buildAttendanceRecordWhere(organizationId, query);
  const settings = await getOrCreateSettings(organizationId);

  const { enrichMovementRecords } = await import("./people.service");
  const { listActiveScheduleRules, resolveScheduleFromRules } = await import(
    "./attendance-schedule.service"
  );
  const scheduleRules = await listActiveScheduleRules(organizationId);

  function serializeWithSchedule(row: Awaited<ReturnType<typeof prisma.attendanceRecord.findMany>>[number]) {
    const isStaff = Boolean(row.level?.startsWith("STAFF:"));
    const resolved = resolveScheduleFromRules(settings, scheduleRules, {
      lessonDate: row.lessonDate,
      className: row.className,
      isStaff,
    });
    const merged = {
      ...settings,
      schoolStarts: resolved.schoolStarts,
      lateStarts: resolved.lateStarts,
      schoolEnds: resolved.schoolEnds,
      attendanceClosingTime: resolved.attendanceClosingTime,
      enableLateDetection: resolved.enableLateDetection,
    };
    return {
      ...serializeAttendanceRow(row, merged),
      scheduleRuleName: resolved.ruleName ?? null,
    };
  }

  if (!needsDisplayFilter) {
    const [total, items] = await Promise.all([
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
        where,
        orderBy: attendanceOrderBy(query?.sortBy, query?.sortDir),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const withPhotos = await enrichMovementRecords(organizationId, items);
    return {
      items: withPhotos.map((row) => ({
        ...serializeWithSchedule(row),
        photoUrl: row.photoUrl ?? null,
        personType: row.personType,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  const all = await prisma.attendanceRecord.findMany({
    where,
    orderBy: attendanceOrderBy(query?.sortBy, query?.sortDir),
  });
  const withPhotos = await enrichMovementRecords(organizationId, all);
  const enriched = withPhotos.map((row) => ({
    ...serializeWithSchedule(row),
    photoUrl: row.photoUrl ?? null,
    personType: row.personType,
  }));
  const filtered = filterByDisplayFields(enriched, query);
  const total = filtered.length;
  const start = (page - 1) * limit;
  return {
    items: filtered.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function normalizeGroupLabel(value?: string | null) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

async function countAssignedCardsForSummary(
  organizationId: string,
  query?: AttendanceListQuery
): Promise<{ assigned: number }> {
  const cards = await prisma.rfidCard.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: { in: [CardStatus.ACTIVE, CardStatus.TEMPORARY] },
    },
    select: { level: true, notes: true, qrPayload: true, className: true, studentId: true, studentCode: true, cardNumber: true },
  });

  const personType = query?.personType?.toUpperCase();
  const wantStaff = personType === "STAFF";
  const wantStudents = personType === "STUDENT" || (!personType && personType !== "ALL" && personType !== "STAFF");
  const wantAll = personType === "ALL";

  const classFilter = query?.className?.trim();
  const deptFilter = (query?.department ?? query?.className)?.trim();

  const uniq = new Set<string>();
  for (const card of cards) {
    const staff = isStaffCard(card);
    if (!wantAll) {
      if (wantStaff && !staff) continue;
      if (wantStudents && staff) continue;
    }
    if (!staff && classFilter) {
      const cls = normalizeGroupLabel(card.className);
      const want = normalizeGroupLabel(classFilter);
      if (want && cls && cls !== want && !cls.includes(want) && !want.includes(cls)) continue;
    }
    if (staff && deptFilter) {
      const dept = normalizeGroupLabel(card.className);
      const want = normalizeGroupLabel(deptFilter);
      if (want && dept && dept !== want && !dept.includes(want) && !want.includes(dept)) {
        // best-effort: if department filter provided, keep matching or unknown
      }
    }
    const key =
      card.studentId?.trim() ||
      card.studentCode?.trim() ||
      card.cardNumber.trim();
    if (key) uniq.add(key.toLowerCase());
  }
  return { assigned: uniq.size };
}

export async function getAttendanceRecordsSummary(organizationId: string, query?: AttendanceListQuery) {
  const where = buildAttendanceRecordWhere(organizationId, query);
  const settings = await getOrCreateSettings(organizationId);
  const { listActiveScheduleRules, resolveScheduleFromRules } = await import(
    "./attendance-schedule.service"
  );
  const scheduleRules = await listActiveScheduleRules(organizationId);
  const [rows, assignedInfo] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      select: {
        status: true,
        entryTime: true,
        exitTime: true,
        lessonDate: true,
        level: true,
        className: true,
      },
    }),
    countAssignedCardsForSummary(organizationId, query),
  ]);

  let present = 0;
  let late = 0;
  let missingCheckout = 0;
  let absent = 0;

  for (const row of rows) {
    const isStaff = Boolean(row.level?.startsWith("STAFF:"));
    const resolved = resolveScheduleFromRules(settings, scheduleRules, {
      lessonDate: row.lessonDate,
      className: row.className,
      isStaff,
    });
    const merged = {
      ...settings,
      schoolStarts: resolved.schoolStarts,
      lateStarts: resolved.lateStarts,
      schoolEnds: resolved.schoolEnds,
      attendanceClosingTime: resolved.attendanceClosingTime,
      enableLateDetection: resolved.enableLateDetection,
      graceMinutes: resolved.graceMinutes,
    };
    const display = computeAttendanceDisplay(row, merged, { isStaff });
    if (display.attendanceStatus === "ABSENT") absent += 1;
    else if (display.attendanceStatus === "PRESENT") {
      present += 1;
      if (display.punctuality === "LATE") late += 1;
      if (display.checkoutStatus === "PENDING") missingCheckout += 1;
    }
  }

  const assigned = assignedInfo.assigned || 0;
  const tapped = present;
  // In range/tap-record summaries, "absent" from records may be 0; for denominators, notTapped = assigned - tapped (clamped)
  const notTapped = assigned > 0 ? Math.max(0, assigned - tapped) : absent;
  return {
    present,
    late,
    missingCheckout,
    absent: assigned > 0 ? notTapped : absent,
    total: rows.length,
    assigned,
    tapped,
    notTapped,
  };
}

export async function getAllClassesAttendanceTotals(organizationId: string, query?: AttendanceListQuery) {
  const { fetchClassesList } = await import("../clients/student-management.client");
  const [cards, smClasses] = await Promise.all([
    prisma.rfidCard.findMany({
      where: { organizationId, deletedAt: null, status: { in: [CardStatus.ACTIVE, CardStatus.TEMPORARY] } },
      select: { level: true, notes: true, qrPayload: true, className: true, studentId: true, studentCode: true, cardNumber: true },
    }).catch(() => []),
    fetchClassesList(organizationId).catch(() => []),
  ]);
  const studentCards = cards.filter((c) => !isStaffCard(c));

  const classAssigned = new Map<string, Set<string>>();
  const addAssigned = (clsRaw: string | null | undefined, key: string) => {
    const cls = String(clsRaw ?? "Unassigned").trim() || "Unassigned";
    const set = classAssigned.get(cls) ?? new Set<string>();
    const k = String(key || "").trim().toLowerCase();
    if (k) set.add(k);
    classAssigned.set(cls, set);
  };
  for (const c of studentCards) {
    addAssigned(c.className, c.studentId || c.studentCode || c.cardNumber);
  }

  const allClassNames = new Set<string>([...classAssigned.keys()]);
  for (const c of smClasses) {
    const label = String((c as any).label || (c as any).name || "").trim();
    if (label) allClassNames.add(label);
  }

  const settings = await getOrCreateSettings(organizationId);
  const { listActiveScheduleRules, resolveScheduleFromRules } = await import("./attendance-schedule.service");
  const scheduleRules = await listActiveScheduleRules(organizationId);

  const where = buildAttendanceRecordWhere(organizationId, { ...(query || {}), personType: "STUDENT", className: undefined });
  const rows = await prisma.attendanceRecord.findMany({
    where,
    select: {
      status: true,
      entryTime: true,
      exitTime: true,
      lessonDate: true,
      level: true,
      className: true,
    },
  });

  const buckets = new Map<string, { className: string; present: number; late: number; missingCheckout: number }>();
  const ensureBucket = (className: string) => {
    const key = className || "Unassigned";
    if (!buckets.has(key)) buckets.set(key, { className: key, present: 0, late: 0, missingCheckout: 0 });
    return buckets.get(key)!;
  };

  const settingsCache = new Map<string, any>();
  for (const row of rows) {
    const cls = String(row.className ?? "Unassigned").trim() || "Unassigned";
    allClassNames.add(cls);
    const isStaff = Boolean(row.level?.startsWith("STAFF:"));
    const ruleKey = `${row.lessonDate?.toISOString?.().slice(0,10) ?? ""}|${cls}|${isStaff ? "S" : "P"}`;
    let merged = settingsCache.get(ruleKey);
    if (!merged) {
      const resolved = resolveScheduleFromRules(settings, scheduleRules, {
        lessonDate: row.lessonDate,
        className: row.className,
        isStaff,
      });
      merged = {
        ...settings,
        schoolStarts: resolved.schoolStarts,
        lateStarts: resolved.lateStarts,
        schoolEnds: resolved.schoolEnds,
        attendanceClosingTime: resolved.attendanceClosingTime,
        enableLateDetection: resolved.enableLateDetection,
        graceMinutes: resolved.graceMinutes,
      };
      settingsCache.set(ruleKey, merged);
    }
    const display = computeAttendanceDisplay(row as any, merged, { isStaff });
    if (display.attendanceStatus === "PRESENT") {
      const b = ensureBucket(cls);
      b.present += 1;
      if (display.punctuality === "LATE") b.late += 1;
      if (display.checkoutStatus === "PENDING") b.missingCheckout += 1;
    }
  }

  const results = [...allClassNames].sort((a, b) => a.localeCompare(b)).map((className) => {
    const b = buckets.get(className) || { className, present: 0, late: 0, missingCheckout: 0 };
    const assigned = classAssigned.get(className)?.size ?? 0;
    const tapped = b.present;
    const notTapped = assigned > 0 ? Math.max(0, assigned - tapped) : 0;
    return {
      className,
      assigned,
      tapped,
      notTapped,
      late: b.late,
      missingCheckout: b.missingCheckout,
      present: tapped,
    };
  });

  const totals = results.reduce(
    (acc, r) => {
      acc.assigned += r.assigned;
      acc.tapped += r.tapped;
      acc.notTapped += r.notTapped;
      acc.late += r.late;
      acc.missingCheckout += r.missingCheckout;
      return acc;
    },
    { assigned: 0, tapped: 0, notTapped: 0, late: 0, missingCheckout: 0 }
  );

  return { classes: results, totals, period: { from: query?.from, to: query?.to, date: query?.date } };
}

export async function getAttendanceFilterOptions(organizationId: string) {
  const { fetchClassesList } = await import("../clients/student-management.client");
  const { fetchOrganizationStaffWithMeta, fetchOrganizationDepartments } = await import("../clients/staff-integration.client");

  const withTimeout = async <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        p,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const [smClasses, staffMeta, dbClasses, hrDepartments] = await Promise.all([
    withTimeout(fetchClassesList(organizationId).catch(() => []), 8000, [] as Array<{ id: string; name: string; stream?: string | null; label: string }>),
    withTimeout(fetchOrganizationStaffWithMeta(organizationId).catch(() => ({ rows: [] as any[], meta: {} as any })), 10000, { rows: [] as any[], meta: {} as any }),
    prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        className: { not: null },
        OR: [{ level: null }, { NOT: { level: { startsWith: "STAFF:" } } }],
      },
      distinct: ["className"],
      select: { className: true },
      take: 300,
    }).catch(() => [] as Array<{ className: string | null }>),
    withTimeout(fetchOrganizationDepartments(organizationId).catch(() => [] as string[]), 8000, [] as string[]),
  ]);

  const classSet = new Set<string>();
  for (const c of smClasses) {
    const label = (c.label || c.name || '').trim();
    if (label) classSet.add(label);
  }
  for (const c of dbClasses) {
    if (c.className?.trim()) classSet.add(c.className.trim());
  }

  const deptSet = new Set<string>();
  const roleSet = new Set<string>();
  for (const name of hrDepartments) {
    const n = String(name || '').trim();
    if (n) deptSet.add(n);
  }
  for (const member of staffMeta.rows || []) {
    const dep = String((member as any).department || '').trim();
    const pos = String((member as any).position || '').trim();
    if (dep) deptSet.add(dep);
    if (pos) roleSet.add(pos);
  }

  return {
    classes: [...classSet].sort((a, b) => a.localeCompare(b)),
    departments: [...deptSet].sort((a, b) => a.localeCompare(b)),
    staffRoles: [...roleSet].sort((a, b) => a.localeCompare(b)),
    sources: {
      studentManagement: smClasses.length > 0,
      hrIam: (staffMeta.rows || []).length > 0 || hrDepartments.length > 0,
    },
  };
}

export async function getAttendanceRecordDetail(organizationId: string, id: string) {
  const record = await prisma.attendanceRecord.findFirst({ where: { id, organizationId } });
  if (!record) throw new AppError(404, "Attendance record not found");

  const settings = await getOrCreateSettings(organizationId);
  const { enrichMovementRecords } = await import("./people.service");
  const [withPhoto] = await enrichMovementRecords(organizationId, [record]);
  const { resolveScheduleFromRules, listActiveScheduleRules } = await import(
    "./attendance-schedule.service"
  );
  const rules = await listActiveScheduleRules(organizationId);
  const isStaff = Boolean(record.level?.startsWith("STAFF:"));
  const resolved = resolveScheduleFromRules(settings, rules, {
    lessonDate: record.lessonDate,
    className: record.className,
    isStaff,
  });
  const merged = {
    ...settings,
    schoolStarts: resolved.schoolStarts,
    lateStarts: resolved.lateStarts,
    schoolEnds: resolved.schoolEnds,
    attendanceClosingTime: resolved.attendanceClosingTime,
    enableLateDetection: resolved.enableLateDetection,
  };
  const serialized = {
    ...serializeAttendanceRow(record, merged),
    photoUrl: withPhoto?.photoUrl ?? null,
    personType: withPhoto?.personType ?? (isStaff ? "STAFF" : "STUDENT"),
    scheduleRuleName: resolved.ruleName ?? null,
  };

  const dayStart = new Date(record.lessonDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(record.lessonDate);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const [syncEvents, audits, alerts] = await Promise.all([
    record.cardNumber
      ? prisma.gateSyncEvent.findMany({
          where: {
            organizationId,
            cardNumber: record.cardNumber,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
          orderBy: { createdAt: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    prisma.auditLog.findMany({
      where: { organizationId, entityId: record.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.securityAlert.findMany({
      where: {
        organizationId,
        createdAt: { gte: dayStart, lte: dayEnd },
        OR: [
          ...(record.studentId ? [{ relatedId: record.studentId }] : []),
          { message: { contains: record.studentName, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  type TimelineEvent = {
    id: string;
    kind: string;
    label: string;
    at: string;
    detail?: string | null;
    meta?: Record<string, unknown>;
  };

  const timeline: TimelineEvent[] = [];

  if (record.entryTime) {
    timeline.push({
      id: `${record.id}-entry`,
      kind: "ARRIVAL",
      label: "First arrival scan",
      at: record.entryTime.toISOString(),
      detail: record.gateName ?? record.deviceCode ?? undefined,
      meta: { deviceCode: record.deviceCode, cardNumber: record.cardNumber },
    });
  }

  if (displayLateNote(serialized.display)) {
    timeline.push({
      id: `${record.id}-late`,
      kind: "LATE",
      label: "Marked late",
      at: record.entryTime?.toISOString() ?? record.createdAt.toISOString(),
      detail: `Expected by ${merged.lateStarts}`,
    });
  }

  for (const ev of syncEvents) {
    timeline.push({
      id: ev.eventId,
      kind: "SCAN",
      label: "Gate scan (sync)",
      at: ev.createdAt.toISOString(),
      detail: ev.cardNumber,
      meta: { deviceId: ev.deviceId },
    });
  }

  if (record.exitTime) {
    timeline.push({
      id: `${record.id}-exit`,
      kind: "DEPARTURE",
      label: "Final check-out",
      at: record.exitTime.toISOString(),
      detail: record.gateName ?? record.deviceCode ?? undefined,
    });
  } else if (record.entryTime && serialized.display.checkoutStatus === "PENDING") {
    timeline.push({
      id: `${record.id}-pending-exit`,
      kind: "WARNING",
      label: "Check-out pending",
      at: new Date().toISOString(),
      detail: "No valid exit scan recorded for this day",
    });
  }

  for (const a of audits) {
    timeline.push({
      id: a.id,
      kind: "CORRECTION",
      label: a.action,
      at: a.createdAt.toISOString(),
      detail: a.detail,
      meta: { actorUserId: a.actorUserId },
    });
  }

  for (const alert of alerts) {
    timeline.push({
      id: alert.id,
      kind: "ALERT",
      label: alert.title,
      at: alert.createdAt.toISOString(),
      detail: alert.message,
      meta: { severity: alert.severity },
    });
  }

  timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return { record: serialized, timeline, timezone: "Africa/Kigali" };
}

function displayLateNote(display: ReturnType<typeof computeAttendanceDisplay>) {
  return display.punctuality === "LATE";
}

export async function notifyAbsentToday(organizationId: string) {
  const today = dateOnly();
  const records = await prisma.attendanceRecord.findMany({
    where: {
      organizationId,
      lessonDate: today,
      status: AttendanceStatus.ABSENT,
    },
  });
  for (const row of records) {
    await queueParentNotify(
      organizationId,
      row.studentName,
      row.studentId,
      "absent",
      new Date(),
      row.className,
      {
        studentCode: row.studentCode,
        cardNumber: row.cardNumber,
        gateName: row.gateName,
        status: row.status,
      }
    );
  }
  return { notified: records.length };
}

/* ─── Parents / Permissions / Reports / Security ────────── */

export async function listParents(organizationId: string) {
  return prisma.parentContact.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function createParent(organizationId: string, body: Record<string, unknown>) {
  return prisma.parentContact.create({
    data: {
      organizationId,
      studentId: body.studentId as string | undefined,
      studentCode: body.studentCode as string | undefined,
      studentName: String(body.studentName ?? ""),
      className: body.className as string | undefined,
      parentName: String(body.parentName ?? ""),
      relationship: String(body.relationship ?? "GUARDIAN"),
      phone: body.phone as string | undefined,
      email: body.email as string | undefined,
      whatsapp: body.whatsapp as string | undefined,
      isEmergency: Boolean(body.isEmergency),
    },
  });
}

export async function listNotifications(organizationId: string) {
  return prisma.parentNotification.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listPermissions(organizationId: string, status?: string) {
  return prisma.permissionRequest.findMany({
    where: {
      organizationId,
      ...(status ? { status: status as PermissionStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPermission(organizationId: string, body: Record<string, unknown>) {
  return prisma.permissionRequest.create({
    data: {
      organizationId,
      parentId: body.parentId as string | undefined,
      studentId: body.studentId as string | undefined,
      studentName: String(body.studentName ?? ""),
      className: body.className as string | undefined,
      type: (body.type as PermissionType) || PermissionType.LEAVE,
      reason: body.reason as string | undefined,
      forDate: body.forDate ? new Date(String(body.forDate)) : dateOnly(),
    },
  });
}

export async function reviewPermission(
  organizationId: string,
  id: string,
  status: "APPROVED" | "REJECTED",
  reviewedBy?: string,
  reviewNote?: string
) {
  const row = await prisma.permissionRequest.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Permission not found");
  return prisma.permissionRequest.update({
    where: { id },
    data: {
      status: status === "APPROVED" ? PermissionStatus.APPROVED : PermissionStatus.REJECTED,
      reviewedBy,
      reviewNote,
      reviewedAt: new Date(),
    },
  });
}

export async function listAlerts(organizationId: string) {
  return prisma.securityAlert.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function resolveAlert(organizationId: string, id: string) {
  return prisma.securityAlert.updateMany({
    where: { id, organizationId },
    data: { resolved: true },
  });
}

export async function listAudit(organizationId: string) {
  return prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function schoolDaySummary(organizationId: string) {
  const today = dateOnly();
  const [dash, devices, firstStudent, studentRecordCount] = await Promise.all([
    dashboard(organizationId),
    listDevices(organizationId),
    prisma.attendanceRecord.findFirst({
      where: {
        organizationId,
        lessonDate: today,
        entryTime: { not: null },
        NOT: { level: { startsWith: "STAFF:" } },
      },
      orderBy: { entryTime: "asc" },
      select: { entryTime: true },
    }),
    prisma.attendanceRecord.count({
      where: {
        organizationId,
        lessonDate: today,
        NOT: { level: { startsWith: "STAFF:" } },
      },
    }),
  ]);

  const lastSeen = devices.reduce<Date | null>((max, d) => {
    const t = d.lastSeenAt ? new Date(d.lastSeenAt) : null;
    if (!t || Number.isNaN(t.getTime())) return max;
    if (!max || t > max) return t;
    return max;
  }, null);

  const firstAttendanceTime = firstStudent?.entryTime
    ? firstStudent.entryTime.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;

  return {
    organizationName: dash.organizationName,
    studentRecordCount,
    firstAttendanceTime,
    lastDeviceSync: lastSeen?.toISOString() ?? null,
    kpis: dash.kpis,
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      lastSeenAt: d.lastSeenAt ? new Date(d.lastSeenAt).toISOString() : null,
      batteryPercent: d.batteryPercent ?? null,
    })),
  };
}

export async function listSecurityAlertsService(organizationId: string, take = 20) {
  const rows = await prisma.securityAlert.findMany({
    where: { organizationId, resolved: false },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.relatedType ?? r.title,
    severity: r.severity,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
    resolved: r.resolved,
  }));
}

export async function reportsSummary(organizationId: string) {
  const today = dateOnly();
  const dayKeys: string[] = [];
  const dayDates: Date[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - offset);
    dayDates.push(d);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const rangeStart = dayDates[0]!;

  const studentOnlyWhere = (
    lessonDate?: Date | { gte: Date; lte: Date }
  ): Prisma.AttendanceRecordWhereInput => ({
    organizationId,
    OR: [{ level: null }, { NOT: { level: { startsWith: "STAFF:" } } }],
    ...(lessonDate ? { lessonDate } : {}),
  });

  const [daily, weekRecords, todayStudentRecords, late] = await Promise.all([
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: studentOnlyWhere(today),
      _count: true,
    }),
    prisma.attendanceRecord.findMany({
      where: studentOnlyWhere({ gte: rangeStart, lte: today }),
      select: { lessonDate: true },
    }),
    prisma.attendanceRecord.findMany({
      where: studentOnlyWhere(today),
      select: {
        className: true,
        studentId: true,
        studentCode: true,
        studentName: true,
        status: true,
        id: true,
      },
    }),
    prisma.attendanceRecord.count({
      where: {
        organizationId,
        lessonDate: today,
        status: AttendanceStatus.LATE,
        OR: [{ level: null }, { NOT: { level: { startsWith: "STAFF:" } } }],
      },
    }),
  ]);

  const tapsByDay = new Map(dayKeys.map((k) => [k, 0]));
  for (const row of weekRecords) {
    const key = row.lessonDate.toISOString().slice(0, 10);
    if (tapsByDay.has(key)) tapsByDay.set(key, (tapsByDay.get(key) ?? 0) + 1);
  }
  const weekly = dayKeys.map((lessonDate) => ({
    lessonDate,
    _count: tapsByDay.get(lessonDate) ?? 0,
  }));

  const classAttended = new Map<string, Set<string>>();
  for (const row of todayStudentRecords) {
    if (!studentAttendedToday(row.status)) continue;
    const cls = row.className?.trim() || "Unassigned";
    const bucket = classAttended.get(cls) ?? new Set<string>();
    bucket.add(attendancePersonKey(row));
    classAttended.set(cls, bucket);
  }
  const byClass = [...classAttended.entries()]
    .map(([className, keys]) => ({ className, _count: keys.size }))
    .sort((a, b) => b._count - a._count);

  return { daily, weekly, byClass, lateToday: late };
}

/* -- Multi-school device links & staff access sync (service APIs) - */

export async function syncStaffSchoolAccess(
  organizationId: string,
  records: Array<{
    staffKey: string;
    iamUserId?: string | null;
    email?: string | null;
    externalId?: string | null;
    source?: string | null;
    status?: string;
  }>
) {
  const org = String(organizationId || "").trim();
  if (!org) throw new AppError(400, "organizationId is required");
  const rows = Array.isArray(records) ? records : [];
  const now = new Date();
  let upserted = 0;
  for (const r of rows) {
    const staffKey = String(r.staffKey || "").trim();
    if (!staffKey) continue;
    const status = String(r.status || "ACTIVE").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    await prisma.attendanceStaffSchoolAccess.upsert({
      where: { organizationId_staffKey: { organizationId: org, staffKey } },
      create: {
        organizationId: org,
        staffKey,
        iamUserId: normalizeKeyPart(r.iamUserId),
        email: normalizeEmailKey(r.email),
        externalId: normalizeKeyPart(r.externalId),
        source: normalizeKeyPart(r.source),
        status,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        iamUserId: normalizeKeyPart(r.iamUserId),
        email: normalizeEmailKey(r.email),
        externalId: normalizeKeyPart(r.externalId),
        source: normalizeKeyPart(r.source),
        status,
        updatedAt: now,
      },
    });
    upserted += 1;
  }
  return { organizationId: org, upserted };
}

export async function removeStaffSchoolAccess(organizationId: string, staffKeys: string[]) {
  const org = String(organizationId || "").trim();
  const keys = (Array.isArray(staffKeys) ? staffKeys : [])
    .map((k) => String(k || "").trim())
    .filter(Boolean);
  if (!org || !keys.length) return { organizationId: org, removed: 0 };
  const res = await prisma.attendanceStaffSchoolAccess.updateMany({
    where: { organizationId: org, staffKey: { in: keys } },
    data: { status: "INACTIVE", updatedAt: new Date() },
  });
  return { organizationId: org, removed: res.count };
}
