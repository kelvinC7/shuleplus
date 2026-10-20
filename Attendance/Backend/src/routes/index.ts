import { Router, Request, Response } from "express";
import { CardStatus, TapDirection } from "../generated/prisma";
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { requireTenant, requireServiceTenant } from "../middleware/tenant.middleware";
import { AppError } from "../middleware/error.middleware";
import { prisma } from "../config/database";
import { createTenant, ensureServiceTenant } from "../services/tenant.service";
import { checkStudentManagementHealth } from "../clients/student-management.client";
import * as svc from "../services/attendance.service";
import * as sectorAttendance from "../services/attendance-sector.service";
import * as peopleSvc from "../services/people.service";
import * as analyticsSvc from "../services/analytics.service";
import { resolvePeriod } from "../utils/attendance-period";
const router = Router();

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, "Missing organization context");
  return id;
}

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function ok(data: unknown, message?: string) {
  return { success: true, data, ...(message ? { message } : {}) };
}

router.get("/health", async (_req: Request, res: Response) => {
  const [studentManagement, integrations] = await Promise.all([
    checkStudentManagementHealth(),
    peopleSvc.integrationsStatus(),
  ]);
  res.json({
    success: true,
    service: "attendance-rfid-service",
    module: "attendance",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    integrations: {
      studentManagement,
      hr: integrations.hr,
      iam: integrations.iam,
      timetable: integrations.timetable,
    },
  });
});

router.post("/tenant/create", requireServiceAuth, async (req, res, next) => {
  try {
    const body = req.body as {
      organizationId?: string;
      organizationName?: string;
      organizationCode?: string;
    };
    if (!body.organizationId || !body.organizationName) {
      throw new AppError(400, "organizationId and organizationName are required");
    }
    const tenant = await createTenant({
      organizationId: body.organizationId,
      organizationName: body.organizationName,
      organizationCode: body.organizationCode,
    });
    return res.status(201).json(ok(tenant));
  } catch (e) {
    return next(e);
  }
});

router.post("/tenant/ensure", authenticate, requireModuleLicense, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const tenant = await createTenant({
      organizationId: user.organizationId,
      organizationName: String(req.body?.organizationName ?? "Organization"),
      organizationCode: req.body?.organizationCode,
    });
    return res.json(ok(tenant));
  } catch (e) {
    return next(e);
  }
});

function collectStudentCodes(query: Request["query"] | Record<string, unknown>): string[] {
  const values: Array<string | null | undefined> = [];
  const add = (raw: unknown) => {
    if (Array.isArray(raw)) raw.forEach(add);
    else if (typeof raw === "string") {
      raw.split(",").forEach((part) => values.push(part.trim()));
    }
  };
  add(query.studentCode);
  add(query.studentId);
  add(query.studentCodes);
  return [...new Set(values.filter(Boolean))] as string[];
}

// Service-to-service (ParentMIS etc.) — guarded by x-service-key
async function resolveServiceTenant(
  organizationId: string,
  meta?: { organizationName?: string; organizationCode?: string }
) {
  if (!organizationId) throw new AppError(400, "organizationId is required");
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ organizationId }, { organizationCode: organizationId }],
      status: "ACTIVE",
    },
  });
  if (tenant) return tenant.organizationId;
  const created = await ensureServiceTenant({
    organizationId,
    organizationName: meta?.organizationName?.trim() || "School",
    organizationCode: meta?.organizationCode?.trim() || organizationId,
  });
  return created.organizationId;
}

router.get("/service/attendance", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : "";
    const codes = collectStudentCodes(req.query);
    if (!codes.length) throw new AppError(400, "studentCode is required");
    const ref = await resolveServiceTenant(organizationId);
    return res.json(ok(await svc.studentAttendanceOverview(ref, codes)));
  } catch (e) {
    return next(e);
  }
});

router.post("/service/attendance/absence", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const body = req.body as {
      organizationId?: string;
      studentCode?: string;
      studentId?: string;
      date?: string;
      reason?: string;
      studentName?: string;
      className?: string;
    };
    const codes = collectStudentCodes({
      studentCode: body.studentCode,
      studentId: body.studentId,
    });
    if (!codes.length || !body.date) {
      throw new AppError(400, "studentCode and date are required");
    }
    const ref = await resolveServiceTenant(body.organizationId ?? "");
    const record = await svc.recordExcusedAbsence(ref, {
      studentCode: body.studentCode || codes[0],
      studentId: body.studentId,
      date: body.date,
      reason: body.reason,
      studentName: body.studentName,
      className: body.className,
    });
    return res.status(201).json(ok(record));
  } catch (e) {
    return next(e);
  }
});

