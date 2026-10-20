import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { env } from '../config/env';

function resolvePhoto(photo: string | null | undefined): string | null {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo)) return photo;
  const base = env.PUBLIC_BASE_URL.replace(/\/$/, '');
  return `${base}${photo.startsWith('/') ? photo : `/${photo}`}`;
}

export class PublicLookupService {
  async lookupByCode(code: string) {
    const raw = code.trim();
    if (!raw) throw new AppError(400, 'ShuleCode or SDMS code is required');

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { studentUid: { equals: raw, mode: 'insensitive' } },
          { studentCode: { equals: raw, mode: 'insensitive' } },
          { sdmCode: { equals: raw, mode: 'insensitive' } },
        ],
      },
      include: {
        tenant: true,
        enrollments: {
          where: { isCurrent: true },
          include: { class: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        studentParents: {
          include: { parent: true },
        },
      },
    });

    if (!student) {
      throw new AppError(404, 'No student found for that ShuleCode or SDMS code');
    }

    const enrollment = student.enrollments[0] ?? null;
    const className = enrollment?.class
      ? [enrollment.class.name, enrollment.class.stream].filter(Boolean).join(' · ')
      : null;

    const schoolDistrict = student.tenant.district ?? student.district ?? null;

    return {
      id: student.id,
      organizationId: student.organizationId,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      studentUid: student.studentUid,
      /** Canonical ShuleCode (studentUid); studentCode mirrors it for most schools. */
      shuleCode: student.studentUid,
      studentCode: student.studentCode ?? student.studentUid,
      sdmCode: student.sdmCode,
      registrationNumber: student.studentCode ?? student.studentUid,
      photoUrl: resolvePhoto(student.studentPhoto),
      status: student.status,
      schoolName: student.tenant.organizationName,
      schoolCode: student.tenant.schoolCode ?? student.tenant.organizationCode ?? null,
      organizationCode: student.tenant.organizationCode ?? null,
      district: schoolDistrict,
      province: student.province ?? null,
      sector: student.sector ?? null,
      className,
      classLabel: enrollment?.class?.name ?? null,
      classId: enrollment?.classId ?? null,
      academicYear: enrollment?.academicYear ?? null,
      term: enrollment?.term ?? null,
      parents: student.studentParents.map((sp) => ({
        role: sp.role,
        name: `${sp.parent.firstName} ${sp.parent.lastName}`.trim(),
        phone: sp.parent.phone,
        email: sp.parent.email,
      })),
      outstandingBalance: null as number | null,
      lastPayment: null as { amount: number; date: string; reference: string } | null,
    };
  }

  /**
   * Public self-service: a parent provides their details + a student code, confirms
   * they are the parent/guardian, and the parent is created/linked to the student
   * in the school database. Linked to the landing-portal kit order consent flow.
   */
  async claimParentByCode(input: {
    studentCode: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    role: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  }) {
    const raw = input.studentCode.trim();
    if (!raw) throw new AppError(400, 'ShuleCode or SDMS code is required');

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { studentUid: { equals: raw, mode: 'insensitive' } },
          { studentCode: { equals: raw, mode: 'insensitive' } },
          { sdmCode: { equals: raw, mode: 'insensitive' } },
        ],
      },
    });

    if (!student) {
      throw new AppError(404, 'No student found for that ShuleCode or SDMS code');
    }

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) {
      throw new AppError(400, 'Parent first and last name are required');
    }

    const phone = input.phone?.trim() || undefined;
    const email = input.email?.trim() || undefined;

    let parent = phone
      ? await prisma.parent.findFirst({ where: { organizationId: student.organizationId, phone } })
      : null;

    if (!parent) {
      parent = await prisma.parent.create({
        data: { organizationId: student.organizationId, firstName, lastName, phone, email },
      });
    }

    const link = await prisma.studentParent.upsert({
      where: {
        organizationId_studentId_parentId: {
          organizationId: student.organizationId,
          studentId: student.id,
          parentId: parent.id,
        },
      },
      create: {
        organizationId: student.organizationId,
        studentId: student.id,
        parentId: parent.id,
        role: input.role,
      },
      update: { role: input.role },
    });

    return {
      studentId: student.id,
      organizationId: student.organizationId,
      parentId: parent.id,
      fullName: `${parent.firstName} ${parent.lastName}`.trim(),
      phone: parent.phone,
      email: parent.email,
      role: link.role,
    };
  }
}

export const publicLookupService = new PublicLookupService();
