import { Router, Request, Response } from "express";
import { AttendanceMethod, BoardingType, CardStatus, PassengerMark, TransportEventType } from "@prisma/client";
import {
  authenticate,
  requireModuleLicense,
  requireServiceAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { requireTenant } from "../middleware/tenant.middleware";
import { AppError } from "../middleware/error.middleware";
import { prisma } from "../config/database";
import { createTenant } from "../services/tenant.service";
import * as svc from "../services/transport.service";
import * as enrollmentSvc from "../services/transport-enrollment.service";
import * as notifySvc from "../services/transport-notification.service";
import * as routePlanSvc from "../services/route-planning.service";
import * as mapStackSvc from "../services/map-stack.service";
import * as purgeSvc from "../services/transport-purge.service";
import * as routeSupervisorSvc from "../services/route-supervisor.service";
import * as attendanceSvc from "../services/route-attendance.service";

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

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: "transport-rfid-service",
    module: "transport",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

router.post("/tenant/create", requireServiceAuth, async (req, res, next) => {
  try {
    const body = req.body as { organizationId?: string; organizationName?: string; organizationCode?: string };
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

async function resolveServiceTenant(organizationId: string) {
  if (!organizationId) throw new AppError(400, "organizationId is required");
  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ organizationId }, { organizationCode: organizationId }], status: "ACTIVE" },
  });
  if (!tenant) throw new AppError(403, "Tenant not provisioned for this organization");
  return tenant.organizationId;
}

router.get("/service/child-tracking", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : "";
    const studentCode = typeof req.query.studentCode === "string" ? req.query.studentCode : "";
    if (!studentCode) throw new AppError(400, "studentCode is required");
    const ref = await resolveServiceTenant(organizationId);
    return res.json(ok(await svc.childTracking(ref, studentCode)));
  } catch (e) {
    return next(e);
  }
});