// Device config + heartbeat (auth by device API key — no command polling needed)
router.get("/device_config", async (req: Request, res: Response, next) => {
  try {
    const apiKey = String(req.headers["x-api-key"] ?? req.query.apiKey ?? "");
    return res.json(ok(await svc.getDeviceConfig(apiKey)));
  } catch (e) {
    return next(e);
  }
});

router.post("/device_heartbeat", async (req: Request, res: Response, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const apiKey = String(req.headers["x-api-key"] ?? body.apiKey ?? "");
    const rssiRaw = body.rssi ?? body.wifiSignalDbm;
    const rssi =
      typeof rssiRaw === "number"
        ? rssiRaw
        : typeof rssiRaw === "string" && rssiRaw.trim()
          ? Number(rssiRaw)
          : null;
    const data = await svc.deviceHeartbeat(apiKey, {
      ip: typeof body.ip === "string" ? body.ip : undefined,
      rssi: Number.isFinite(rssi) ? rssi : null,
    });
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

// Device gate endpoint for Arduino / ESP32 RFID readers (auth by device API key)
router.post("/gate_attendance", async (req: Request, res: Response, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const apiKey = String(req.headers["x-api-key"] ?? body.apiKey ?? body.deviceKey ?? "");
    const rawCard = body.cardNumber ?? body.cardUid ?? body.card_uid ?? body.uid ?? body.card;
    const data = await svc.deviceGateTap({
      apiKey,
      cardNumber: typeof rawCard === "string" ? rawCard : undefined,
      direction: typeof body.direction === "string" ? (body.direction as TapDirection) : undefined,
      scannedAt: typeof body.scannedAt === "string" ? body.scannedAt : undefined,
      offline: Boolean(body.offline),
    });
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

/** Offline queue sync from gate readers (many students, slow/no network). */
router.post("/gate_attendance/batch", async (req: Request, res: Response, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const apiKey = String(req.headers["x-api-key"] ?? body.apiKey ?? body.deviceKey ?? "");
    const events = Array.isArray(body.events) ? body.events : [];
    const data = await svc.deviceGateTapBatch({
      apiKey,
      events: events as Array<{
        cardNumber?: string;
        cardUid?: string;
        scannedAt?: string;
        direction?: string;
        eventId?: string;
      }>,
    });
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

/** Service-to-service: gate device provisioning (Super Admin via IAM). */
router.get("/service/devices", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : "";
    const ref = await resolveServiceTenant(organizationId);
    return res.json(ok(await svc.listDevices(ref)));
  } catch (e) {
    return next(e);
  }
});

/** Service-to-service: compact today snapshot for Sector MIS. */
router.get("/service/day-summary", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : "";
    const ref = await resolveServiceTenant(organizationId);
    return res.json(ok(await svc.schoolDaySummary(ref)));
  } catch (e) {
    return next(e);
  }
});

router.post("/service/sector/batch-snapshot", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const body = (req.body ?? {}) as { organizationIds?: string[] };
    const ids = Array.isArray(body.organizationIds) ? body.organizationIds : [];
    return res.json(ok(await sectorAttendance.batchSchoolSnapshots(ids)));
  } catch (e) {
    return next(e);
  }
});

router.post("/service/sector/history", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const body = (req.body ?? {}) as { organizationIds?: string[]; days?: number };
    const ids = Array.isArray(body.organizationIds) ? body.organizationIds : [];
    const days = typeof body.days === "number" ? body.days : Number(body.days) || 7;
    return res.json(ok(await sectorAttendance.batchSectorHistory(ids, days)));
  } catch (e) {
    return next(e);
  }
});

router.get("/service/school-attendance-detail", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : "";
    const ref = await resolveServiceTenant(organizationId);
    return res.json(ok(await sectorAttendance.schoolAttendanceDetail(ref)));
  } catch (e) {
    return next(e);
  }
});

router.post("/service/sector/chronic-absence", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const body = (req.body ?? {}) as { organizationIds?: string[]; minDays?: number };
    const ids = Array.isArray(body.organizationIds) ? body.organizationIds : [];
    const minDays = typeof body.minDays === "number" ? body.minDays : 3;
    return res.json(ok(await sectorAttendance.sectorChronicAbsenteeSummary(ids, minDays)));
  } catch (e) {
    return next(e);
  }
});

router.post("/service/sector/data-quality", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const body = (req.body ?? {}) as { organizationIds?: string[] };
    const ids = Array.isArray(body.organizationIds) ? body.organizationIds : [];
    return res.json(ok(await sectorAttendance.sectorDataQualityMetrics(ids)));
  } catch (e) {
    return next(e);
  }
});

