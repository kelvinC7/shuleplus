import { prisma } from '../config/database';
import { smListClasses, smListStudents, smListSubjects } from '../clients/student-management.client';

function normalize(s: string) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·_-]+/g, ' ');
}

function classLabel(c: { name?: string | null; stream?: string | null; label?: string | null }) {
  if (c.label?.trim()) return c.label.trim();
  return [c.name, c.stream].filter(Boolean).join(' ').trim();
}

function splitName(full: string) {
  const parts = String(full ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstName: parts[0] || 'Student',
    lastName: parts.slice(1).join(' ') || '',
  };
}

function asGender(value: unknown): 'MALE' | 'FEMALE' | null {
  const raw = String(value ?? '').trim().toUpperCase();
  if (raw === 'MALE' || raw === 'M' || raw === 'BOY') return 'MALE';
  if (raw === 'FEMALE' || raw === 'F' || raw === 'GIRL') return 'FEMALE';
  return null;
}

export async function resolveAcademicClass(
  organizationId: string,
  opts: { classId?: string; className?: string }
) {
  const wantedId = opts.classId?.trim();
  const wantedName = opts.className?.trim();

  if (wantedId) {
    const byId = await prisma.class.findFirst({ where: { id: wantedId, organizationId } });
    if (byId) return byId;
  }

  const local = await prisma.class.findMany({ where: { organizationId } });
  if (wantedName) {
    const target = normalize(wantedName);
    const match = local.find((c) => normalize(classLabel(c)) === target || normalize(c.name) === target);
    if (match) return match;
  }

  const smClasses = (await smListClasses(organizationId).catch(() => [])) as Array<{
    id: string;
    name: string;
    stream?: string | null;
    label?: string | null;
    category?: string | null;
  }>;
  const sm =
    (wantedId ? smClasses.find((c) => c.id === wantedId) : undefined) ||
    (wantedName
      ? smClasses.find((c) => normalize(classLabel(c)) === normalize(wantedName) || normalize(c.name) === normalize(wantedName))
      : undefined);
  if (!sm && wantedName) {
    const existingByName = local.find((c) => normalize(classLabel(c)) === normalize(wantedName) || normalize(c.name) === normalize(wantedName));
    if (existingByName) return existingByName;
    return prisma.class.create({
      data: {
        organizationId,
        name: wantedName,
        stream: null,
      },
    });
  }
  if (!sm) return null;

  const existing = await prisma.class.findFirst({
    where: { organizationId, name: sm.name, stream: sm.stream ?? null },
  });
  if (existing) {
    if (sm.category && !existing.category) {
      return prisma.class.update({
        where: { id: existing.id },
        data: { category: sm.category },
      });
    }
    return existing;
  }

  return prisma.class.create({
    data: {
      id: sm.id,
      organizationId,
      name: sm.name,
      stream: sm.stream ?? null,
      category: sm.category ?? null,
    },
  });
}

export async function resolveAcademicSubject(
  organizationId: string,
  opts: { subjectId?: string; subjectName?: string }
) {
  const wantedId = opts.subjectId?.trim();
  const wantedName = opts.subjectName?.trim();

  if (wantedId) {
    const byId = await prisma.subject.findFirst({ where: { id: wantedId, organizationId } });
    if (byId) return byId;
  }
  if (wantedName) {
    const byName = await prisma.subject.findFirst({
      where: { organizationId, name: { equals: wantedName, mode: 'insensitive' } },
    });
    if (byName) return byName;
  }

  const smSubjects = (await smListSubjects(organizationId).catch(() => [])) as Array<{
    id: string;
    name: string;
    code?: string | null;
  }>;
  const sm =
    (wantedId ? smSubjects.find((s) => s.id === wantedId) : undefined) ||
    (wantedName ? smSubjects.find((s) => normalize(s.name) === normalize(wantedName)) : undefined);

  if (sm) {
    const existing = await prisma.subject.findFirst({
      where: { organizationId, name: { equals: sm.name, mode: 'insensitive' } },
    });
    if (existing) return existing;
    return prisma.subject.create({
      data: {
        id: sm.id,
        organizationId,
        name: sm.name,
        code: sm.code ?? null,
      },
    });
  }

  if (wantedName) {
    return prisma.subject.create({
      data: { organizationId, name: wantedName },
    });
  }
  return null;
}

export async function ensureAcademicStudent(
  organizationId: string,
  input: { studentId: string; studentCode?: string; fullName?: string; gender?: string | null }
) {
  const byId = await prisma.student.findFirst({ where: { id: input.studentId, organizationId } });
  if (byId) return byId;

  const code = input.studentCode?.trim();
  if (code) {
    const byCode = await prisma.student.findFirst({
      where: { organizationId, OR: [{ studentUid: code }, { studentCode: code }] },
    });
    if (byCode) return byCode;
  }

  let smStudent: {
    id: string;
    studentCode?: string;
    fullName?: string;
    gender?: string | null;
  } | null = null;
  const smRows = (await smListStudents(organizationId, {
    search: code || input.studentId,
    status: 'ACTIVE',
  }).catch(() => [])) as Array<{
    id: string;
    studentCode?: string;
    fullName?: string;
    gender?: string | null;
  }>;
  smStudent =
    smRows.find((s) => s.id === input.studentId) ||
    smRows.find((s) => s.studentCode === code) ||
    null;

  const names = splitName(smStudent?.fullName || input.fullName || 'Student');
  const studentUid = smStudent?.studentCode || code || input.studentId;

  const existingUid = await prisma.student.findFirst({
    where: { organizationId, studentUid },
  });
  if (existingUid) return existingUid;

  return prisma.student.create({
    data: {
      id: smStudent?.id || input.studentId,
      organizationId,
      studentUid,
      studentCode: smStudent?.studentCode || code || null,
      firstName: names.firstName,
      lastName: names.lastName,
      gender: asGender(smStudent?.gender ?? input.gender),
      status: 'ACTIVE',
    },
  });
}