router.get("/service/parent-portal", requireServiceAuth, async (req: Request, res, next) => {
  try {
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : "";
    const studentCode = typeof req.query.studentCode === "string" ? req.query.studentCode : "";
    if (!studentCode) throw new AppError(400, "studentCode is required");
    const ref = await resolveServiceTenant(organizationId);
    const { parentPortalSnapshot } = await import("../services/parent-portal.service");
    return res.json(ok(await parentPortalSnapshot(ref, studentCode)));
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

p.get("/live-operations", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.liveOperations(orgId(req))));
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

p.post("/tap", async (req: AuthenticatedRequest, res, next) => {
  try {
    const cardNumber = String(req.body?.cardNumber ?? req.body?.card_number ?? "");
    if (!cardNumber) throw new AppError(400, "cardNumber is required");
    const data = await svc.processTap(orgId(req), {
      cardNumber,
      deviceCode: req.body?.deviceCode ?? req.body?.device_code,
      type: req.body?.type as BoardingType | undefined,
      busCode: req.body?.busCode ?? req.body?.bus_code,
      tripId: req.body?.tripId ?? req.body?.trip_id,
      eventType: req.body?.eventType ?? req.body?.event_type,
      idempotencyKey: req.body?.idempotencyKey ?? req.body?.idempotency_key,
      attendanceMethod: req.body?.attendanceMethod ?? req.body?.attendance_method,
      recordedByUserId: req.user?.sub,
      clientRecordedAt: req.body?.clientRecordedAt ?? req.body?.client_recorded_at,
    });
    return res.status(201).json(ok(data));
  } catch (e) {
    return next(e);
  }
});

p.get("/trips", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listTrips(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/trips/prepare", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.prepareTrip(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.get("/trips/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.getTrip(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/trips/:id/start", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.startTrip(orgId(req), paramId(req.params.id), Boolean(req.body?.force))));
  } catch (e) {
    return next(e);
  }
});

p.post("/trips/:id/complete", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.completeTrip(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/trips/:id/reconcile", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await svc.reconcilePassenger(
          orgId(req),
          paramId(req.params.id),
          String(req.body?.studentCode ?? ""),
          req.body?.mark as PassengerMark,
          req.body?.note
        )
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.post("/trips/:id/gps", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.pingGps(orgId(req), paramId(req.params.id), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.get("/org-users", async (req: AuthenticatedRequest, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    return res.json(ok(await svc.listOrgUsersForTransport(orgId(req), q)));
  } catch (e) {
    return next(e);
  }
});

p.get("/buses/next-code", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok({ code: await svc.nextBusCode(orgId(req)) }));
  } catch (e) {
    return next(e);
  }
});

p.get("/buses", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listBuses(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/buses/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.getBus(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/buses", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.upsertBus(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/buses/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.upsertBus(orgId(req), req.body, paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/buses/:id/assign-driver", async (req: AuthenticatedRequest, res, next) => {
  try {
    const organizationId = orgId(req);
    const busId = paramId(req.params.id);
    const body = req.body as {
      driverId?: string;
      iamUserId?: string;
      name?: string;
      phone?: string;
      licenseNumber?: string;
    };
    let driverId = body.driverId?.trim();
    if (!driverId) {
      const driver = await svc.resolveOrCreateDriverFromOrgUser(organizationId, {
        iamUserId: body.iamUserId,
        name: String(body.name ?? ""),
        phone: body.phone,
        licenseNumber: body.licenseNumber,
      });
      driverId = driver.id;
    }
    return res.json(
      ok(
        await svc.upsertBus(organizationId, { driverId }, busId)
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.delete("/buses/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.deleteBus(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/drivers", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listDrivers(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/drivers", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.upsertDriver(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/drivers/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.upsertDriver(orgId(req), req.body, paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/attendants", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listAttendants(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/attendants", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.upsertAttendant(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/attendants/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.upsertAttendant(orgId(req), req.body, paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/locations/provinces", async (_req: AuthenticatedRequest, res, next) => {
  try {
    const { listProvinces } = await import("../clients/iam-locations.client");
    return res.json(ok(await listProvinces()));
  } catch (e) {
    return next(e);
  }
});

p.get("/locations/provinces/:provinceId/districts", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { listDistricts } = await import("../clients/iam-locations.client");
    return res.json(ok(await listDistricts(paramId(req.params.provinceId))));
  } catch (e) {
    return next(e);
  }
});

p.get("/locations/districts/:districtId/sectors", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { listSectors } = await import("../clients/iam-locations.client");
    return res.json(ok(await listSectors(paramId(req.params.districtId))));
  } catch (e) {
    return next(e);
  }
});

p.get("/locations/sectors/:sectorId/cells", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { listCells } = await import("../clients/iam-locations.client");
    return res.json(ok(await listCells(paramId(req.params.sectorId))));
  } catch (e) {
    return next(e);
  }
});

p.get("/locations/cells/:cellId/villages", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { listVillages } = await import("../clients/iam-locations.client");
    return res.json(ok(await listVillages(paramId(req.params.cellId))));
  } catch (e) {
    return next(e);
  }
});

p.get("/map/stack", async (_req: AuthenticatedRequest, res) => {
  return res.json(ok(mapStackSvc.mapStackMeta()));
});

p.get("/map/places/search", async (req: AuthenticatedRequest, res, next) => {
  try {
    const q = String(req.query.q ?? "");
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 8;
    return res.json(ok(await mapStackSvc.searchPlaces(orgId(req), q, limit)));
  } catch (e) {
    return next(e);
  }
});

p.get("/map/places/reverse", async (req: AuthenticatedRequest, res, next) => {
  try {
    const lat = parseFloat(String(req.query.lat ?? ""));
    const lng = parseFloat(String(req.query.lng ?? ""));
    return res.json(ok(await mapStackSvc.reversePlace(orgId(req), lat, lng)));
  } catch (e) {
    return next(e);
  }
});

p.post("/map/route", async (req: AuthenticatedRequest, res, next) => {
  try {
    const stops = (req.body as { stops?: { lat: number; lng: number }[] })?.stops ?? [];
    return res.json(ok(await mapStackSvc.roadRoute(orgId(req), stops)));
  } catch (e) {
    return next(e);
  }
});

p.get("/routes/dashboard", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await routePlanSvc.routesDashboard(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/routes/next-code", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok({ code: await routePlanSvc.nextRouteCode(orgId(req)) }));
  } catch (e) {
    return next(e);
  }
});

p.get("/routes/page", async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : undefined;
    const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const serviceDirection =
      typeof req.query.serviceDirection === "string" ? req.query.serviceDirection : undefined;
    const busId = typeof req.query.busId === "string" ? req.query.busId : undefined;
    return res.json(
      ok(
        await routePlanSvc.listRoutesPage(orgId(req), {
          page,
          limit,
          q,
          status,
          serviceDirection,
          busId,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/routes", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listRoutes(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/routes/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await routePlanSvc.getRouteDetail(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/routes/:id/supervisors", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await routeSupervisorSvc.listRouteSupervisors(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/routes/:id/supervisors", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res
      .status(201)
      .json(ok(await routeSupervisorSvc.addRouteSupervisor(orgId(req), paramId(req.params.id), req.body, req.user?.sub)));
  } catch (e) {
    return next(e);
  }
});

p.delete("/routes/:id/supervisors/:supervisorId", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await routeSupervisorSvc.removeRouteSupervisor(
          orgId(req),
          paramId(req.params.id),
          paramId(req.params.supervisorId),
          req.user?.sub
        )
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.post("/routes/full", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await routePlanSvc.saveRouteFull(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.put("/routes/:id/full", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await routePlanSvc.saveRouteFull(orgId(req), req.body, paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/routes", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.upsertRoute(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/routes/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.upsertRoute(orgId(req), req.body, paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.delete("/routes/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await routePlanSvc.archiveRoute(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/operational-data/purge", async (req: AuthenticatedRequest, res, next) => {
  try {
    const confirm = String((req.body as { confirm?: string })?.confirm ?? "");
    const result = await purgeSvc.purgeOperationalData(orgId(req), confirm, req.user?.sub);
    return res.json(ok(result));
  } catch (e) {
    return next(e);
  }
});

p.post("/stops", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.upsertStop(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/stops/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.upsertStop(orgId(req), req.body, paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/students", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listStudents(orgId(req), typeof req.query.q === "string" ? req.query.q : undefined)));
  } catch (e) {
    return next(e);
  }
});

p.post("/students", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.upsertStudent(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/students/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.upsertStudent(orgId(req), req.body, paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/learners/dashboard", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await enrollmentSvc.learnersDashboard(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/learners/classes", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await enrollmentSvc.listLearnerClassOptions(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/learners/directory", async (req: AuthenticatedRequest, res, next) => {
  try {
    const status = req.query.assignmentStatus;
    const assignmentStatus =
      status === "assigned" || status === "unassigned" || status === "all" ? status : undefined;
    return res.json(
      ok(
        await enrollmentSvc.searchLearnerDirectory(orgId(req), {
          q: typeof req.query.q === "string" ? req.query.q : undefined,
          className: typeof req.query.className === "string" ? req.query.className : undefined,
          classId: typeof req.query.classId === "string" ? req.query.classId : undefined,
          excludeEnrolled: req.query.excludeEnrolled === "true",
          assignmentStatus,
          limit: Number(req.query.limit) || 200,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/routes/:id/learners-detail", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await enrollmentSvc.routeLearnersDetail(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/routes/:id/enrollment-summary", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await enrollmentSvc.routeEnrollmentSummary(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.post("/students/bulk-assign", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res
      .status(201)
      .json(ok(await enrollmentSvc.bulkAssignLearners(orgId(req), req.body, req.user?.sub)));
  } catch (e) {
    return next(e);
  }
});

p.post("/students/unassign", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await enrollmentSvc.unassignLearners(orgId(req), req.body, req.user?.sub)));
  } catch (e) {
    return next(e);
  }
});

p.get("/notification-templates", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await notifySvc.listNotificationTemplates(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.patch("/notification-templates/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(await notifySvc.updateNotificationTemplate(orgId(req), paramId(req.params.id), req.body))
    );
  } catch (e) {
    return next(e);
  }
});

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

p.patch("/cards/:id/status", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(await svc.updateCardStatus(orgId(req), paramId(req.params.id), String(req.body?.status) as CardStatus, req.body?.reason, req.user?.sub))
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
    return res.status(201).json(ok(await svc.replaceCard(orgId(req), paramId(req.params.id), req.body?.newCardNumber, req.user?.sub)));
  } catch (e) {
    return next(e);
  }
});

p.get("/devices", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listDevices(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/devices", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.upsertDevice(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/devices/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.upsertDevice(orgId(req), req.body, paramId(req.params.id))));
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

p.get("/boarding", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listBoarding(orgId(req), typeof req.query.q === "string" ? req.query.q : undefined)));
  } catch (e) {
    return next(e);
  }
});

p.get("/attendance/routes", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await attendanceSvc.listAttendanceRoutes(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/attendance/trips/:id/start-journey", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await attendanceSvc.beginRouteJourney(orgId(req), paramId(req.params.id), req.user?.sub)
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.post("/attendance/trips/ensure", async (req: AuthenticatedRequest, res, next) => {
  try {
    const direction = req.body?.direction === "TO_HOME" ? "TO_HOME" : "TO_SCHOOL";
    return res.status(201).json(
      ok(
        await attendanceSvc.ensureTripForRoute(orgId(req), {
          routeId: String(req.body?.routeId ?? ""),
          direction,
          serviceDate: req.body?.serviceDate,
          busId: req.body?.busId,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/attendance/dashboard", async (req: AuthenticatedRequest, res, next) => {
  try {
    const tripId = String(req.query.tripId ?? "");
    const eventType = String(req.query.eventType ?? "BOARDING_TO_SCHOOL") as TransportEventType;
    if (!tripId) throw new AppError(400, "tripId is required");
    return res.json(ok(await attendanceSvc.getAttendanceDashboard(orgId(req), tripId, eventType)));
  } catch (e) {
    return next(e);
  }
});

p.post("/attendance/record", async (req: AuthenticatedRequest, res, next) => {
  try {
    const action = req.body?.action === "ABSENT" ? "ABSENT" : "CONFIRM";
    return res.status(201).json(
      ok(
        await attendanceSvc.recordManualAttendance(orgId(req), req.user?.sub, {
          tripId: String(req.body?.tripId ?? ""),
          eventType: req.body?.eventType as TransportEventType,
          studentCode: String(req.body?.studentCode ?? ""),
          action,
          idempotencyKey: req.body?.idempotencyKey,
          clientRecordedAt: req.body?.clientRecordedAt,
          note: req.body?.note,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.post("/attendance/bulk-confirm", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(
      ok(
        await attendanceSvc.bulkConfirmAttendance(orgId(req), req.user?.sub, {
          tripId: String(req.body?.tripId ?? ""),
          eventType: req.body?.eventType as TransportEventType,
          studentCodes: Array.isArray(req.body?.studentCodes) ? req.body.studentCodes.map(String) : [],
          idempotencyPrefix: req.body?.idempotencyPrefix,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.post("/attendance/sync", async (req: AuthenticatedRequest, res, next) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    return res.json(ok(await attendanceSvc.syncOfflineAttendance(orgId(req), req.user?.sub, events)));
  } catch (e) {
    return next(e);
  }
});

p.get("/attendance/history", async (req: AuthenticatedRequest, res, next) => {
  try {
    const q = req.query;
    return res.json(
      ok(
        await attendanceSvc.listAttendanceHistory(orgId(req), {
          page: q.page ? Number(q.page) : undefined,
          limit: q.limit ? Number(q.limit) : undefined,
          q: typeof q.q === "string" ? q.q : undefined,
          routeId: typeof q.routeId === "string" ? q.routeId : undefined,
          tripId: typeof q.tripId === "string" ? q.tripId : undefined,
          eventType: typeof q.eventType === "string" ? (q.eventType as TransportEventType) : undefined,
          method: typeof q.method === "string" ? (q.method as AttendanceMethod) : undefined,
          from: typeof q.from === "string" ? q.from : undefined,
          to: typeof q.to === "string" ? q.to : undefined,
          syncStatus: typeof q.syncStatus === "string" ? (q.syncStatus as import("@prisma/client").AttendanceSyncStatus) : undefined,
        })
      )
    );
  } catch (e) {
    return next(e);
  }
});

p.get("/attendance/events/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await attendanceSvc.getAttendanceEventDetail(orgId(req), paramId(req.params.id))));
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

p.get("/missing", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listMissing(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/emergencies", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listEmergencies(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/emergencies", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.raiseEmergency(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.post("/emergencies/:id/resolve", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.resolveEmergency(orgId(req), paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/incidents", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listIncidents(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/incidents", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.createIncident(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.get("/fees", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listFees(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/fees", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.upsertFee(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.patch("/fees/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.upsertFee(orgId(req), req.body, paramId(req.params.id))));
  } catch (e) {
    return next(e);
  }
});

p.get("/fuel", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listFuel(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/fuel", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.createFuel(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.get("/maintenance", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listMaintenance(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/maintenance", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.createMaintenance(orgId(req), req.body)));
  } catch (e) {
    return next(e);
  }
});

p.get("/documents", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listDocuments(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.post("/documents", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.status(201).json(ok(await svc.createDocument(orgId(req), req.body)));
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

p.get("/parents", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listParents(orgId(req))));
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

p.get("/audit-logs", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listAudit(orgId(req))));
  } catch (e) {
    return next(e);
  }
});

p.get("/parent-portal/change-requests", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { parentPortalClient } = await import("../clients/parent-portal.client");
    if (!parentPortalClient.enabled()) {
      throw new AppError(503, "Parent MIS API not configured — set PARENT_MIS_API_URL on Transport backend");
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const data = await parentPortalClient.listChangeRequests(orgId(req), status);
    if (data === null) throw new AppError(502, "Parent portal unreachable — check Parent MIS is running and SERVICE_API_KEY matches");
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

p.patch("/parent-portal/change-requests/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { parentPortalClient } = await import("../clients/parent-portal.client");
    const data = await parentPortalClient.respondChangeRequest(orgId(req), paramId(req.params.id), req.body ?? {});
    if (!data) throw new AppError(502, "Parent portal unavailable");
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

p.get("/parent-portal/issue-reports", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { parentPortalClient } = await import("../clients/parent-portal.client");
    if (!parentPortalClient.enabled()) {
      throw new AppError(503, "Parent MIS API not configured — set PARENT_MIS_API_URL on Transport backend");
    }
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const data = await parentPortalClient.listIssueReports(orgId(req), status);
    if (data === null) throw new AppError(502, "Parent portal unreachable — check Parent MIS is running and SERVICE_API_KEY matches");
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

p.patch("/parent-portal/issue-reports/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const { parentPortalClient } = await import("../clients/parent-portal.client");
    const data = await parentPortalClient.updateIssueReport(orgId(req), paramId(req.params.id), req.body ?? {});
    if (!data) throw new AppError(502, "Parent portal unavailable");
    return res.json(ok(data));
  } catch (e) {
    return next(e);
  }
});

router.use(p);

export default router;
