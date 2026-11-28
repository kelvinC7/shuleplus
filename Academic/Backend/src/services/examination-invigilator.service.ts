import { randomBytes } from 'crypto';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { fetchIamOrgUsers } from '../clients/iam.client';

type ManualRoomConfig = {
  roomId: string;
  defaultCount?: number;
  sessions?: Record<string, number>; // key: `${date}|${session}` -> count
};

function toDateKey(value: Date | string) {
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function atNoonUtc(value: string) {
  return new Date(`${toDateKey(value)}T12:00:00.000Z`);
}

function parseMins(t?: string | null) {
  if (!t) return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function sessionCodeOf(slot: any) {
  return String(slot?.sessionCode || slot?.session || 'MORNING');
}

function sessionNameOf(slot: any) {
  return String(slot?.sessionName || (slot?.session === 'AFTERNOON' ? 'Afternoon' : 'Morning'));
}

function sessionKey(date: string | Date, sessionCode: string) {
  return `${toDateKey(date)}|${sessionCode}`;
}

function findSessionSlot(slots: any[], date: string, session?: 'MORNING' | 'AFTERNOON', sessionCode?: string) {
  const daySlots = slots.filter((slot) => toDateKey(slot.examDate) === date);
  if (sessionCode) return daySlots.find((slot) => sessionCodeOf(slot) === sessionCode) || null;
  const matches = daySlots.filter((slot) => slot.session === session);
  if (matches.length > 1) throw new AppError(400, 'sessionCode is required when multiple sessions share this period');
  return matches[0] || null;
}

async function getTeachers(organizationId: string) {
  const users = await fetchIamOrgUsers(organizationId).catch(() => [] as any[]);
  return (Array.isArray(users) ? users : [])
    .filter((u: any) => String(u.status || 'ACTIVE').toUpperCase() !== 'SUSPENDED')
    .map((u: any) => {
      const name = u.name || [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || u.id;
      const roles = Array.isArray(u.roles) ? u.roles : [];
      const modules = Array.isArray(u.modules) ? u.modules : [];
      const isTeacher = roles.some((r: string) => /teacher|tutor|invigilator/i.test(r)) || modules.some((m: string) => /teacher|ticha|academic/i.test(m));
      return {
        id: u.id,
        name,
        email: u.email || null,
        roles,
        modules,
        isTeacher,
        active: String(u.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
      };
    });
}

async function loadExamAndList(organizationId: string, examinationListId: string) {
  const list = await prisma.examinationList.findFirst({
    where: { id: examinationListId, organizationId },
    include: {
      rooms: { orderBy: { sortOrder: 'asc' }, include: { allocations: { select: { classId: true, className: true, studentId: true } } } },
      examinationTimetable: { include: { slots: { orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { sessionCode: 'asc' }] } } },
      examinationType: true,
    },
  });
  if (!list) throw new AppError(404, 'Examination list not found');
  return list;
}

function deriveSessions(list: any) {
  const slots = list.examinationTimetable?.slots || [];
  if (slots.length) {
    return slots.map((s: any) => ({
      examDate: toDateKey(s.examDate),
      session: s.session as 'MORNING' | 'AFTERNOON',
      sessionCode: sessionCodeOf(s),
      sessionName: sessionNameOf(s),
      startTime: s.startTime || (s.session === 'MORNING' ? '08:00' : '14:00'),
      endTime: s.endTime || (s.session === 'MORNING' ? '10:00' : '16:00'),
      courseName: s.courseName || null,
    }));
  }
  // fallback: derive from list dates as single day morning+afternoon
  const start = list.startDate || list.examinationTimetable?.startDate || new Date();
  const day = toDateKey(start);
  return [
    { examDate: day, session: 'MORNING' as const, sessionCode: 'MORNING', sessionName: 'Morning', startTime: '08:00', endTime: '10:00', courseName: null },
    { examDate: day, session: 'AFTERNOON' as const, sessionCode: 'AFTERNOON', sessionName: 'Afternoon', startTime: '14:00', endTime: '16:00', courseName: null },
  ];
}

export class ExaminationInvigilatorService {
  async context(organizationId: string, params: { examinationListId?: string; examinationTypeId?: string }) {
    const [lists, teachers, examinationTypes, typeTimetables] = await Promise.all([
      prisma.examinationList.findMany({
        where: { organizationId, ...(params.examinationTypeId ? { examinationTypeId: params.examinationTypeId } : {}) },
        include: {
          examinationTimetable: { select: { id: true, examinationCode: true, name: true, className: true, examinationTypeId: true, startDate: true, endDate: true } },
          examinationType: { select: { id: true, name: true } },
          rooms: { select: { id: true, roomName: true, roomNumber: true, capacity: true } },
          _count: { select: { allocations: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      getTeachers(organizationId),
      prisma.examinationType.findMany({ where: { organizationId }, orderBy: [{ academicYear: 'desc' }, { term: 'asc' }, { name: 'asc' }] }).catch(() => []),
      params.examinationTypeId
        ? prisma.classExaminationTimetable.findMany({
            where: { organizationId, examinationTypeId: params.examinationTypeId },
            include: { slots: { select: { id: true, examDate: true, session: true, sessionCode: true, sessionName: true, startTime: true, endTime: true, courseName: true } , orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { sessionCode: 'asc' }] } },
            orderBy: [{ className: 'asc' }],
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    let selected: any = null;
    if (params.examinationListId) {
      const list = await loadExamAndList(organizationId, params.examinationListId);
      const assignments = await prisma.examinationInvigilatorAssignment.findMany({
        where: { organizationId, examinationListId: list.id },
        orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { sessionCode: 'asc' }, { roomName: 'asc' }, { teacherName: 'asc' }],
      });

      // Compute required room-slots based on timetable slots for classes allocated in each room
      const typeId = list.examinationTypeId || list.examinationTimetable?.examinationTypeId || null;
      const ttWhere: any = { organizationId };
      if (typeId) ttWhere.examinationTypeId = typeId;
      else if (list.examinationTimetableId) ttWhere.id = list.examinationTimetableId;
      else ttWhere.id = '__none__';
      let scopeTT = await prisma.classExaminationTimetable.findMany({ where: ttWhere, include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } } });
      if (list.examinationTimetableId && !scopeTT.some((t) => t.id === list.examinationTimetableId)) {
        const own = await prisma.classExaminationTimetable.findFirst({ where: { id: list.examinationTimetableId, organizationId }, include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } } });
        if (own) scopeTT = [own, ...scopeTT];
      }
      const normName = (v: any) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const baseName = (v: any) => normName(v).replace(/\s+[a-z]$/i, '').trim();
      const buildSlotMap = (tts: any[]) => {
        const m = new Map<string, Map<string, any>>();
        for (const tt of tts) {
          const n = normName(tt.className); const b = baseName(tt.className);
          const keys = [tt.classId, `name:${n}`, b && b !== n ? `base:${b}` : null].filter(Boolean) as string[];
          for (const k of keys) { if (!m.has(k)) m.set(k, new Map()); const cm = m.get(k)!; for (const sl of (tt.slots || [])) { const sk = sessionKey(sl.examDate, sessionCodeOf(sl)); if (!cm.has(sk)) cm.set(sk, sl); } }
        }
        return m;
      };
      let cMap = buildSlotMap(scopeTT);
      const allAllocClassIds = [...new Set((list.rooms as any[]).flatMap((r: any) => ((r.allocations || []) as any[]).map((a) => a.classId).filter(Boolean)))];
      const missingOrEmpty = allAllocClassIds.filter((cid) => { const m = cMap.get(cid); return !m || m.size === 0; });
      if (missingOrEmpty.length) {
        const extra = await prisma.classExaminationTimetable.findMany({ where: { organizationId, classId: { in: missingOrEmpty }, ...(typeId ? { OR: [{ examinationTypeId: typeId }, { examinationTypeId: null }] } : {}) }, include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } } });
        if (extra.length) { scopeTT = [...scopeTT, ...extra]; cMap = buildSlotMap(scopeTT); }
        const still = missingOrEmpty.filter((cid) => { const m = cMap.get(cid); return !m || m.size === 0; });
        if (still.length) { const extra2 = await prisma.classExaminationTimetable.findMany({ where: { organizationId, classId: { in: still } }, include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } }, orderBy: { updatedAt: 'desc' } }); if (extra2.length) { scopeTT = [...scopeTT, ...extra2]; cMap = buildSlotMap(scopeTT); } }
      }
      if (typeId) {
        const withSlots = await prisma.classExaminationTimetable.findMany({ where: { organizationId, examinationTypeId: typeId, slots: { some: {} } }, include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } } });
        if (withSlots.length) { scopeTT = [...scopeTT, ...withSlots]; cMap = buildSlotMap(scopeTT); }
      }

      const requiredSlots: Array<{ examDate: string; session: 'MORNING' | 'AFTERNOON'; sessionCode: string; sessionName: string; startTime: string; endTime: string; roomId: string; roomName: string; roomNumber?: string | null; classNames: string[] }> = [];
      const seenReq = new Set<string>();
      for (const r of list.rooms as any[]) {
        const allocClassIds = [...new Set(((r.allocations || []) as any[]).map((a) => a.classId).filter(Boolean))];
        const classIds = allocClassIds.length ? allocClassIds : (list.examinationTimetable?.classId ? [list.examinationTimetable.classId] : []);
        for (const classId of classIds) {
          const alloc = ((r.allocations || []) as any[]).find((a) => a.classId === classId);
          const n = normName(alloc?.className || ''); const b = baseName(alloc?.className || '');
          const sm = cMap.get(classId) || cMap.get(`name:${n}`) || (b ? cMap.get(`base:${b}`) : undefined) || (b ? cMap.get(`name:${b}`) : undefined);
          if (!sm) continue;
          for (const [key, sl] of sm.entries()) {
            const rk = `${r.id}|${key}`;
            if (seenReq.has(rk)) continue;
            seenReq.add(rk);
            const classNames = classIds.filter((cid) => {
              const a2 = ((r.allocations || []) as any[]).find((a) => a.classId === cid);
              const n2 = normName(a2?.className || ''); const b2 = baseName(a2?.className || '');
              const m2 = cMap.get(cid) || cMap.get(`name:${n2}`) || (b2 ? cMap.get(`base:${b2}`) : undefined) || (b2 ? cMap.get(`name:${b2}`) : undefined);
              return m2?.has(key);
            }).map((cid) => ((r.allocations || []) as any[]).find((a) => a.classId === cid)?.className || scopeTT.find((t) => t.classId === cid)?.className || cid);
            requiredSlots.push({
              examDate: toDateKey(sl.examDate),
              session: sl.session as 'MORNING' | 'AFTERNOON',
              sessionCode: sessionCodeOf(sl),
              sessionName: sessionNameOf(sl),
              startTime: sl.startTime || (sl.session === 'MORNING' ? '08:00' : '14:00'),
              endTime: sl.endTime || (sl.session === 'MORNING' ? '10:00' : '16:00'),
              roomId: r.id, roomName: r.roomName, roomNumber: r.roomNumber,
              classNames: [...new Set(classNames)],
            });
          }
        }
      }
      requiredSlots.sort((a,b)=>a.examDate.localeCompare(b.examDate)||a.startTime.localeCompare(b.startTime)||a.roomName.localeCompare(b.roomName));

      const sessions = requiredSlots.length
        ? [...new Map(requiredSlots.map((s) => [`${s.examDate}|${s.sessionCode}`, { examDate: s.examDate, session: s.session, sessionCode: s.sessionCode, sessionName: s.sessionName, startTime: s.startTime, endTime: s.endTime, courseName: null }])).values()]
        : deriveSessions(list);

      const assignmentKey = (a: any) => `${toDateKey(a.examDate)}|${sessionCodeOf(a)}|${a.roomId}`;
      const coverage = requiredSlots.map((rs) => {
        const key = `${rs.examDate}|${rs.sessionCode}|${rs.roomId}`;
        const roomAssignments = assignments.filter((a: any) => assignmentKey(a) === key);
        return { ...rs, required: 1, assigned: roomAssignments.length, status: roomAssignments.length > 0 ? 'COVERED' : 'MISSING', invigilators: roomAssignments.map((a: any) => ({ id: a.id, teacherUserId: a.teacherUserId, teacherName: a.teacherName })) };
      });

      selected = {
        list: {
          id: list.id,
          listCode: list.listCode,
          examinationCode: list.examinationCode || list.examinationTimetable?.examinationCode || null,
          examinationName: list.examinationName || list.examinationTimetable?.name || null,
          examinationTypeId: list.examinationTypeId || list.examinationTimetable?.examinationTypeId || null,
          academicYear: list.academicYear,
          term: list.term,
          startDate: toDateKey(list.startDate || list.examinationTimetable?.startDate || new Date()),
          endDate: toDateKey(list.endDate || list.examinationTimetable?.endDate || new Date()),
        },
        rooms: list.rooms.map((r: any) => ({ id: r.id, roomName: r.roomName, roomNumber: r.roomNumber, capacity: r.capacity })),
        sessions,
        assignments,
        coverage,
      };
    }

    return {
      examinationTypes: examinationTypes.map((t: any) => ({ id: t.id, name: t.name, academicYear: t.academicYear, term: t.term })),
      typeTimetables: (typeTimetables as any[]).map((tt: any) => ({
        id: tt.id,
        classId: tt.classId,
        className: tt.className,
        examinationCode: tt.examinationCode,
        startDate: toDateKey(tt.startDate),
        endDate: toDateKey(tt.endDate),
        slots: (tt.slots || []).map((sl: any) => ({ examDate: toDateKey(sl.examDate), session: sl.session, sessionCode: sessionCodeOf(sl), sessionName: sessionNameOf(sl), startTime: sl.startTime, endTime: sl.endTime, courseName: sl.courseName })),
      })),
      lists: lists.map((l: any) => ({
        id: l.id,
        listCode: l.listCode,
        examinationCode: l.examinationCode || l.examinationTimetable?.examinationCode || null,
        examinationName: l.examinationName || l.examinationTimetable?.name || l.name,
        examinationTypeId: l.examinationTypeId || l.examinationTimetable?.examinationTypeId || null,
        examinationTypeName: l.examinationType?.name || null,
        academicYear: l.academicYear,
        term: l.term,
        status: l.status,
        roomCount: l.rooms.length,
        studentCount: l._count.allocations,
      })),
      teachers,
      selected,
    };
  }

  async dashboard(organizationId: string, examinationListId: string) {
    const ctx = await this.context(organizationId, { examinationListId });
    if (!ctx.selected) throw new AppError(404, 'Examination list not found');
    const { rooms, sessions, assignments, coverage } = ctx.selected as any;
    const daySet = new Set(sessions.map((s: any) => s.examDate));
    const coverageRows = Array.isArray(coverage) ? coverage : [];
    const requiredKeys = coverageRows.length
      ? coverageRows.map((c: any) => `${c.examDate}|${sessionCodeOf(c)}|${c.roomId}`)
      : (() => { const keys: string[] = []; for (const s of sessions) for (const r of rooms) keys.push(`${s.examDate}|${sessionCodeOf(s)}|${r.id}`); return keys; })();
    const assignedKeys = new Set(assignments.map((a: any) => `${toDateKey(a.examDate)}|${sessionCodeOf(a)}|${a.roomId}`));
    const unassignedRooms = requiredKeys.filter((k: string) => !assignedKeys.has(k)).length;
    const teacherSet = new Set(assignments.map((a: any) => a.teacherUserId));
    return {
      stats: {
        totalExaminationDays: daySet.size,
        totalExaminationRooms: rooms.length,
        availableTeachers: ctx.teachers.filter((t: any) => t.active).length,
        assignedInvigilators: teacherSet.size,
        unassignedRooms,
        totalAssignments: assignments.length,
      },
      selected: ctx.selected,
      teachers: ctx.teachers,
    };
  }

  private async generateForLists(organizationId: string, listIds: string[], body: {
    examinationListId?: string;
    examinationListIds?: string[];
    examinationTypeId?: string;
    teacherIds: string[];
    mode: 'AUTO' | 'MANUAL';
    rotationMode?: 'PER_SESSION' | 'DAILY' | 'NONE';
    defaultPerRoom?: number;
    manual?: { rooms: ManualRoomConfig[] };
    replaceExisting?: boolean;
  }) {
    const ids = [...new Set(listIds.filter(Boolean))];
    if (!ids.length) throw new AppError(400, 'No examination lists selected');
    const valid = await prisma.examinationList.findMany({ where: { organizationId, id: { in: ids } }, select: { id: true } });
    if (valid.length !== ids.length) throw new AppError(404, 'One or more selected examination lists were not found');
    let created = 0;
    let success = 0;
    const unassigned: any[] = [];
    const assignments: any[] = [];
    const failures: Array<{ examinationListId: string; message: string }> = [];
    for (const id of valid.map((l) => l.id)) {
      try {
        const res = await this.generate(organizationId, { ...body, examinationListId: id, examinationListIds: undefined });
        success += 1;
        created += res.created || 0;
        if (Array.isArray(res.unassigned)) unassigned.push(...res.unassigned);
        if (Array.isArray(res.assignments)) assignments.push(...res.assignments);
      } catch (e: any) {
        failures.push({ examinationListId: id, message: e?.message || 'Generation failed' });
      }
    }
    if (!success && failures.length) {
      throw new AppError(400, `Invigilator generation failed for all selected lists: ${failures.slice(0, 3).map((f) => f.message).join('; ')}`);
    }
    return { created, unassigned, assignments, generatedLists: success, failures };
  }

  async generate(organizationId: string, body: {
    examinationListId?: string;
    examinationListIds?: string[];
    examinationTypeId?: string;
    teacherIds: string[];
    mode: 'AUTO' | 'MANUAL';
    rotationMode?: 'PER_SESSION' | 'DAILY' | 'NONE';
    defaultPerRoom?: number;
    manual?: { rooms: ManualRoomConfig[] };
    replaceExisting?: boolean;
  }) {
    if (Array.isArray(body.examinationListIds) && body.examinationListIds.length) {
      return this.generateForLists(organizationId, body.examinationListIds, body);
    }
    if (body.examinationTypeId && !body.examinationListId) {
      const lists = await prisma.examinationList.findMany({ where: { organizationId, examinationTypeId: body.examinationTypeId }, select: { id: true } });
      if (!lists.length) throw new AppError(400, 'No examination lists found for the selected examination type');
      return this.generateForLists(organizationId, lists.map((l) => l.id), body);
    }
    if (!body.examinationListId) throw new AppError(400, 'examinationListId or examinationTypeId is required');
    const list = await loadExamAndList(organizationId, body.examinationListId);
    const rooms = list.rooms as any[];
    if (!rooms.length) throw new AppError(400, 'No examination rooms found for this list');

    const teacherIds = [...new Set((body.teacherIds || []).filter(Boolean))];
    if (!teacherIds.length) throw new AppError(400, 'Select at least one teacher/invigilator');

    const allTeachers = await getTeachers(organizationId);
    const teacherMap = new Map(allTeachers.map((t) => [t.id, t]));
    const teachers = teacherIds.map((id) => teacherMap.get(id)).filter(Boolean) as any[];
    if (!teachers.length) throw new AppError(400, 'Selected teachers could not be found');

    // Build classId -> (date|session -> slot) from timetables in same exam type/scope
    const typeId = list.examinationTypeId || list.examinationTimetable?.examinationTypeId || null;
    const timetableWhere: any = { organizationId };
    if (typeId) timetableWhere.examinationTypeId = typeId;
    else if (list.examinationTimetableId) timetableWhere.id = list.examinationTimetableId;
    else timetableWhere.id = '__none__';
    let scopeTimetables = await prisma.classExaminationTimetable.findMany({
      where: timetableWhere,
      include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } },
    });

    // Also include list's own timetable if not present
    if (list.examinationTimetableId && !scopeTimetables.some((t) => t.id === list.examinationTimetableId)) {
      const own = await prisma.classExaminationTimetable.findFirst({ where: { id: list.examinationTimetableId, organizationId }, include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } } });
      if (own) scopeTimetables = [own, ...scopeTimetables];
    }

    const normName = (v: any) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const baseName = (v: any) => normName(v).replace(/\s+[a-z]$/i, '').trim();
    const buildSlotMap = (tts: any[]) => {
      const m = new Map<string, Map<string, any>>();
      for (const tt of tts) {
        const n = normName(tt.className);
        const b = baseName(tt.className);
        const keys = [tt.classId, `name:${n}`, b && b !== n ? `base:${b}` : null].filter(Boolean) as string[];
        for (const k of keys) {
          if (!m.has(k)) m.set(k, new Map());
          const cm = m.get(k)!;
          for (const sl of (tt.slots || [])) {
            const sk = sessionKey(sl.examDate, sessionCodeOf(sl));
            if (!cm.has(sk)) cm.set(sk, sl);
          }
        }
      }
      return m;
    };
    let classSlotMap = buildSlotMap(scopeTimetables);

    // Ensure timetables for allocated classes are loaded (handles mixed/other-type edge cases)
    const allAllocClassIds = [...new Set(rooms.flatMap((r: any) => ((r.allocations || []) as any[]).map((a) => a.classId).filter(Boolean)))];
    const missingOrEmpty = allAllocClassIds.filter((cid) => {
      const m = classSlotMap.get(cid);
      return !m || m.size === 0;
    });
    if (missingOrEmpty.length) {
      const extra = await prisma.classExaminationTimetable.findMany({
        where: { organizationId, classId: { in: missingOrEmpty }, ...(typeId ? { OR: [{ examinationTypeId: typeId }, { examinationTypeId: null }] } : {}) },
        include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } },
      });
      if (extra.length) { scopeTimetables = [...scopeTimetables, ...extra]; classSlotMap = buildSlotMap(scopeTimetables); }
      const stillMissing = missingOrEmpty.filter((cid) => { const m = classSlotMap.get(cid); return !m || m.size === 0; });
      if (stillMissing.length) {
        const extra2 = await prisma.classExaminationTimetable.findMany({
          where: { organizationId, classId: { in: stillMissing } },
          include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } },
          orderBy: { updatedAt: 'desc' },
        });
        if (extra2.length) { scopeTimetables = [...scopeTimetables, ...extra2]; classSlotMap = buildSlotMap(scopeTimetables); }
      }
    }
    // Also load any other timetables in same type that have slots (covers classId/name mismatches)
    if (typeId) {
      const withSlots = await prisma.classExaminationTimetable.findMany({
        where: { organizationId, examinationTypeId: typeId, slots: { some: {} } },
        include: { slots: { orderBy: [{ examDate: 'asc' }, { session: 'asc' }] } },
      });
      if (withSlots.length) { scopeTimetables = [...scopeTimetables, ...withSlots]; classSlotMap = buildSlotMap(scopeTimetables); }
    }

    // Only generate invigilation where room has at least one allocated class with an exam in that date/session
    const defaultPerRoom = Math.max(1, Number(body.defaultPerRoom || 1));
    const manualRooms = new Map<string, ManualRoomConfig>();
    for (const r of body.manual?.rooms || []) manualRooms.set(r.roomId, r);

    const needs: Array<{ room: any; session: any; count: number }> = [];
    const seenNeed = new Set<string>();
    for (const r of rooms) {
      const allocClassIds = [...new Set(((r.allocations as any[]) || []).map((a) => a.classId).filter(Boolean))];
      const classIds = allocClassIds.length ? allocClassIds : (list.examinationTimetable?.classId ? [list.examinationTimetable.classId] : []);
      for (const classId of classIds) {
        const alloc = ((r.allocations as any[]) || []).find((a) => a.classId === classId);
        const n = normName(alloc?.className || '');
        const b = baseName(alloc?.className || '');
        const slotMap = classSlotMap.get(classId) || classSlotMap.get(`name:${n}`) || (b ? classSlotMap.get(`base:${b}`) : undefined) || (b ? classSlotMap.get(`name:${b}`) : undefined);
        if (!slotMap) continue;
        for (const [key, sl] of slotMap.entries()) {
          const needKey = `${r.id}|${key}`;
          if (seenNeed.has(needKey)) continue;
          seenNeed.add(needKey);
          const session = {
            examDate: toDateKey(sl.examDate),
            session: sl.session as 'MORNING' | 'AFTERNOON',
            sessionCode: sessionCodeOf(sl),
            sessionName: sessionNameOf(sl),
            startTime: sl.startTime || (sl.session === 'MORNING' ? '08:00' : '14:00'),
            endTime: sl.endTime || (sl.session === 'MORNING' ? '10:00' : '16:00'),
            courseName: sl.courseName || null,
          };
          let count = defaultPerRoom;
          const cfg = manualRooms.get(r.id);
          if (body.mode === 'MANUAL' && cfg) {
            const sk = sessionKey(session.examDate, session.sessionCode);
            if (cfg.sessions && typeof cfg.sessions[sk] === 'number') count = Math.max(1, cfg.sessions[sk]);
            else if (typeof cfg.defaultCount === 'number') count = Math.max(1, cfg.defaultCount);
            else count = Math.max(1, defaultPerRoom);
          }
          needs.push({ room: r, session, count });
        }
      }
    }

    // Safe fallback only when we could not map any class slots: use list timetable slots for the list's class only
    if (!needs.length && list.examinationTimetable?.slots?.length) {
      const listClassId = list.examinationTimetable.classId;
      for (const r of rooms) {
        const allocClassIds = [...new Set(((r.allocations as any[]) || []).map((a) => a.classId).filter(Boolean))];
        const applies = !allocClassIds.length || allocClassIds.includes(listClassId);
        if (!applies) continue;
        for (const sl of (list.examinationTimetable.slots as any[])) {
          const key = sessionKey(sl.examDate, sessionCodeOf(sl));
          const needKey = `${r.id}|${key}`;
          if (seenNeed.has(needKey)) continue;
          seenNeed.add(needKey);
          needs.push({
            room: r,
            session: {
              examDate: toDateKey(sl.examDate),
              session: sl.session as 'MORNING' | 'AFTERNOON',
              sessionCode: sessionCodeOf(sl),
              sessionName: sessionNameOf(sl),
              startTime: sl.startTime || (sl.session === 'MORNING' ? '08:00' : '14:00'),
              endTime: sl.endTime || (sl.session === 'MORNING' ? '10:00' : '16:00'),
              courseName: sl.courseName || null,
            },
            count: Math.max(1, Number(body.defaultPerRoom || 1)),
          });
        }
      }
    }

    needs.sort((a, b) => a.session.examDate.localeCompare(b.session.examDate) || a.session.startTime.localeCompare(b.session.startTime) || a.room.roomName.localeCompare(b.room.roomName));
    if (!needs.length) {
      const roomClassNames = [...new Set(rooms.flatMap((r: any) => ((r.allocations || []) as any[]).map((a) => a.className).filter(Boolean)))];
      const ttNames = scopeTimetables.map((t: any) => `${t.className}(${(t.slots||[]).length})`).slice(0, 8).join(', ');
      throw new AppError(400, `No exam sessions found for allocated classes in this examination list. Room classes: ${roomClassNames.slice(0,8).join(', ') || 'none'}; Timetables found: ${ttNames || 'none'}. Ensure examination timetables have slots for these classes in the selected exam type.`);
    }

    const rotationMode = body.rotationMode || 'PER_SESSION';
    // teacher load tracking and conflict avoidance per date+session
    const assignedInSlot = new Map<string, Set<string>>(); // slot -> teacherIds
    const otherAssignments = await prisma.examinationInvigilatorAssignment.findMany({
      where: { organizationId, examinationListId: { not: list.id } },
      select: { teacherUserId: true, examDate: true, session: true, sessionCode: true },
    });
    for (const a of otherAssignments) {
      const slot = sessionKey(a.examDate, sessionCodeOf(a));
      if (!assignedInSlot.has(slot)) assignedInSlot.set(slot, new Set());
      assignedInSlot.get(slot)!.add(a.teacherUserId);
    }
    const teacherLoad = new Map<string, number>();
    for (const t of teachers) {
      const load = otherAssignments.reduce((n, a) => n + (a.teacherUserId === t.id ? 1 : 0), 0);
      teacherLoad.set(t.id, load);
    }
    // sticky assignments for NONE/DAILY
    const stickyByRoom = new Map<string, string[]>(); // roomId -> teacherIds
    const stickyByRoomDay = new Map<string, string[]>(); // roomId|date -> teacherIds

    const assignmentsToCreate: any[] = [];
    const unassigned: Array<{ roomName: string; date: string; session: string; sessionCode: string; needed: number; assigned: number }> = [];

    for (const need of needs) {
      const slot = sessionKey(need.session.examDate, need.session.sessionCode);
      if (!assignedInSlot.has(slot)) assignedInSlot.set(slot, new Set());
      const busy = assignedInSlot.get(slot)!;
      const roomDayKey = `${need.room.id}|${need.session.examDate}`;
      let preferred: string[] = [];
      if (rotationMode === 'NONE') preferred = stickyByRoom.get(need.room.id) || [];
      else if (rotationMode === 'DAILY') preferred = stickyByRoomDay.get(roomDayKey) || [];

      let assignedCount = 0;
      const pick = (t: any) => {
        assignmentsToCreate.push({
          organizationId,
          examinationTimetableId: list.examinationTimetableId ?? null,
          examinationListId: list.id,
          examinationCode: list.examinationCode || list.examinationTimetable?.examinationCode || null,
          listCode: list.listCode || null,
          roomId: need.room.id,
          roomName: need.room.roomName,
          roomNumber: need.room.roomNumber ?? null,
          examDate: atNoonUtc(need.session.examDate),
          session: need.session.session,
          sessionCode: need.session.sessionCode,
          sessionName: need.session.sessionName,
          startTime: need.session.startTime ?? null,
          endTime: need.session.endTime ?? null,
          teacherUserId: t.id,
          teacherName: t.name,
          teacherEmail: t.email ?? null,
          assignmentType: body.mode === 'MANUAL' ? 'MANUAL' : 'AUTOMATIC',
          status: 'ASSIGNED',
          updatedAt: new Date(),
        });
        busy.add(t.id);
        teacherLoad.set(t.id, (teacherLoad.get(t.id) || 0) + 1);
        assignedCount += 1;
      };

      // try preferred sticky teachers first (if not busy in this slot)
      for (const tid of preferred) {
        if (assignedCount >= need.count) break;
        if (busy.has(tid)) continue;
        const t = teachers.find((x) => x.id === tid);
        if (t) pick(t);
      }

      const candidates = teachers
        .filter((t) => !busy.has(t.id))
        .sort((a, b) => (teacherLoad.get(a.id)! - teacherLoad.get(b.id)!) || a.name.localeCompare(b.name));
      for (const t of candidates) {
        if (assignedCount >= need.count) break;
        pick(t);
      }

      const assignedIds = assignmentsToCreate.filter((a) => a.roomId === need.room.id && toDateKey(a.examDate) === need.session.examDate && a.sessionCode === need.session.sessionCode).map((a) => a.teacherUserId);
      if (rotationMode === 'NONE') stickyByRoom.set(need.room.id, assignedIds);
      if (rotationMode === 'DAILY') stickyByRoomDay.set(roomDayKey, assignedIds);

      if (assignedCount < need.count) {
        unassigned.push({ roomName: need.room.roomName, date: need.session.examDate, session: need.session.sessionName, sessionCode: need.session.sessionCode, needed: need.count, assigned: assignedCount });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.examinationInvigilatorAssignment.deleteMany({ where: { organizationId, examinationListId: list.id } });
      const chunk = 200;
      for (let i = 0; i < assignmentsToCreate.length; i += chunk) {
        await tx.examinationInvigilatorAssignment.createMany({ data: assignmentsToCreate.slice(i, i + chunk) });
      }
    });

    const results = await prisma.examinationInvigilatorAssignment.findMany({
      where: { organizationId, examinationListId: list.id },
      orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { sessionCode: 'asc' }, { roomName: 'asc' }, { teacherName: 'asc' }],
    });

    return { created: assignmentsToCreate.length, unassigned, assignments: results };
  }

  async listAssignments(organizationId: string, examinationListId: string) {
    return prisma.examinationInvigilatorAssignment.findMany({
      where: { organizationId, examinationListId },
      orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { sessionCode: 'asc' }, { roomName: 'asc' }, { teacherName: 'asc' }],
    });
  }

  async updateAssignment(organizationId: string, id: string, body: { teacherUserId?: string; status?: string; roomId?: string; examDate?: string; session?: 'MORNING' | 'AFTERNOON'; sessionCode?: string }) {
    const existing = await prisma.examinationInvigilatorAssignment.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Assignment not found');
    const list = await prisma.examinationList.findFirst({
      where: { id: existing.examinationListId, organizationId },
      include: { rooms: true, examinationTimetable: { include: { slots: true } } },
    });
    if (!list) throw new AppError(404, 'Examination list not found');

    const targetTeacherId = body.teacherUserId || existing.teacherUserId;
    const targetRoomId = body.roomId || existing.roomId;
    const targetSessionCode = body.sessionCode || body.session || existing.sessionCode;
    const targetDate = body.examDate ? atNoonUtc(body.examDate) : existing.examDate;
    const targetDateKey = toDateKey(targetDate);
    const targetSessionInfo = deriveSessions(list).find((s: any) => s.examDate === targetDateKey && s.sessionCode === targetSessionCode);
    if (!targetSessionInfo) throw new AppError(404, 'Target examination session not found');

    const room = list.rooms.find((r) => r.id === targetRoomId);
    if (!room) throw new AppError(404, 'Room not found');

    const teachers = await getTeachers(organizationId);
    const t = teachers.find((x: any) => x.id === targetTeacherId);
    if (!t) throw new AppError(404, 'Teacher not found');

    const conflict = await prisma.examinationInvigilatorAssignment.findFirst({
      where: {
        organizationId,
        examinationListId: existing.examinationListId,
        examDate: targetDate,
        sessionCode: targetSessionCode,
        teacherUserId: targetTeacherId,
        NOT: { id: existing.id },
      },
    });
    if (conflict) throw new AppError(409, 'Selected teacher is already assigned to another room in this session');

    const dup = await prisma.examinationInvigilatorAssignment.findFirst({
      where: {
        organizationId,
        examinationListId: existing.examinationListId,
        roomId: room.id,
        examDate: targetDate,
        sessionCode: targetSessionCode,
        teacherUserId: targetTeacherId,
        NOT: { id: existing.id },
      },
    });
    if (dup) throw new AppError(409, 'Teacher already assigned to this room/session');

    const data: any = {
      teacherUserId: t.id,
      teacherName: t.name,
      teacherEmail: t.email ?? null,
      roomId: room.id,
      roomName: room.roomName,
      roomNumber: room.roomNumber ?? null,
      examDate: targetDate,
      session: targetSessionInfo.session,
      sessionCode: targetSessionInfo.sessionCode,
      sessionName: targetSessionInfo.sessionName,
      startTime: targetSessionInfo.startTime ?? null,
      endTime: targetSessionInfo.endTime ?? null,
      assignmentType: 'MANUAL',
    };
    if (body.status && ['ASSIGNED', 'PENDING', 'CHECKED_IN', 'REPLACED'].includes(body.status)) data.status = body.status;
    else data.status = 'ASSIGNED';

    return prisma.examinationInvigilatorAssignment.update({ where: { id: existing.id }, data });
  }

  async availableTeachersForSlot(organizationId: string, params: { examinationListId: string; examDate: string; session?: 'MORNING' | 'AFTERNOON'; sessionCode?: string }) {
    const sessionCode = params.sessionCode || params.session;
    if (!params.examinationListId || !params.examDate || !sessionCode) throw new AppError(400, 'examinationListId, examDate and sessionCode are required');
    const date = atNoonUtc(params.examDate);
    const [teachers, busy] = await Promise.all([
      getTeachers(organizationId),
      prisma.examinationInvigilatorAssignment.findMany({
        where: { organizationId, examDate: date, sessionCode },
        select: { teacherUserId: true },
      }),
    ]);
    const busySet = new Set(busy.map((b) => b.teacherUserId));
    return teachers.filter((t: any) => t.active && !busySet.has(t.id)).map((t: any) => ({ id: t.id, name: t.name, email: t.email }));
  }

  async addAssignment(organizationId: string, body: { examinationListId: string; roomId: string; examDate: string; session?: 'MORNING' | 'AFTERNOON'; sessionCode?: string; teacherUserId: string }) {
    const { examinationListId, roomId, examDate, session, sessionCode: requestedSessionCode, teacherUserId } = body || ({} as any);
    const sessionCode = requestedSessionCode || session;
    if (!examinationListId || !roomId || !examDate || !sessionCode || !teacherUserId) throw new AppError(400, 'examinationListId, roomId, examDate, sessionCode and teacherUserId are required');
    const list = await prisma.examinationList.findFirst({
      where: { id: examinationListId, organizationId },
      include: { rooms: true, examinationTimetable: { include: { slots: true } } },
    });
    if (!list) throw new AppError(404, 'Examination list not found');
    if (list.status === 'PUBLISHED') {
      // allow operational assignment updates? keep consistent with update - permit
    }
    const room = list.rooms.find((r) => r.id === roomId);
    if (!room) throw new AppError(404, 'Room not found in this examination list');

    const date = atNoonUtc(examDate);
    const busyAny = await prisma.examinationInvigilatorAssignment.findFirst({
      where: { organizationId, examDate: date, sessionCode, teacherUserId },
    });
    if (busyAny) throw new AppError(409, 'Teacher is already assigned to another room in this session');

    const teachers = await getTeachers(organizationId);
    const teacher = teachers.find((t: any) => t.id === teacherUserId);
    if (!teacher) throw new AppError(404, 'Teacher not found');

    const dup = await prisma.examinationInvigilatorAssignment.findFirst({
      where: { examinationListId, roomId, examDate: date, sessionCode, teacherUserId },
    });
    if (dup) throw new AppError(409, 'Teacher already assigned to this room/session');

    const sessionInfo = deriveSessions(list).find((s: any) => s.examDate === toDateKey(examDate) && s.sessionCode === sessionCode);
    if (!sessionInfo) throw new AppError(404, 'Examination session not found');
    return prisma.examinationInvigilatorAssignment.create({
      data: {
        organizationId,
        examinationTimetableId: list.examinationTimetableId ?? null,
        examinationListId: list.id,
        examinationCode: list.examinationCode || list.examinationTimetable?.examinationCode || null,
        listCode: list.listCode || null,
        roomId: room.id,
        roomName: room.roomName,
        roomNumber: room.roomNumber ?? null,
        examDate: date,
        session: sessionInfo.session,
        sessionCode: sessionInfo.sessionCode,
        sessionName: sessionInfo.sessionName,
        startTime: sessionInfo?.startTime ?? null,
        endTime: sessionInfo?.endTime ?? null,
        teacherUserId: teacher.id,
        teacherName: teacher.name,
        teacherEmail: teacher.email ?? null,
        assignmentType: 'MANUAL',
        status: 'ASSIGNED',
      },
    });
  }

  async clearAssignments(organizationId: string, params: { examinationListId?: string; examinationTypeId?: string }) {
    if (!params.examinationListId && !params.examinationTypeId) throw new AppError(400, 'examinationListId or examinationTypeId is required');
    let where: any = { organizationId };
    if (params.examinationListId) where.examinationListId = params.examinationListId;
    else if (params.examinationTypeId) {
      const lists = await prisma.examinationList.findMany({ where: { organizationId, examinationTypeId: params.examinationTypeId }, select: { id: true } });
      where.examinationListId = { in: lists.map((l) => l.id) };
    }
    const res = await prisma.examinationInvigilatorAssignment.deleteMany({ where });
    return { deleted: res.count };
  }

  async deleteAssignment(organizationId: string, id: string) {
    const existing = await prisma.examinationInvigilatorAssignment.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, 'Assignment not found');
    await prisma.examinationInvigilatorAssignment.delete({ where: { id } });
    return { id };
  }

  async getExamAttendance(organizationId: string, params: { examinationListId: string; roomId: string; examDate: string; session?: 'MORNING'|'AFTERNOON'; sessionCode?: string }) {
    const { examinationListId, roomId, examDate, session: requestedSession, sessionCode: requestedSessionCode } = params;
    if (!examinationListId || !roomId || !examDate || (!requestedSession && !requestedSessionCode)) throw new AppError(400, 'examinationListId, roomId, examDate and sessionCode are required');
    const list = await prisma.examinationList.findFirst({ where: { id: examinationListId, organizationId }, include: { rooms: { include: { allocations: { orderBy: [{ className: 'asc' }, { studentName: 'asc' }] } } }, examinationTimetable: { include: { slots: true } } } });
    if (!list) throw new AppError(404, 'Examination list not found');
    const room = (list.rooms || []).find((r: any) => r.id === roomId);
    if (!room) throw new AppError(404, 'Room not found');
    const dateKey = toDateKey(examDate);
    const timetableSlots = list.examinationTimetable?.slots || [];
    const slot = findSessionSlot(timetableSlots, dateKey, requestedSession, requestedSessionCode);
    if (requestedSessionCode && timetableSlots.some((item: any) => toDateKey(item.examDate) === dateKey) && !slot) {
      throw new AppError(404, 'Examination session not found');
    }
    const sessionCode = requestedSessionCode || (slot ? sessionCodeOf(slot) : requestedSession!);
    const session = slot?.session || requestedSession;
    if (!session) throw new AppError(404, 'Examination session not found');
    const sessionName = slot ? sessionNameOf(slot) : session === 'MORNING' ? 'Morning' : 'Afternoon';
    const startTime = slot?.startTime || (session === 'MORNING' ? '08:00' : '14:00');
    const endTime = slot?.endTime || (session === 'MORNING' ? '10:00' : '16:00');
    const existing = await prisma.examinationAttendance.findMany({ where: { organizationId, examinationListId, roomId, examDate: atNoonUtc(dateKey), sessionCode } });
    const byStudent = new Map(existing.map((r: any) => [r.studentId, r]));
    const students = ((room as any).allocations || []).map((a: any) => {
      const rec = byStudent.get(a.studentId);
      return { studentId: a.studentId, studentCode: a.studentCode || null, studentName: a.studentName, classId: a.classId, className: a.className, status: rec?.status || null, markedAt: rec?.markedAt || null, markedByName: rec?.markedByName || null, notes: rec?.notes || null };
    });
    return { examinationListId, roomId, roomName: room.roomName, roomNumber: (room as any).roomNumber || null, examDate: dateKey, session, sessionCode, sessionName, startTime, endTime, students };
  }

  async markExamAttendance(organizationId: string, actor: { id?: string; name?: string }, body: { examinationListId: string; roomId: string; examDate: string; session?: 'MORNING'|'AFTERNOON'; sessionCode?: string; records: Array<{ studentId: string; status: 'PRESENT'|'ABSENT'|'LATE'|'EXCUSED'; notes?: string }> }) {
    const { examinationListId, roomId, examDate, session: requestedSession, sessionCode: requestedSessionCode, records } = body || ({} as any);
    if (!examinationListId || !roomId || !examDate || (!requestedSession && !requestedSessionCode)) throw new AppError(400, 'examinationListId, roomId, examDate and sessionCode are required');
    if (!Array.isArray(records)) throw new AppError(400, 'records array is required');
    const list = await prisma.examinationList.findFirst({ where: { id: examinationListId, organizationId }, include: { rooms: { include: { allocations: true } }, examinationTimetable: { include: { slots: true } } } });
    if (!list) throw new AppError(404, 'Examination list not found');
    const room = (list.rooms || []).find((r: any) => r.id === roomId);
    if (!room) throw new AppError(404, 'Room not found');
    const dateKey = toDateKey(examDate);
    const timetableSlots = list.examinationTimetable?.slots || [];
    const slot = findSessionSlot(timetableSlots, dateKey, requestedSession, requestedSessionCode);
    if (requestedSessionCode && timetableSlots.some((item: any) => toDateKey(item.examDate) === dateKey) && !slot) {
      throw new AppError(404, 'Examination session not found');
    }
    const sessionCode = requestedSessionCode || (slot ? sessionCodeOf(slot) : requestedSession!);
    const session = slot?.session || requestedSession;
    if (!session) throw new AppError(404, 'Examination session not found');
    const sessionName = slot ? sessionNameOf(slot) : session === 'MORNING' ? 'Morning' : 'Afternoon';
    const startTime = slot?.startTime || (session === 'MORNING' ? '08:00' : '14:00');
    const endTime = slot?.endTime || (session === 'MORNING' ? '10:00' : '16:00');
    // enforce time window on exam date
    const now = new Date();
    const nowKeyDate = toDateKey(now);
    const [sh, sm] = String(startTime).split(':').map(Number);
    const [eh, em] = String(endTime).split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = (sh||0)*60 + (sm||0);
    const endMins = (eh||0)*60 + (em||0);
    if (nowKeyDate !== dateKey || nowMins < startMins || nowMins > endMins) {
      throw new AppError(400, `Attendance can only be marked during the exam time window (${dateKey} ${startTime}-${endTime})`);
    }
    const allowed = new Set(((room as any).allocations || []).map((a: any) => a.studentId));
    const nowDate = new Date();
    const ops = [] as any[];
    for (const rec of records) {
      if (!allowed.has(rec.studentId)) continue;
      const alloc = ((room as any).allocations || []).find((a: any) => a.studentId === rec.studentId);
      const status = ['PRESENT','ABSENT','LATE','EXCUSED'].includes(rec.status) ? rec.status : 'PRESENT';
      ops.push(prisma.examinationAttendance.upsert({
        where: { examinationListId_roomId_examDate_sessionCode_studentId: { examinationListId, roomId, examDate: atNoonUtc(dateKey), sessionCode, studentId: rec.studentId } },
        update: { status: status as any, sessionName, notes: rec.notes || null, markedByUserId: actor?.id || null, markedByName: actor?.name || null, markedAt: nowDate },
        create: { organizationId, examinationListId, roomId, studentId: rec.studentId, studentCode: alloc?.studentCode || null, studentName: alloc?.studentName || 'Student', classId: alloc?.classId || null, className: alloc?.className || null, examDate: atNoonUtc(dateKey), session, sessionCode, sessionName, status: status as any, markedByUserId: actor?.id || null, markedByName: actor?.name || null, markedAt: nowDate, notes: rec.notes || null },
      }));
    }
    if (ops.length) await prisma.$transaction(ops);
    return this.getExamAttendance(organizationId, { examinationListId, roomId, examDate: dateKey, session, sessionCode });
  }

  async listExamAttendance(organizationId: string, query: any = {}) {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10) || 20));
    const where: any = { organizationId };
    if (query.term) where.examinationList = { ...(where.examinationList || {}), term: String(query.term) };
    if (query.academicYear) where.examinationList = { ...(where.examinationList || {}), academicYear: String(query.academicYear) };
    if (query.examinationTypeId) where.examinationList = { ...(where.examinationList || {}), examinationTypeId: String(query.examinationTypeId) };
    if (query.roomId) where.roomId = String(query.roomId);
    if (query.classId) where.classId = String(query.classId);
    if (query.className) where.className = { contains: String(query.className), mode: 'insensitive' };
    if (query.stream) where.className = { contains: String(query.stream), mode: 'insensitive' };
    if (query.status && ['PRESENT','ABSENT','LATE','EXCUSED'].includes(String(query.status))) where.status = String(query.status);
    if (query.search) {
      const q = String(query.search).trim();
      if (q) where.OR = [
        { studentName: { contains: q, mode: 'insensitive' } },
        { studentCode: { contains: q, mode: 'insensitive' } },
        { className: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query.examDate) where.examDate = atNoonUtc(toDateKey(query.examDate));
    if (query.sessionCode) where.sessionCode = String(query.sessionCode);
    else if (query.session && ['MORNING','AFTERNOON'].includes(String(query.session))) where.session = String(query.session);

    const [total, rows, grouped, roomRows, classRows] = await Promise.all([
      prisma.examinationAttendance.count({ where }),
      prisma.examinationAttendance.findMany({
        where,
        include: {
          room: { select: { id: true, roomName: true, roomNumber: true } },
          examinationList: { select: { id: true, listCode: true, examinationName: true, academicYear: true, term: true, examinationTypeId: true, examinationType: { select: { id: true, name: true } } } },
        },
        orderBy: [{ examDate: 'desc' }, { sessionCode: 'asc' }, { className: 'asc' }, { studentName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.examinationAttendance.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.examinationListRoom.findMany({ where: { list: { organizationId } }, select: { id: true, roomName: true, roomNumber: true, list: { select: { academicYear: true, term: true, examinationTypeId: true } } }, orderBy: { roomName: 'asc' } }),
      prisma.examinationListClass.findMany({ where: { list: { organizationId } }, select: { classId: true, className: true, list: { select: { academicYear: true, term: true, examinationTypeId: true } } }, orderBy: { className: 'asc' } }),
    ]);

    const stats = { total: 0, present: 0, absent: 0, late: 0, excused: 0 };
    for (const g of grouped as any[]) {
      const c = g._count?._all || 0;
      stats.total += c;
      if (g.status === 'PRESENT') stats.present = c;
      if (g.status === 'ABSENT') stats.absent = c;
      if (g.status === 'LATE') stats.late = c;
      if (g.status === 'EXCUSED') stats.excused = c;
    }
    // dedupe filter options
    const roomMap = new Map<string, any>();
    for (const r of roomRows as any[]) {
      if (!roomMap.has(r.id)) roomMap.set(r.id, { id: r.id, roomName: r.roomName, roomNumber: r.roomNumber });
    }
    const classMap = new Map<string, any>();
    for (const c of classRows as any[]) {
      const k = c.classId || c.className;
      if (!classMap.has(k)) classMap.set(k, { id: c.classId, name: c.className });
    }

    return {
      rows,
      stats,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      filters: { rooms: [...roomMap.values()], classes: [...classMap.values()] },
    };
  }

  async teacherAssignments(organizationId: string, teacherUserId: string, query?: { date?: string; examinationListId?: string }) {
    const where: any = { organizationId, teacherUserId };
    if (query?.examinationListId) where.examinationListId = query.examinationListId;
    if (query?.date) {
      const d = toDateKey(query.date);
      where.examDate = atNoonUtc(d);
    }
    const rows = await prisma.examinationInvigilatorAssignment.findMany({
      where,
      include: {
        examinationList: {
          include: {
            rooms: { include: { allocations: { orderBy: [{ className: 'asc' }, { studentName: 'asc' }] } } },
            examinationTimetable: { include: { slots: true } },
          },
        },
        room: { include: { allocations: { orderBy: [{ className: 'asc' }, { studentName: 'asc' }] } } },
      },
      orderBy: [{ examDate: 'asc' }, { session: 'asc' }, { roomName: 'asc' }],
    });
    if (!rows.length) return rows;
    const or = rows.map((r) => ({
      examinationListId: r.examinationListId,
      roomId: r.roomId,
      examDate: r.examDate,
      sessionCode: r.sessionCode,
    }));
    const siblings = await prisma.examinationInvigilatorAssignment.findMany({
      where: { organizationId, OR: or },
      select: { id: true, examinationListId: true, roomId: true, examDate: true, session: true, sessionCode: true, sessionName: true, teacherUserId: true, teacherName: true, teacherEmail: true, status: true },
    });
    const sibMap = new Map<string, typeof siblings>();
    for (const s of siblings) {
      const k = `${s.examinationListId}|${s.roomId}|${toDateKey(s.examDate)}|${s.sessionCode}`;
      if (!sibMap.has(k)) sibMap.set(k, [] as any);
      sibMap.get(k)!.push(s);
    }

    // Resolve exam slots per assignment for all classes in the room (handles multi-class/type-wide lists).
    const listCtx = new Map<string, { year: string; term: string; examTypeId: string | null }>();
    for (const r of rows) {
      const l: any = r.examinationList;
      if (l?.id) listCtx.set(l.id, { year: l.academicYear, term: l.term, examTypeId: l.examinationTypeId || null });
    }
    const ctxKeys = [...new Set([...listCtx.values()].map((c) => `${c.year}|||${c.term}|||${c.examTypeId || ''}`))];
    const timetableRows: any[] = [];
    for (const ck of ctxKeys) {
      const [year, term, examTypeId] = ck.split('|||');
      const whereT: any = { organizationId, academicYear: year, term };
      if (examTypeId) whereT.examinationTypeId = examTypeId;
      const tts = await prisma.classExaminationTimetable.findMany({
        where: whereT,
        include: { slots: true },
      });
      timetableRows.push(...tts);
    }

    const norm = (v: any) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const base = (v: any) => norm(v).replace(/\s+[a-z0-9]+$/i, '').trim();

    return rows.map((r) => {
      const k = `${r.examinationListId}|${r.roomId}|${toDateKey(r.examDate)}|${r.sessionCode}`;
      const dk = toDateKey(r.examDate);
      const roomAlloc = (r.room?.allocations || (r.examinationList as any)?.rooms?.find((rm: any) => rm.id === r.roomId)?.allocations || []) as any[];
      const classKeys = [...new Set(roomAlloc.map((a) => `${a.classId || ''}|||${a.className || ''}`))];
      const ctx = listCtx.get(r.examinationListId);
      const relevantSlots = timetableRows
        .filter((t) => !ctx || (t.academicYear === ctx.year && t.term === ctx.term && (!ctx.examTypeId || t.examinationTypeId === ctx.examTypeId)))
        .flatMap((t) => (t.slots || []).map((sl: any) => ({ ...sl, __ttClassId: t.classId, __ttClassName: t.className })))
        .filter((sl: any) => toDateKey(sl.examDate) === dk && sessionCodeOf(sl) === r.sessionCode);

      const examSlots = classKeys.map((ck) => {
        const [classId, className] = ck.split('|||');
        const cn = norm(className); const cb = base(className);
        const match = relevantSlots.find((sl: any) => {
          const sn = norm(sl.className || sl.__ttClassName);
          const sb = base(sl.className || sl.__ttClassName);
          const sid = sl.classId || sl.__ttClassId;
          return (classId && sid && classId === sid) || (cn && (sn === cn || sn === cb || sb === cb || sb === cn));
        }) || (relevantSlots.length === 1 ? relevantSlots[0] : null);
        return {
          classId: classId || null,
          className: className || null,
          courseName: match?.courseName || null,
          startTime: match?.startTime || r.startTime || null,
          endTime: match?.endTime || r.endTime || null,
        };
      });

      return { ...r, sessionName: r.sessionName || (r.session === 'MORNING' ? 'Morning' : 'Afternoon'), coInvigilators: sibMap.get(k) || [], examSlots };
    });
  }
}

export const examinationInvigilatorService = new ExaminationInvigilatorService();
