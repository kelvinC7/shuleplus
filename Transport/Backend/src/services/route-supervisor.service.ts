import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { writeAudit } from "./seed.service";

function str(v: unknown) {
  return v == null ? "" : String(v).trim();
}

export async function listRouteSupervisors(organizationId: string, routeId: string) {
  const route = await prisma.route.findFirst({
    where: { id: routeId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!route) throw new AppError(404, "Route not found");

  return prisma.routeSupervisor.findMany({
    where: { organizationId, routeId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export async function addRouteSupervisor(
  organizationId: string,
  routeId: string,
  body: Record<string, unknown>,
  actorUserId?: string
) {
  const route = await prisma.route.findFirst({
    where: { id: routeId, organizationId, deletedAt: null },
  });
  if (!route) throw new AppError(404, "Route not found");

  const name = str(body.name);
  const roleTitle = str(body.roleTitle ?? body.role);
  if (!name) throw new AppError(400, "Supervisor name is required");
  if (!roleTitle) throw new AppError(400, "Role / position is required");

  const row = await prisma.routeSupervisor.create({
    data: {
      organizationId,
      routeId,
      iamUserId: str(body.iamUserId) || null,
      name,
      email: str(body.email) || null,
      phone: str(body.phone) || null,
      roleTitle,
    },
  });

  await writeAudit(organizationId, "ROUTE_SUPERVISOR_ADD", {
    actorUserId,
    entityType: "route",
    entityId: routeId,
    detail: name,
  });

  return row;
}

export async function removeRouteSupervisor(organizationId: string, routeId: string, supervisorId: string, actorUserId?: string) {
  const row = await prisma.routeSupervisor.findFirst({
    where: { id: supervisorId, routeId, organizationId, deletedAt: null },
  });
  if (!row) throw new AppError(404, "Supervisor not found");

  await prisma.routeSupervisor.update({
    where: { id: supervisorId },
    data: { deletedAt: new Date() },
  });

  await writeAudit(organizationId, "ROUTE_SUPERVISOR_REMOVE", {
    actorUserId,
    entityType: "route",
    entityId: routeId,
    detail: row.name,
  });

  return { id: supervisorId };
}