router.get("/service/security-alerts", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : "";
    const limitRaw = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 20;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
    const ref = await resolveServiceTenant(organizationId);
    return res.json(ok(await svc.listSecurityAlertsService(ref, limit)));
  } catch (e) {
    return next(e);
  }
});

router.post("/service/devices", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const organizationId =
      typeof body.organizationId === "string" ? body.organizationId : String(req.query.organizationId ?? "");
    const ref = await resolveServiceTenant(organizationId, {
      organizationName:
        typeof body.organizationName === "string" ? body.organizationName : undefined,
      organizationCode:
        typeof body.organizationCode === "string" ? body.organizationCode : undefined,
    });
    const deviceCodeRaw = body.deviceCode ?? body.device_code;
    const device = await svc.createDevice(ref, {
      deviceCode:
        typeof deviceCodeRaw === "string" && deviceCodeRaw.trim() ? deviceCodeRaw : undefined,
      name: String(body.name ?? "Main Gate"),
      location: typeof body.location === "string" ? body.location : undefined,
      gateName: typeof body.gateName === "string" ? body.gateName : undefined,
      direction: typeof body.direction === "string" ? (body.direction as TapDirection) : undefined,
      organizationCode:
        typeof body.organizationCode === "string" ? body.organizationCode : undefined,
    });
    return res.status(201).json(ok(device));
  } catch (e) {
    return next(e);
  }
});

router.post("/service/devices/:id/api-key/rotate", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId =
      typeof req.query.organizationId === "string"
        ? req.query.organizationId
        : String((req.body as { organizationId?: string })?.organizationId ?? "");
    const ref = await resolveServiceTenant(organizationId);
    const data = await svc.rotateDeviceApiKey(ref, String(req.params.id));
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

router.delete("/service/devices/:id", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId =
      typeof req.query.organizationId === "string"
        ? req.query.organizationId
        : String((req.body as { organizationId?: string })?.organizationId ?? "");
    const ref = await resolveServiceTenant(organizationId);
    const data = await svc.deleteDevice(ref, String(req.params.id));
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

router.patch("/service/devices/:id", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId =
      typeof req.query.organizationId === "string"
        ? req.query.organizationId
        : String((req.body as { organizationId?: string })?.organizationId ?? "");
    const ref = await resolveServiceTenant(organizationId);
    const device = await svc.updateDevice(ref, String(req.params.id), req.body as Record<string, unknown>);
    return res.json(ok(device));
  } catch (e) {
    return next(e);
  }
});

const p = Router();
p.use(authenticate, requireModuleLicense, requireTenant);

