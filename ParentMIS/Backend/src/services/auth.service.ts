import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';
import { hashPassword, normalizeParentPin, sanitizePhone, verifyPassword } from '../utils/password';

function issueToken(parent: { id: string; email: string | null; organizationId: string }) {
  const payload = {
    sub: parent.id,
    email: parent.email ?? '',
    organizationId: parent.organizationId,
    sessionId: randomUUID(),
    roles: ['parent'],
    modules: [env.MODULE_SLUG],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '12h',
    algorithm: 'HS256',
  });
}

async function linkedStudents(parentId: string) {
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId },
    include: { student: true },
  });
  return links.map(({ student, relationship }) => ({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    firstName: student.firstName,
    lastName: student.lastName,
    studentCode: student.shuleCode,
    className: student.className,
    photo: student.avatarUrl,
    role: relationship,
    organizationId: student.organizationId,
  }));
}

function serializeParent(parent: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  organizationId: string;
}) {
  return {
    id: parent.id,
    firstName: parent.firstName,
    lastName: parent.lastName,
    phone: parent.phone,
    email: parent.email,
    organizationId: parent.organizationId,
  };
}

export class AuthService {
  async status(phoneRaw: string) {
    const phone = sanitizePhone(phoneRaw);
    const parent = await prisma.parentAccount.findFirst({
      where: { phone },
      include: { students: { include: { student: true } } },
    });

    if (!parent) {
      throw new AppError(404, 'No parent account found for this phone number');
    }

    return {
      phone: parent.phone,
      hasPassword: parent.hasPassword,
      hasPin: parent.hasPassword,
      displayName: `${parent.firstName} ${parent.lastName}`,
      students: parent.students.map(({ student, relationship }) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        studentCode: student.shuleCode,
        className: student.className,
        role: relationship,
      })),
    };
  }

  async login(phoneRaw: string, password: string) {
    const pin = normalizeParentPin(password);
    const phone = sanitizePhone(phoneRaw);
    const parent = await prisma.parentAccount.findFirst({ where: { phone } });

    if (!parent || !parent.passwordHash || !parent.hasPassword) {
      throw new AppError(401, 'Invalid phone number or PIN');
    }

    if (!verifyPassword(pin, parent.passwordHash)) {
      throw new AppError(401, 'Invalid phone number or PIN');
    }

    const token = issueToken(parent);
    const students = await linkedStudents(parent.id);
    await prisma.activityLog.create({
      data: {
        organizationId: parent.organizationId,
        userId: parent.id,
        action: 'PARENT_LOGIN',
        description: `${parent.firstName} ${parent.lastName} signed in to Parent Portal`,
      },
    });

    return { token, parent: serializeParent(parent), students };
  }

  async setPassword(phoneRaw: string, password: string, confirmPassword: string) {
    const pin = normalizeParentPin(password);
    const confirmPin = normalizeParentPin(confirmPassword);
    if (pin !== confirmPin) {
      throw new AppError(400, 'PINs do not match');
    }

    const phone = sanitizePhone(phoneRaw);
    const parent = await prisma.parentAccount.findFirst({ where: { phone } });
    if (!parent) {
      throw new AppError(404, 'No parent account found for this phone number');
    }

    const updated = await prisma.parentAccount.update({
      where: { id: parent.id },
      data: { passwordHash: hashPassword(pin), hasPassword: true },
    });

    const token = issueToken(updated);
    const students = await linkedStudents(updated.id);
    await prisma.activityLog.create({
      data: {
        organizationId: updated.organizationId,
        userId: updated.id,
        action: 'PARENT_PASSWORD_SET',
        description: `${updated.firstName} ${updated.lastName} set a Parent Portal password`,
      },
    });

    return { token, parent: serializeParent(updated), students };
  }
}

export const authService = new AuthService();
