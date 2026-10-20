import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  asStringArray,
  classToken,
  inferLevelFromClass,
  normalizeEducationLevel,
  normalizeOwnership,
  normalizeStudentType,
  policyApplies,
  type EducationLevelCode,
  type OwnershipCode,
  type StudentTypeCode,
} from '../constants/policy';

export type ResolveInput = {
  ownershipType?: string | null;
  feeTargetStudents?: string | null;
  academicYear?: string | null;
  term?: string | number | null;
  educationLevel?: string | null;
  studentType?: string | null;
  classLabel?: string | null;
  /** Optional amounts for simulation */
  enteredTuitionRwf?: number | null;
  enteredGeneralAssemblyRwf?: number | null;
  enteredTotalRwf?: number | null;
};

function parseTerm(term: string | number | null | undefined): number | null {
  if (term == null || term === '') return null;
  if (typeof term === 'number' && [1, 2, 3].includes(term)) return term;
  const s = String(term).trim();
  const digit = s.match(/([123])/);
  if (digit) return Number(digit[1]);
  return null;
}

function matchesOwnership(policyOwnerships: string[], ownership: OwnershipCode): boolean {
  return policyOwnerships.map((o) => o.toUpperCase()).includes(ownership);
}

function matchesClasses(applyTo: string[], classLabel?: string | null): boolean {
  const normalized = applyTo.map((c) => c.toUpperCase());
  if (normalized.includes('ALL')) return true;
  const token = classToken(classLabel);
  if (!token) return true;
  return normalized.some((c) => token === c || token.startsWith(c));
}

function matchesGaLevels(levels: string[], educationLevel: EducationLevelCode): boolean {
  const normalized = levels.map((l) => l.toUpperCase());
  return normalized.includes('ALL') || normalized.includes(educationLevel);
}

function matchesGaStudents(studentTypes: string[], studentType: StudentTypeCode): boolean {
  const normalized = studentTypes.map((s) => s.toUpperCase());
  return normalized.includes('ALL') || normalized.includes(studentType);
}