p.get("/dashboard", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.dashboard(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/live-monitor", async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = orgId(req);
    return res.json(
      ok(
        await svc.liveMonitor(id, {
          ...periodQuery(req),
          className: typeof req.query.className === "string" ? req.query.className : undefined,
          q: typeof req.query.q === "string" ? req.query.q : undefined,
          personType: typeof req.query.personType === "string" ? req.query.personType : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

router.patch("/service/settings/enable-sms", requireServiceAuth, requireServiceTenant, async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.enableAttendanceSmsChannel(req.organizationRef!), "Attendance SMS channel enabled"));
  } catch (e) {
    return next(e);
  }
});

p.get("/settings", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.getOrCreateSettings(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.put("/settings", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.updateSettings(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.get("/schedule-rules/summary", async (req: AuthenticatedRequest, res, next) => {
  try {
    const scheduleSvc = await import("../services/attendance-schedule.service");
    return res.json(ok(await scheduleSvc.getScheduleRulesSummary(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/schedule-rules/classes", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { fetchClassesList } = await import("../clients/student-management.client");
    return res.json(ok(await fetchClassesList(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/schedule-rules", async (req: AuthenticatedRequest, res, next) => {
  try {
    const scheduleSvc = await import("../services/attendance-schedule.service");
    const actorId = req.user?.sub ?? "system";
    return res.status(201).json(ok(await scheduleSvc.createScheduleRule(orgId(req), actorId, req.body)));
  } catch (e) {
    return next(e);
  }
});

p.put("/schedule-rules/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const scheduleSvc = await import("../services/attendance-schedule.service");
    const actorId = req.user?.sub ?? "system";
    const id = String(req.params.id ?? "");
    return res.json(ok(await scheduleSvc.updateScheduleRule(orgId(req), id, actorId, req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/schedule-rules/:id/active", async (req: AuthenticatedRequest, res, next) => {
  try {
    const scheduleSvc = await import("../services/attendance-schedule.service");
    const actorId = req.user?.sub ?? "system";
    const id = String(req.params.id ?? "");
    const isActive = Boolean(req.body?.isActive);
    return res.json(ok(await scheduleSvc.setScheduleRuleActive(orgId(req), id, actorId, isActive)));
  } catch (e) {
    return next(e);
  }
});

// Cards
p.get("/cards", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json({
      success: true,
      ...(await svc.listCards(orgId(req), {
        status: typeof req.query.status === "string" ? req.query.status : undefined,
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      })),
    });
  } catch (e) {
    return next(e);
  }
});

p.post("/cards", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.createCard(orgId(req), req.body, req.user?.sub)));
  } catch (e) {
    return next(e);
  }
});

p.post("/cards/bulk", async (req: AuthenticatedRequest, res, next) => {
  try {
    const rows = (req.body?.rows ?? []) as Array<Record<string, unknown>>;
    return res.status(201).json(ok(await svc.bulkCreateCards(orgId(req), rows, req.user?.sub)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/cards/:id/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    const status = String(req.body?.status ?? "") as CardStatus;
    return res.json(
      ok(
        await svc.updateCardStatus(
          orgId(req),
          paramId(req.params.id),
          status,
          req.body?.reason,
          req.user?.sub
        )
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/cards/:id/history", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.cardHistory(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/cards/:id/replace", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res
      .status(201)
      .json(
        ok(
          await svc.requestCardReplacement(
            orgId(req),
            paramId(req.params.id),
            req.body?.reason,
            req.user?.email
          )
        )
      );
  } catch (e) {
    return next(e);
  }
});

p.get("/card-replacements", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listReplacements(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

// Devices
p.get("/devices", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listDevices(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/devices", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.createDevice(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/devices/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.updateDevice(orgId(req), paramId(req.params.id), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.post("/devices/:id/test", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.testDevice(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/devices/:id/api-key/rotate", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.rotateDeviceApiKey(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.delete("/devices/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.deleteDevice(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

// Attendance taps
p.post("/tap", async (req: AuthenticatedRequest, res, next) => {
  try {
    const cardNumber = String(req.body?.cardNumber ?? req.body?.card_number ?? "");
    if (!cardNumber) throw new AppError(400, "cardNumber is required");
    const data = await svc.processTap(orgId(req), {
      cardNumber,
      deviceCode: req.body?.deviceCode ?? req.body?.device_code,
      direction: req.body?.direction as TapDirection | undefined,
    });
    return res.status(201).json(ok(data));
  } catch (e) {
    return next(e);
  }
});

function attendanceListQuery(req: AuthenticatedRequest, period: { from: string; to: string }) {
  const isSingleDay = period.from === period.to;
  const pageRaw = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
  const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  return {
    ...(isSingleDay ? { date: period.from } : { from: period.from, to: period.to }),
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    className: typeof req.query.className === "string" ? req.query.className : undefined,
    department: typeof req.query.department === "string" ? req.query.department : undefined,
    staffRole: typeof req.query.staffRole === "string" ? req.query.staffRole : undefined,
    checkoutStatus: typeof req.query.checkoutStatus === "string" ? req.query.checkoutStatus : undefined,
    punctuality: typeof req.query.punctuality === "string" ? req.query.punctuality : undefined,
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    personType: typeof req.query.personType === "string" ? req.query.personType : undefined,
    sortBy: typeof req.query.sortBy === "string" ? req.query.sortBy : undefined,
    sortDir: typeof req.query.sortDir === "string" ? req.query.sortDir : undefined,
    page: Number.isFinite(pageRaw) ? pageRaw : 1,
    limit: Number.isFinite(limitRaw) ? limitRaw : 25,
  };
}

p.get("/attendance/filter-options", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.getAttendanceFilterOptions(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/attendance/summary", async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = orgId(req);
    const academic = await analyticsSvc.getAcademicContextForOrg(id);
    const period = resolvePeriod(periodQuery(req), academic);
    return res.json(ok(await svc.getAttendanceRecordsSummary(id, attendanceListQuery(req, period))));
  } catch (e) {
    return next(e);
  }
});

p.get("/attendance/:id/detail", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.getAttendanceRecordDetail(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/attendance", async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = orgId(req);
    const academic = await analyticsSvc.getAcademicContextForOrg(id);
    const period = resolvePeriod(periodQuery(req), academic);
    return res.json(ok(await svc.listAttendancePaged(id, attendanceListQuery(req, period))));
  } catch (e) {
    return next(e);
  }
});

function periodQuery(req: AuthenticatedRequest) {
  return {
    date: typeof req.query.date === "string" ? req.query.date : undefined,
    from: typeof req.query.from === "string" ? req.query.from : undefined,
    to: typeof req.query.to === "string" ? req.query.to : undefined,
    academicYear: typeof req.query.academicYear === "string" ? req.query.academicYear : undefined,
    term: typeof req.query.term === "string" ? req.query.term : undefined,
  };
}

p.get("/academic-context", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await analyticsSvc.getAcademicContextForOrg(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/analytics", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await analyticsSvc.getAnalytics(orgId(req), {
          ...periodQuery(req),
          personType: typeof req.query.personType === "string" ? req.query.personType : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/people/staff/rankings", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await peopleSvc.staffRankings(orgId(req), periodQuery(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/people/students/class-performance", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await peopleSvc.studentsClassPerformance(orgId(req), {
          ...periodQuery(req),
          q: typeof req.query.q === "string" ? req.query.q : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/people/students/by-class", async (req: AuthenticatedRequest, res, next) => {
  try {
    const className = typeof req.query.className === "string" ? req.query.className : "";
    if (!className.trim()) throw new AppError(400, "className is required");
    return res.json(
      ok(
        await peopleSvc.studentsInClassPerformance(orgId(req), className, {
          ...periodQuery(req),
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/people/students", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await peopleSvc.studentsOverview(orgId(req), {
          ...periodQuery(req),
          q: typeof req.query.q === "string" ? req.query.q : undefined,
          className: typeof req.query.className === "string" ? req.query.className : undefined,
          page: typeof req.query.page === "string" ? Number(req.query.page) : undefined,
          limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/people/staff", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await peopleSvc.staffOverview(orgId(req), {
          ...periodQuery(req),
          q: typeof req.query.q === "string" ? req.query.q : undefined,
          page: typeof req.query.page === "string" ? Number(req.query.page) : undefined,
          limit: typeof req.query.limit === "string" ? Number(req.query.limit) : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/people/integrations", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await peopleSvc.integrationsStatus()));
  } catch (e) {
    return next(e);
  }
});

p.get("/people/students/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const profile = await peopleSvc.studentProfile(orgId(req), paramId(req.params.id));
    if (!profile) throw new AppError(404, "Student not found");
    return res.json(ok(profile));
  } catch (e) {
    return next(e);
  }
});

p.get("/people/staff/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const profile = await peopleSvc.staffProfile(orgId(req), paramId(req.params.id));
    if (!profile) throw new AppError(404, "Staff member not found");
    return res.json(ok(profile));
  } catch (e) {
    return next(e);
  }
});

p.get("/people/students/:id/performance", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await peopleSvc.personPerformanceDetail(orgId(req), paramId(req.params.id), "STUDENT", {
          ...periodQuery(req),
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/people/staff/:id/performance", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await peopleSvc.personPerformanceDetail(orgId(req), paramId(req.params.id), "STAFF", {
          ...periodQuery(req),
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.post("/attendance/notify-absent", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.notifyAbsentToday(orgId(req)), "Absent parents notified"));
  } catch (e) {
    return next(e);
  }
});

// Parents
p.get("/parents", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listParents(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/parents", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.createParent(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.get("/notifications", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listNotifications(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

// Permissions
p.get("/permissions", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await svc.listPermissions(
          orgId(req),
          typeof req.query.status === "string" ? req.query.status : undefined
        )
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.post("/permissions", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.createPermission(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.post("/permissions/:id/approve", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await svc.reviewPermission(
          orgId(req),
          paramId(req.params.id),
          "APPROVED",
          req.user?.email,
          req.body?.note
        )
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.post("/permissions/:id/reject", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await svc.reviewPermission(
          orgId(req),
          paramId(req.params.id),
          "REJECTED",
          req.user?.email,
          req.body?.note
        )
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/alerts", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listAlerts(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/alerts/:id/resolve", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.resolveAlert(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/audit-logs", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listAudit(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/reports/summary", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.reportsSummary(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

router.use(p);

router.get("/service/attendance", requireServiceAuth, requireServiceTenant, async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await svc.listAttendance(req.organizationRef!, {
          date: typeof req.query.date === "string" ? req.query.date : undefined,
          from: typeof req.query.from === "string" ? req.query.from : undefined,
          to: typeof req.query.to === "string" ? req.query.to : undefined,
          status: typeof req.query.status === "string" ? req.query.status : undefined,
          className: typeof req.query.className === "string" ? req.query.className : undefined,
          q: typeof req.query.q === "string" ? req.query.q : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

export default router;
