import { Prisma } from "../generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import type { AttendanceSettings } from "../generated/prisma";
import { z } from "zod";

const WEEKDAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type ResolvedScheduleTimes = {
  schoolStarts: string;
  lateStarts: string;
  schoolEnds: string;
  attendanceClosingTime: string;
  graceMinutes: number;
  enableLateDetection: boolean;
  ruleId?: string;
  ruleName?: string;
};

const ruleBodySchema = z.object({
  name: z.string().min(2).max(120),
  scope: z.enum(["SCHOOL", "CLASS"]),
  className: z.string().max(120).optional().nullable(),
  recurrence: z.enum(["EVERY_DAY", "WEEKDAYS", "SPECIFIC_DATE"]),
  weekdays: z.array(z.enum(WEEKDAYS)).optional().nullable(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  schoolStarts: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  lateStarts: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  schoolEnds: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  staffStarts: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  staffEnds: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

function parseDateOnly(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function dateIsoInTz(d: Date, tz = "Africa/Kigali"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    d
  );
}

function weekdayInKigali(d: Date): Weekday {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Kigali", weekday: "long" })
    .format(d)
    .toUpperCase();
  return name as Weekday;
}

function normalizeClassName(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function inEffectiveRange(lessonDate: Date, from?: Date | null, to?: Date | null) {
  const day = dateIsoInTz(lessonDate);
  if (from) {
    const fromIso = dateIsoInTz(from);
    if (day < fromIso) return false;
  }
  if (to) {
    const toIso = dateIsoInTz(to);
    if (day > toIso) return false;
  }
  return true;
}

function ruleMatchesDay(
  rule: {
    recurrence: string;
    weekdays: unknown;
    specificDate: Date | null;
  },
  lessonDate: Date
) {
  if (rule.recurrence === "SPECIFIC_DATE") {
    if (!rule.specificDate) return false;
    return dateIsoInTz(rule.specificDate) === dateIsoInTz(lessonDate);
  }
  if (rule.recurrence === "EVERY_DAY") return true;
  const wd = weekdayInKigali(lessonDate);
  const list = Array.isArray(rule.weekdays) ? (rule.weekdays as string[]) : [];
  if (!list.length) return false;
  return list.map((d) => d.toUpperCase()).includes(wd);
}

function rulePriority(rule: { recurrence: string; scope: string }) {
  if (rule.recurrence === "SPECIFIC_DATE") return rule.scope === "CLASS" ? 100 : 90;
  if (rule.recurrence === "WEEKDAYS") return rule.scope === "CLASS" ? 80 : 70;
  return rule.scope === "CLASS" ? 60 : 50;
}

function mergeRuleOntoBase(
  base: AttendanceSettings,
  rule: {
    id: string;
    name: string;
    schoolStarts: string | null;
    lateStarts: string | null;
    schoolEnds: string | null;
    staffStarts: string | null;
    staffEnds: string | null;
  },
  isStaff: boolean
): ResolvedScheduleTimes {
  const staffStarts = rule.staffStarts ?? base.schoolStarts;
  const staffEnds = rule.staffEnds ?? base.schoolEnds;
  return {
    schoolStarts: isStaff ? staffStarts : (rule.schoolStarts ?? base.schoolStarts),
    lateStarts: rule.lateStarts ?? base.lateStarts,
    schoolEnds: isStaff ? staffEnds : (rule.schoolEnds ?? base.schoolEnds),
    attendanceClosingTime: base.attendanceClosingTime,
    graceMinutes: base.graceMinutes,
    enableLateDetection: base.enableLateDetection,
    ruleId: rule.id,
    ruleName: rule.name,
  };
}

export function resolveScheduleFromRules(
  base: AttendanceSettings,
  rules: Array<{
    id: string;
    name: string;
    scope: string;
    className: string | null;
    recurrence: string;
    weekdays: unknown;
    specificDate: Date | null;
    effectiveFrom: Date | null;
    effectiveTo: Date | null;
    schoolStarts: string | null;
    lateStarts: string | null;
    schoolEnds: string | null;
    staffStarts: string | null;
    staffEnds: string | null;
    isActive: boolean;
  }>,
  ctx: { lessonDate: Date; className?: string | null; isStaff?: boolean }
): ResolvedScheduleTimes {
  const isStaff = Boolean(ctx.isStaff);
  const classKey = normalizeClassName(ctx.className);

  const candidates = rules.filter((rule) => {
    if (!rule.isActive) return false;
    if (!inEffectiveRange(ctx.lessonDate, rule.effectiveFrom, rule.effectiveTo)) return false;
    if (!ruleMatchesDay(rule, ctx.lessonDate)) return false;
    if (rule.scope === "CLASS") {
      if (!classKey) return false;
      return normalizeClassName(rule.className) === classKey;
    }
    return true;
  });

  if (!candidates.length) {
    return {
      schoolStarts: base.schoolStarts,
      lateStarts: base.lateStarts,
      schoolEnds: base.schoolEnds,
      attendanceClosingTime: base.attendanceClosingTime,
      graceMinutes: base.graceMinutes,
      enableLateDetection: base.enableLateDetection,
    };
  }

  candidates.sort((a, b) => rulePriority(b) - rulePriority(a));
  return mergeRuleOntoBase(base, candidates[0]!, isStaff);
}

export async function listScheduleRules(organizationId: string) {
  return prisma.attendanceScheduleRule.findMany({
    where: { organizationId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });
}

export async function listActiveScheduleRules(organizationId: string) {
  return prisma.attendanceScheduleRule.findMany({
    where: { organizationId, isActive: true },
  });
}

function serializeRule(row: Awaited<ReturnType<typeof listScheduleRules>>[number]) {
  return {
    ...row,
    specificDate: row.specificDate ? dateIsoInTz(row.specificDate) : null,
    effectiveFrom: row.effectiveFrom ? dateIsoInTz(row.effectiveFrom) : null,
    effectiveTo: row.effectiveTo ? dateIsoInTz(row.effectiveTo) : null,
    weekdays: Array.isArray(row.weekdays) ? row.weekdays : [],
  };
}

export async function getScheduleRulesSummary(organizationId: string) {
  const rules = await listScheduleRules(organizationId);
  const active = rules.filter((r) => r.isActive);
  return {
    total: rules.length,
    active: active.length,
    classRules: active.filter((r) => r.scope === "CLASS").length,
    weekdayRules: active.filter((r) => r.recurrence === "WEEKDAYS").length,
    dateOverrides: active.filter((r) => r.recurrence === "SPECIFIC_DATE").length,
    rules: rules.map(serializeRule),
  };
}

function validateRuleBody(body: z.infer<typeof ruleBodySchema>) {
  if (body.scope === "CLASS" && !body.className?.trim()) {
    throw new AppError(400, "Class name is required for class-based schedules");
  }
  if (body.recurrence === "WEEKDAYS" && (!body.weekdays || body.weekdays.length === 0)) {
    throw new AppError(400, "Select at least one weekday");
  }
  if (body.recurrence === "SPECIFIC_DATE" && !body.specificDate) {
    throw new AppError(400, "Specific date is required for date overrides");
  }
  const hasTime =
    body.schoolStarts || body.lateStarts || body.schoolEnds || body.staffStarts || body.staffEnds;
  if (!hasTime) {
    throw new AppError(400, "Set at least one arrival or departure time");
  }
}

function detectConflicts(
  organizationId: string,
  existing: Awaited<ReturnType<typeof listScheduleRules>>,
  candidate: {
    id?: string;
    scope: string;
    className?: string | null;
    recurrence: string;
    weekdays?: string[] | null;
    specificDate?: string | null;
  }
) {
  const warnings: string[] = [];
  for (const rule of existing) {
    if (candidate.id && rule.id === candidate.id) continue;
    if (!rule.isActive) continue;
    if (rule.scope !== candidate.scope) continue;
    if (rule.scope === "CLASS" && normalizeClassName(rule.className) !== normalizeClassName(candidate.className)) {
      continue;
    }
    if (rule.recurrence === "SPECIFIC_DATE" && candidate.recurrence === "SPECIFIC_DATE") {
      const a = rule.specificDate ? dateIsoInTz(rule.specificDate) : "";
      const b = candidate.specificDate ?? "";
      if (a && a === b) {
        warnings.push(`Overlaps date override “${rule.name}” on ${a}`);
      }
    }
    if (rule.recurrence === "WEEKDAYS" && candidate.recurrence === "WEEKDAYS") {
      const a = new Set(Array.isArray(rule.weekdays) ? (rule.weekdays as string[]) : []);
      const b = new Set(candidate.weekdays ?? []);
      const overlap = [...a].filter((d) => b.has(d));
      if (overlap.length) {
        warnings.push(`Overlaps weekday rule “${rule.name}” on ${overlap.join(", ")}`);
      }
    }
  }
  return warnings;
}

export async function createScheduleRule(
  organizationId: string,
  actorId: string,
  raw: unknown
) {
  const body = ruleBodySchema.parse(raw);
  validateRuleBody(body);

  const existing = await listScheduleRules(organizationId);
  const warnings = detectConflicts(organizationId, existing, {
    scope: body.scope,
    className: body.className,
    recurrence: body.recurrence,
    weekdays: body.weekdays ?? [],
    specificDate: body.specificDate,
  });

  const row = await prisma.attendanceScheduleRule.create({
    data: {
      organizationId,
      name: body.name.trim(),
      scope: body.scope,
      className: body.scope === "CLASS" ? body.className?.trim() ?? null : null,
      recurrence: body.recurrence,
      weekdays: body.weekdays ?? Prisma.JsonNull,
      specificDate: body.specificDate ? parseDateOnly(body.specificDate) : null,
      schoolStarts: body.schoolStarts ?? null,
      lateStarts: body.lateStarts ?? null,
      schoolEnds: body.schoolEnds ?? null,
      staffStarts: body.staffStarts ?? null,
      staffEnds: body.staffEnds ?? null,
      effectiveFrom: body.effectiveFrom ? parseDateOnly(body.effectiveFrom) : null,
      effectiveTo: body.effectiveTo ? parseDateOnly(body.effectiveTo) : null,
      reason: body.reason?.trim() ?? null,
      isActive: body.isActive ?? true,
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  return { rule: serializeRule(row), warnings };
}

export async function updateScheduleRule(
  organizationId: string,
  id: string,
  actorId: string,
  raw: unknown
) {
  const existing = await prisma.attendanceScheduleRule.findFirst({ where: { id, organizationId } });
  if (!existing) throw new AppError(404, "Schedule rule not found");

  const body = ruleBodySchema.partial().parse(raw);
  const merged = {
    name: body.name ?? existing.name,
    scope: body.scope ?? existing.scope,
    className: body.className !== undefined ? body.className : existing.className,
    recurrence: body.recurrence ?? existing.recurrence,
    weekdays: body.weekdays !== undefined ? body.weekdays : (existing.weekdays as string[] | null),
    specificDate:
      body.specificDate !== undefined
        ? body.specificDate
        : existing.specificDate
          ? dateIsoInTz(existing.specificDate)
          : null,
    schoolStarts: body.schoolStarts !== undefined ? body.schoolStarts : existing.schoolStarts,
    lateStarts: body.lateStarts !== undefined ? body.lateStarts : existing.lateStarts,
    schoolEnds: body.schoolEnds !== undefined ? body.schoolEnds : existing.schoolEnds,
    staffStarts: body.staffStarts !== undefined ? body.staffStarts : existing.staffStarts,
    staffEnds: body.staffEnds !== undefined ? body.staffEnds : existing.staffEnds,
    effectiveFrom:
      body.effectiveFrom !== undefined
        ? body.effectiveFrom
        : existing.effectiveFrom
          ? dateIsoInTz(existing.effectiveFrom)
          : null,
    effectiveTo:
      body.effectiveTo !== undefined
        ? body.effectiveTo
        : existing.effectiveTo
          ? dateIsoInTz(existing.effectiveTo)
          : null,
    reason: body.reason !== undefined ? body.reason : existing.reason,
    isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
  };

  validateRuleBody(merged as z.infer<typeof ruleBodySchema>);

  const all = await listScheduleRules(organizationId);
  const warnings = detectConflicts(organizationId, all, {
    id,
    scope: merged.scope,
    className: merged.className,
    recurrence: merged.recurrence,
    weekdays: merged.weekdays ?? [],
    specificDate: merged.specificDate,
  });

  const row = await prisma.attendanceScheduleRule.update({
    where: { id },
    data: {
      name: merged.name.trim(),
      scope: merged.scope as "SCHOOL" | "CLASS",
      className: merged.scope === "CLASS" ? merged.className?.trim() ?? null : null,
      recurrence: merged.recurrence as "EVERY_DAY" | "WEEKDAYS" | "SPECIFIC_DATE",
      weekdays: merged.weekdays ?? Prisma.JsonNull,
      specificDate: merged.specificDate ? parseDateOnly(merged.specificDate) : null,
      schoolStarts: merged.schoolStarts ?? null,
      lateStarts: merged.lateStarts ?? null,
      schoolEnds: merged.schoolEnds ?? null,
      staffStarts: merged.staffStarts ?? null,
      staffEnds: merged.staffEnds ?? null,
      effectiveFrom: merged.effectiveFrom ? parseDateOnly(merged.effectiveFrom) : null,
      effectiveTo: merged.effectiveTo ? parseDateOnly(merged.effectiveTo) : null,
      reason: merged.reason?.trim() ?? null,
      isActive: merged.isActive,
      updatedBy: actorId,
    },
  });

  return { rule: serializeRule(row), warnings };
}

export async function setScheduleRuleActive(
  organizationId: string,
  id: string,
  actorId: string,
  isActive: boolean
) {
  const existing = await prisma.attendanceScheduleRule.findFirst({ where: { id, organizationId } });
  if (!existing) throw new AppError(404, "Schedule rule not found");
  const row = await prisma.attendanceScheduleRule.update({
    where: { id },
    data: { isActive, updatedBy: actorId },
  });
  return serializeRule(row);
}

export async function resolveScheduleForContext(
  organizationId: string,
  base: AttendanceSettings,
  ctx: { lessonDate: Date; className?: string | null; isStaff?: boolean }
) {
  const rules = await listActiveScheduleRules(organizationId);
  return resolveScheduleFromRules(base, rules, ctx);
}
