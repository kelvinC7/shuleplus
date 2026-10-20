import { randomUUID } from 'crypto';
import { prisma } from '../config/database';

export type ReportCardAccessPolicyRow = {
  organizationId: string;
  requireFeesClearance: boolean;
  blockWhenLoanActive: boolean;
  updatedAt: Date;
};

export type ReportCardAccessOverrideRow = {
  id: string;
  organizationId: string;
  studentId: string;
  studentCode: string | null;
  academicYear: string;
  term: string;
  decision: string;
  exceptionReason: string | null;
  exceptionNote: string | null;
  exceptionById: string | null;
  exceptionByName: string | null;
  exceptionAt: Date | null;
};

const DEFAULT_POLICY = {
  requireFeesClearance: true,
  blockWhenLoanActive: true,
};

export async function getOrCreateReportCardAccessPolicy(
  organizationId: string
): Promise<ReportCardAccessPolicyRow> {
  const existing = await prisma.$queryRaw<
    Array<{
      organization_id: string;
      require_fees_clearance: boolean;
      block_when_loan_active: boolean;
      updated_at: Date;
    }>
  >`
    SELECT organization_id, require_fees_clearance, block_when_loan_active, updated_at
    FROM report_card_access_policies
    WHERE organization_id = ${organizationId}
    LIMIT 1
  `;
  if (existing[0]) {
    const r = existing[0];
    return {
      organizationId: r.organization_id,
      requireFeesClearance: Boolean(r.require_fees_clearance),
      blockWhenLoanActive: Boolean(r.block_when_loan_active),
      updatedAt: r.updated_at,
    };
  }

  await prisma.$executeRaw`
    INSERT INTO report_card_access_policies (organization_id, require_fees_clearance, block_when_loan_active, updated_at)
    VALUES (${organizationId}, ${DEFAULT_POLICY.requireFeesClearance}, ${DEFAULT_POLICY.blockWhenLoanActive}, NOW())
    ON CONFLICT (organization_id) DO NOTHING
  `;

  const again = await prisma.$queryRaw<
    Array<{
      organization_id: string;
      require_fees_clearance: boolean;
      block_when_loan_active: boolean;
      updated_at: Date;
    }>
  >`
    SELECT organization_id, require_fees_clearance, block_when_loan_active, updated_at
    FROM report_card_access_policies
    WHERE organization_id = ${organizationId}
    LIMIT 1
  `;
  const r = again[0];
  if (r) {
    return {
      organizationId: r.organization_id,
      requireFeesClearance: Boolean(r.require_fees_clearance),
      blockWhenLoanActive: Boolean(r.block_when_loan_active),
      updatedAt: r.updated_at,
    };
  }

  return {
    organizationId,
    ...DEFAULT_POLICY,
    updatedAt: new Date(),
  };
}

export async function updateReportCardAccessPolicy(
  organizationId: string,
  body: { requireFeesClearance?: boolean; blockWhenLoanActive?: boolean }
): Promise<ReportCardAccessPolicyRow> {
  await getOrCreateReportCardAccessPolicy(organizationId);

  const requireFeesClearance = body.requireFeesClearance ?? DEFAULT_POLICY.requireFeesClearance;
  const blockWhenLoanActive = body.blockWhenLoanActive ?? DEFAULT_POLICY.blockWhenLoanActive;

  if (body.requireFeesClearance !== undefined || body.blockWhenLoanActive !== undefined) {
    const req =
      body.requireFeesClearance !== undefined ? body.requireFeesClearance : undefined;
    const block =
      body.blockWhenLoanActive !== undefined ? body.blockWhenLoanActive : undefined;

    if (req !== undefined && block !== undefined) {
      await prisma.$executeRaw`
        UPDATE report_card_access_policies
        SET require_fees_clearance = ${req}, block_when_loan_active = ${block}, updated_at = NOW()
        WHERE organization_id = ${organizationId}
      `;
    } else if (req !== undefined) {
      await prisma.$executeRaw`
        UPDATE report_card_access_policies
        SET require_fees_clearance = ${req}, updated_at = NOW()
        WHERE organization_id = ${organizationId}
      `;
    } else if (block !== undefined) {
      await prisma.$executeRaw`
        UPDATE report_card_access_policies
        SET block_when_loan_active = ${block}, updated_at = NOW()
        WHERE organization_id = ${organizationId}
      `;
    }
  }

  return getOrCreateReportCardAccessPolicy(organizationId);
}

