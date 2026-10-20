import { createHash, randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

function resolvePhoto(photo: string | null | undefined): string | null {
  if (!photo?.trim()) return null;
  const value = photo.trim();
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const base = env.PUBLIC_BASE_URL.replace(/\/$/, '');
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`;
}

function normalizePhone(raw: string): string {
 const trimmed = raw.trim().replace(/[\s\-()]/g, '');
 if (!trimmed) return '';
 const plus = trimmed.startsWith('+') ? '+': '';
 const digits = trimmed.replace(/\D/g, '');
 return `${plus}${digits}`;
}

function phoneVariants(normalized: string): string[] {
  const digits = normalized.replace(/\D/g, '');
  const variants = new Set<string>([normalized, digits]);
  if (digits.startsWith('250') && digits.length >= 12) {
    variants.add(`0${digits.slice(3)}`);
    variants.add(`+${digits}`);
    variants.add(digits.slice(3));
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    variants.add(`+250${digits.slice(1)}`);
    variants.add(`250${digits.slice(1)}`);
    variants.add(digits.slice(1));
  }
  if (digits.length >= 9) {
    const last9 = digits.slice(-9);
    variants.add(last9);
    variants.add(`0${last9}`);
    variants.add(`250${last9}`);
    variants.add(`+250${last9}`);
  }
  return [...variants].filter(Boolean);
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function isUsablePinHash(stored: string | null | undefined): boolean {
  if (!stored?.trim()) return false;
  const parts = stored.split(':');
  if (parts.length === 3 && parts[0] === 'scrypt' && parts[1] && parts[2]) return true;
  if (parts.length === 2 && parts[0] && parts[1] && parts[0] !== 'scrypt') return true;
  return false;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  try {
    if (parts.length === 3 && parts[0] === 'scrypt') {
      const [, salt, hash] = parts;
      if (!salt || !hash) return false;
      const next = scryptSync(password, salt, 64);
      const prev = Buffer.from(hash, 'hex');
      if (prev.length !== next.length) return false;
      return timingSafeEqual(prev, next);
    }
    if (parts.length === 2) {
      const [salt, hash] = parts;
      if (!salt || !hash) return false;
      const next = scryptSync(password, salt, 64);
      const prev = Buffer.from(hash, 'hex');
      if (prev.length !== next.length) return false;
      return timingSafeEqual(prev, next);
    }
  } catch {
    return false;
  }
  return false;
}

/** Parent Portal / USSD: numeric PIN only (5 digits). */
export function normalizeParentPin(raw: string): string {
 const digits = String(raw ?? '').replace(/\D/g, '');
 if (digits.length !== 5) {
 throw new AppError(400, 'PIN must be exactly 5 digits');
 }
 return digits;
}

function maskName(first: string, last: string) {
 const f = first?.trim() || 'Parent';
 const l = last?.trim() || '';
 return `${f}${l ? ` ${l.charAt(0)}.`: ''}`;
}

type ParentWithLinks = Awaited<ReturnType<typeof loadParentsByPhone>>[number];

async function loadParentsByPhone(phoneRaw: string) {
  const phone = normalizePhone(phoneRaw);
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) {
    throw new AppError(400, 'Enter a valid parent phone number');
  }

  const include = {
    studentParents: {
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentCode: true,
            studentPhoto: true,
            gender: true,
            enrollments: {
              where: { isCurrent: true },
              include: { class: { select: { name: true, stream: true } } },
              take: 1,
            },
          },
        },
      },
    },
  } as const;

  let parents = await prisma.parent.findMany({
    where: { phone: { in: phoneVariants(phone) } },
    include,
    orderBy: { updatedAt: 'desc' },
  });

  // Fallback: match last 9 digits (Rwanda mobile) when formats differ in DB
  if (parents.length === 0) {
    const last9 = digits.slice(-9);
    parents = await prisma.parent.findMany({
      where: {
        OR: [
          { phone: { endsWith: last9 } },
          { phone: { endsWith: `0${last9}` } },
        ],
      },
      include,
      orderBy: { updatedAt: 'desc' },
      take: 40,
    });
    parents = parents.filter((p) => {
      const pDigits = String(p.phone ?? '').replace(/\D/g, '');
      return pDigits.endsWith(last9);
    });
  }

  if (parents.length === 0) {
    throw new AppError(
      404,
      'No parent found with this phone. Ask the school to add your number on the student profile.'
    );
  }

  return parents;
}

function collectStudents(parents: ParentWithLinks[]) {
 const byId = new Map<
 string,
 {
 id: string;
 name: string;
 firstName: string;
 lastName: string;
 studentCode: string | null;
 className: string | null;
 academicYear: string | null;
 term: string | null;
 photo: string | null;
 gender: string | null;
 role: string;
 organizationId: string;
 parentIds: string[];
 }
 >();

 for (const parent of parents) {
 for (const sp of parent.studentParents) {
 const enrollment = sp.student.enrollments[0];
 const className = enrollment?.class
 ? [enrollment.class.name, enrollment.class.stream].filter(Boolean).join(' · ')
: null;
 const existing = byId.get(sp.student.id);
 if (existing) {
 if (!existing.parentIds.includes(parent.id)) existing.parentIds.push(parent.id);
 continue;
 }
 byId.set(sp.student.id, {
 id: sp.student.id,
 name: `${sp.student.firstName} ${sp.student.lastName}`.trim(),
 firstName: sp.student.firstName,
 lastName: sp.student.lastName,
 studentCode: sp.student.studentCode,
 className,
 academicYear: enrollment?.academicYear ?? null,
 term: enrollment?.term ?? null,
 photo: resolvePhoto(sp.student.studentPhoto),
 gender: sp.student.gender,
 role: sp.role,
 organizationId: parent.organizationId,
 parentIds: [parent.id],
 });
 }
 }

 return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export class ParentAuthService {
  async status(phoneRaw: string) {
    const parents = await loadParentsByPhone(phoneRaw);
    const primary = parents[0]!;
    const students = collectStudents(parents);
    const hasPassword = parents.some((p) => isUsablePinHash(p.passwordHash));

    return {
      phone: primary.phone,
      hasPassword,
      /** Same as hasPassword: credential is a 5-digit PIN (USSD-friendly). */
      hasPin: hasPassword,
      needsPinSetup: !hasPassword,
      displayName: maskName(primary.firstName, primary.lastName),
      studentCount: students.length,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        studentCode: s.studentCode,
        className: s.className,
        role: s.role,
      })),
    };
  }

  async setPassword(phoneRaw: string, password: string, opts?: { reset?: boolean }) {
    const pin = normalizeParentPin(password);

    const parents = await loadParentsByPhone(phoneRaw);
    const withUsablePin = parents.filter((p) => isUsablePinHash(p.passwordHash));
    if (withUsablePin.length > 0 && !opts?.reset) {
      throw new AppError(409, 'PIN already set. Please log in instead.');
    }

    const passwordHash = hashPassword(pin);
    await prisma.parent.updateMany({
      where: { id: { in: parents.map((p) => p.id) } },
      data: { passwordHash },
    });

    return this.issueSessionForParents(parents);
  }

  async login(phoneRaw: string, password: string) {
    if (!password) throw new AppError(400, 'PIN is required');
    const pin = normalizeParentPin(password);

    const parents = await loadParentsByPhone(phoneRaw);
    const withHash = parents.filter((p) => isUsablePinHash(p.passwordHash));
    if (withHash.length === 0) {
      throw new AppError(400, 'No PIN set yet. Create a 5-digit PIN to continue.');
    }

    const matched = withHash.find((p) => verifyPassword(pin, p.passwordHash!));
    if (!matched) {
      throw new AppError(401, 'Incorrect phone or PIN. Use Reset PIN if you forgot it.');
    }

    // Always re-save a fresh unified hash so every linked parent row shares the same PIN
    const passwordHash = hashPassword(pin);
    await prisma.parent.updateMany({
      where: { id: { in: parents.map((p) => p.id) } },
      data: { passwordHash },
    });

    return this.issueSessionForParents(parents);
  }

 async sessionFromToken(parentId: string, phone?: string | null) {
 const parents = phone
 ? await loadParentsByPhone(phone)
: await prisma.parent.findMany({
 where: { id: parentId },
 include: {
 studentParents: {
 include: {
 student: {
 select: {
 id: true,
 firstName: true,
 lastName: true,
 studentCode: true,
 studentPhoto: true,
 gender: true,
 enrollments: {
 where: { isCurrent: true },
 include: { class: { select: { name: true, stream: true } } },
 take: 1,
 },
 },
 },
 },
 },
 },
 });

 if (parents.length === 0) throw new AppError(404, 'Parent not found');
 return this.issueSessionForParents(parents as ParentWithLinks[], false);
 }

 private async issueSessionForParents(parents: ParentWithLinks[], withToken = true) {
 const primary = parents[0]!;
 const students = collectStudents(parents);
 const parentIds = parents.map((p) => p.id);

 const sessionId = createHash('sha256')
.update(`${primary.id}:${randomUUID()}`)
.digest('hex')
.slice(0, 32);

 const token = withToken
 ? jwt.sign(
 {
 sub: primary.id,
 email:
 primary.email ||
 `${(primary.phone || primary.id).replace(/\D/g, '')}@parent.shuleplus.local`,
 organizationId: primary.organizationId,
 sessionId,
 roles: ['parent'],
 modules: ['parent-mis'],
 parentId: primary.id,
 parentIds,
 phone: primary.phone,
 },
 env.JWT_ACCESS_SECRET,
 { expiresIn: '7d' }
 )
: undefined;

 return {
...(token ? { token }: {}),
 parent: {
 id: primary.id,
 firstName: primary.firstName,
 lastName: primary.lastName,
 phone: primary.phone,
 email: primary.email,
 organizationId: primary.organizationId,
 parentIds,
 },
 students,
 };
 }
}

export const parentAuthService = new ParentAuthService();
