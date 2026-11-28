import { randomBytes } from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { smListClasses, smListStudents } from '../clients/student-management.client';
import { fetchTimetableClassrooms } from '../clients/timetable.client';
import { fetchIamOrgUsers } from '../clients/iam.client';
import {
  assertOwnRecord,
  currentAcademicScope,
  mergeOwnData,
} from '../middleware/academic-scope';

type RoomInput = {
  sourceRoomId?: string | null;
  roomName: string;
  roomNumber?: string | null;
  capacity: number;
  isUniqueCapacity?: boolean;
  selected?: boolean;
};

type StudentRow = {
  id: string;
  studentCode?: string | null;
  fullName: string;
  classId: string;
  className: string;
  /** class level WITHOUT stream, e.g. S1 for S1A/S1B/S1C. */
  classLevel: string;
  stream?: string | null;
  parentClassId?: string | null;
  gender?: string | null;
};

function norm(s: string) { return s.trim().toLowerCase().replace(/[\s_\-\.]+/g, ' '); }

/** Common class-level key: parent class id if present, else raw class name (not the stream). */
function classLevelKeyOf(s: { classLevel?: string | null; className?: string | null; classId?: string | null; parentClassId?: string | null }): string {
  return norm(s.classLevel || s.parentClassId || s.className || s.classId || '');
}

function classLevelOfClass(c: any): string {
  return norm(c?.name || c?.classLevel || c?.level || c?.label || c?.id || '');
}

function classLabelOf(c: any) {
  return c?.label || [c?.name, c?.stream].filter(Boolean).join(' ').trim() || c?.id || '';
}

