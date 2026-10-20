import { Router, Request, Response } from "express";
import { BoardingType, CardStatus, PassengerMark } from "@prisma/client";
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
      busCode: req.body?.busCode,
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

p.get("/buses", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listBuses(orgId(req))));
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

p.get("/routes", async (req: AuthenticatedRequest, res, next) => {
  try {
    return res.json(ok(await svc.listRoutes(orgId(req))));
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

router.use(p);

export default router;
