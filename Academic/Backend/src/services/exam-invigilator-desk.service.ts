import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
  fetchIamOrgUsers,
  provisionInvigilatorAccount,
  type IamOrgUser,
} from '../clients/iam.client';
import { examPlanningService } from './exam-planning.service';
import { lookupExamEligibility } from '../clients/school-fees.client';

function calendarKey(value: Date | string) {
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(value);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function normName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function teacherSlug(name: string) {
  return `t-${name.toLowerCase().replace(/\s+/g, '-')}`;
}

function decodeStudentCode(raw: string) {
  const trimmed = raw.trim();
  try {
    const asUrl = /^https?:\/\//i.test(trimmed)
      ? new URL(trimmed)
      : trimmed.startsWith('/v/')
        ? new URL(trimmed, 'http://localhost')
        : null;
    if (asUrl) {
      const parts = asUrl.pathname.split('/').filter(Boolean);
      const vIdx = parts.findIndex((p) => p.toLowerCase() === 'v');
      if (vIdx >= 0 && parts[vIdx + 1]) return decodeURIComponent(parts[vIdx + 1]);
      const code = asUrl.searchParams.get('code') || asUrl.searchParams.get('uid');
      if (code) return code.trim();
      return decodeURIComponent(parts[parts.length - 1] || trimmed);
    }
  } catch {
    /* plain code */
  }
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    if (parts[0]?.toUpperCase() === 'EXAM' && parts[3]) return parts[3].trim();
    return (parts[3] || parts[parts.length - 1] || trimmed).trim();
  }
  return trimmed;
}

function rwandaDateTime(date: string, time: string) {
  const t = (time || '00:00').length === 5 ? `${time}:00` : time || '00:00:00';
  return new Date(`${date}T${t}+02:00`);
}

