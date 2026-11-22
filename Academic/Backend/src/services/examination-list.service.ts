import { randomBytes } from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { smListClasses, smListStudents } from '../clients/student-management.client';
import { fetchTimetableClassrooms } from '../clients/timetable.client';

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
  gender?: string | null;
};

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
  const raw = await smListStudents(organizationId, { status: 'ACTIVE' }).catch(() => [] as any[]);
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((s: any) => {
    const fullName = s.fullName || [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || s.studentCode || s.id;
    const classId = String(s.classId || s.enrollments?.[0]?.classId || s.enrollments?.[0]?.class?.id || '');
    const className = s.className || s.enrollments?.[0]?.class?.label || [s.enrollments?.[0]?.class?.name, s.enrollments?.[0]?.class?.stream].filter(Boolean).join(' ').trim() || 'Unassigned';
    return {
      id: String(s.id),
      studentCode: s.studentCode ?? null,
      fullName,
      classId,
      className,
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
      where: {
        organizationId,
        ...(academicYear ? { academicYear } : {}),
        ...(term ? { term } : {}),
        ...(examinationTypeId ? { examinationTypeId } : {}),
      },
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
        where: {
          organizationId,
          ...(params.academicYear ? { academicYear: params.academicYear } : {}),
          ...(params.term ? { term: params.term } : {}),
          ...(params.examinationTypeId ? { examinationTypeId: params.examinationTypeId } : {}),
        },
        include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] }, examinationType: true },
        orderBy: [{ academicYear: 'desc' }, { term: 'asc' }, { className: 'asc' }],
      }),
      prisma.examinationType.findMany({
        where: {
          organizationId,
          ...(params.academicYear ? { academicYear: params.academicYear } : {}),
          ...(params.term ? { term: params.term } : {}),
        },
        orderBy: [{ academicYear: 'desc' }, { term: 'asc' }, { name: 'asc' }],
      }),
      params.examinationTimetableId
        ? prisma.classExaminationTimetable.findFirst({
            where: { id: params.examinationTimetableId, organizationId },
            include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] }, examinationType: true },
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
        slots: timetable.slots.map((s: any) => ({ examDate: toDateOnly(s.examDate), session: s.session, courseName: s.courseName, startTime: s.startTime, endTime: s.endTime })),
      } : null,
    };
  }

  async list(organizationId: string, params: { academicYear?: string; term?: string; examinationTimetableId?: string; examinationTypeId?: string }) {
    return prisma.examinationList.findMany({
      where: {
        organizationId,
        ...(params.academicYear ? { academicYear: params.academicYear } : {}),
        ...(params.term ? { term: params.term } : {}),
        ...(params.examinationTimetableId ? { examinationTimetableId: params.examinationTimetableId } : {}),
        ...(params.examinationTypeId ? { examinationTypeId: params.examinationTypeId } : {}),
      },
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
      where: { id, organizationId },
      include: {
        examinationTimetable: {
          include: {
            slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] },
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
    const list = await prisma.examinationList.findFirst({ where: { id, organizationId }, select: { id: true, status: true, listCode: true } });
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
    const list = await prisma.examinationList.findFirst({ where: { id, organizationId } });
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
    const list = await prisma.examinationList.findFirst({ where: { id, organizationId } });
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
      ? await prisma.classExaminationTimetable.findFirst({ where: { id: body.examinationTimetableId, organizationId }, include: { examinationType: true } })
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

    let assigned: Array<StudentRow & { roomKey: string }>;
    if (body.distributionMethod === 'KEEP_CLASS') {
      assigned = distributeKeepClass(studentsByClass, classIds, roomDefs);
    } else {
      const qty = body.mixQuantity && body.mixQuantity > 0 ? Math.floor(body.mixQuantity) : null;
      const mixed = qty ? interleaveByQuantity(studentsByClass, classIds, qty) : interleaveAuto(studentsByClass, classIds);
      assigned = fillRoomsSequentially(mixed, roomDefs);
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
    const existing = await prisma.examinationList.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Examination list not found');
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
      where: { id, organizationId },
      include: { rooms: { include: { _count: { select: { allocations: true } } } } },
    });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be modified');
    const alloc = await prisma.examinationAllocation.findFirst({ where: { id: body.allocationId, listId: id } });
    if (!alloc) throw new AppError(404, 'Allocation not found');
    const target = list.rooms.find((r) => r.id === body.targetRoomId);
    if (!target) throw new AppError(404, 'Target room not found');
    const currentCount = target._count.allocations;
    const effectiveCount = target.id === alloc.roomId ? currentCount : currentCount + 1;
    if (effectiveCount > target.capacity) throw new AppError(409, `Room ${target.roomName} is at full capacity`);
    await prisma.examinationAllocation.update({ where: { id: alloc.id }, data: { roomId: target.id } });
    return this.getById(id, organizationId);
  }

  async addStudentToRoom(id: string, organizationId: string, body: { roomId: string; studentId: string }) {
    const list = await prisma.examinationList.findFirst({
      where: { id, organizationId },
      include: { rooms: { include: { _count: { select: { allocations: true } } } } },
    });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be modified');
    const room = list.rooms.find((r) => r.id === body.roomId);
    if (!room) throw new AppError(404, 'Room not found');
    if (room._count.allocations >= room.capacity) throw new AppError(409, `Room ${room.roomName} is at full capacity`);

    const existing = await prisma.examinationAllocation.findFirst({ where: { listId: id, studentId: body.studentId } });
    if (existing) throw new AppError(409, 'This student is already allocated to a room in this examination list');

    const students = await getAllActiveStudents(organizationId);
    const student = students.find((s) => s.id === body.studentId);
    if (!student) throw new AppError(404, 'Student not found or not active');

    await prisma.examinationAllocation.create({
      data: {
        listId: id,
        roomId: room.id,
        studentId: student.id,
        studentCode: student.studentCode ?? null,
        studentName: student.fullName,
        classId: student.classId,
        className: student.className,
        gender: student.gender ?? null,
      },
    });
    return this.getById(id, organizationId);
  }

  async removeAllocation(id: string, organizationId: string, allocationId: string) {
    const list = await prisma.examinationList.findFirst({ where: { id, organizationId } });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') throw new AppError(409, 'Published examination lists cannot be modified');
    const alloc = await prisma.examinationAllocation.findFirst({ where: { id: allocationId, listId: id } });
    if (!alloc) throw new AppError(404, 'Allocation not found');
    await prisma.examinationAllocation.delete({ where: { id: alloc.id } });
    return this.getById(id, organizationId);
  }

  async availableStudents(id: string, organizationId: string, q?: string) {
    const list = await prisma.examinationList.findFirst({ where: { id, organizationId }, select: { id: true } });
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
