import { PolicyStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import {
  EDUCATION_LEVELS,
  OWNERSHIPS,
  STUDENT_TYPES,
  asStringArray,
} from '../constants/policy';

export type GaPolicyInput = {
  levels: string[];
  ownerships: string[];
  studentTypes: string[];
  maxAmountRwf: number;
  requireApproval?: boolean;
  maxTimesPerTerm?: number;
  allowMultipleCharges?: boolean;
  requireAttachment?: boolean;
  attachmentTypes?: string[];
  description?: string | null;
  status?: PolicyStatus;
  effectiveDate?: string | null;
};

function validateInput(input: GaPolicyInput) {
  const levels = input.levels.map((l) => l.toUpperCase());
  if (!levels.length) throw new AppError(400, 'Applicable levels required');
  if (!levels.includes('ALL') && levels.some((l) => !(EDUCATION_LEVELS as readonly string[]).includes(l))) {
    throw new AppError(400, 'Invalid education level in General Assembly policy');
  }
  const ownerships = input.ownerships.map((o) => o.toUpperCase());
  if (!ownerships.length || ownerships.some((o) => !(OWNERSHIPS as readonly string[]).includes(o))) {
    throw new AppError(400, 'Ownerships must include GOVERNMENT and/or GOVERNMENT_AIDED');
  }
  const studentTypes = input.studentTypes.map((s) => s.toUpperCase());
  if (!studentTypes.length) throw new AppError(400, 'Student types required');
  const allowedStudents = [...STUDENT_TYPES, 'ALL'];
  if (studentTypes.some((s) => !allowedStudents.includes(s))) {
    throw new AppError(400, 'Invalid student type');
  }
  if (!(Number(input.maxAmountRwf) > 0)) throw new AppError(400, 'Maximum amount must be > 0');
}

function serialize(policy: {
  id: string;
  levels: unknown;
  ownerships: unknown;
  studentTypes: unknown;
  maxAmountRwf: Prisma.Decimal;
  requireApproval: boolean;
  maxTimesPerTerm: number;
  allowMultipleCharges: boolean;
  requireAttachment: boolean;
  attachmentTypes: unknown;
  description: string | null;
  status: PolicyStatus;
  effectiveDate: Date | null;
  version: number;
  archivedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: policy.id,
    levels: asStringArray(policy.levels),
    ownerships: asStringArray(policy.ownerships),
    studentTypes: asStringArray(policy.studentTypes),
    maxAmountRwf: Number(policy.maxAmountRwf),
    requireApproval: policy.requireApproval,
    maxTimesPerTerm: policy.maxTimesPerTerm,
    allowMultipleCharges: policy.allowMultipleCharges,
    requireAttachment: policy.requireAttachment,
    attachmentTypes: asStringArray(policy.attachmentTypes),
    description: policy.description,
    status: policy.status,
    effectiveDate: policy.effectiveDate?.toISOString() ?? null,
    version: policy.version,
    archivedAt: policy.archivedAt?.toISOString() ?? null,
    createdBy: policy.createdBy,
    updatedBy: policy.updatedBy,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

async function audit(
  action: string,
  entityId: string | null,
  actor: { id?: string; name?: string },
  payload?: unknown
) {
  await prisma.policyAuditLog.create({
    data: {
      entityType: 'GeneralAssemblyPolicy',
      entityId,
      action,
      actorId: actor.id,
      actorName: actor.name,
      payload: payload as Prisma.InputJsonValue,
    },
  });
}

export class GeneralAssemblyPolicyService {
  async list(query: { status?: string }) {
    const where: Prisma.GeneralAssemblyPolicyWhereInput = {};
    if (query.status) where.status = query.status.toUpperCase() as PolicyStatus;
    const items = await prisma.generalAssemblyPolicy.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
    });
    return { items: items.map(serialize), total: items.length };
  }

  async get(id: string) {
    const policy = await prisma.generalAssemblyPolicy.findUnique({ where: { id } });
    if (!policy) throw new AppError(404, 'General Assembly policy not found');
    return serialize(policy);
  }

  async create(input: GaPolicyInput, actor: { id?: string; name?: string }) {
    validateInput(input);
    const policy = await prisma.generalAssemblyPolicy.create({
      data: {
        levels: input.levels.map((l) => l.toUpperCase()),
        ownerships: input.ownerships.map((o) => o.toUpperCase()),
        studentTypes: input.studentTypes.map((s) => s.toUpperCase()),
        maxAmountRwf: input.maxAmountRwf,
        requireApproval: input.requireApproval ?? true,
        maxTimesPerTerm: input.maxTimesPerTerm ?? 1,
        allowMultipleCharges: input.allowMultipleCharges ?? false,
        requireAttachment: input.requireAttachment ?? false,
        attachmentTypes: (input.attachmentTypes ?? []).map(String),
        description: input.description ?? null,
        status: (input.status ?? 'ACTIVE') as PolicyStatus,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
    await audit('create', policy.id, actor, serialize(policy));
    return serialize(policy);
  }

  async update(id: string, input: Partial<GaPolicyInput>, actor: { id?: string; name?: string }) {
    const existing = await prisma.generalAssemblyPolicy.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'General Assembly policy not found');
    if (existing.status === 'ARCHIVED') throw new AppError(400, 'Archived policies cannot be edited');

    const merged: GaPolicyInput = {
      levels: input.levels ?? asStringArray(existing.levels),
      ownerships: input.ownerships ?? asStringArray(existing.ownerships),
      studentTypes: input.studentTypes ?? asStringArray(existing.studentTypes),
      maxAmountRwf: input.maxAmountRwf ?? Number(existing.maxAmountRwf),
      requireApproval: input.requireApproval ?? existing.requireApproval,
      maxTimesPerTerm: input.maxTimesPerTerm ?? existing.maxTimesPerTerm,
      allowMultipleCharges: input.allowMultipleCharges ?? existing.allowMultipleCharges,
      requireAttachment: input.requireAttachment ?? existing.requireAttachment,
      attachmentTypes: input.attachmentTypes ?? asStringArray(existing.attachmentTypes),
      description: input.description !== undefined ? input.description : existing.description,
      status: input.status ?? existing.status,
      effectiveDate:
        input.effectiveDate !== undefined
          ? input.effectiveDate
          : existing.effectiveDate?.toISOString() ?? null,
    };
    validateInput(merged);

    const policy = await prisma.generalAssemblyPolicy.update({
      where: { id },
      data: {
        levels: merged.levels.map((l) => l.toUpperCase()),
        ownerships: merged.ownerships.map((o) => o.toUpperCase()),
        studentTypes: merged.studentTypes.map((s) => s.toUpperCase()),
        maxAmountRwf: merged.maxAmountRwf,
        requireApproval: merged.requireApproval ?? true,
        maxTimesPerTerm: merged.maxTimesPerTerm ?? 1,
        allowMultipleCharges: merged.allowMultipleCharges ?? false,
        requireAttachment: merged.requireAttachment ?? false,
        attachmentTypes: (merged.attachmentTypes ?? []).map(String),
        description: merged.description ?? null,
        status: merged.status as PolicyStatus,
        effectiveDate: merged.effectiveDate ? new Date(merged.effectiveDate) : null,
        version: existing.version + 1,
        updatedBy: actor.id,
      },
    });
    await audit('update', policy.id, actor, serialize(policy));
    return serialize(policy);
  }

  async archive(id: string, actor: { id?: string; name?: string }) {
    const existing = await prisma.generalAssemblyPolicy.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'General Assembly policy not found');
    const policy = await prisma.generalAssemblyPolicy.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        version: existing.version + 1,
        updatedBy: actor.id,
      },
    });
    await audit('archive', policy.id, actor, serialize(policy));
    return serialize(policy);
  }
}

export const generalAssemblyPolicyService = new GeneralAssemblyPolicyService();
