import { prisma } from '../config/database';
import { listAttendanceRecordsSafe, type AttendanceModuleRecord } from '../clients/attendance-module.client';
import {
  smartAccessModuleClient,
  type SmartAccessStaff,
  type SmartAccessStudent,
} from '../clients/smart-access-module.client';
import { listIamUsersForSmartAccess } from './smart-access-iam-users.service';
import { RepresentativeAssignmentStatus } from '../generated/prisma';
import { mergeStaffLists, staffSourceLabel } from './smart-access-staff-merge';

export type GatePersonRow = {
  id: string;
  organizationId: string;
  schoolName: string;
  personKind: 'student' | 'staff';
  personName: string;
  personCode: string;
  classOrRole: string | null;
  source: string | null;
  morningEntry: string | null;
  morningGate: string | null;
  eveningExit: string | null;
  eveningGate: string | null;
  scanMethod: string | null;
  todayStatus: 'present' | 'partial' | 'absent';
};

function legacyModuleSlugs(modules: unknown): string[] {
  if (!Array.isArray(modules)) return [];
  return modules.map((m) => String(m).trim().toLowerCase());
}

async function resolveModuleForOrg(organizationId: string, slug: string) {
  const mod = await prisma.platformModule.findUnique({ where: { slug } });
  if (!mod) {
    return { canUse: false, reason: `${slug} is not registered in the platform catalog` };
  }

  const assignment = await prisma.organizationModule.findFirst({
    where: { organizationId, moduleId: mod.id },
  });

  if (assignment) {
    if (assignment.status === 'ACTIVE') {
      return { canUse: true, reason: 'Active in Module Catalog' };
    }
    if (assignment.status === 'PENDING') {
      return {
        canUse: false,
        reason: 'Assigned but not activated yet (PENDING — Super Admin must activate)',
      };
    }
    if (assignment.status === 'SUSPENDED') {
      return { canUse: false, reason: 'Module is deactivated (SUSPENDED)' };
    }
    return { canUse: false, reason: `Module assignment status: ${assignment.status}` };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { modules: true },
  });
  const legacy = legacyModuleSlugs(org?.modules);
  const normalized = slug.toLowerCase();
  if (legacy.some((s) => s === normalized || s.replace(/_/g, '-') === normalized)) {
    return { canUse: true, reason: 'Enabled via organization modules (legacy)' };
  }

  return { canUse: false, reason: 'Not assigned to this school in Module Catalog' };
}

async function orgHasActiveModule(organizationId: string, slug: string) {
  const resolved = await resolveModuleForOrg(organizationId, slug);
  return resolved.canUse;
}

async function fetchStudentsForOrg(organizationId: string, search?: string) {
  const access = await resolveModuleForOrg(organizationId, 'student-management');
  try {
    const rows = await smartAccessModuleClient.listStudents(organizationId, { search });
    return {
      rows,
      access: { ok: true as const, reason: access.canUse ? access.reason : 'Live API returned student data' },
    };
  } catch (e) {
    const apiMsg = e instanceof Error ? e.message : 'Student Management API unreachable';
    return {
      rows: [] as SmartAccessStudent[],
      access: { ok: false as const, reason: access.canUse ? apiMsg : `${access.reason}. ${apiMsg}` },
    };
  }
}

function formatTime(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isStaffRecord(record: AttendanceModuleRecord) {
  return Boolean(record.notes?.includes('owner:staff'));
}

function indexRecordsByCode(records: AttendanceModuleRecord[]) {
  const map = new Map<string, AttendanceModuleRecord>();
  for (const r of records) {
    const key = (r.studentCode ?? r.studentId ?? '').trim().toLowerCase();
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, r);
      continue;
    }
    if (!existing.entryTime && r.entryTime) existing.entryTime = r.entryTime;
    if (!existing.exitTime && r.exitTime) existing.exitTime = r.exitTime;
    if (!existing.gateName && r.gateName) existing.gateName = r.gateName;
  }
  return map;
}

