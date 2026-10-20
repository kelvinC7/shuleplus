import {
  EducationLevel,
  PolicyStatus,
  Prisma,
  StudentType,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import {
  CLASS_OPTIONS,
  EDUCATION_LEVELS,
  OWNERSHIPS,
  STUDENT_TYPES,
  asStringArray,
  type EducationLevelCode,
} from '../constants/policy';

export type FeePolicyInput = {
  academicYear: string;
  term: number;
  educationLevel: EducationLevelCode;
  studentType: 'DAY' | 'BOARDING';
  ownerships: string[];
  applyToClasses: string[];
  maxTuitionRwf: number;
  status?: PolicyStatus;
  effectiveDate?: string | null;
  description?: string | null;
};

function validateInput(input: FeePolicyInput) {
  if (!input.academicYear?.trim()) throw new AppError(400, 'Academic year is required');
  if (![1, 2, 3].includes(Number(input.term))) throw new AppError(400, 'Term must be 1, 2, or 3');
  if (!(EDUCATION_LEVELS as readonly string[]).includes(input.educationLevel)) {
    throw new AppError(400, 'Invalid education level');
  }
  if (!(STUDENT_TYPES as readonly string[]).includes(input.studentType)) {
    throw new AppError(400, 'Invalid student type');
  }
  const ownerships = input.ownerships.map((o) => o.toUpperCase());
  if (!ownerships.length || ownerships.some((o) => !(OWNERSHIPS as readonly string[]).includes(o))) {
    throw new AppError(400, 'Ownerships must include GOVERNMENT and/or GOVERNMENT_AIDED');
  }
  const classes = input.applyToClasses.map((c) => c.toUpperCase());
  if (!classes.length) throw new AppError(400, 'Apply-to classes is required');
  if (!classes.includes('ALL')) {
    const allowed = CLASS_OPTIONS[input.educationLevel];
    if (classes.some((c) => !allowed.includes(c))) {
      throw new AppError(400, `Invalid class for ${input.educationLevel}`);
    }
  }
  if (!(Number(input.maxTuitionRwf) > 0)) throw new AppError(400, 'Maximum tuition must be > 0');
}

function serialize(policy: {
  id: string;
  academicYear: string;
  term: number;
  educationLevel: EducationLevel;
  studentType: StudentType;
  ownerships: unknown;
  applyToClasses: unknown;
  maxTuitionRwf: Prisma.Decimal;
  status: PolicyStatus;
  effectiveDate: Date | null;
  description: string | null;
  version: number;
  archivedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: policy.id,
    academicYear: policy.academicYear,
    term: policy.term,
    educationLevel: policy.educationLevel,
    studentType: policy.studentType,
    ownerships: asStringArray(policy.ownerships),
    applyToClasses: asStringArray(policy.applyToClasses),
    maxTuitionRwf: Number(policy.maxTuitionRwf),
    status: policy.status,
    effectiveDate: policy.effectiveDate?.toISOString() ?? null,
    description: policy.description,
    version: policy.version,
    archivedAt: policy.archivedAt?.toISOString() ?? null,
    createdBy: policy.createdBy,
    updatedBy: policy.updatedBy,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
    // list-compat fields for existing UI
    name: `${policy.educationLevel} · ${policy.studentType} · Term ${policy.term}`,
    ownership: asStringArray(policy.ownerships).join(', '),
    level: policy.educationLevel,
    maxAnnualFeeRwf: Number(policy.maxTuitionRwf),
    academicYearId: policy.academicYear,
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
      entityType: 'FeePolicy',
      entityId,
      action,
      actorId: actor.id,
      actorName: actor.name,
      payload: payload as Prisma.InputJsonValue,
    },
  });
}

export class FeePolicyService {
  async list(query: { status?: string; academicYear?: string; educationLevel?: string }) {
    const where: Prisma.FeePolicyWhereInput = {};
    if (query.status) where.status = query.status.toUpperCase() as PolicyStatus;
    if (query.academicYear) where.academicYear = query.academicYear;
    if (query.educationLevel) {
      where.educationLevel = query.educationLevel.toUpperCase() as EducationLevel;
    }
    const items = await prisma.feePolicy.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
    });
    return { items: items.map(serialize), total: items.length };
  }

  async get(id: string) {
    const policy = await prisma.feePolicy.findUnique({ where: { id } });
    if (!policy) throw new AppError(404, 'Fee policy not found');
    return serialize(policy);
  }

  async create(input: FeePolicyInput, actor: { id?: string; name?: string }) {
    validateInput(input);
    const policy = await prisma.feePolicy.create({
      data: {
        academicYear: input.academicYear.trim(),
        term: Number(input.term),
        educationLevel: input.educationLevel as EducationLevel,
        studentType: input.studentType as StudentType,
        ownerships: input.ownerships.map((o) => o.toUpperCase()),
        applyToClasses: input.applyToClasses.map((c) => c.toUpperCase()),
        maxTuitionRwf: input.maxTuitionRwf,
        status: (input.status ?? 'ACTIVE') as PolicyStatus,
        effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
        description: input.description ?? null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
    await audit('create', policy.id, actor, serialize(policy));
    return serialize(policy);
  }

  async update(id: string, input: Partial<FeePolicyInput>, actor: { id?: string; name?: string }) {
    const existing = await prisma.feePolicy.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Fee policy not found');
    if (existing.status === 'ARCHIVED') throw new AppError(400, 'Archived policies cannot be edited');

    const merged: FeePolicyInput = {
      academicYear: input.academicYear ?? existing.academicYear,
      term: input.term ?? existing.term,
      educationLevel: (input.educationLevel ?? existing.educationLevel) as EducationLevelCode,
      studentType: (input.studentType ?? existing.studentType) as 'DAY' | 'BOARDING',
      ownerships: input.ownerships ?? asStringArray(existing.ownerships),
      applyToClasses: input.applyToClasses ?? asStringArray(existing.applyToClasses),
      maxTuitionRwf: input.maxTuitionRwf ?? Number(existing.maxTuitionRwf),
      status: input.status ?? existing.status,
      effectiveDate:
        input.effectiveDate !== undefined
          ? input.effectiveDate
          : existing.effectiveDate?.toISOString() ?? null,
      description: input.description !== undefined ? input.description : existing.description,
    };
    validateInput(merged);

    const policy = await prisma.feePolicy.update({
      where: { id },
      data: {
        academicYear: merged.academicYear.trim(),
        term: Number(merged.term),
        educationLevel: merged.educationLevel as EducationLevel,
        studentType: merged.studentType as StudentType,
        ownerships: merged.ownerships.map((o) => o.toUpperCase()),
        applyToClasses: merged.applyToClasses.map((c) => c.toUpperCase()),
        maxTuitionRwf: merged.maxTuitionRwf,
        status: merged.status as PolicyStatus,
        effectiveDate: merged.effectiveDate ? new Date(merged.effectiveDate) : null,
        description: merged.description ?? null,
        version: existing.version + 1,
        updatedBy: actor.id,
      },
    });
    await audit('update', policy.id, actor, serialize(policy));
    return serialize(policy);
  }

  async archive(id: string, actor: { id?: string; name?: string }) {
    const existing = await prisma.feePolicy.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Fee policy not found');
    const policy = await prisma.feePolicy.update({
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

export const feePolicyService = new FeePolicyService();
