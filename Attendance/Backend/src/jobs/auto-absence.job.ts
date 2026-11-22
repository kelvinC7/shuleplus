import { listStudentAttendanceRoster } from "../services/attendance-roster.service";
import {
  isDisciplineIntegrationEnabled,
  listAutoAbsenceEnabledOrgs,
  markAutoAbsenceRun,
  tryDisciplineAttendanceEvent,
} from "../clients/discipline.client";

const TZ = "Africa/Kigali";

function isoInKigali(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function yesterdayIso(todayIso: string): string {
  const d = new Date(`${todayIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isWeekday(iso: string): boolean {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function previousWeekday(iso: string): string {
  let cur = iso;
  for (let i = 0; i < 7; i++) {
    cur = yesterdayIso(cur);
    if (isWeekday(cur)) return cur;
  }
  return iso;
}

async function loadAllAbsentStudents(organizationId: string, date: string) {
  const limit = 100;
  const all: Array<{ studentId?: string; studentCode?: string; studentName: string; className?: string }> = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 50; page++) {
    const result = await listStudentAttendanceRoster(organizationId, {
      date,
      status: "ABSENT",
      page,
      limit,
    });
    const items = (result as any)?.items ?? (result as any)?.data?.items ?? [];
    for (const row of items) {
      const studentName = String(row.studentName ?? "").trim();
      if (!studentName) continue;
      const key =
        String(row.studentId ?? "").trim() ||
        String(row.studentCode ?? "").trim() ||
        `${studentName.toLowerCase()}|${row.className ?? row.groupLabel ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({
        studentId: row.studentId ?? undefined,
        studentCode: row.studentCode ?? undefined,
        studentName,
        className: row.className ?? row.groupLabel ?? undefined,
      });
    }
    if (items.length < limit) break;
  }
  return all;
}

let running = false;

/**
 * Automatically apply absence deductions for the last completed school day.
 * Idempotent: Discipline skips duplicate [auto:absence:<date>] cases and we
 * record autoAbsenceLastRunDate per organization.
 */
export async function runAutoAbsenceDeductionsOnce(): Promise<void> {
  if (running) return;
  if (!isDisciplineIntegrationEnabled()) return;
  running = true;
  try {
    const today = isoInKigali();
    const target = previousWeekday(today);
    if (!isWeekday(target) || target >= today) return;

    const orgs = await listAutoAbsenceEnabledOrgs();
    for (const org of orgs) {
      try {
        if (!org.organizationId) continue;
        if (org.autoAbsenceLastRunDate && org.autoAbsenceLastRunDate >= target) continue;

        const students = await loadAllAbsentStudents(org.organizationId, target);
        if (students.length > 0) {
          await tryDisciplineAttendanceEvent(org.organizationId, {
            event: "ABSENCE",
            date: target,
            students,
            recordedBy: "attendance-auto",
          });
        }
        // Mark run even when no absentees are found to avoid rescanning the same day.
        await markAutoAbsenceRun(org.organizationId, target);
      } catch (err) {
        console.error(`[auto-absence] org ${org.organizationId} failed for ${target}:`, err);
      }
    }
  } catch (err) {
    console.error("[auto-absence] scheduler tick failed:", err);
  } finally {
    running = false;
  }
}

export function startAutoAbsenceScheduler() {
  // Delayed initial run, then every 30 minutes.
  setTimeout(() => void runAutoAbsenceDeductionsOnce(), 60_000);
  setInterval(() => void runAutoAbsenceDeductionsOnce(), 30 * 60_000);
  console.log("[auto-absence] scheduler started (daily automatic absence deductions)");
}