async function generateUniqueListCode() {
  for (let i = 0; i < 10; i++) {
    const code = `EL-${randomBytes(3).toString('hex').toUpperCase()}`;
    const exists = await prisma.examinationList.findFirst({ where: { listCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  return `EL-${Date.now().toString(36).toUpperCase()}`;
}

const STUDENT_CACHE_TTL_MS = 60_000;
const studentListCache = new Map<string, { at: number; rows: StudentRow[] }>();

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = await fn(items[current]);
      } catch {
        results[current] = [] as unknown as R;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function getAllActiveStudents(organizationId: string, opts?: { fresh?: boolean }): Promise<StudentRow[]> {
  const cached = studentListCache.get(organizationId);
  if (!opts?.fresh && cached && Date.now() - cached.at < STUDENT_CACHE_TTL_MS) return cached.rows;

  const [raw, classRows] = await Promise.all([
    smListStudents(organizationId, { status: 'ACTIVE' }).catch(() => [] as any[]),
    smListClasses(organizationId).catch(() => [] as any[]),
  ]);
  const classInfo = new Map<string, any>();
  const classRowsList = Array.isArray(classRows) ? classRows : [];
  for (const c of classRowsList) classInfo.set(String(c.id), c);

  let studentRows: any[] = Array.isArray(raw) ? raw : [];
  const classIdOf = (s: any) => String(s.classId || s.enrollments?.[0]?.classId || s.enrollments?.[0]?.class?.id || '').trim();

  // Some schools do not flag enrollments as current. The global endpoint then
  // returns students without a class. Fill the gaps class-by-class so every
  // class and every student is selectable in exam room allocation.
  const hasUnresolvedClass = studentRows.some((s) => !classIdOf(s));
  if (hasUnresolvedClass && classRowsList.length) {
    const classIds = classRowsList.map((c: any) => String(c.id)).filter(Boolean);
    const batches = await mapWithConcurrency<string, any[]>(classIds, 8, (classId) =>
      smListStudents(organizationId, { classId, status: 'ACTIVE' }).catch(() => [] as any[])
    );
    const byId = new Map<string, any>(studentRows.map((s: any) => [String(s.id), s]));
    for (const batch of batches) {
      for (const student of Array.isArray(batch) ? batch : []) byId.set(String(student.id), student);
    }
    studentRows = [...byId.values()];
  }

  const rows = studentRows.map((s: any) => {
    const fullName = s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || s.studentCode || s.id;
    const classId = classIdOf(s);
    const klass = s.enrollments?.[0]?.class ?? classInfo.get(classId) ?? {};
    const className = s.className || klass.label || [klass.name, klass.stream].filter(Boolean).join(' ').trim() || 'Unassigned';
    const classLevel = norm(klass.name || klass.classLevel || klass.level || s.classLevel || klass.label || className);
    return {
      id: String(s.id),
      studentCode: s.studentCode ?? null,
      fullName,
      classId,
      className,
      classLevel,
      stream: klass.stream ?? s.stream ?? null,
      parentClassId: klass.parentClassId ?? klass.parent_class_id ?? null,
      gender: s.gender ?? null,
    };
  }).filter((s) => s.id);

  studentListCache.set(organizationId, { at: Date.now(), rows });
  return rows;
}

function distributeKeepClass(studentsByClass: Map<string, StudentRow[]>, classOrder: string[], rooms: Array<{ id: string; capacity: number }>) {
  const ordered: Array<StudentRow & { roomKey: string }> = [] as any;
  let roomIndex = 0;
  let used = 0;
  for (const classId of classOrder) {
    const list = studentsByClass.get(classId) || [];
    for (const student of list) {
      if (roomIndex >= rooms.length) throw new AppError(400, 'Selected rooms do not have enough capacity for all participating students');
      if (used >= rooms[roomIndex].capacity) {
        roomIndex += 1;
        used = 0;
        if (roomIndex >= rooms.length) throw new AppError(400, 'Selected rooms do not have enough capacity for all participating students');
      }
      (student as any).roomKey = rooms[roomIndex].id;
      ordered.push(student as any);
      used += 1;
    }
  }
  return ordered;
}

function interleaveByQuantity(studentsByClass: Map<string, StudentRow[]>, classOrder: string[], qty: number) {
  const queues = classOrder.map((id) => [...(studentsByClass.get(id) || [])]);
  const out: StudentRow[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (let i = 0; i < queues.length; i++) {
      const q = queues[i];
      if (!q.length) continue;
      remaining = true;
      out.push(...q.splice(0, Math.max(1, qty)));
    }
  }
  return out;
}

function interleaveAuto(studentsByClass: Map<string, StudentRow[]>, classOrder: string[]) {
  const queues = classOrder.map((id) => [...(studentsByClass.get(id) || [])]);
  const out: StudentRow[] = [];
  let idx = 0;
  let guard = 0;
  while (queues.some((q) => q.length) && guard < 1000000) {
    const q = queues[idx % queues.length];
    if (q.length) out.push(q.shift()!);
    idx += 1;
    guard += 1;
  }
  return out;
}

function fillRoomsSequentially(students: StudentRow[], rooms: Array<{ id: string; capacity: number }>) {
  const out: Array<StudentRow & { roomKey: string }> = [];
  let roomIndex = 0;
  let used = 0;
  for (const student of students) {
    if (roomIndex >= rooms.length) throw new AppError(400, 'Selected rooms do not have enough capacity for all participating students');
    if (used >= rooms[roomIndex].capacity) {
      roomIndex += 1;
      used = 0;
      if (roomIndex >= rooms.length) throw new AppError(400, 'Selected rooms do not have enough capacity for all participating students');
    }
    out.push({ ...student, roomKey: rooms[roomIndex].id });
    used += 1;
  }
  return out;
}

/** Part-5: no room may contain two students from the same class level (streams of one level count as the same class). */
function sameLevelConflictMessage(
  roomName: string,
  studentsInRoom: Array<{ classLevel?: string | null; className?: string | null; classId?: string | null; parentClassId?: string | null; studentName?: string; fullName?: string }>,
) {
  const seen = new Map<string, string>();
  for (const s of studentsInRoom) {
    const key = classLevelKeyOf(s);
    if (!key) continue;
    const who = s.studentName || s.fullName || '';
    if (seen.has(key)) {
      return `Room allocation not allowed. Room ${roomName} already has a student from class ${seen.get(key)}; ` +
        `cannot also add ${who} (class ${key}). Students from the same class level (including different streams) must be in different rooms.`;
    }
    seen.set(key, key);
  }
  return null;
}

function assertRoomNoSameLevel(
  roomName: string,
  studentsInRoom: Array<{ classLevel?: string | null; className?: string | null; classId?: string | null; parentClassId?: string | null; studentName?: string; fullName?: string }>,
  allowSameClassException = false,
) {
  if (allowSameClassException) return;
  const message = sameLevelConflictMessage(roomName, studentsInRoom);
  if (message) throw new AppError(409, message);
}

type AllocationRoomDef = { id: string; capacity: number; roomName?: string };
type AllocatedStudent = StudentRow & { roomKey: string; isException?: boolean };

type AllocationCollisionReport = {
  message: string;
  totalStudents: number;
  totalRooms: number;
  totalCapacity: number;
  allocatedStudents: number;
  unallocatedStudents: number;
  remainingSeats: number;
  largestClassLevel: { key: string; count: number };
  collisions: Array<{
    studentId: string;
    studentName: string;
    studentCode?: string | null;
    className: string;
    classLevel: string;
    reason: string;
  }>;
  classLevelCounts: Array<{ classLevel: string; count: number; roomsNeeded: number }>;
  roomOccupancy: Array<{
    roomKey: string;
    roomName: string;
    capacity: number;
    used: number;
    remaining: number;
    classLevels: string[];
  }>;
  canResolveWithExceptions: boolean;
  minimumExceptionStudents: number;
  exceptionPreview: Array<{
    studentId: string;
    studentName: string;
    className: string;
    classLevel: string;
    roomKey: string;
    roomName: string;
  }>;
  suggestions: string[];
};

function buildRoomState(rooms: AllocationRoomDef[]) {
  return rooms.map((r) => ({
    id: r.id,
    roomName: r.roomName || r.id,
    capacity: r.capacity,
    count: 0,
    levels: new Set<string>(),
    studentIds: new Set<string>(),
  }));
}

function studentOrderByStrategy(students: StudentRow[], byLevel: Map<string, StudentRow[]>, strategy: number): StudentRow[] {
  const levels = [...byLevel.entries()].map(([key, arr]) => ({ key, arr: [...arr] }));
  // Largest/most constrained first
  levels.sort((a, b) => b.arr.length - a.arr.length || a.key.localeCompare(b.key));
  if (strategy === 0) {
    // interleave by level, largest first
    const out: StudentRow[] = [];
    const queues = levels.map((l) => [...l.arr].sort((a, b) => a.fullName.localeCompare(b.fullName)));
    let remaining = true;
    while (remaining) {
      remaining = false;
      for (const q of queues) {
        if (q.length) { out.push(q.shift()!); remaining = true; }
      }
    }
    return out;
  }
  if (strategy === 1) {
    // all largest level first, then next; helps constrained levels get rooms
    const out: StudentRow[] = [];
    for (const l of levels) out.push(...l.arr.sort((a, b) => a.fullName.localeCompare(b.fullName)));
    return out;
  }
  // round robin but rotate starting level by strategy
  const out: StudentRow[] = [];
  const queues = levels.map((l) => [...l.arr].sort((a, b) => a.fullName.localeCompare(b.fullName)));
  const offset = Math.max(0, strategy - 2) % Math.max(1, queues.length);
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (let i = 0; i < queues.length; i++) {
      const q = queues[(i + offset) % queues.length];
      if (q.length) { out.push(q.shift()!); remaining = true; }
    }
  }
  return out;
}

function tryStrictAllocation(
  students: StudentRow[],
  rooms: AllocationRoomDef[],
  strategy: number,
): { ok: true; assigned: AllocatedStudent[] } | { ok: false; assigned: AllocatedStudent[]; unallocated: StudentRow[] } {
  const byLevel = new Map<string, StudentRow[]>();
  for (const s of students) {
    const k = classLevelKeyOf(s);
    if (!byLevel.has(k)) byLevel.set(k, []);
    byLevel.get(k)!.push(s);
  }
  const ordered = studentOrderByStrategy(students, byLevel, strategy);
  const roomState = buildRoomState(rooms);
  const assigned: AllocatedStudent[] = [];
  const unallocated: StudentRow[] = [];

  for (const s of ordered) {
    const key = classLevelKeyOf(s);
    const eligible = roomState
      .filter((r) => r.count < r.capacity && !r.levels.has(key))
      .sort((a, b) => {
        // prefer room with more remaining slots for other constrained levels, but also keep balanced
        const aRemain = a.capacity - a.count;
        const bRemain = b.capacity - b.count;
        return a.count - b.count || bRemain - aRemain || a.id.localeCompare(b.id);
      });
    if (!eligible.length) {
      unallocated.push(s);
      continue;
    }
    const room = eligible[0];
    room.count += 1;
    room.levels.add(key);
    room.studentIds.add(s.id);
    assigned.push({ ...s, roomKey: room.id, isException: false });
  }

  if (unallocated.length === 0) return { ok: true, assigned };
  return { ok: false, assigned, unallocated };
}

function tryStrictAllocationWithRepair(
  students: StudentRow[],
  rooms: AllocationRoomDef[],
): { ok: true; assigned: AllocatedStudent[] } | { ok: false; bestAssigned: AllocatedStudent[]; bestUnallocated: StudentRow[] } {
  let bestAssigned: AllocatedStudent[] = [];
  let bestUnallocated: StudentRow[] = [...students];
  const strategies = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (const strategy of strategies) {
    const result = tryStrictAllocation(students, rooms, strategy);
    if (result.ok) return result;
    if (result.unallocated.length < bestUnallocated.length) {
      bestAssigned = result.assigned;
      bestUnallocated = result.unallocated;
    }
  }
  // randomized repair attempts: try to place unallocated by swapping/moving
  for (let attempt = 0; attempt < 30 && bestUnallocated.length > 0; attempt++) {
    const shuffled = [...students].sort((a, b) => {
      const ka = classLevelKeyOf(a);
      const kb = classLevelKeyOf(b);
      if (ka === kb) return a.fullName.localeCompare(b.fullName);
      return (attempt * 17 + ka.length * 13 + kb.length) % 2 === 0 ? -1 : 1;
    });
    // bias by putting previously unallocated first
    const unallocatedIds = new Set(bestUnallocated.map((s) => s.id));
    shuffled.sort((a, b) => Number(unallocatedIds.has(b.id)) - Number(unallocatedIds.has(a.id)));
    const roomState = buildRoomState(rooms);
    const assigned: AllocatedStudent[] = [];
    const unallocated: StudentRow[] = [];
    for (const s of shuffled) {
      const key = classLevelKeyOf(s);
      const eligible = roomState
        .filter((r) => r.count < r.capacity && !r.levels.has(key))
        .sort((a, b) => a.count - b.count || (b.capacity - b.count) - (a.capacity - a.count) || a.id.localeCompare(b.id));
      if (!eligible.length) { unallocated.push(s); continue; }
      const room = eligible[(attempt + assigned.length) % eligible.length];
      room.count += 1; room.levels.add(key); room.studentIds.add(s.id);
      assigned.push({ ...s, roomKey: room.id, isException: false });
    }
    if (unallocated.length === 0) return { ok: true, assigned };
    if (unallocated.length < bestUnallocated.length) {
      bestAssigned = assigned;
      bestUnallocated = unallocated;
    }
  }
  return { ok: false, bestAssigned, bestUnallocated };
}

function allocateWithMinimalExceptions(
  students: StudentRow[],
  rooms: AllocationRoomDef[],
): { assigned: AllocatedStudent[]; exceptionCount: number; exceptionStudents: AllocatedStudent[] } {
  const strict = tryStrictAllocationWithRepair(students, rooms);
  if (strict.ok) return { assigned: strict.assigned, exceptionCount: 0, exceptionStudents: [] };

  // Start from best strict partial allocation, then place remaining with exceptions.
  const roomState = buildRoomState(rooms);
  const assigned: AllocatedStudent[] = [];
  const assignedIds = new Set<string>();
  for (const a of strict.bestAssigned) {
    const room = roomState.find((r) => r.id === a.roomKey);
    if (!room) continue;
    room.count += 1;
    room.levels.add(classLevelKeyOf(a));
    room.studentIds.add(a.id);
    assigned.push({ ...a, isException: false });
    assignedIds.add(a.id);
  }
  const remaining = students.filter((s) => !assignedIds.has(s.id));
  const exceptionStudents: AllocatedStudent[] = [];
  for (const s of remaining) {
    const key = classLevelKeyOf(s);
    // Prefer strict room even now (in case state changed), else any room with capacity, prefer one with fewest same-level conflicts.
    const strictEligible = roomState.filter((r) => r.count < r.capacity && !r.levels.has(key)).sort((a, b) => a.count - b.count);
    let room = strictEligible[0];
    let isException = false;
    if (!room) {
      const capEligible = roomState
        .filter((r) => r.count < r.capacity)
        .sort((a, b) => {
          const aConflict = a.levels.has(key) ? 1 : 0;
          const bConflict = b.levels.has(key) ? 1 : 0;
          return aConflict - bConflict || a.count - b.count || a.id.localeCompare(b.id);
        });
      room = capEligible[0];
      isException = true;
    }
    if (!room) {
      throw new AppError(400, 'Not enough room capacity to allocate all students even with exceptions.');
    }
    room.count += 1;
    room.levels.add(key);
    room.studentIds.add(s.id);
    const row: AllocatedStudent = { ...s, roomKey: room.id, isException };
    assigned.push(row);
    if (isException) exceptionStudents.push(row);
  }
  return { assigned, exceptionCount: exceptionStudents.length, exceptionStudents };
}

function buildAllocationCollisionReport(
  students: StudentRow[],
  rooms: AllocationRoomDef[],
  strictResult: { bestAssigned: AllocatedStudent[]; bestUnallocated: StudentRow[] },
): AllocationCollisionReport {
  const byLevel = new Map<string, StudentRow[]>();
  for (const s of students) {
    const k = classLevelKeyOf(s);
    if (!byLevel.has(k)) byLevel.set(k, []);
    byLevel.get(k)!.push(s);
  }
  const classLevelCounts = [...byLevel.entries()]
    .map(([classLevel, arr]) => ({ classLevel, count: arr.length, roomsNeeded: arr.length }))
    .sort((a, b) => b.count - a.count || a.classLevel.localeCompare(b.classLevel));
  const largest = classLevelCounts[0] || { classLevel: '-', count: 0, roomsNeeded: 0 };
  const totalCapacity = rooms.reduce((n, r) => n + r.capacity, 0);
  const remainingSeats = Math.max(0, totalCapacity - students.length);

  const roomState = buildRoomState(rooms);
  for (const a of strictResult.bestAssigned) {
    const r = roomState.find((x) => x.id === a.roomKey);
    if (r) { r.count += 1; r.levels.add(classLevelKeyOf(a)); }
  }
  const roomOccupancy = roomState.map((r) => ({
    roomKey: r.id,
    roomName: r.roomName,
    capacity: r.capacity,
    used: r.count,
    remaining: Math.max(0, r.capacity - r.count),
    classLevels: [...r.levels].sort(),
  }));

  const exceptionPreviewPlan = allocateWithMinimalExceptions(students, rooms);
  const exceptionPreview = exceptionPreviewPlan.exceptionStudents.map((s) => {
    const room = rooms.find((r) => r.id === s.roomKey);
    return {
      studentId: s.id,
      studentName: s.fullName,
      className: s.className,
      classLevel: classLevelKeyOf(s),
      roomKey: s.roomKey,
      roomName: room?.roomName || s.roomKey,
    };
  });

  const suggestions: string[] = [];
  if (largest.count > rooms.length) {
    suggestions.push(`Largest class level ${largest.classLevel.toUpperCase()} has ${largest.count} students but only ${rooms.length} rooms are selected. Strict separation is mathematically impossible without more rooms.`);
  }
  if (totalCapacity < students.length) {
    suggestions.push(`Add ${students.length - totalCapacity} more seat(s) or additional rooms. Total capacity is ${totalCapacity} for ${students.length} students.`);
  }
  if (!suggestions.length) {
    suggestions.push('Try adding more rooms, increasing room capacities, or allowing remaining same-class students as a confirmed exception.');
  }

  const collisions = strictResult.bestUnallocated.map((s) => ({
    studentId: s.id,
    studentName: s.fullName,
    studentCode: s.studentCode ?? null,
    className: s.className,
    classLevel: classLevelKeyOf(s),
    reason: `No available room can take ${s.fullName} (${s.className}) without putting two students of class level ${classLevelKeyOf(s).toUpperCase()} together.`,
  }));

  const canResolveWithExceptions = totalCapacity >= students.length;
  const message = canResolveWithExceptions
    ? `Strict allocation could not place ${collisions.length} student(s). Intelligent auto-fix tried multiple strategies. You can review and allow only the unavoidable remaining same-class students to share a room.`
    : `Not enough examination room capacity. Need ${students.length} seats but only ${totalCapacity} available.`;

  return {
    message,
    totalStudents: students.length,
    totalRooms: rooms.length,
    totalCapacity,
    allocatedStudents: students.length - strictResult.bestUnallocated.length,
    unallocatedStudents: strictResult.bestUnallocated.length,
    remainingSeats,
    largestClassLevel: { key: largest.classLevel, count: largest.count },
    collisions,
    classLevelCounts,
    roomOccupancy,
    canResolveWithExceptions,
    minimumExceptionStudents: exceptionPreviewPlan.exceptionCount,
    exceptionPreview,
    suggestions,
  };
}

function assignRoomsNoSameLevel(
  students: StudentRow[],
  rooms: Array<{ id: string; capacity: number; roomName?: string }>,
): AllocatedStudent[] {
  const strict = tryStrictAllocationWithRepair(students, rooms);
  if (strict.ok) return strict.assigned;
  const report = buildAllocationCollisionReport(students, rooms, strict);
  const err: any = new AppError(409, report.message);
  err.details = { collisionReport: report };
  throw err;
}
function toDateOnly(value?: Date | string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export class ExaminationListService {
  async dashboard(organizationId: string, params: { academicYear?: string; term?: string; examinationTypeId?: string }) {
    const { academicYear, term, examinationTypeId } = params;
    const lists = await prisma.examinationList.findMany({
      where: mergeOwnData({
        organizationId,
        ...(academicYear ? { academicYear } : {}),
        ...(term ? { term } : {}),
        ...(examinationTypeId ? { examinationTypeId } : {}),
      }),
      include: {
        rooms: { include: { allocations: true }, orderBy: { sortOrder: 'asc' } },
        classes: true,
        examinationTimetable: { select: { id: true, examinationCode: true, examinationTypeId: true, examinationType: { select: { id: true, name: true } }, name: true, className: true, startDate: true, endDate: true } },
        _count: { select: { allocations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const latest = lists.find((l) => l.status === 'GENERATED' || l.status === 'PUBLISHED') || lists[0] || null;
    const [classes, students] = await Promise.all([
      smListClasses(organizationId).catch(() => [] as any[]),
      getAllActiveStudents(organizationId).catch(() => [] as StudentRow[]),
    ]);
    const totalStudents = students.length;
    const totalRooms = latest?.rooms.length ?? 0;
    const allocated = latest?._count.allocations ?? latest?.rooms.reduce((n, r) => n + r.allocations.length, 0) ?? 0;
    const participating = latest?.classes.length ?? 0;
    return {
      stats: {
        totalStudents,
        totalExaminationRooms: totalRooms,
        totalStudentsAllocated: allocated,
        studentsNotAllocated: latest ? Math.max(0, latest.classes.reduce((n, c) => n + c.studentCount, 0) - allocated) : 0,
        totalClassesParticipating: participating,
        examinationListsGenerated: lists.length,
      },
      lists,
      latestList: latest,
      classCount: Array.isArray(classes) ? classes.length : 0,
    };
  }

  async context(organizationId: string, params: { academicYear?: string; term?: string; examinationTimetableId?: string; examinationTypeId?: string }) {
    const [classesRaw, students, roomsRaw, timetables, examinationTypes, selectedTimetable] = await Promise.all([
      smListClasses(organizationId).catch(() => [] as any[]),
      getAllActiveStudents(organizationId).catch(() => [] as StudentRow[]),
      fetchTimetableClassrooms(organizationId).catch(() => [] as any[]),
      prisma.classExaminationTimetable.findMany({
        where: mergeOwnData({
          organizationId,
          ...(params.academicYear ? { academicYear: params.academicYear } : {}),
          ...(params.term ? { term: params.term } : {}),
          ...(params.examinationTypeId ? { examinationTypeId: params.examinationTypeId } : {}),
        }),
        include: { slots: { orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { sessionCode: 'asc' }], include: { courses: true } }, examinationType: true },
        orderBy: [{ academicYear: 'desc' }, { term: 'asc' }, { className: 'asc' }],
      }),
      prisma.examinationType.findMany({
        where: mergeOwnData({
          organizationId,
          ...(params.academicYear ? { academicYear: params.academicYear } : {}),
          ...(params.term ? { term: params.term } : {}),
        }),
        orderBy: [{ academicYear: 'desc' }, { term: 'asc' }, { name: 'asc' }],
      }),
      params.examinationTimetableId
        ? prisma.classExaminationTimetable.findFirst({
            where: mergeOwnData({ id: params.examinationTimetableId, organizationId }),
            include: { slots: { orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { sessionCode: 'asc' }], include: { courses: true } }, examinationType: true },
          })
        : Promise.resolve(null),
    ]);

    const countByClass = new Map<string, number>();
    for (const s of students) countByClass.set(s.classId, (countByClass.get(s.classId) || 0) + 1);
    const classes = (Array.isArray(classesRaw) ? classesRaw : []).map((c: any) => ({
      id: c.id,
      name: c.name,
      stream: c.stream ?? null,
      label: classLabelOf(c),
      studentCount: countByClass.get(c.id) || 0,
    })).sort((a, b) => a.label.localeCompare(b.label));
    const timetableRooms = (Array.isArray(roomsRaw) ? roomsRaw : []).map((r: any) => ({
      sourceRoomId: r.id ?? null,
      roomName: r.name || r.roomNumber || r.classLabel || 'Room',
      roomNumber: r.roomNumber ?? null,
      capacity: Math.max(1, Number(r.capacity) || 40),
      building: r.building ?? null,
      floor: r.floor ?? null,
      active: r.active !== false,
      source: 'TIMETABLE' as const,
    })).filter((r) => r.active);

    // Fallback/default: use Student Management classes as rooms when no timetable rooms are configured.
    const classRooms = classes.map((c: any) => ({
      sourceRoomId: `class:${c.id}`,
      roomName: c.label || c.name || 'Class Room',
      roomNumber: c.stream || null,
      capacity: Math.max(1, Number(c.studentCount) || 40),
      building: null,
      floor: null,
      active: true,
      source: 'CLASS' as const,
    }));

    const rooms = timetableRooms.length > 0 ? timetableRooms : classRooms;

    const timetable = selectedTimetable || null;
    return {
      academicYear: timetable?.academicYear || params.academicYear || '',
      term: timetable?.term || params.term || '',
      rooms,
      classes,
      totalStudents: classes.reduce((n, c) => n + c.studentCount, 0),
      examinationTypes: examinationTypes.map((t: any) => ({ id: t.id, name: t.name, academicYear: t.academicYear, term: t.term })),
      examinationTimetables: timetables.map((t: any) => ({
        id: t.id,
        examinationCode: t.examinationCode,
        examinationTypeId: t.examinationTypeId ?? null,
        examinationTypeName: t.examinationType?.name ?? null,
        name: t.name || `${t.className} ${t.term} ${t.academicYear} Examination`,
        classId: t.classId,
        className: t.className,
        academicYear: t.academicYear,
        term: t.term,
        startDate: toDateOnly(t.startDate),
        endDate: toDateOnly(t.endDate),
        slotCount: t.slots.length,
      })),
      selectedExamination: timetable ? {
        id: timetable.id,
        examinationCode: timetable.examinationCode,
        examinationTypeId: (timetable as any).examinationTypeId ?? null,
        examinationTypeName: (timetable as any).examinationType?.name ?? null,
        name: timetable.name || `${timetable.className} ${timetable.term} ${timetable.academicYear} Examination`,
        classId: timetable.classId,
        className: timetable.className,
        academicYear: timetable.academicYear,
        term: timetable.term,
        startDate: toDateOnly(timetable.startDate),
        endDate: toDateOnly(timetable.endDate),
        slots: timetable.slots.map((s: any) => ({ examDate: toDateOnly(s.examDate), session: s.session, sessionCode: s.sessionCode, sessionName: s.sessionName, courseName: s.courseName, startTime: s.startTime, endTime: s.endTime, courses: (s.courses ?? []).map((c: any) => ({ courseName: c.courseName, subjectId: c.subjectId ?? null, courseCode: c.courseCode ?? null, teacherName: c.teacherName ?? null })) })),
      } : null,
    };
  }

  async list(organizationId: string, params: { academicYear?: string; term?: string; examinationTimetableId?: string; examinationTypeId?: string }) {
    return prisma.examinationList.findMany({
      where: mergeOwnData({
        organizationId,
        ...(params.academicYear ? { academicYear: params.academicYear } : {}),
        ...(params.term ? { term: params.term } : {}),
        ...(params.examinationTimetableId ? { examinationTimetableId: params.examinationTimetableId } : {}),
        ...(params.examinationTypeId ? { examinationTypeId: params.examinationTypeId } : {}),
      }),
      include: {
        examinationTimetable: { select: { id: true, examinationCode: true, examinationTypeId: true, examinationType: { select: { id: true, name: true } }, name: true, className: true, startDate: true, endDate: true } },
        rooms: { orderBy: { sortOrder: 'asc' }, include: { _count: { select: { allocations: true } } } },
        classes: true,
        _count: { select: { allocations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string, organizationId: string) {
    const row = await prisma.examinationList.findFirst({
      where: mergeOwnData({ id, organizationId }),
      include: {
        examinationTimetable: {
          include: {
            slots: { orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { sessionCode: 'asc' }], include: { courses: true } },
          },
        },
        rooms: {
          orderBy: { sortOrder: 'asc' },
          include: {
            allocations: { orderBy: [{ className: 'asc' }, { studentName: 'asc' }] },
          },
        },
        classes: { orderBy: { className: 'asc' } },
        allocations: true,
      },
    });
    if (!row) throw new AppError(404, 'Examination list not found');
    return row;
  }

  async getPublicRoom(listId: string, roomId: string) {
    const row: any = await (prisma.examinationList.findFirst as any)({
      where: { id: listId },
      select: {
        id: true,
        listCode: true,
        examinationCode: true,
        examinationName: true,
        academicYear: true,
        term: true,
        startDate: true,
        endDate: true,
        status: true,
        organizationId: true,
        examinationType: { select: { name: true } },
        examinationTimetable: { select: { name: true, examinationType: { select: { name: true } } } },
        rooms: {
          where: { id: roomId },
          select: {
            id: true,
            roomName: true,
            roomNumber: true,
            capacity: true,
            allocations: {
              orderBy: [{ className: 'asc' }, { studentName: 'asc' }],
              select: {
                id: true,
                studentId: true,
                studentCode: true,
                studentName: true,
                className: true,
                classLevel: true,
                gender: true,
                isException: true,
              },
            },
          },
        },
      },
    });
    if (!row) throw new AppError(404, 'Examination list not found');
    const room = row.rooms?.[0];
    if (!room) throw new AppError(404, 'Examination room not found');
    return {
      list: {
        id: row.id,
        listCode: row.listCode,
        examinationCode: row.examinationCode,
        examinationName: row.examinationName || row.examinationTimetable?.name || row.examinationType?.name || row.examinationTimetable?.examinationType?.name || 'Examination',
        academicYear: row.academicYear,
        term: row.term,
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
      },
      room,
    };
  }

  async impact(id: string, organizationId: string) {
    const list = await prisma.examinationList.findFirst({ where: mergeOwnData({ id, organizationId }), select: { id: true, status: true, listCode: true } });
    if (!list) throw new AppError(404, 'Examination list not found');
    const invigilatorAssignments = await prisma.examinationInvigilatorAssignment.count({ where: { organizationId, examinationListId: id } });
    const warnings: string[] = [];
    if (invigilatorAssignments > 0) warnings.push(`${invigilatorAssignments} invigilator assignment(s) are linked to this examination list.`);
    if (list.status === 'PUBLISHED') warnings.push('This examination list is published and protected from modification/deletion.');
    return {
      listId: id,
      status: list.status,
      linkedInvigilatorAssignments: invigilatorAssignments,
      hasImpact: invigilatorAssignments > 0 || list.status === 'PUBLISHED',
      canDelete: list.status !== 'PUBLISHED',
      canModify: list.status !== 'PUBLISHED',
      warnings,
    };
  }

  async publish(id: string, organizationId: string) {
    const list = await prisma.examinationList.findFirst({ where: mergeOwnData({ id, organizationId }) });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') return prisma.examinationList.findUnique({ where: { id }, include: { rooms: { orderBy: { sortOrder: 'asc' } }, classes: true } });
    const allocCount = await prisma.examinationAllocation.count({ where: { listId: id } });
    if (allocCount === 0) throw new AppError(400, 'Cannot publish an examination list with no student allocations');
    return prisma.examinationList.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
      include: { rooms: { orderBy: { sortOrder: 'asc' } }, classes: true },
    });
  }

  async unpublish(id: string, organizationId: string) {
    const list = await prisma.examinationList.findFirst({ where: mergeOwnData({ id, organizationId }) });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status !== 'PUBLISHED') return prisma.examinationList.findUnique({ where: { id }, include: { rooms: { orderBy: { sortOrder: 'asc' } }, classes: true } });
    return prisma.examinationList.update({
      where: { id },
      data: { status: 'GENERATED', publishedAt: null },
      include: { rooms: { orderBy: { sortOrder: 'asc' } }, classes: true },
    });
  }

  async generate(organizationId: string, body: {
    examinationTimetableId?: string;
    examinationTypeId?: string;
    academicYear?: string;
    term?: string;
    name?: string;
    defaultCapacity?: number;
    rooms: RoomInput[];
    participatingClassIds: string[];
    distributionMethod: 'KEEP_CLASS' | 'MIX_CLASSES';
    mixQuantity?: number | null;
    allowSameClassExceptions?: boolean;
    dryRun?: boolean;
  }) {
    const timetable = body.examinationTimetableId
      ? await prisma.classExaminationTimetable.findFirst({ where: mergeOwnData({ id: body.examinationTimetableId, organizationId }), include: { examinationType: true } })
      : null;
    if (body.examinationTimetableId && !timetable) throw new AppError(404, 'Selected examination timetable not found');

    const academicYear = timetable?.academicYear || body.academicYear || '';
    const term = timetable?.term || body.term || '';
    if (!academicYear || !term) throw new AppError(400, 'Academic year and term are required');

    const roomsInput = (body.rooms || []).filter((r) => r.selected !== false).map((r, i) => ({
      sourceRoomId: r.sourceRoomId ?? null,
      roomName: String(r.roomName || '').trim(),
      roomNumber: r.roomNumber ?? null,
      capacity: Math.max(1, Number(r.capacity) || 1),
      isUniqueCapacity: !!r.isUniqueCapacity,
      sortOrder: i,
    }));
    if (!roomsInput.length) throw new AppError(400, 'Select at least one examination room');
    for (const r of roomsInput) if (!r.roomName) throw new AppError(400, 'Every room must have a name');
    const totalCapacity = roomsInput.reduce((n, r) => n + r.capacity, 0);

    const classIds = [...new Set((body.participatingClassIds || []).filter(Boolean))];
    if (!classIds.length) throw new AppError(400, 'Select at least one participating class');

    const [classesRaw, students] = await Promise.all([
      smListClasses(organizationId).catch(() => [] as any[]),
      getAllActiveStudents(organizationId),
    ]);
    const classMap = new Map<string, any>();
    for (const c of Array.isArray(classesRaw) ? classesRaw : []) classMap.set(c.id, c);

    const studentsByClass = new Map<string, StudentRow[]>();
    for (const id of classIds) studentsByClass.set(id, []);
    for (const s of students) {
      if (!studentsByClass.has(s.classId)) continue;
      studentsByClass.get(s.classId)!.push(s);
    }
    for (const [id, list] of studentsByClass.entries()) {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      if (!classMap.has(id)) classMap.set(id, { id, label: list[0]?.className || id });
    }

    const totalParticipants = [...studentsByClass.values()].reduce((n, arr) => n + arr.length, 0);
    if (totalParticipants === 0) throw new AppError(400, 'No students found in the selected classes');
    if (totalCapacity < totalParticipants) {
      throw new AppError(400, `Not enough room capacity. Need ${totalParticipants} seats but only ${totalCapacity} available. Add ${totalParticipants - totalCapacity} more seat(s).`);
    }

    const roomKeys = roomsInput.map((_, i) => `room_${i}`);
    const roomDefs = roomsInput.map((r, i) => ({ id: roomKeys[i], capacity: r.capacity, roomName: r.roomName }));

    const allParticipants = [...studentsByClass.values()].flatMap((l) => l);
    const strictResult = tryStrictAllocationWithRepair(allParticipants, roomDefs);

    let assigned: AllocatedStudent[] = [];
    let exceptionCount = 0;
    let exceptionStudents: AllocatedStudent[] = [];
    let allocationMeta: any = { strategy: 'strict', autoFixAttempted: true, exceptionCount: 0 };

    if (strictResult.ok) {
      assigned = strictResult.assigned;
    } else if (body.allowSameClassExceptions) {
      const ex = allocateWithMinimalExceptions(allParticipants, roomDefs);
      assigned = ex.assigned;
      exceptionCount = ex.exceptionCount;
      exceptionStudents = ex.exceptionStudents;
      allocationMeta = {
        strategy: 'strict-with-exceptions',
        autoFixAttempted: true,
        exceptionCount,
        exceptions: exceptionStudents.map((s) => ({
          studentId: s.id,
          studentName: s.fullName,
          className: s.className,
          classLevel: classLevelKeyOf(s),
          roomKey: s.roomKey,
        })),
      };
    } else {
      const report = buildAllocationCollisionReport(allParticipants, roomDefs, strictResult);
      const err: any = new AppError(409, report.message);
      err.details = { collisionReport: report };
      throw err;
    }

    const seenStudent = new Set<string>();
    const roomCounts = new Map<string, number>();
    for (const a of assigned) {
      if (seenStudent.has(a.id)) throw new AppError(500, 'Allocation produced duplicate student assignment');
      seenStudent.add(a.id);
      roomCounts.set(a.roomKey, (roomCounts.get(a.roomKey) || 0) + 1);
    }
    if (seenStudent.size !== totalParticipants) throw new AppError(500, 'Allocation did not account for all students');
    for (let i = 0; i < roomDefs.length; i++) {
      if ((roomCounts.get(roomKeys[i]) || 0) > roomDefs[i].capacity) throw new AppError(500, 'Allocation exceeded room capacity');
    }

    const listCode = await generateUniqueListCode();
    const examinationName = timetable?.name || `${timetable?.className || 'Examination'} ${term} ${academicYear} Examination`;

    if (body.dryRun) {
      const previewRooms = roomsInput.map((r, i) => {
        const key = roomKeys[i];
        const roomAllocations = assigned.filter((a) => a.roomKey === key).map((a) => ({
          studentId: a.id,
          studentCode: a.studentCode ?? null,
          studentName: a.fullName,
          classId: a.classId,
          className: a.className,
          classLevel: a.classLevel ?? classLevelKeyOf(a),
          gender: a.gender ?? null,
          isException: !!a.isException,
        }));
        return {
          roomKey: key,
          roomName: r.roomName,
          roomNumber: r.roomNumber,
          capacity: r.capacity,
          used: roomAllocations.length,
          allocations: roomAllocations,
        };
      });
      return {
        preview: true,
        listCode,
        examinationName,
        academicYear,
        term,
        distributionMethod: body.distributionMethod,
        allowSameClassExceptions: !!body.allowSameClassExceptions,
        exceptionCount,
        allocationMeta,
        totalStudents: totalParticipants,
        totalCapacity,
        rooms: previewRooms,
        exceptionStudents: exceptionStudents.map((s) => ({
          studentId: s.id,
          studentName: s.fullName,
          className: s.className,
          classLevel: classLevelKeyOf(s),
          roomName: roomsInput[roomKeys.indexOf(s.roomKey)]?.roomName || s.roomKey,
        })),
      } as any;
    }

    return prisma.$transaction(async (tx) => {
      const list = await tx.examinationList.create({
        data: {
          organizationId,
          listCode,
          examinationTimetableId: timetable?.id ?? null,
          examinationTypeId: timetable?.examinationTypeId ?? body.examinationTypeId ?? null,
          examinationCode: timetable?.examinationCode ?? null,
          examinationName,
          academicYear,
          term,
          name: body.name?.trim() || `Examination List ${academicYear} ${term}`,
          startDate: timetable?.startDate ?? null,
          endDate: timetable?.endDate ?? null,
          distributionMethod: body.distributionMethod,
          mixQuantity: body.distributionMethod === 'MIX_CLASSES' ? (body.mixQuantity && body.mixQuantity > 0 ? Math.floor(body.mixQuantity) : null) : null,
          defaultCapacity: Math.max(1, Number(body.defaultCapacity) || 40),
          allowSameClassExceptions: !!body.allowSameClassExceptions && exceptionCount > 0,
          exceptionCount,
          allocationMeta,
          status: 'GENERATED',
          generatedAt: new Date(),
          createdBy: currentAcademicScope()?.userId ?? null,
        } as any,
      });
      const roomRows = await Promise.all(roomsInput.map((r, i) => tx.examinationListRoom.create({
        data: {
          listId: list.id,
          sourceRoomId: r.sourceRoomId,
          roomName: r.roomName,
          roomNumber: r.roomNumber,
          capacity: r.capacity,
          isUniqueCapacity: r.isUniqueCapacity,
          sortOrder: r.sortOrder ?? i,
        },
      })));
      const roomIdByKey = new Map<string, string>();
      roomRows.forEach((row, i) => roomIdByKey.set(roomKeys[i], row.id));

      await tx.examinationListClass.createMany({
        data: classIds.map((id) => ({
          listId: list.id,
          classId: id,
          className: classLabelOf(classMap.get(id)) || studentsByClass.get(id)?.[0]?.className || id,
          studentCount: (studentsByClass.get(id) || []).length,
        })),
      });

      const allocData = assigned.map((a) => ({
        listId: list.id,
        roomId: roomIdByKey.get(a.roomKey)!,
        studentId: a.id,
        studentCode: a.studentCode ?? null,
        studentName: a.fullName,
        classId: a.classId,
        className: a.className,
        classLevel: a.classLevel ?? classLevelKeyOf(a) ?? null,
        gender: a.gender ?? null,
        isException: !!a.isException,
        updatedAt: new Date(),
      }));
      const chunk = 500;
      for (let i = 0; i < allocData.length; i += chunk) {
        await tx.examinationAllocation.createMany({ data: allocData.slice(i, i + chunk) as any });
      }
      return tx.examinationList.findUnique({
        where: { id: list.id },
        include: {
          examinationTimetable: { select: { id: true, examinationCode: true, examinationTypeId: true, examinationType: { select: { id: true, name: true } }, name: true, className: true, startDate: true, endDate: true } },
          rooms: { orderBy: { sortOrder: 'asc' }, include: { allocations: { orderBy: [{ className: 'asc' }, { studentName: 'asc' }] } } },
          classes: { orderBy: { className: 'asc' } },
        },
      });
    });
  }

  async remove(id: string, organizationId: string, opts?: { confirmImpact?: boolean }) {
    const existing = await prisma.examinationList.findFirst({ where: mergeOwnData({ id, organizationId }) });
    if (!existing) throw new AppError(404, 'Examination list not found');
    assertOwnRecord(existing.createdBy, 'examination list');
    if (existing.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be deleted. Unpublish or create a new list instead.');
    if (!opts?.confirmImpact) {
      const invigilatorAssignments = await prisma.examinationInvigilatorAssignment.count({ where: { organizationId, examinationListId: id } });
      if (invigilatorAssignments > 0) {
        const err: any = new AppError(409, 'This examination list has dependent invigilator assignments. Confirm to delete and remove linked assignments.');
        err.details = { requiresConfirmation: true, linkedInvigilatorAssignments: invigilatorAssignments, warnings: [`${invigilatorAssignments} invigilator assignment(s) will be removed with this list.`] };
        throw err;
      }
    }
    await prisma.examinationList.delete({ where: { id } });
    return { deleted: true };
  }

  async moveStudent(id: string, organizationId: string, body: { allocationId: string; targetRoomId: string; allowSameClassException?: boolean }) {
    const list = await prisma.examinationList.findFirst({
      where: mergeOwnData({ id, organizationId }),
      include: { rooms: { include: { allocations: true } } },
    });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be modified');
    const alloc = await prisma.examinationAllocation.findFirst({ where: { id: body.allocationId, listId: id } });
    if (!alloc) throw new AppError(404, 'Allocation not found');
    const target = list.rooms.find((r) => r.id === body.targetRoomId);
    if (!target) throw new AppError(404, 'Target room not found');
    const othersInTarget = target.allocations.filter((a) => a.id !== alloc.id);
    const currentCount = target.allocations.length;
    const effectiveCount = target.id === alloc.roomId ? currentCount : currentCount + 1;
    if (effectiveCount > target.capacity) throw new AppError(409, `Room ${target.roomName} is at full capacity`);
    // Part-5 backend validation
    const studentsForCheck = [
      ...othersInTarget.map((a) => ({ classLevel: (a as any).classLevel ?? null, className: a.className, classId: a.classId, studentName: a.studentName })),
      { classLevel: (alloc as any).classLevel ?? null, className: alloc.className, classId: alloc.classId, studentName: alloc.studentName },
    ];
    const conflict = sameLevelConflictMessage(target.roomName, studentsForCheck);
    if (conflict && !body.allowSameClassException) throw new AppError(409, conflict);
    await prisma.examinationAllocation.update({
      where: { id: alloc.id },
      data: { roomId: target.id, ...(conflict ? { isException: true } : {}) },
    });
    return this.getById(id, organizationId);
  }

  async addStudentToRoom(id: string, organizationId: string, body: { roomId: string; studentId: string; allowSameClassException?: boolean }) {
    const res = await this.addStudentsToRoom(id, organizationId, { roomId: body.roomId, studentIds: [body.studentId], allowSameClassException: body.allowSameClassException });
    return res;
  }

  async addStudentsToRoom(id: string, organizationId: string, body: { roomId: string; studentIds: string[]; allowSameClassException?: boolean }) {
    const list = await prisma.examinationList.findFirst({
      where: mergeOwnData({ id, organizationId }),
      include: { rooms: { include: { allocations: true } } },
    });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be modified');
    const room = list.rooms.find((r) => r.id === body.roomId);
    if (!room) throw new AppError(404, 'Room not found');

    const requestedIds = Array.from(new Set((body.studentIds || []).map((s) => String(s)).filter(Boolean)));
    if (!requestedIds.length) throw new AppError(400, 'At least one student is required');
    if (room.allocations.length + requestedIds.length > room.capacity) {
      throw new AppError(409, `Room ${room.roomName} capacity exceeded. Available: ${Math.max(0, room.capacity - room.allocations.length)}, requested: ${requestedIds.length}`);
    }

    const students = await getAllActiveStudents(organizationId);
    const byId = new Map(students.map((s) => [s.id, s]));
    const selected = requestedIds.map((sid) => byId.get(sid)).filter(Boolean) as any[];
    if (selected.length !== requestedIds.length) throw new AppError(404, 'One or more students were not found or are not active');

    const existing = await prisma.examinationAllocation.findMany({
      where: { listId: id, studentId: { in: requestedIds } },
      select: { studentId: true, studentName: true, studentCode: true, room: { select: { roomName: true, roomNumber: true } } },
    });
    if (existing.length) {
      const detail = existing
        .map((a) => `${a.studentName}${a.studentCode ? ` (${a.studentCode})` : ''} is already allocated to ${a.room?.roomName || 'another room'}${a.room?.roomNumber ? ` (${a.room.roomNumber})` : ''}`)
        .join('; ');
      throw new AppError(409, detail);
    }

    // Part-5 backend validation: no two students of the same class level in one room
    const studentsForCheck = [
      ...room.allocations.map((a) => ({ classLevel: (a as any).classLevel ?? null, className: a.className, classId: a.classId, studentName: a.studentName })),
      ...selected.map((student) => ({ classLevel: student.classLevel ?? classLevelKeyOf(student) ?? null, className: student.className, classId: student.classId, studentName: student.fullName })),
    ];
    const conflict = sameLevelConflictMessage(room.roomName, studentsForCheck);
    if (conflict && !body.allowSameClassException) throw new AppError(409, conflict);

    const levelSeen = new Set(room.allocations.map((a) => String((a as any).classLevel || '').trim().toLowerCase()).filter(Boolean));
    const data = selected.map((student) => {
      const level = String(student.classLevel ?? classLevelKeyOf(student) ?? '').trim().toLowerCase();
      const isException = !!conflict && !!body.allowSameClassException && !!level && levelSeen.has(level);
      if (level) levelSeen.add(level);
      return {
        listId: id,
        roomId: room.id,
        studentId: student.id,
        studentCode: student.studentCode ?? null,
        studentName: student.fullName,
        classId: student.classId,
        className: student.className,
        classLevel: student.classLevel ?? classLevelKeyOf(student) ?? null,
        gender: student.gender ?? null,
        isException,
      };
    });

    await prisma.examinationAllocation.createMany({ data });
    return this.getById(id, organizationId);
  }

  async removeAllocation(id: string, organizationId: string, allocationId: string) {
    const list = await prisma.examinationList.findFirst({ where: mergeOwnData({ id, organizationId }) });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be modified');
    const alloc = await prisma.examinationAllocation.findFirst({ where: { id: allocationId, listId: id } });
    if (!alloc) throw new AppError(404, 'Allocation not found');
    await prisma.examinationAllocation.delete({ where: { id: alloc.id } });
    return this.getById(id, organizationId);
  }

  async addManualRoom(id: string, organizationId: string, body: { roomName: string; roomNumber?: string | null; capacity: number; studentIds: string[]; invigilatorIds?: string[] }) {
    const list = await prisma.examinationList.findFirst({
      where: mergeOwnData({ id, organizationId }),
      include: {
        rooms: { include: { allocations: true }, orderBy: { sortOrder: 'asc' } },
        examinationTimetable: { include: { slots: { orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { sessionCode: 'asc' }] } } },
        examinationType: { select: { name: true } },
      },
    });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be modified');

    const roomName = String(body.roomName || '').trim();
    if (!roomName) throw new AppError(400, 'Room name is required');
    const capacity = Math.max(1, Number(body.capacity || 0));
    const studentIds = Array.from(new Set((body.studentIds || []).map((s) => String(s)).filter(Boolean)));
    if (!studentIds.length) throw new AppError(400, 'Select at least one student');
    if (studentIds.length > capacity) throw new AppError(400, `Selected students (${studentIds.length}) exceed room capacity (${capacity})`);

    const allStudents = await getAllActiveStudents(organizationId);
    const byId = new Map(allStudents.map((s) => [s.id, s]));
    const selectedStudents = studentIds.map((sid) => byId.get(sid)).filter(Boolean) as StudentRow[];
    if (selectedStudents.length !== studentIds.length) throw new AppError(404, 'One or more selected students were not found or are not active');

    const existing = await prisma.examinationAllocation.findMany({
      where: { listId: id, studentId: { in: studentIds } },
      select: { studentId: true, studentName: true, studentCode: true, room: { select: { roomName: true, roomNumber: true } } },
    });
    if (existing.length) {
      const detail = existing
        .map((a) => `${a.studentName}${a.studentCode ? ` (${a.studentCode})` : ''} is already allocated to ${a.room?.roomName || 'another room'}${a.room?.roomNumber ? ` (${a.room.roomNumber})` : ''}`)
        .join('; ');
      throw new AppError(409, detail);
    }

    assertRoomNoSameLevel(roomName, selectedStudents.map((student) => ({
      classLevel: student.classLevel ?? classLevelKeyOf(student) ?? null,
      className: student.className,
      classId: student.classId,
      studentName: student.fullName,
    })));

    const invigilatorIds = Array.from(new Set((body.invigilatorIds || []).map((s) => String(s)).filter(Boolean)));

    const toDateKey = (value: Date | string) => { const d = typeof value === 'string' ? new Date(value) : value; return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; };
    const atNoonUtc = (value: string) => new Date(`${toDateKey(value)}T12:00:00.000Z`);
    const sessionCodeOf = (slot: any) => String(slot?.sessionCode || slot?.session || 'MORNING');
    const sessionNameOf = (slot: any) => String(slot?.sessionName || (slot?.session === 'AFTERNOON' ? 'Afternoon' : 'Morning'));

    const slots = (list as any).examinationTimetable?.slots || [];
    const sessions = slots.length
      ? slots.map((s: any) => ({
          examDate: toDateKey(s.examDate),
          session: s.session as 'MORNING' | 'AFTERNOON',
          sessionCode: sessionCodeOf(s),
          sessionName: sessionNameOf(s),
          startTime: s.startTime || (s.session === 'MORNING' ? '08:00' : '14:00'),
          endTime: s.endTime || (s.session === 'MORNING' ? '10:00' : '16:00'),
        }))
      : [{ examDate: toDateKey(list.startDate || (list as any).examinationTimetable?.startDate || new Date()), session: 'MORNING' as const, sessionCode: 'MORNING', sessionName: 'Morning', startTime: '08:00', endTime: '10:00' }];
    const uniqueSessions = [...new Map(sessions.map((s: any) => [`${s.examDate}|${s.sessionCode}`, s])).values()] as any[];

    let teachers: any[] = [];
    if (invigilatorIds.length) {
      const users = await fetchIamOrgUsers(organizationId).catch(() => [] as any[]);
      teachers = (Array.isArray(users) ? users : [])
        .filter((u: any) => String(u.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
        .map((u: any) => ({ id: u.id, name: u.name || [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || u.id, email: u.email || null }));
      const missing = invigilatorIds.filter((tid) => !teachers.some((t) => t.id === tid));
      if (missing.length) throw new AppError(404, 'One or more selected invigilators were not found');

      // Conflict check: teacher cannot be in another room same date/session
      for (const teacherId of invigilatorIds) {
        for (const sess of uniqueSessions) {
          const busy = await prisma.examinationInvigilatorAssignment.findFirst({
            where: { organizationId, examDate: atNoonUtc(sess.examDate), sessionCode: sess.sessionCode, teacherUserId: teacherId },
            select: { id: true, roomName: true },
          });
          if (busy) {
            const t = teachers.find((x) => x.id === teacherId);
            throw new AppError(409, `${t?.name || 'Teacher'} is already assigned on ${sess.examDate} ${sess.sessionName} (${busy.roomName})`);
          }
        }
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const maxOrder = list.rooms.reduce((m, r) => Math.max(m, r.sortOrder || 0), -1);
      const room = await tx.examinationListRoom.create({
        data: {
          listId: id,
          roomName,
          roomNumber: body.roomNumber ? String(body.roomNumber).trim() : null,
          capacity,
          isUniqueCapacity: true,
          sortOrder: maxOrder + 1,
        },
      });

      await tx.examinationAllocation.createMany({
        data: selectedStudents.map((student) => ({
          listId: id,
          roomId: room.id,
          studentId: student.id,
          studentCode: student.studentCode ?? null,
          studentName: student.fullName,
          classId: student.classId,
          className: student.className,
          classLevel: student.classLevel ?? classLevelKeyOf(student) ?? null,
          gender: student.gender ?? null,
        })),
      });

      const newClassIds = [...new Set(selectedStudents.map((s) => s.classId))];
      for (const classId of newClassIds) {
        const classStudents = selectedStudents.filter((s) => s.classId === classId);
        await tx.examinationListClass.upsert({
          where: { listId_classId: { listId: id, classId } },
          update: { studentCount: { increment: classStudents.length } as any },
          create: { listId: id, classId, className: classStudents[0]?.className || classId, studentCount: classStudents.length },
        }).catch(async () => {
          // fallback for engines not supporting increment in upsert update the same way
          const existingClass = await tx.examinationListClass.findUnique({ where: { listId_classId: { listId: id, classId } } });
          if (existingClass) await tx.examinationListClass.update({ where: { id: existingClass.id }, data: { studentCount: existingClass.studentCount + classStudents.length } });
          else await tx.examinationListClass.create({ data: { listId: id, classId, className: classStudents[0]?.className || classId, studentCount: classStudents.length } });
        });
      }

      if (invigilatorIds.length) {
        const data: any[] = [];
        for (const sess of uniqueSessions) {
          for (const teacherId of invigilatorIds) {
            const teacher = teachers.find((t) => t.id === teacherId);
            if (!teacher) continue;
            data.push({
              organizationId,
              examinationTimetableId: list.examinationTimetableId ?? null,
              examinationListId: list.id,
              examinationCode: list.examinationCode || (list as any).examinationTimetable?.examinationCode || null,
              listCode: list.listCode || null,
              roomId: room.id,
              roomName: room.roomName,
              roomNumber: room.roomNumber ?? null,
              examDate: atNoonUtc(sess.examDate),
              session: sess.session,
              sessionCode: sess.sessionCode,
              sessionName: sess.sessionName,
              startTime: sess.startTime ?? null,
              endTime: sess.endTime ?? null,
              teacherUserId: teacher.id,
              teacherName: teacher.name,
              teacherEmail: teacher.email ?? null,
              assignmentType: 'MANUAL',
              status: 'ASSIGNED',
            });
          }
        }
        if (data.length) await tx.examinationInvigilatorAssignment.createMany({ data, skipDuplicates: true });
      }

      return room;
    });

    const updated = await this.getById(id, organizationId);
    return { list: updated, roomId: created.id };
  }

  async updateRoom(id: string, organizationId: string, roomId: string, body: { capacity?: number; roomName?: string; roomNumber?: string | null }) {
    const list = await prisma.examinationList.findFirst({
      where: mergeOwnData({ id, organizationId }),
      include: { rooms: { include: { _count: { select: { allocations: true } } } } },
    });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be modified');
    const room = (list.rooms as any[]).find((r) => r.id === roomId);
    if (!room) throw new AppError(404, 'Room not found');

    const data: any = {};
    if (body.roomName !== undefined) {
      const name = String(body.roomName || '').trim();
      if (!name) throw new AppError(400, 'Room name is required');
      data.roomName = name;
    }
    if (body.roomNumber !== undefined) data.roomNumber = body.roomNumber ? String(body.roomNumber).trim() : null;
    if (body.capacity !== undefined) {
      const capacity = Math.max(1, Number(body.capacity || 0));
      const allocated = Number(room._count?.allocations || 0);
      if (capacity < allocated) throw new AppError(409, `Capacity cannot be less than currently allocated students (${allocated})`);
      data.capacity = capacity;
      data.isUniqueCapacity = true;
    }
    if (!Object.keys(data).length) throw new AppError(400, 'No room changes provided');

    await prisma.examinationListRoom.update({ where: { id: roomId }, data });
    return this.getById(id, organizationId);
  }

  async availableStudents(id: string, organizationId: string, q?: string, opts?: { fresh?: boolean }) {
    const list = await prisma.examinationList.findFirst({ where: mergeOwnData({ id, organizationId }), select: { id: true } });
    if (!list) throw new AppError(404, 'Examination list not found');
    const [students, allocated] = await Promise.all([
      getAllActiveStudents(organizationId, opts),
      prisma.examinationAllocation.findMany({ where: { listId: id }, select: { studentId: true } }),
    ]);
    const allocatedSet = new Set(allocated.map((a) => a.studentId));
    const query = String(q || '').trim().toLowerCase();
    return students
      .filter((s) => !allocatedSet.has(s.id))
      .filter((s) => !query || s.fullName.toLowerCase().includes(query) || (s.studentCode || '').toLowerCase().includes(query) || s.className.toLowerCase().includes(query))
      .map((s) => ({ id: s.id, studentCode: s.studentCode ?? null, fullName: s.fullName, classId: s.classId, className: s.className, gender: s.gender ?? null }));
  }

  /**
   * Master student search: finds any active student by name/code/class and
   * reports the room they currently occupy in this examination list (or Unallocated).
   */
  async searchStudents(id: string, organizationId: string, q?: string, opts?: { fresh?: boolean }) {
    const list = await prisma.examinationList.findFirst({ where: mergeOwnData({ id, organizationId }), select: { id: true } });
    if (!list) throw new AppError(404, 'Examination list not found');
    const [students, allocations, classes] = await Promise.all([
      getAllActiveStudents(organizationId, opts),
      prisma.examinationAllocation.findMany({
        where: { listId: id },
        select: { id: true, studentId: true, roomId: true, room: { select: { roomName: true, roomNumber: true } } },
      }),
      smListClasses(organizationId).catch(() => [] as any[]),
    ]);
    const allocByStudent = new Map(allocations.map((a) => [a.studentId, a]));
    const query = String(q || '').trim().toLowerCase();
    const rows = students
      .filter((s) => !query || s.fullName.toLowerCase().includes(query) || (s.studentCode || '').toLowerCase().includes(query) || s.className.toLowerCase().includes(query))
      .map((s) => {
        const alloc = allocByStudent.get(s.id);
        return {
          id: s.id,
          studentCode: s.studentCode ?? null,
          fullName: s.fullName,
          classId: s.classId,
          className: s.className,
          gender: s.gender ?? null,
          allocated: Boolean(alloc),
          allocationId: alloc?.id ?? null,
          roomId: alloc?.roomId ?? null,
          roomName: alloc?.room?.roomName ?? null,
          roomNumber: alloc?.room?.roomNumber ?? null,
        };
      })
      .sort((a, b) => Number(a.allocated) - Number(b.allocated) || a.className.localeCompare(b.className) || a.fullName.localeCompare(b.fullName));
    return {
      students: query ? rows.slice(0, 100) : rows.slice(0, 50),
      total: rows.length,
      totalStudents: students.length,
      availableCount: rows.filter((r) => !r.allocated).length,
      allocatedCount: allocations.length,
      classes: (Array.isArray(classes) ? classes : []).map((c: any) => ({
        id: String(c.id),
        name: classLabelOf(c),
        studentCount: students.filter((s) => s.classId === String(c.id)).length,
      })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
}

export const examinationListService = new ExaminationListService();