async function listStaffForOrg(organizationId: string, search?: string) {
  const hasHr = await orgHasActiveModule(organizationId, 'hr');
  const hasTimetable = await orgHasActiveModule(organizationId, 'timetable');
  const [hrRows, iamRows, timetableRows] = await Promise.all([
    hasHr ? smartAccessModuleClient.listStaffFromHr(organizationId, { search }) : Promise.resolve([]),
    listIamUsersForSmartAccess(organizationId, { search }),
    hasTimetable
      ? smartAccessModuleClient.listStaffFromTimetable(organizationId, { search })
      : Promise.resolve([]),
  ]);
  return { staff: mergeStaffLists(hrRows, iamRows, timetableRows, search), hasHr, hasTimetable };
}

async function assignedSchools(userId: string, organizationId?: string) {
  const now = new Date();
  const assignments = await prisma.schoolRepresentativeAssignment.findMany({
    where: {
      userId,
      status: RepresentativeAssignmentStatus.ACTIVE,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(organizationId && organizationId !== 'all' ? { organizationId } : {}),
    },
    select: { organizationId: true },
  });
  const ids = assignments.map((a) => a.organizationId);
  if (!ids.length) return [];
  return prisma.organization.findMany({
    where: { id: { in: ids }, type: 'SCHOOL' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

function mapStudentRow(
  organizationId: string,
  schoolName: string,
  student: SmartAccessStudent,
  record?: AttendanceModuleRecord
): GatePersonRow {
  const morning = formatTime(record?.entryTime);
  const evening = formatTime(record?.exitTime);
  const todayStatus: GatePersonRow['todayStatus'] = morning && evening ? 'present' : morning || evening ? 'partial' : 'absent';
  return {
    id: student.id,
    organizationId,
    schoolName,
    personKind: 'student',
    personName: student.fullName,
    personCode: student.studentCode,
    classOrRole: student.className ?? null,
    source: 'Student Management',
    morningEntry: morning,
    morningGate: morning ? record?.gateName ?? 'Main gate' : null,
    eveningExit: evening,
    eveningGate: evening ? record?.gateName ?? 'Main gate' : null,
    scanMethod: record?.cardNumber ? 'RFID card' : record ? 'Manual' : null,
    todayStatus,
  };
}

function mapStaffRow(
  organizationId: string,
  schoolName: string,
  staff: SmartAccessStaff,
  record?: AttendanceModuleRecord
): GatePersonRow {
  const morning = formatTime(record?.entryTime);
  const evening = formatTime(record?.exitTime);
  const todayStatus: GatePersonRow['todayStatus'] = morning && evening ? 'present' : morning || evening ? 'partial' : 'absent';
  return {
    id: staff.id,
    organizationId,
    schoolName,
    personKind: 'staff',
    personName: staff.fullName,
    personCode: staff.employeeNumber,
    classOrRole: staff.position ?? null,
    source: staffSourceLabel(staff.source),
    morningEntry: morning,
    morningGate: morning ? record?.gateName ?? 'Staff entrance' : null,
    eveningExit: evening,
    eveningGate: evening ? record?.gateName ?? 'Staff entrance' : null,
    scanMethod: record?.cardNumber ? 'RFID card' : record ? 'Manual' : null,
    todayStatus,
  };
}

function applyShiftFilter(rows: GatePersonRow[], shift?: string) {
  if (!shift || shift === 'all') return rows;
  if (shift === 'morning_entry') {
    return rows.filter((r) => r.morningEntry);
  }
  if (shift === 'evening_exit') {
    return rows.filter((r) => r.eveningExit);
  }
  return rows;
}

function applyStatusFilter(rows: GatePersonRow[], status?: string) {
  if (!status) return rows;
  return rows.filter((r) => r.todayStatus === status);
}

export async function getRepresentativeGateAttendance(
  userId: string,
  query: {
    organizationId?: string;
    date?: string;
    personKind?: string;
    shift?: string;
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const scoped = await assignedSchools(userId, query.organizationId);

  if (query.organizationId && query.organizationId !== 'all' && !scoped.length) {
    return {
      date: query.date ?? new Date().toISOString().slice(0, 10),
      personKind: query.personKind === 'staff' ? 'staff' : 'student',
      page: 1,
      pageSize: 20,
      total: 0,
      items: [] as GatePersonRow[],
      summary: {
        studentMorning: 0,
        studentEvening: 0,
        staffMorning: 0,
        staffEvening: 0,
        totalEvents: 0,
      },
      integrationHint: undefined,
    };
  }

  const date = query.date ?? new Date().toISOString().slice(0, 10);
  const personKind = query.personKind === 'staff' ? 'staff' : 'student';
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, query.pageSize ?? 20));
  const search = query.search?.trim().toLowerCase();

  const schoolModuleNotes: { schoolName: string; detail: string }[] = [];
  const allRows: GatePersonRow[] = [];

  for (const school of scoped) {
    const orgId = school.id;
    const attendanceAccess = await resolveModuleForOrg(orgId, 'attendance');
    const hasAttendance = attendanceAccess.canUse;

    const records =
      hasAttendance || personKind === 'student'
        ? await listAttendanceRecordsSafe(orgId, { date, q: query.search })
        : [];
    const studentRecords = records.filter((r) => !isStaffRecord(r));
    const staffRecords = records.filter((r) => isStaffRecord(r));
    const studentByCode = indexRecordsByCode(studentRecords);
    const staffByCode = indexRecordsByCode(staffRecords);

    if (personKind === 'student') {
      const { rows: students, access: smAccess } = await fetchStudentsForOrg(orgId, query.search);
      if (!smAccess.ok) {
        schoolModuleNotes.push({ schoolName: school.name, detail: smAccess.reason });
      }

      for (const st of students) {
        const codeKey = st.studentCode.trim().toLowerCase();
        const idKey = st.id.trim().toLowerCase();
        const record = studentByCode.get(codeKey) ?? studentByCode.get(idKey);
        const row = mapStudentRow(orgId, school.name, st, record);
        if (search) {
          const hay = `${row.personName} ${row.personCode} ${row.classOrRole ?? ''} ${row.schoolName}`.toLowerCase();
          if (!hay.includes(search)) continue;
        }
        allRows.push(row);
      }

      if (!students.length && studentRecords.length) {
        for (const record of studentRecords) {
          allRows.push({
            id: record.id,
            organizationId: orgId,
            schoolName: school.name,
            personKind: 'student',
            personName: record.studentName,
            personCode: record.studentCode ?? '—',
            classOrRole: record.className,
            source: 'Attendance',
            morningEntry: formatTime(record.entryTime),
            morningGate: record.gateName,
            eveningExit: formatTime(record.exitTime),
            eveningGate: record.gateName,
            scanMethod: record.cardNumber ? 'RFID card' : 'Manual',
            todayStatus: record.entryTime ? (record.exitTime ? 'present' : 'partial') : 'absent',
          });
        }
      }
    } else {
      const { staff: staffList } = await listStaffForOrg(orgId, query.search);
      for (const st of staffList) {
        const codeKey = st.employeeNumber.trim().toLowerCase();
        const idKey = st.id.trim().toLowerCase();
        const record = staffByCode.get(codeKey) ?? staffByCode.get(idKey);
        const row = mapStaffRow(orgId, school.name, st, record);
        if (search) {
          const hay = `${row.personName} ${row.personCode} ${row.classOrRole ?? ''} ${row.schoolName} ${row.source ?? ''}`.toLowerCase();
          if (!hay.includes(search)) continue;
        }
        allRows.push(row);
      }
    }
  }

  allRows.sort((a, b) => a.personName.localeCompare(b.personName));

  let filtered = applyShiftFilter(allRows, query.shift);
  filtered = applyStatusFilter(filtered, query.status);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  const summary = {
    studentMorning: allRows.filter((r) => r.personKind === 'student' && r.morningEntry).length,
    studentEvening: allRows.filter((r) => r.personKind === 'student' && r.eveningExit).length,
    staffMorning: allRows.filter((r) => r.personKind === 'staff' && r.morningEntry).length,
    staffEvening: allRows.filter((r) => r.personKind === 'staff' && r.eveningExit).length,
    totalEvents:
      allRows.filter((r) => r.morningEntry).length + allRows.filter((r) => r.eveningExit).length,
  };

  const integrationHint =
    schoolModuleNotes.length > 0 && personKind === 'student'
      ? {
          title: 'Student Management',
          message:
            total === 0
              ? 'No students loaded for your filter. Check license and API status per school below (PENDING activation, missing Module Catalog assignment, or server URL/key).'
              : 'Some assigned schools could not reach Student Management; others may still show in the list.',
          schools: schoolModuleNotes,
        }
      : undefined;

  return {
    date,
    personKind,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items,
    summary,
    integrationHint,
  };
}
