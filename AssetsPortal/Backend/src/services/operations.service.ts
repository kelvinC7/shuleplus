import { prisma } from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { registerAssetWithLedger } from "./register.service";

type PageQuery = { page?: number; limit?: number };

function parsePageQuery(query?: PageQuery) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function paginated<T>(rows: T[], total: number, page: number, limit: number) {
  return {
    data: rows,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

function mapAssignment(row: Awaited<ReturnType<typeof prisma.assetAssignment.findFirst>> & {
  asset?: unknown;
}) {
  if (!row) return row;
  const now = new Date();
  const status =
    row.returnedAt
      ? "Returned"
      : row.expectedReturnDate && row.expectedReturnDate < now && row.status === "Active"
        ? "Overdue"
        : row.status;
  return {
    ...row,
    assignDate: row.assignDate.toISOString(),
    expectedReturnDate: row.expectedReturnDate?.toISOString() ?? null,
    returnedAt: row.returnedAt?.toISOString() ?? null,
    returnDate: row.returnedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status,
  };
}

function mapMaintenance(row: Awaited<ReturnType<typeof prisma.assetMaintenance.findFirst>> & {
  asset?: unknown;
}) {
  if (!row) return row;
  return {
    ...row,
    dueDate: row.dueDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTransfer(row: Awaited<ReturnType<typeof prisma.assetTransfer.findFirst>> & {
  asset?: unknown;
}) {
  if (!row) return row;
  return {
    ...row,
    transferDate: row.transferDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function mapReplacement(row: Awaited<ReturnType<typeof prisma.assetReplacement.findFirst>> & {
  oldAsset?: unknown;
}) {
  if (!row) return row;
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listAssignments(organizationId: string, query?: PageQuery) {
  const { page, limit, skip } = parsePageQuery(query);
  const where = { organizationId };
  const [total, rows] = await Promise.all([
    prisma.assetAssignment.count({ where }),
    prisma.assetAssignment.findMany({
      where,
      include: { asset: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return paginated(rows.map((r) => mapAssignment(r)), total, page, limit);
}

export async function createAssignment(
  organizationId: string,
  input: {
    assetId: string;
    assigneeName?: string;
    department?: string;
    location?: string;
    assignDate?: string;
    expectedReturnDate?: string;
    notes?: string;
  }
) {
  const asset = await prisma.asset.findFirst({
    where: { id: input.assetId, organizationId, deletedAt: null },
  });
  if (!asset) throw new AppError(404, "Asset not found");
  return mapAssignment(
    await prisma.assetAssignment.create({
      data: {
        organizationId,
        assetId: asset.id,
        assigneeName: input.assigneeName,
        department: input.department,
        location: input.location ?? asset.location,
        assignDate: input.assignDate ? new Date(input.assignDate) : new Date(),
        expectedReturnDate: input.expectedReturnDate
          ? new Date(input.expectedReturnDate)
          : null,
        notes: input.notes,
        status: "Active",
      },
      include: { asset: true },
    })
  );
}

export async function returnAssignment(
  organizationId: string,
  id: string,
  input: { returnCondition?: string; returnNotes?: string; returnDate?: string; returnedAt?: string }
) {
  const row = await prisma.assetAssignment.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Assignment not found");
  const returnedAtRaw = input.returnedAt ?? input.returnDate;
  const returnedAt = returnedAtRaw ? new Date(returnedAtRaw) : new Date();
  if (Number.isNaN(returnedAt.getTime())) {
    throw new AppError(400, "Invalid return date");
  }
  const updated = await prisma.assetAssignment.update({
    where: { id },
    data: {
      returnedAt,
      returnCondition: input.returnCondition,
      returnNotes: input.returnNotes,
      status: "Returned",
    },
    include: { asset: true },
  });
  return mapAssignment(updated);
}

export async function updateAssignment(
  organizationId: string,
  id: string,
  input: {
    assigneeName?: string;
    department?: string;
    location?: string;
    assignDate?: string;
    expectedReturnDate?: string;
    notes?: string;
    returnCondition?: string;
    returnNotes?: string;
    returnDate?: string;
    returnedAt?: string;
  }
) {
  const row = await prisma.assetAssignment.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Assignment not found");
  const returnedAtRaw =
    input.returnedAt ?? input.returnDate;
  const updated = await prisma.assetAssignment.update({
    where: { id },
    data: {
      assigneeName: input.assigneeName ?? row.assigneeName,
      department: input.department ?? row.department,
      location: input.location ?? row.location,
      assignDate: input.assignDate ? new Date(input.assignDate) : row.assignDate,
      expectedReturnDate:
        input.expectedReturnDate !== undefined
          ? input.expectedReturnDate
            ? new Date(input.expectedReturnDate)
            : null
          : row.expectedReturnDate,
      notes: input.notes ?? row.notes,
      returnCondition: input.returnCondition ?? row.returnCondition,
      returnNotes: input.returnNotes ?? row.returnNotes,
      returnedAt:
        returnedAtRaw !== undefined
          ? returnedAtRaw
            ? new Date(returnedAtRaw)
            : null
          : row.returnedAt,
    },
    include: { asset: true },
  });
  return mapAssignment(updated);
}

export async function deleteAssignment(organizationId: string, id: string) {
  const row = await prisma.assetAssignment.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Assignment not found");
  await prisma.assetAssignment.delete({ where: { id } });
  return { id };
}

export async function updateMaintenance(
  organizationId: string,
  id: string,
  input: {
    description?: string;
    provider?: string;
    priority?: string;
    dueDate?: string;
    estimatedCost?: number;
    status?: string;
  }
) {
  const row = await prisma.assetMaintenance.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Maintenance ticket not found");
  const updated = await prisma.assetMaintenance.update({
    where: { id },
    data: {
      description: input.description ?? row.description,
      provider: input.provider ?? row.provider,
      priority: input.priority ?? row.priority,
      dueDate:
        input.dueDate !== undefined
          ? input.dueDate
            ? new Date(input.dueDate)
            : null
          : row.dueDate,
      estimatedCost: input.estimatedCost ?? row.estimatedCost,
      status: input.status ?? row.status,
    },
    include: { asset: true },
  });
  return mapMaintenance(updated);
}

export async function deleteMaintenance(organizationId: string, id: string) {
  const row = await prisma.assetMaintenance.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Maintenance ticket not found");
  await prisma.assetMaintenance.delete({ where: { id } });
  return { id };
}

export async function updateTransfer(
  organizationId: string,
  id: string,
  input: {
    toLocation?: string;
    toDepartment?: string;
    transferDate?: string;
    authorizedBy?: string;
    receivedBy?: string;
    reason?: string;
  }
) {
  const row = await prisma.assetTransfer.findFirst({
    where: { id, organizationId },
    include: { asset: true },
  });
  if (!row) throw new AppError(404, "Transfer not found");
  const transfer = await prisma.assetTransfer.update({
    where: { id },
    data: {
      toLocation: input.toLocation ?? row.toLocation,
      toDepartment: input.toDepartment ?? row.toDepartment,
      transferDate: input.transferDate ? new Date(input.transferDate) : row.transferDate,
      authorizedBy: input.authorizedBy ?? row.authorizedBy,
      receivedBy: input.receivedBy ?? row.receivedBy,
      reason: input.reason ?? row.reason,
    },
    include: { asset: true },
  });
  if (input.toLocation && row.asset) {
    await prisma.asset.update({
      where: { id: row.assetId },
      data: { location: input.toLocation },
    });
  }
  return transfer;
}

export async function deleteTransfer(organizationId: string, id: string) {
  const row = await prisma.assetTransfer.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Transfer not found");
  await prisma.assetTransfer.delete({ where: { id } });
  return { id };
}

export async function updateReplacement(
  organizationId: string,
  id: string,
  input: { reason?: string; pendingPayload?: object }
) {
  const row = await prisma.assetReplacement.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Replacement not found");
  if (row.status !== "Pending" && row.status !== "AwaitingAsset") {
    throw new AppError(400, "Only pending replacements can be edited");
  }
  return prisma.assetReplacement.update({
    where: { id },
    data: {
      reason: input.reason ?? row.reason,
      pendingPayload: input.pendingPayload ?? row.pendingPayload ?? {},
    },
    include: { oldAsset: true },
  });
}

export async function deleteReplacement(organizationId: string, id: string) {
  const row = await prisma.assetReplacement.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Replacement not found");
  if (row.status !== "Pending" && row.status !== "AwaitingAsset") {
    throw new AppError(400, "Only pending replacements can be deleted");
  }
  await prisma.assetReplacement.delete({ where: { id } });
  return { id };
}

export async function listMaintenance(organizationId: string, query?: PageQuery) {
  const { page, limit, skip } = parsePageQuery(query);
  const where = { organizationId };
  const [total, rows] = await Promise.all([
    prisma.assetMaintenance.count({ where }),
    prisma.assetMaintenance.findMany({
      where,
      include: { asset: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return paginated(rows.map((r) => mapMaintenance(r)), total, page, limit);
}

export async function createMaintenance(
  organizationId: string,
  input: {
    assetId: string;
    description: string;
    provider?: string;
    priority?: string;
    dueDate?: string;
    estimatedCost?: number;
  }
) {
  const asset = await prisma.asset.findFirst({
    where: { id: input.assetId, organizationId, deletedAt: null },
  });
  if (!asset) throw new AppError(404, "Asset not found");
  const created = await prisma.assetMaintenance.create({
    data: {
      organizationId,
      assetId: asset.id,
      description: input.description,
      provider: input.provider?.trim() || "Internal",
      priority: input.priority ?? "Medium",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      estimatedCost: input.estimatedCost,
      status: "Open",
    },
    include: { asset: true },
  });
  return mapMaintenance(created);
}

export async function extendMaintenance(
  organizationId: string,
  id: string,
  input: { newDueDate: string; reason?: string }
) {
  const row = await prisma.assetMaintenance.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Maintenance ticket not found");
  const log = Array.isArray(row.extensionLog) ? [...(row.extensionLog as object[])] : [];
  log.push({ newDueDate: input.newDueDate, reason: input.reason, at: new Date().toISOString() });
  return prisma.assetMaintenance.update({
    where: { id },
    data: {
      dueDate: new Date(input.newDueDate),
      extensionLog: log,
      status: "InProgress",
    },
    include: { asset: true },
  });
}

export async function listTransfers(organizationId: string, query?: PageQuery) {
  const { page, limit, skip } = parsePageQuery(query);
  const where = { organizationId };
  const [total, rows] = await Promise.all([
    prisma.assetTransfer.count({ where }),
    prisma.assetTransfer.findMany({
      where,
      include: { asset: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return paginated(rows.map((r) => mapTransfer(r)), total, page, limit);
}

export async function createTransfer(
  organizationId: string,
  input: {
    assetId: string;
    toLocation?: string;
    toDepartment?: string;
    transferDate?: string;
    authorizedBy?: string;
    receivedBy?: string;
    reason?: string;
  }
) {
  const asset = await prisma.asset.findFirst({
    where: { id: input.assetId, organizationId, deletedAt: null },
  });
  if (!asset) throw new AppError(404, "Asset not found");
  const transfer = await prisma.assetTransfer.create({
    data: {
      organizationId,
      assetId: asset.id,
      fromLocation: asset.location,
      toLocation: input.toLocation,
      fromDepartment: null,
      toDepartment: input.toDepartment,
      transferDate: input.transferDate ? new Date(input.transferDate) : new Date(),
      authorizedBy: input.authorizedBy,
      receivedBy: input.receivedBy,
      reason: input.reason,
    },
    include: { asset: true },
  });
  if (input.toLocation) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { location: input.toLocation },
    });
  }
  return transfer;
}

export async function listReplacements(organizationId: string, query?: PageQuery) {
  const { page, limit, skip } = parsePageQuery(query);
  const where = { organizationId };
  const [total, rows] = await Promise.all([
    prisma.assetReplacement.count({ where }),
    prisma.assetReplacement.findMany({
      where,
      include: { oldAsset: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return paginated(rows.map((r) => mapReplacement(r)), total, page, limit);
}

export async function createReplacement(
  organizationId: string,
  input: { oldAssetId: string; reason?: string; pendingPayload?: object }
) {
  const asset = await prisma.asset.findFirst({
    where: { id: input.oldAssetId, organizationId, deletedAt: null },
  });
  if (!asset) throw new AppError(404, "Asset not found");
  return prisma.assetReplacement.create({
    data: {
      organizationId,
      oldAssetId: asset.id,
      reason: input.reason,
      pendingPayload: input.pendingPayload ?? {},
      status: "Pending",
    },
    include: { oldAsset: true },
  });
}

export async function approveReplacement(organizationId: string, id: string) {
  const row = await prisma.assetReplacement.findFirst({
    where: { id, organizationId },
    include: { oldAsset: true },
  });
  if (!row) throw new AppError(404, "Replacement not found");
  if (row.status !== "Pending" && row.status !== "AwaitingAsset") {
    throw new AppError(400, "Replacement is not pending");
  }

  const payload = (row.pendingPayload ?? {}) as Record<string, unknown>;
  const created = await registerAssetWithLedger(organizationId, {
    assetName: String(payload.assetName ?? `${row.oldAsset.assetName} (Replacement)`),
    category: String(payload.category ?? row.oldAsset.categoryName),
    registerYear: Number(payload.registerYear ?? row.oldAsset.registerYear),
    purchasePrice: Number(payload.purchasePrice ?? row.oldAsset.unitPrice),
    location: String(payload.location ?? row.oldAsset.location),
    locationLabel: String(payload.locationLabel ?? row.oldAsset.locationLabel),
    quantity: 1,
    entryMode: "year_setup",
  });

  const newId = Array.isArray(created) ? created[0].id : created.id;
  await prisma.asset.update({
    where: { id: row.oldAssetId },
    data: {
      assetHealthStatus: "NotUsedOld",
      replacedByAssetId: newId,
    },
  });

  return prisma.assetReplacement.update({
    where: { id },
    data: { status: "Approved", newAssetId: newId },
    include: { oldAsset: true },
  });
}

export async function rejectReplacement(
  organizationId: string,
  id: string,
  reason?: string
) {
  const row = await prisma.assetReplacement.findFirst({ where: { id, organizationId } });
  if (!row) throw new AppError(404, "Replacement not found");
  return prisma.assetReplacement.update({
    where: { id },
    data: { status: "Rejected", rejectReason: reason },
    include: { oldAsset: true },
  });
}