export class PolicyEngineService {
  async resolve(input: ResolveInput) {
    const applies = policyApplies({
      ownershipType: input.ownershipType,
      feeTargetStudents: input.feeTargetStudents,
    });

    if (!applies) {
      return {
        applies: false as const,
        reason: 'NESA fee policies do not apply to this ownership/cohort',
        tuitionMaxRwf: null,
        generalAssemblyMaxRwf: null,
        totalMaxRwf: null,
        policies: [] as Array<Record<string, unknown>>,
        ownership: normalizeOwnership(input.ownershipType),
        feeTargetStudents: input.feeTargetStudents ?? 'public',
      };
    }

    const ownership = normalizeOwnership(input.ownershipType) as OwnershipCode;
    const studentType = normalizeStudentType(input.studentType);
    const educationLevel =
      normalizeEducationLevel(input.educationLevel) ??
      inferLevelFromClass(input.classLabel) ??
      'PRIMARY';
    const term = parseTerm(input.term);
    const academicYear = (input.academicYear ?? '').trim() || undefined;

    const feePolicies = await prisma.feePolicy.findMany({
      where: {
        status: 'ACTIVE',
        educationLevel,
        studentType,
        ...(term ? { term } : {}),
        ...(academicYear ? { academicYear } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    const matchedTuition = feePolicies.find((p) => {
      const ownerships = asStringArray(p.ownerships);
      const classes = asStringArray(p.applyToClasses);
      return matchesOwnership(ownerships, ownership) && matchesClasses(classes, input.classLabel);
    });

    const gaPolicies = await prisma.generalAssemblyPolicy.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
    });

    const matchedGa = gaPolicies.find((p) => {
      const ownerships = asStringArray(p.ownerships);
      const levels = asStringArray(p.levels);
      const students = asStringArray(p.studentTypes);
      return (
        matchesOwnership(ownerships, ownership) &&
        matchesGaLevels(levels, educationLevel) &&
        matchesGaStudents(students, studentType)
      );
    });

    const tuitionMaxRwf = matchedTuition ? Number(matchedTuition.maxTuitionRwf) : null;
    const generalAssemblyMaxRwf = matchedGa ? Number(matchedGa.maxAmountRwf) : null;
    const totalMaxRwf =
      tuitionMaxRwf == null && generalAssemblyMaxRwf == null
        ? null
        : (tuitionMaxRwf ?? 0) + (generalAssemblyMaxRwf ?? 0);

    const policies: Array<Record<string, unknown>> = [];
    if (matchedTuition) {
      policies.push({
        type: 'TUITION',
        id: matchedTuition.id,
        academicYear: matchedTuition.academicYear,
        term: matchedTuition.term,
        educationLevel: matchedTuition.educationLevel,
        studentType: matchedTuition.studentType,
        maxTuitionRwf: tuitionMaxRwf,
        applyToClasses: asStringArray(matchedTuition.applyToClasses),
        description: matchedTuition.description,
      });
    }
    if (matchedGa) {
      policies.push({
        type: 'GENERAL_ASSEMBLY',
        id: matchedGa.id,
        maxAmountRwf: generalAssemblyMaxRwf,
        requireApproval: matchedGa.requireApproval,
        requireAttachment: matchedGa.requireAttachment,
        attachmentTypes: asStringArray(matchedGa.attachmentTypes),
        description: matchedGa.description,
      });
    }

    return {
      applies: true as const,
      reason: matchedTuition || matchedGa ? 'Active policies loaded' : 'No matching active policy',
      academicYear: academicYear ?? null,
      term,
      educationLevel,
      studentType,
      ownership,
      feeTargetStudents: input.feeTargetStudents ?? 'public',
      classLabel: input.classLabel ?? null,
      tuitionMaxRwf,
      generalAssemblyMaxRwf,
      totalMaxRwf,
      /** Back-compat for Babyeyi nesa-limit consumers */
      limit: totalMaxRwf ?? tuitionMaxRwf,
      policies,
    };
  }

  async simulate(input: ResolveInput) {
    const resolved = await this.resolve(input);
    const enteredTuition = Number(input.enteredTuitionRwf ?? 0);
    const enteredGa = Number(input.enteredGeneralAssemblyRwf ?? 0);
    const enteredTotal =
      input.enteredTotalRwf != null
        ? Number(input.enteredTotalRwf)
        : enteredTuition + enteredGa;

    if (!resolved.applies) {
      const result = {
        ...resolved,
        enteredTuitionRwf: enteredTuition || null,
        enteredGeneralAssemblyRwf: enteredGa || null,
        enteredTotalRwf: enteredTotal || null,
        differenceRwf: null,
        status: 'SKIPPED' as const,
        message: 'Policy engine skipped — private cohort or private school',
      };
      await this.logSimulate(result);
      return result;
    }

    const max = resolved.totalMaxRwf ?? resolved.tuitionMaxRwf;
    let status: 'VALID' | 'NOT_ALLOWED' | 'NO_POLICY' = 'NO_POLICY';
    let differenceRwf: number | null = null;
    let message = 'No matching active tuition/GA policy';

    if (max != null) {
      differenceRwf = Math.max(0, enteredTotal - max);
      if (enteredTotal <= max) {
        status = 'VALID';
        message = 'Within policy limits';
      } else {
        status = 'NOT_ALLOWED';
        message = 'Over policy limit — request approval required';
      }
    }

    // Line-item checks when provided
    const tuitionOk =
      resolved.tuitionMaxRwf == null || enteredTuition <= 0 || enteredTuition <= resolved.tuitionMaxRwf;
    const gaOk =
      resolved.generalAssemblyMaxRwf == null ||
      enteredGa <= 0 ||
      enteredGa <= resolved.generalAssemblyMaxRwf;

    const result = {
      ...resolved,
      enteredTuitionRwf: enteredTuition || null,
      enteredGeneralAssemblyRwf: enteredGa || null,
      enteredTotalRwf: enteredTotal || null,
      differenceRwf,
      tuitionLineStatus: tuitionOk ? 'VALID' : 'OVER_LIMIT',
      generalAssemblyLineStatus: gaOk ? 'VALID' : 'OVER_LIMIT',
      status,
      message,
      requestApproval: status === 'NOT_ALLOWED',
    };
    await this.logSimulate(result);
    return result;
  }

  private async logSimulate(payload: unknown) {
    await prisma.policyAuditLog.create({
      data: {
        entityType: 'PolicyEngine',
        action: 'simulate',
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}

export const policyEngineService = new PolicyEngineService();