function examPhase(date: string, startTime: string, endTime: string): 'UPCOMING' | 'LIVE' | 'COMPLETED' {
  const now = Date.now();
  const start = rwandaDateTime(date, startTime).getTime();
  const end = rwandaDateTime(date, endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'UPCOMING';
  if (now < start) return 'UPCOMING';
  if (now > end) return 'COMPLETED';
  return 'LIVE';
}

export type DeskActor = {
  sub: string;
  email?: string;
  roles?: string[];
};

function actorMatchesDuty(
  duty: { invigilatorId: string; invigilatorName: string; userId?: string | null; email?: string | null },
  actor: DeskActor,
  actorName: string,
  staffIds: Set<string>,
) {
  if (duty.userId && duty.userId === actor.sub) return true;
  if (duty.invigilatorId === actor.sub || duty.invigilatorId === `user:${actor.sub}`) return true;
  if (staffIds.has(duty.invigilatorId)) return true;
  if (actor.email && duty.email && duty.email.toLowerCase() === actor.email.toLowerCase()) return true;
  if (actorName && duty.invigilatorId === teacherSlug(actorName)) return true;
  if (actorName && normName(duty.invigilatorName) === normName(actorName)) return true;
  return false;
}

export const examInvigilatorDeskService = {
  async listOrgUsers(organizationId: string) {
    return fetchIamOrgUsers(organizationId);
  },

  async listStaff(organizationId: string) {
    return prisma.examInvigilatorStaff.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  },

  async addStaff(
    organizationId: string,
    actorId: string | undefined,
    body: {
      name: string;
      email?: string;
      password?: string;
      existingUserId?: string;
      phone?: string;
    },
  ) {
    const name = body.name?.trim();
    if (!name) throw new AppError(400, 'Invigilator name is required');
    const email = body.email?.trim().toLowerCase() || undefined;
    if (!body.existingUserId && !email) {
      throw new AppError(400, 'Select an existing organization user or enter a login email');
    }

    const users = await fetchIamOrgUsers(organizationId);
    const existingUser =
      (body.existingUserId ? users.find((u) => u.id === body.existingUserId) : undefined) ||
      (email ? users.find((u) => u.email.toLowerCase() === email) : undefined);
    const isTeacher = /^teacher$/i.test((existingUser?.position ?? '').trim());

    let account: { userId: string; email: string; created: boolean; existing: boolean; name: string } | null = null;
    if (existingUser && isTeacher) {
      account = {
        userId: existingUser.id,
        created: false,
        existing: true,
        email: existingUser.email,
        name: existingUser.name,
      };
    } else if (body.existingUserId || email) {
      try {
        account = await provisionInvigilatorAccount(organizationId, actorId, {
          fullName: existingUser?.name || name,
          email: existingUser?.email || email,
          password: body.password,
          existingUserId: existingUser?.id || body.existingUserId,
          requirePasswordChange: true,
        });
      } catch (err) {
        const fallbackId = existingUser?.id || body.existingUserId;
        if (!fallbackId) throw err;
        account = {
          userId: fallbackId,
          created: false,
          existing: true,
          email: existingUser?.email || email || '',
          name: existingUser?.name || name,
        };
      }
    }

    const userId = account?.userId || existingUser?.id || null;
    const resolvedEmail = account?.email || existingUser?.email || email || null;
    const resolvedName = account?.name || existingUser?.name || name;

    const already = userId
      ? await prisma.examInvigilatorStaff.findFirst({ where: { organizationId, userId } })
      : resolvedEmail
        ? await prisma.examInvigilatorStaff.findFirst({ where: { organizationId, email: resolvedEmail } })
        : await prisma.examInvigilatorStaff.findFirst({
            where: { organizationId, name: { equals: resolvedName, mode: 'insensitive' } },
          });
    const source = isTeacher || already?.source === 'TEACHER' ? 'TEACHER' : existingUser || account?.existing ? 'USER' : 'STAFF';

    const row = already
      ? await prisma.examInvigilatorStaff.update({
          where: { id: already.id },
          data: {
            name: resolvedName,
            email: resolvedEmail,
            userId,
            phone: body.phone?.trim() || already.phone,
            source: already.source === 'TEACHER' ? 'TEACHER' : source,
            hasAccount: Boolean(userId),
          },
        })
      : await prisma.examInvigilatorStaff.create({
          data: {
            organizationId,
            name: resolvedName,
            email: resolvedEmail,
            userId,
            phone: body.phone?.trim() || null,
            source,
            hasAccount: Boolean(userId),
          },
        });

    return {
      staff: row,
      account: account
        ? { created: account.created, existing: account.existing, email: account.email, userId: account.userId }
        : userId
          ? { created: false, existing: true, email: resolvedEmail, userId }
          : null,
    };
  },

  async myDesk(organizationId: string, actor: DeskActor) {
    const [users, staff] = await Promise.all([
      fetchIamOrgUsers(organizationId),
      prisma.examInvigilatorStaff.findMany({ where: { organizationId } }),
    ]);
    const me = users.find((u) => u.id === actor.sub);
    const actorName = me?.name || '';
    const myStaff = staff.filter(
      (s) => s.userId === actor.sub || (actor.email && s.email && s.email.toLowerCase() === actor.email.toLowerCase()),
    );
    const staffIds = new Set(myStaff.map((s) => s.id).concat(myStaff.map((s) => `staff-${s.id}`)));

    const duties = await prisma.examInvigilatorDuty.findMany({
      where: { organizationId },
      include: {
        session: { select: { id: true, name: true, status: true, academicYear: true, term: true } },
        schedule: true,
      },
      orderBy: [{ examDate: 'asc' }, { slotCode: 'asc' }],
    });
    const mine = duties.filter((d) => actorMatchesDuty(d, actor, actorName, staffIds));

    const rooms = new Map<string, {
      key: string;
      sessionId: string;
      sessionName: string;
      sessionStatus: string;
      academicYear: string;
      term: string;
      examDate: string;
      slotCode: string;
      startTime: string;
      endTime: string;
      roomName: string;
      subjectName: string;
      classNames: string[];
      dutyIds: string[];
      scheduleIds: string[];
    }>();

    for (const duty of mine) {
      const date = calendarKey(duty.examDate);
      const key = `${duty.sessionId}|${date}|${duty.slotCode}|${duty.roomName}`;
      const cur = rooms.get(key) ?? {
        key,
        sessionId: duty.sessionId,
        sessionName: duty.session.name,
        sessionStatus: duty.session.status,
        academicYear: duty.session.academicYear,
        term: duty.session.term,
        examDate: date,
        slotCode: duty.slotCode,
        startTime: duty.schedule?.startTime || '',
        endTime: duty.schedule?.endTime || '',
        roomName: duty.roomName,
        subjectName: duty.schedule?.subjectName || '',
        classNames: [] as string[],
        dutyIds: [] as string[],
        scheduleIds: [] as string[],
      };
      if (duty.schedule?.className && !cur.classNames.includes(duty.schedule.className)) {
        cur.classNames.push(duty.schedule.className);
      }
      if (duty.schedule?.subjectName && !cur.subjectName) cur.subjectName = duty.schedule.subjectName;
      if (duty.scheduleId && !cur.scheduleIds.includes(duty.scheduleId)) cur.scheduleIds.push(duty.scheduleId);
      cur.dutyIds.push(duty.id);
      rooms.set(key, cur);
    }

    const assigned = [...rooms.values()];
    const studentCounts = await Promise.all(
      assigned.map(async (room) => {
        const seats = await prisma.examSeat.findMany({
          where: { organizationId, sessionId: room.sessionId, roomName: room.roomName },
          select: { studentId: true, schedule: { select: { examDate: true, slotCode: true } } },
        });
        return new Set(
          seats
            .filter((s) => calendarKey(s.schedule.examDate) === room.examDate && s.schedule.slotCode === room.slotCode)
            .map((s) => s.studentId),
        ).size;
      }),
    );

    return {
      actor: { userId: actor.sub, email: actor.email || me?.email || null, name: actorName || myStaff[0]?.name || actor.email || 'Invigilator' },
      organizationName: (await prisma.tenant.findFirst({ where: { organizationId, status: 'ACTIVE' } }))?.organizationName ?? 'School',
      rooms: assigned.map((room, i) => ({
        ...room,
        studentCount: studentCounts[i] ?? 0,
        examPhase: examPhase(room.examDate, room.startTime, room.endTime),
      })),
    };
  },

  async roomRoster(
    organizationId: string,
    actor: DeskActor,
    query: { sessionId?: string; roomName: string; examDate?: string; slotCode?: string },
  ) {
    const desk = await this.myDesk(organizationId, actor);
    const room = desk.rooms.find((r) =>
      r.roomName === query.roomName
      && (!query.sessionId || r.sessionId === query.sessionId)
      && (!query.examDate || r.examDate === query.examDate)
      && (!query.slotCode || r.slotCode === query.slotCode),
    );
    if (!room) throw new AppError(403, 'You are not assigned to invigilate this room');

    const seats = await prisma.examSeat.findMany({
      where: {
        organizationId,
        sessionId: room.sessionId,
        roomName: room.roomName,
      },
      include: { schedule: true },
      orderBy: [{ seatCode: 'asc' }, { fullName: 'asc' }],
    });
    const matchedSeats = seats.filter(
      (seat) => calendarKey(seat.schedule.examDate) === room.examDate && seat.schedule.slotCode === room.slotCode,
    );

    const unique = new Map<string, (typeof matchedSeats)[number]>();
    for (const seat of matchedSeats) {
      if (!unique.has(seat.studentId)) unique.set(seat.studentId, seat);
    }
    const students = [...unique.values()];
    const scheduleIds = [...new Set(students.map((s) => s.scheduleId))];
    const studentIds = students.map((s) => s.studentId);
    const attendances = studentIds.length
      ? await prisma.examAttendance.findMany({
          where: { organizationId, sessionId: room.sessionId, studentId: { in: studentIds } },
        })
      : [];
    const attendanceByStudent = new Map<string, (typeof attendances)[number]>();
    for (const row of attendances) {
      if (scheduleIds.includes(row.scheduleId) || row.roomName === room.roomName) {
        const prev = attendanceByStudent.get(row.studentId);
        if (!prev || (row.checkInAt && !prev.checkInAt)) attendanceByStudent.set(row.studentId, row);
      }
    }

    const codes = students.map((s) => s.studentCode).filter(Boolean);
    const ids = students.map((s) => s.studentId);
    const photos = ids.length || codes.length
      ? await prisma.student.findMany({
          where: {
            organizationId,
            OR: [
              ...(ids.length ? [{ id: { in: ids } }] : []),
              ...(codes.length ? [{ studentUid: { in: codes } }, { studentCode: { in: codes } }] : []),
            ],
          },
          select: { id: true, studentUid: true, studentCode: true, studentPhoto: true },
        })
      : [];
    const photoOf = (studentId: string, studentCode: string) =>
      photos.find((p) => p.id === studentId || p.studentUid === studentCode || p.studentCode === studentCode)?.studentPhoto ?? null;

    const classNames = [...new Set(students.map((s) => s.className).filter(Boolean))];
    const lists = await Promise.all(
      classNames.map((className) =>
        lookupExamEligibility({
          organizationId,
          academicYear: room.academicYear,
          term: room.term,
          className,
        }),
      ),
    );
    const byStudent = new Map<string, { allowed: boolean; status: string; financialStatus?: string; balance?: number; reason?: string | null }>();
    for (const list of lists) {
      for (const row of list.students ?? []) {
        byStudent.set(row.studentId, row);
        byStudent.set(row.studentCode.toLowerCase(), row);
      }
    }

    return {
      room: { ...room, examPhase: examPhase(room.examDate, room.startTime, room.endTime) },
      students: students.map((seat) => {
        const att = attendanceByStudent.get(seat.studentId);
        const eligibility = byStudent.get(seat.studentId) || byStudent.get(seat.studentCode.toLowerCase());
        const allowed = eligibility ? eligibility.allowed : true;
        return {
          studentId: seat.studentId,
          studentCode: seat.studentCode,
          fullName: seat.fullName,
          className: seat.className,
          roomName: seat.roomName,
          seatCode: seat.seatCode,
          scheduleId: seat.scheduleId,
          subjectName: seat.schedule.subjectName,
          photoUrl: photoOf(seat.studentId, seat.studentCode),
          status: att?.status ?? 'NOT_ARRIVED',
          checkInAt: att?.checkInAt ?? null,
          submitAt: att?.submitAt ?? null,
          exitAt: att?.exitAt ?? null,
          method: att?.method ?? null,
          examAllowed: allowed,
          examDecision: eligibility?.status ?? (allowed ? 'NO_LIST' : 'NOT_ALLOWED'),
          financialStatus: eligibility?.financialStatus ?? null,
          feeBalance: eligibility?.balance ?? null,
          exceptionReason: eligibility?.reason ?? null,
        };
      }),
    };
  },

  async markEntry(
    organizationId: string,
    actor: DeskActor,
    body: { studentCode?: string; studentId?: string; roomName: string; sessionId?: string; examDate?: string; slotCode?: string; method?: 'MANUAL' | 'QR' | 'RFID' },
  ) {
    const code = body.studentCode ? decodeStudentCode(body.studentCode) : undefined;
    const roster = await this.roomRoster(organizationId, actor, {
      sessionId: body.sessionId,
      roomName: body.roomName,
      examDate: body.examDate,
      slotCode: body.slotCode,
    });
    const phase = examPhase(roster.room.examDate, roster.room.startTime, roster.room.endTime);
    if (phase === 'UPCOMING') {
      throw new AppError(403, `Attendance opens when the exam starts at ${roster.room.startTime}.`);
    }
    if (phase === 'COMPLETED') {
      throw new AppError(403, 'QR attendance is closed. This examination has ended.');
    }

    const academic = code || body.studentId
      ? await prisma.student.findFirst({
          where: {
            organizationId,
            OR: [
              body.studentId ? { id: body.studentId } : undefined,
              code ? { id: code } : undefined,
              code ? { studentUid: { equals: code, mode: 'insensitive' } } : undefined,
              code ? { studentCode: { equals: code, mode: 'insensitive' } } : undefined,
              code ? { rfidUid: { equals: code, mode: 'insensitive' } } : undefined,
            ].filter(Boolean) as object[],
          },
          select: { id: true, studentUid: true, studentCode: true },
        })
      : null;

    const aliases = new Set(
      [body.studentId, code, academic?.id, academic?.studentUid, academic?.studentCode]
        .filter(Boolean)
        .map((v) => String(v).trim().toLowerCase()),
    );
    if (!aliases.size) throw new AppError(400, 'Scan a student smart card or enter a student code');
    const student = roster.students.find((s) =>
      aliases.has(s.studentId.toLowerCase()) || aliases.has(s.studentCode.toLowerCase()),
    );
    if (!student) {
      const elsewhere = await prisma.examSeat.findFirst({
        where: {
          organizationId,
          sessionId: roster.room.sessionId,
          OR: [...aliases].flatMap((alias) => [{ studentCode: { equals: alias, mode: 'insensitive' } }, { studentId: alias }]),
        },
      });
      if (elsewhere && elsewhere.roomName !== roster.room.roomName) {
        throw new AppError(409, `Student Not Assigned to This Room. ${elsewhere.fullName} is assigned to ${elsewhere.roomName}. This student cannot be marked present in ${roster.room.roomName}.`);
      }
      throw new AppError(404, 'Student is not seated in your assigned exam room');
    }
    return examPlanningService.checkIn(organizationId, actor.sub, {
      scheduleId: student.scheduleId,
      studentId: student.studentId,
      studentCode: student.studentCode,
      roomName: roster.room.roomName,
      method: body.method ?? 'MANUAL',
    });
  },

  async markExit(
    organizationId: string,
    actor: DeskActor,
    body: { studentCode?: string; studentId?: string; roomName: string; sessionId?: string; examDate?: string; slotCode?: string; method?: 'MANUAL' | 'QR' | 'RFID' },
  ) {
    const code = body.studentCode ? decodeStudentCode(body.studentCode) : undefined;
    const roster = await this.roomRoster(organizationId, actor, {
      sessionId: body.sessionId,
      roomName: body.roomName,
      examDate: body.examDate,
      slotCode: body.slotCode,
    });
    const student = roster.students.find(
      (s) => s.studentId === body.studentId || s.studentCode === code || s.studentId === code,
    );
    if (!student) throw new AppError(404, 'Student is not seated in your assigned exam room');
    return examPlanningService.markExit(organizationId, actor.sub, {
      scheduleId: student.scheduleId,
      studentId: student.studentId,
      studentCode: student.studentCode,
      allowWithoutSubmit: true,
      method: body.method ?? 'MANUAL',
    });
  },

  async allocatedLists(organizationId: string, actor: DeskActor) {
    const desk = await this.myDesk(organizationId, actor);
    const rooms = await Promise.all(
      desk.rooms.map(async (room) => {
        const roster = await this.roomRoster(organizationId, actor, {
          sessionId: room.sessionId,
          roomName: room.roomName,
          examDate: room.examDate,
          slotCode: room.slotCode,
        });
        return {
          room: roster.room,
          students: roster.students,
          allowed: roster.students.filter((s) => s.examAllowed !== false).length,
          blocked: roster.students.filter((s) => s.examAllowed === false).length,
        };
      }),
    );
    return { actor: desk.actor, rooms };
  },

  async checkCardEligibility(
    organizationId: string,
    actor: DeskActor,
    body: { studentCode?: string; academicYear?: string; term?: string },
  ) {
    const raw = String(body.studentCode ?? '').trim();
    if (!raw) throw new AppError(400, 'Scan a student smart card or enter a student code');
    const studentCode = decodeStudentCode(raw);
    const academic = await prisma.student.findFirst({
      where: {
        organizationId,
        OR: [
          { id: studentCode },
          { studentUid: { equals: studentCode, mode: 'insensitive' } },
          { studentCode: { equals: studentCode, mode: 'insensitive' } },
          { rfidUid: { equals: studentCode, mode: 'insensitive' } },
        ],
      },
      select: { id: true, studentUid: true, studentCode: true },
    });
    const aliases = new Set(
      [studentCode, academic?.id, academic?.studentUid, academic?.studentCode]
        .filter(Boolean)
        .map((v) => String(v).trim().toLowerCase()),
    );
    const lists = await this.allocatedLists(organizationId, actor);
    let seated: {
      studentId: string;
      studentCode: string;
      fullName: string;
      className: string;
      roomName: string;
      examAllowed?: boolean;
      examDecision?: string;
      financialStatus?: string | null;
      feeBalance?: number | null;
      exceptionReason?: string | null;
    } | null = null;
    let seatedRoom: (typeof lists.rooms)[number]['room'] | null = null;
    for (const row of lists.rooms) {
      const match = row.students.find(
        (s) =>
          aliases.has(s.studentCode.toLowerCase())
          || aliases.has(s.studentId.toLowerCase()),
      );
      if (match) {
        seated = match;
        seatedRoom = row.room;
        break;
      }
    }
    if (!seated || !seatedRoom) {
      throw new AppError(403, 'This student is not on your allocated examination room lists.');
    }

    const eligibility = await lookupExamEligibility({
      organizationId,
      studentCode: seated.studentCode,
      studentId: seated.studentId,
      academicYear: body.academicYear || seatedRoom.academicYear,
      term: body.term || seatedRoom.term,
      className: seated.className,
    });

    return {
      ...eligibility,
      studentCode: seated.studentCode,
      studentName: eligibility.studentName || seated.fullName,
      className: eligibility.className || seated.className,
      roomName: seated.roomName,
      subjectName: seatedRoom.subjectName,
      academicYear: seatedRoom.academicYear,
      term: seatedRoom.term,
      examAllowed: seated.examAllowed,
      examDecision: seated.examDecision,
    };
  },
};

export type { IamOrgUser };
