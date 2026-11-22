import { randomUUID } from 'crypto';
import { prisma } from '../config/database';

export type PublicationAccessPolicyValue = 'PAID_ONLY' | 'ALL_PARENTS';

export type ReportCardPublicationRow = {
  id: string;
  organizationId: string;
  studentId: string;
  classId: string;
  className: string | null;
  studentName: string | null;
  studentCode: string | null;
  academicYear: string;
  term: string;
  publishedAt: Date;
  publishedBy: string | null;
  publishedByName: string | null;
  reportKind: string;
  batchId: string | null;
  accessPolicy: PublicationAccessPolicyValue;
  status: string;
};

type DbRow = {
  id: string;
  organization_id: string;
  student_id: string;
  class_id: string;
  class_name: string | null;
  student_name: string | null;
  student_code: string | null;
  academic_year: string;
  term: string;
  published_at: Date;
  published_by: string | null;
  published_by_name: string | null;
  report_kind: string;
  batch_id?: string | null;
  access_policy?: string | null;
  status?: string | null;
};

function mapRow(r: DbRow): ReportCardPublicationRow {
  const policy = r.access_policy === 'ALL_PARENTS' ? 'ALL_PARENTS' : 'PAID_ONLY';
  return {
    id: r.id,
    organizationId: r.organization_id,
    studentId: r.student_id,
    classId: r.class_id,
    className: r.class_name,
    studentName: r.student_name,
    studentCode: r.student_code,
    academicYear: r.academic_year,
    term: r.term,
    publishedAt: r.published_at,
    publishedBy: r.published_by,
    publishedByName: r.published_by_name,
    reportKind: r.report_kind || 'standard',
    batchId: r.batch_id ?? null,
    accessPolicy: policy,
    status: r.status || 'PUBLISHED',
  };
}

export async function upsertReportCardPublicationRow(input: {
  organizationId: string;
  studentId: string;
  classId: string;
  className: string | null;
  studentName: string | null;
  studentCode: string | null;
  academicYear: string;
  term: string;
  publishedBy?: string | null;
  publishedByName?: string | null;
  reportKind?: string;
  batchId?: string | null;
  accessPolicy?: PublicationAccessPolicyValue;
  status?: string;
}): Promise<ReportCardPublicationRow> {
  const reportKind = (input.reportKind?.trim() || 'standard').toLowerCase() === 'midterm' ? 'midterm' : 'standard';
  const accessPolicy: PublicationAccessPolicyValue = input.accessPolicy === 'ALL_PARENTS' ? 'ALL_PARENTS' : 'PAID_ONLY';
  const status = input.status || 'PUBLISHED';
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO report_card_publications (
      id, organization_id, student_id, class_id, class_name, student_name, student_code,
      academic_year, term, report_kind, published_at, published_by, published_by_name,
      batch_id, access_policy, status
    ) VALUES (
      ${id}, ${input.organizationId}, ${input.studentId}, ${input.classId},
      ${input.className}, ${input.studentName}, ${input.studentCode},
      ${input.academicYear}, ${input.term}, ${reportKind}, NOW(), ${input.publishedBy ?? null}, ${input.publishedByName ?? null},
      ${input.batchId ?? null}, ${accessPolicy}::"PublicationAccessPolicy", ${status}
    )
    ON CONFLICT (organization_id, student_id, class_id, academic_year, term, report_kind)
    DO UPDATE SET
      class_name = EXCLUDED.class_name,
      student_name = EXCLUDED.student_name,
      student_code = EXCLUDED.student_code,
      published_at = NOW(),
      published_by = EXCLUDED.published_by,
      published_by_name = EXCLUDED.published_by_name,
      batch_id = COALESCE(EXCLUDED.batch_id, report_card_publications.batch_id),
      access_policy = EXCLUDED.access_policy,
      status = EXCLUDED.status
  `;

  const found = await findReportCardPublicationRow({
    organizationId: input.organizationId,
    studentId: input.studentId,
    classId: input.classId,
    academicYear: input.academicYear,
    term: input.term,
    reportKind,
  });
  if (found) return found;

  return {
    id,
    organizationId: input.organizationId,
    studentId: input.studentId,
    classId: input.classId,
    className: input.className,
    studentName: input.studentName,
    studentCode: input.studentCode,
    academicYear: input.academicYear,
    term: input.term,
    publishedAt: new Date(),
    publishedBy: input.publishedBy ?? null,
    publishedByName: input.publishedByName ?? null,
    reportKind,
    batchId: input.batchId ?? null,
    accessPolicy,
    status,
  };
}

export async function findReportCardPublicationRow(input: {
  organizationId: string;
  studentId: string;
  classId: string;
  academicYear: string;
  term: string;
  reportKind?: string;
}): Promise<ReportCardPublicationRow | null> {
  const reportKind =
    (input.reportKind?.trim() || 'standard').toLowerCase() === 'midterm' ? 'midterm' : 'standard';
  const rows = await prisma.$queryRaw<DbRow[]>`
    SELECT id, organization_id, student_id, class_id, class_name, student_name, student_code,
           academic_year, term, report_kind, published_at, published_by, published_by_name,
           batch_id, access_policy, status
    FROM report_card_publications
    WHERE organization_id = ${input.organizationId}
      AND student_id = ${input.studentId}
      AND class_id = ${input.classId}
      AND academic_year = ${input.academicYear}
      AND term = ${input.term}
      AND report_kind = ${reportKind}
    LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listReportCardPublicationRows(
  organizationId: string,
  filters: {
    academicYear?: string;
    term?: string;
    classId?: string;
    className?: string;
    search?: string;
  }
): Promise<ReportCardPublicationRow[]> {
  const parts = ['organization_id = $1'];
  const params: unknown[] = [organizationId];
  let n = 2;

  if (filters.academicYear?.trim()) {
    parts.push(`academic_year = $${n++}`);
    params.push(filters.academicYear.trim());
  }
  if (filters.term?.trim()) {
    parts.push(`term = $${n++}`);
    params.push(filters.term.trim());
  }
  if (filters.classId?.trim()) {
    parts.push(`class_id = $${n++}`);
    params.push(filters.classId.trim());
  }
  if (filters.className?.trim()) {
    parts.push(`class_name ILIKE $${n++}`);
    params.push(`%${filters.className.trim()}%`);
  }
  if (filters.search?.trim()) {
    const like = `%${filters.search.trim()}%`;
    parts.push(`(student_name ILIKE $${n} OR student_code ILIKE $${n})`);
    params.push(like);
    n += 1;
  }

  const sql = `
    SELECT id, organization_id, student_id, class_id, class_name, student_name, student_code,
           academic_year, term, report_kind, published_at, published_by, published_by_name,
           batch_id, access_policy, status
    FROM report_card_publications
    WHERE ${parts.join(' AND ')}
    ORDER BY published_at DESC, student_name ASC NULLS LAST
    LIMIT 500
  `;
  const rows = await prisma.$queryRawUnsafe<DbRow[]>(sql, ...params);
  return rows.map(mapRow);
}
