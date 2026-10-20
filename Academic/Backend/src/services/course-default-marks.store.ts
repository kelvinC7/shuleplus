import { randomUUID } from 'crypto';
import { Prisma } from '../generated/prisma';
import { prisma } from '../config/database';

export type CourseDefaultMarksRow = {
  id: string;
  organizationId: string;
  classId: string;
  subjectId: string;
  academicYear: string;
  term: string;
  defaultCourseMarks: number;
  subject?: { id: string; name: string };
  class?: { id: string; name: string; stream: string | null };
};

/** Raw SQL access until Prisma client is regenerated (course_default_marks table). */
export async function listCourseDefaultMarksRows(
  organizationId: string,
  filters: { classId?: string; academicYear: string; term: string }
): Promise<CourseDefaultMarksRow[]> {
  const rows = filters.classId
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          organization_id: string;
          class_id: string;
          subject_id: string;
          academic_year: string;
          term: string;
          default_course_marks: unknown;
          subject_name: string;
          class_name: string;
          class_stream: string | null;
        }>
      >`
        SELECT cdm.id, cdm.organization_id, cdm.class_id, cdm.subject_id, cdm.academic_year, cdm.term,
               cdm.default_course_marks, s.name AS subject_name, c.name AS class_name, c.stream AS class_stream
        FROM course_default_marks cdm
        JOIN subjects s ON s.id = cdm.subject_id
        JOIN classes c ON c.id = cdm.class_id
        WHERE cdm.organization_id = ${organizationId}
          AND cdm.academic_year = ${filters.academicYear}
          AND cdm.term = ${filters.term}
          AND cdm.class_id = ${filters.classId}
        ORDER BY c.name ASC, s.name ASC
      `
    : await prisma.$queryRaw<
        Array<{
          id: string;
          organization_id: string;
          class_id: string;
          subject_id: string;
          academic_year: string;
          term: string;
          default_course_marks: unknown;
          subject_name: string;
          class_name: string;
          class_stream: string | null;
        }>
      >`
        SELECT cdm.id, cdm.organization_id, cdm.class_id, cdm.subject_id, cdm.academic_year, cdm.term,
               cdm.default_course_marks, s.name AS subject_name, c.name AS class_name, c.stream AS class_stream
        FROM course_default_marks cdm
        JOIN subjects s ON s.id = cdm.subject_id
        JOIN classes c ON c.id = cdm.class_id
        WHERE cdm.organization_id = ${organizationId}
          AND cdm.academic_year = ${filters.academicYear}
          AND cdm.term = ${filters.term}
        ORDER BY c.name ASC, s.name ASC
      `;

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    classId: r.class_id,
    subjectId: r.subject_id,
    academicYear: r.academic_year,
    term: r.term,
    defaultCourseMarks: Number(r.default_course_marks),
    subject: { id: r.subject_id, name: r.subject_name },
    class: { id: r.class_id, name: r.class_name, stream: r.class_stream },
  }));
}

export async function upsertCourseDefaultMarksRow(input: {
  organizationId: string;
  classId: string;
  subjectId: string;
  academicYear: string;
  term: string;
  defaultCourseMarks: number;
  updatedBy?: string | null;
}): Promise<CourseDefaultMarksRow> {
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO course_default_marks (
      id, organization_id, class_id, subject_id, academic_year, term, default_course_marks, updated_by, created_at, updated_at
    ) VALUES (
      ${id}, ${input.organizationId}, ${input.classId}, ${input.subjectId},
      ${input.academicYear}, ${input.term}, ${input.defaultCourseMarks}, ${input.updatedBy ?? null}, NOW(), NOW()
    )
    ON CONFLICT (organization_id, class_id, subject_id, academic_year, term)
    DO UPDATE SET
      default_course_marks = EXCLUDED.default_course_marks,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
  `;

  const listed = await listCourseDefaultMarksRows(input.organizationId, {
    classId: input.classId,
    academicYear: input.academicYear,
    term: input.term,
  });
  const hit = listed.find((r) => r.subjectId === input.subjectId);
  if (hit) return hit;

  const [subject, cls] = await Promise.all([
    prisma.subject.findFirst({ where: { id: input.subjectId, organizationId: input.organizationId } }),
    prisma.class.findFirst({ where: { id: input.classId, organizationId: input.organizationId } }),
  ]);

  return {
    id,
    organizationId: input.organizationId,
    classId: input.classId,
    subjectId: input.subjectId,
    academicYear: input.academicYear,
    term: input.term,
    defaultCourseMarks: input.defaultCourseMarks,
    subject: subject ? { id: subject.id, name: subject.name } : undefined,
    class: cls ? { id: cls.id, name: cls.name, stream: cls.stream } : undefined,
  };
}

export async function findCourseDefaultMarksForSubjects(
  organizationId: string,
  classId: string,
  academicYear: string,
  term: string,
  subjectIds: string[]
): Promise<Map<string, number>> {
  if (!subjectIds.length) return new Map();
  const rows = await prisma.$queryRaw<Array<{ subject_id: string; default_course_marks: unknown }>>`
    SELECT subject_id, default_course_marks
    FROM course_default_marks
    WHERE organization_id = ${organizationId}
      AND class_id = ${classId}
      AND academic_year = ${academicYear}
      AND term = ${term}
      AND subject_id IN (${Prisma.join(subjectIds.map((sid) => Prisma.sql`${sid}`))})
  `;
  return new Map(rows.map((r) => [r.subject_id, Math.max(1, Number(r.default_course_marks))]));
}
