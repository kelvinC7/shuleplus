import { randomBytes } from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { smListClasses, smListStudents } from '../clients/student-management.client';
import { fetchTimetableClassrooms } from '../clients/timetable.client';
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

async function getAllActiveStudents(organizationId: string): Promise<StudentRow[]> {
  const [raw, classRows] = await Promise.all([
    smListStudents(organizationId, { status: 'ACTIVE' }).catch(() => [] as any[]),
    smListClasses(organizationId).catch(() => [] as any[]),
  ]);
  const rows = Array.isArray(raw) ? raw : [];
  const classInfo = new Map<string, any>();
  for (const c of classRows) classInfo.set(String(c.id), c);
  return rows.map((s: any) => {
    const fullName = s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || s.studentCode || s.id;
    const classId = String(s.classId || s.enrollments?.[0]?.classId || s.enrollments?.[0]?.class?.id || '');
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
  }).filter((s) => s.id && s.classId);
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
function assertRoomNoSameLevel(roomName: string, studentsInRoom: Array<{ classLevel?: string | null; className?: string | null; classId?: string | null; parentClassId?: string | null; studentName?: string; fullName?: string }>) {
  const seen = new Map<string, string>();
  for (const s of studentsInRoom) {
    const key = classLevelKeyOf(s);
    if (!key) continue;
    const who = s.studentName || s.fullName || '';
    if (seen.has(key)) {
      throw new AppError(
        409,
        `Room allocation not allowed. Room ${roomName} already has a student from class ${seen.get(key)}; ` +
          `cannot also add ${who} (class ${key}). Students from the same class level (including different streams) must be in different rooms.`,
      );
    }
    seen.set(key, key);
  }
}

/** Part-5 automatic distribution: no room gets two students of the same class level; respects capacity. */
function assignRoomsNoSameLevel(
  students: StudentRow[],
  rooms: Array<{ id: string; capacity: number }>,
): Array<StudentRow & { roomKey: string }> {
  // interleave by class level so streams of one level are spread across rooms
  const byLevel = new Map<string, StudentRow[]>();
  for (const s of students) {
    const k = classLevelKeyOf(s);
    if (!byLevel.has(k)) byLevel.set(k, []);
    byLevel.get(k)!.push(s);
  }
  const queues = [...byLevel.values()].map((q) => [...q].sort((a, b) => a.fullName.localeCompare(b.fullName)));
  const ordered: StudentRow[] = [];
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const q of queues) {
      if (q.length) { ordered.push(q.shift()!); remaining = true; }
    }
  }

  const roomState = rooms.map((r) => ({ id: r.id, capacity: r.capacity, count: 0, levels: new Set<string>() }));
  const assigned: Array<StudentRow & { roomKey: string }> = [];
  for (const s of ordered) {
    const key = classLevelKeyOf(s);
    const eligible = roomState
      .filter((r) => r.count < r.capacity && !r.levels.has(key))
      .sort((a, b) => a.count - b.count || a.id.localeCompare(b.id));
    if (!eligible.length) {
      const totalCapacity = roomState.reduce((n, r) => n + r.capacity, 0);
      const maxPerLevel = Math.max(1, ...[...byLevel.values()].map((v) => v.length));
      throw new AppError(
        400,
        `Not enough examination rooms. No room can take ${s.fullName} (class ${key}) without putting two students of class ${key} together. ` +
          `Add more rooms or capacity. Total capacity ${totalCapacity}, largest class level ${maxPerLevel} student(s), total students ${students.length}.`,
      );
    }
    const room = eligible[0];
    room.count += 1;
    room.levels.add(key);
    assigned.push({ ...s, roomKey: room.id });
  }
  return assigned;
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
      throw new AppError(400, `Not enough room capacity. Need ${totalParticipants} seats but only ${totalCapacity} available.`);
    }

    const roomKeys = roomsInput.map((_, i) => `room_${i}`);
    const roomDefs = roomsInput.map((r, i) => ({ id: roomKeys[i], capacity: r.capacity }));

    // Part-5: never place two students of the same class level in one room.
    const allParticipants = [...studentsByClass.values()].flatMap((l) => l);
    const assigned: Array<StudentRow & { roomKey: string }> = assignRoomsNoSameLevel(allParticipants, roomDefs);

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
          status: 'GENERATED',
          generatedAt: new Date(),
          createdBy: currentAcademicScope()?.userId ?? null,
        },
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
        updatedAt: new Date(),
      }));
      const chunk = 500;
      for (let i = 0; i < allocData.length; i += chunk) {
        await tx.examinationAllocation.createMany({ data: allocData.slice(i, i + chunk) });
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

  async moveStudent(id: string, organizationId: string, body: { allocationId: string; targetRoomId: string }) {
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
    assertRoomNoSameLevel(target.roomName, [
      ...othersInTarget.map((a) => ({ classLevel: (a as any).classLevel ?? null, className: a.className, classId: a.classId, studentName: a.studentName })),
      { classLevel: (alloc as any).classLevel ?? null, className: alloc.className, classId: alloc.classId, studentName: alloc.studentName },
    ]);
    await prisma.examinationAllocation.update({ where: { id: alloc.id }, data: { roomId: target.id } });
    return this.getById(id, organizationId);
  }

  async addStudentToRoom(id: string, organizationId: string, body: { roomId: string; studentId: string }) {
    const list = await prisma.examinationList.findFirst({
      where: mergeOwnData({ id, organizationId }),
      include: { rooms: { include: { allocations: true } } },
    });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be modified');
    const room = list.rooms.find((r) => r.id === body.roomId);
    if (!room) throw new AppError(404, 'Room not found');
    if (room.allocations.length >= room.capacity) throw new AppError(409, `Room ${room.roomName} is at full capacity`);

    const existing = await prisma.examinationAllocation.findFirst({ where: { listId: id, studentId: body.studentId } });
    if (existing) throw new AppError(409, 'This student is already allocated to a room in this examination list');

    const students = await getAllActiveStudents(organizationId);
    const student = students.find((s) => s.id === body.studentId);
    if (!student) throw new AppError(404, 'Student not found or not active');

    // Part-5 backend validation: no two students of the same class level in one room
    assertRoomNoSameLevel(room.roomName, [
      ...room.allocations.map((a) => ({ classLevel: (a as any).classLevel ?? null, className: a.className, classId: a.classId, studentName: a.studentName })),
      { classLevel: student.classLevel ?? classLevelKeyOf(student) ?? null, className: student.className, classId: student.classId, studentName: student.fullName },
    ]);

    await prisma.examinationAllocation.create({
      data: {
        listId: id,
        roomId: room.id,
        studentId: student.id,
        studentCode: student.studentCode ?? null,
        studentName: student.fullName,
        classId: student.classId,
        className: student.className,
        classLevel: student.classLevel ?? classLevelKeyOf(student) ?? null,
        gender: student.gender ?? null,
      },
    });
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

  async availableStudents(id: string, organizationId: string, q?: string) {
    const list = await prisma.examinationList.findFirst({ where: mergeOwnData({ id, organizationId }), select: { id: true } });
    if (!list) throw new AppError(404, 'Examination list not found');
    const [students, allocated] = await Promise.all([
      getAllActiveStudents(organizationId),
      prisma.examinationAllocation.findMany({ where: { listId: id }, select: { studentId: true } }),
    ]);
    const allocatedSet = new Set(allocated.map((a) => a.studentId));
    const query = String(q || '').trim().toLowerCase();
    return students
      .filter((s) => !allocatedSet.has(s.id))
      .filter((s) => !query || s.fullName.toLowerCase().includes(query) || (s.studentCode || '').toLowerCase().includes(query) || s.className.toLowerCase().includes(query))
      .slice(0, 200)
      .map((s) => ({ id: s.id, studentCode: s.studentCode ?? null, fullName: s.fullName, classId: s.classId, className: s.className, gender: s.gender ?? null }));
  }
}

export const examinationListService = new ExaminationListService();












