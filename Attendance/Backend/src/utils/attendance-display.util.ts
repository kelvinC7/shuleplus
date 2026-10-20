import { AttendanceStatus } from "../generated/prisma";

export type Punctuality = "ON_TIME" | "LATE" | "EARLY" | "UNKNOWN";
export type CheckoutStatus = "COMPLETE" | "PENDING" | "NOT_APPLICABLE" | "EARLY_DEPARTURE";
export type AttendancePresence = "PRESENT" | "ABSENT" | "EXCUSED" | "PENDING";

export interface ScheduleSettings {
  schoolStarts: string;
  lateStarts: string;
  schoolEnds: string;
  attendanceClosingTime: string;
  graceMinutes: number;
  enableLateDetection: boolean;
}

export interface AttendanceDisplay {
  attendanceStatus: AttendancePresence;
  punctuality: Punctuality;
  checkoutStatus: CheckoutStatus;
  /** Primary badge for compact UI (may differ from raw DB status). */
  primaryBadge: string;
  expectedArrival: string;
  expectedDeparture: string;
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesInTz(d: Date, tz = "Africa/Kigali"): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function dateIsoInTz(d: Date, tz = "Africa/Kigali"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    d
  );
}

const EXCUSED = new Set<AttendanceStatus>([
  AttendanceStatus.EXCUSED,
  AttendanceStatus.PERMISSION,
  AttendanceStatus.HALF_DAY,
]);

const ABSENT_LIKE = new Set<AttendanceStatus>([AttendanceStatus.ABSENT, AttendanceStatus.SUSPENDED]);

export function computeAttendanceDisplay(
  record: {
    status: AttendanceStatus;
    entryTime: Date | null;
    exitTime: Date | null;
    lessonDate: Date;
  },
  settings: ScheduleSettings,
  now: Date = new Date()
): AttendanceDisplay {
  const expectedArrival = settings.schoolStarts;
  const expectedDeparture = settings.schoolEnds;

  if (EXCUSED.has(record.status)) {
    return {
      attendanceStatus: "EXCUSED",
      punctuality: "UNKNOWN",
      checkoutStatus: "NOT_APPLICABLE",
      primaryBadge: record.status,
      expectedArrival,
      expectedDeparture,
    };
  }

  if (ABSENT_LIKE.has(record.status)) {
    return {
      attendanceStatus: "ABSENT",
      punctuality: "UNKNOWN",
      checkoutStatus: "NOT_APPLICABLE",
      primaryBadge: "ABSENT",
      expectedArrival,
      expectedDeparture,
    };
  }

  const lessonIso = dateIsoInTz(record.lessonDate);
  const todayIso = dateIsoInTz(now);
  const hasEntry = Boolean(record.entryTime);
  const hasExit = Boolean(record.exitTime);

  if (!hasEntry) {
    const pastDay = lessonIso < todayIso;
    const closingMins = parseHm(settings.attendanceClosingTime);
    const nowMins = minutesInTz(now);
    const isToday = lessonIso === todayIso;
    const pastCutoff = isToday && nowMins >= closingMins;
    const absentFinal = pastDay || pastCutoff;

    return {
      attendanceStatus: absentFinal ? "ABSENT" : "PENDING",
      punctuality: "UNKNOWN",
      checkoutStatus: "NOT_APPLICABLE",
      primaryBadge: absentFinal ? "ABSENT" : "PENDING",
      expectedArrival,
      expectedDeparture,
    };
  }

  let punctuality: Punctuality = "ON_TIME";
  if (settings.enableLateDetection && record.entryTime) {
    if (record.status === AttendanceStatus.LATE) {
      punctuality = "LATE";
    } else {
      const entryMins = minutesInTz(record.entryTime);
      const lateThreshold = parseHm(settings.lateStarts) + (settings.graceMinutes ?? 0);
      punctuality = entryMins > lateThreshold ? "LATE" : "ON_TIME";
    }
  }

  let checkoutStatus: CheckoutStatus = "PENDING";
  if (hasExit && record.exitTime) {
    if (record.status === AttendanceStatus.EARLY_DEPARTURE) {
      checkoutStatus = "EARLY_DEPARTURE";
    } else {
      const exitMins = minutesInTz(record.exitTime);
      const endMins = parseHm(expectedDeparture);
      checkoutStatus = exitMins < endMins ? "EARLY_DEPARTURE" : "COMPLETE";
    }
  } else if (record.status === AttendanceStatus.ENTERED_ONLY) {
    checkoutStatus = "PENDING";
  }

  let primaryBadge = "PRESENT";
  if (punctuality === "LATE") primaryBadge = "LATE";
  if (checkoutStatus === "EARLY_DEPARTURE") primaryBadge = "EARLY_DEPARTURE";

  return {
    attendanceStatus: "PRESENT",
    punctuality,
    checkoutStatus,
    primaryBadge,
    expectedArrival,
    expectedDeparture,
  };
}

export function staffDepartmentFromLevel(level: string | null | undefined, className: string | null | undefined) {
  if (className?.trim()) return className.trim();
  if (!level?.startsWith("STAFF:")) return null;
  return level.slice("STAFF:".length).trim() || "Staff";
}

export function staffRoleFromLevel(level: string | null | undefined): string | null {
  if (!level?.startsWith("STAFF:")) return null;
  const role = level.slice("STAFF:".length).trim();
  return role || null;
}