export async function listReportCardAccessOverrides(
  organizationId: string,
  academicYear: string,
  term: string
): Promise<ReportCardAccessOverrideRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      organization_id: string;
      student_id: string;
      student_code: string | null;
      academic_year: string;
      term: string;
      decision: string;
      exception_reason: string | null;
      exception_note: string | null;
      exception_by_id: string | null;
      exception_by_name: string | null;
      exception_at: Date | null;
    }>
  >`
    SELECT id, organization_id, student_id, student_code, academic_year, term, decision,
           exception_reason, exception_note, exception_by_id, exception_by_name, exception_at
    FROM report_card_access_overrides
    WHERE organization_id = ${organizationId}
      AND academic_year = ${academicYear}
      AND term = ${term}
  `;
  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    studentId: r.student_id,
    studentCode: r.student_code,
    academicYear: r.academic_year,
    term: r.term,
    decision: r.decision,
    exceptionReason: r.exception_reason,
    exceptionNote: r.exception_note,
    exceptionById: r.exception_by_id,
    exceptionByName: r.exception_by_name,
    exceptionAt: r.exception_at,
  }));
}

export async function upsertReportCardAccessOverride(input: {
  organizationId: string;
  studentId: string;
  studentCode?: string | null;
  academicYear: string;
  term: string;
  decision: string;
  exceptionReason?: string | null;
  exceptionNote?: string | null;
  exceptionById?: string | null;
  exceptionByName?: string | null;
}): Promise<ReportCardAccessOverrideRow> {
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO report_card_access_overrides (
      id, organization_id, student_id, student_code, academic_year, term, decision,
      exception_reason, exception_note, exception_by_id, exception_by_name, exception_at,
      created_at, updated_at
    ) VALUES (
      ${id}, ${input.organizationId}, ${input.studentId}, ${input.studentCode ?? null},
      ${input.academicYear}, ${input.term}, ${input.decision}::"ExamDecision",
      ${input.exceptionReason ?? null}, ${input.exceptionNote ?? null},
      ${input.exceptionById ?? null}, ${input.exceptionByName ?? null}, NOW(), NOW(), NOW()
    )
    ON CONFLICT (organization_id, student_id, academic_year, term)
    DO UPDATE SET
      student_code = EXCLUDED.student_code,
      decision = EXCLUDED.decision,
      exception_reason = EXCLUDED.exception_reason,
      exception_note = EXCLUDED.exception_note,
      exception_by_id = EXCLUDED.exception_by_id,
      exception_by_name = EXCLUDED.exception_by_name,
      exception_at = NOW(),
      updated_at = NOW()
  `;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      organization_id: string;
      student_id: string;
      student_code: string | null;
      academic_year: string;
      term: string;
      decision: string;
      exception_reason: string | null;
      exception_note: string | null;
      exception_by_id: string | null;
      exception_by_name: string | null;
      exception_at: Date | null;
    }>
  >`
    SELECT id, organization_id, student_id, student_code, academic_year, term, decision,
           exception_reason, exception_note, exception_by_id, exception_by_name, exception_at
    FROM report_card_access_overrides
    WHERE organization_id = ${input.organizationId}
      AND student_id = ${input.studentId}
      AND academic_year = ${input.academicYear}
      AND term = ${input.term}
    LIMIT 1
  `;
  const r = rows[0]!;
  return {
    id: r.id,
    organizationId: r.organization_id,
    studentId: r.student_id,
    studentCode: r.student_code,
    academicYear: r.academic_year,
    term: r.term,
    decision: r.decision,
    exceptionReason: r.exception_reason,
    exceptionNote: r.exception_note,
    exceptionById: r.exception_by_id,
    exceptionByName: r.exception_by_name,
    exceptionAt: r.exception_at,
  };
}
