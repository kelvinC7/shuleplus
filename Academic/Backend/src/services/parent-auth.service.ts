import { createHash, randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

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
 }
 if (digits.startsWith('0') && digits.length >= 10) {
 variants.add(`+250${digits.slice(1)}`);
 variants.add(`250${digits.slice(1)}`);
 }
 return [...variants].filter(Boolean);
}

function hashPassword(password: string): string {
 const salt = randomBytes(16).toString('hex');
 const hash = scryptSync(password, salt, 64).toString('hex');
 return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
 const [salt, hash] = stored.split(':');
 if (!salt || !hash) return false;
 const next = scryptSync(password, salt, 64);
 const prev = Buffer.from(hash, 'hex');
 if (prev.length !== next.length) return false;
 return timingSafeEqual(prev, next);
}

function maskName(first: string, last: string) {
 const f = first?.trim() || 'Parent';
 const l = last?.trim() || '';
 return `${f}${l ? ` ${l.charAt(0)}.`: ''}`;
}

type ParentWithLinks = Awaited<ReturnType<typeof loadParentsByPhone>>[number];

async function loadParentsByPhone(phoneRaw: string) {
 const phone = normalizePhone(phoneRaw);
 if (phone.replace(/\D/g, '').length < 9) {
 throw new AppError(400, 'Enter a valid parent phone number');
 }

 const parents = await prisma.parent.findMany({
 where: { phone: { in: phoneVariants(phone) } },
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
 orderBy: { updatedAt: 'desc' },
 });

 if (parents.length === 0) {
 throw new AppError(
 404,
 'No parent found with this phone. Ask the school to add your number on the student profile in Academic.'
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
 photo: sp.student.studentPhoto,
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
 const hasPassword = parents.some((p) => Boolean(p.passwordHash));

 return {
 phone: primary.phone,
 hasPassword,
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

 async setPassword(phoneRaw: string, password: string) {
 if (!password || password.length < 6) {
 throw new AppError(400, 'Password must be at least 6 characters');
 }

 const parents = await loadParentsByPhone(phoneRaw);
 if (parents.some((p) => p.passwordHash)) {
 throw new AppError(409, 'Password already set. Please log in instead.');
 }

 const passwordHash = hashPassword(password);
 await prisma.parent.updateMany({
 where: { id: { in: parents.map((p) => p.id) } },
 data: { passwordHash },
 });

 return this.issueSessionForParents(parents);
 }

 async login(phoneRaw: string, password: string) {
 if (!password) throw new AppError(400, 'Password is required');

 const parents = await loadParentsByPhone(phoneRaw);
 const withHash = parents.filter((p) => p.passwordHash);
 if (withHash.length === 0) {
 throw new AppError(400, 'No password set yet. Create a password to continue.');
 }

 const matched = withHash.find((p) => verifyPassword(password, p.passwordHash!));
 if (!matched) {
 throw new AppError(401, 'Incorrect phone or password');
 }

 // Keep password in sync across all parent rows sharing this phone
 if (withHash.some((p) => p.passwordHash !== matched.passwordHash)) {
 await prisma.parent.updateMany({
 where: { id: { in: parents.map((p) => p.id) } },
 data: { passwordHash: matched.passwordHash },
 });
 }

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
