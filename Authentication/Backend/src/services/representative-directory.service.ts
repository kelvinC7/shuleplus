import { prisma } from '../config/database';
import { listAttendanceRecordsSafe } from '../clients/attendance-module.client';
import { smartAccessModuleClient } from '../clients/smart-access-module.client';
import { listIamUsersForSmartAccess } from './smart-access-iam-users.service';
import { mergeStaffLists, staffSourceLabel } from './smart-access-staff-merge';
import { RepresentativeAssignmentStatus } from '../generated/prisma';

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

function attendanceStatusFromRecord(
  code: string,
  records: Awaited<ReturnType<typeof listAttendanceRecordsSafe>>
): 'present' | 'late' | 'absent' {
  const key = code.trim().toLowerCase();
  const record = records.find(
    (r) =>
      (r.studentCode?.trim().toLowerCase() === key || r.studentId?.trim().toLowerCase() === key) &&
      r.entryTime
  );
  if (!record?.entryTime) return 'absent';
  const hour = new Date(record.entryTime).getHours();
  return hour >= 8 ? 'late' : 'present';
}

export async function getRepresentativeStudentsDirectory(
  userId: string,
  query?: { organizationId?: string; search?: string; className?: string; status?: string }
) {
  const schools = await assignedSchools(userId, query?.organizationId);
  const search = query?.search?.trim().toLowerCase();
  const classFilter = query?.className?.trim();
  const statusFilter = query?.status?.trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  const rows: Array<{
    id: string;
    organizationId: string;
    schoolName: string;
    studentCode: string;
    fullName: string;
    className: string | null;
    attendanceToday: string;
    attendanceRate: number;
  }> = [];

  for (const school of schools) {
    let students: Awaited<ReturnType<typeof smartAccessModuleClient.listStudents>> = [];
    try {
      students = await smartAccessModuleClient.listStudents(school.id, { search: query?.search });
    } catch {
      students = [];
    }
    const records = await listAttendanceRecordsSafe(school.id, { date: today });

    for (const st of students) {
      const attendanceToday = attendanceStatusFromRecord(st.studentCode || st.id, records);
      const row = {
        id: st.id,
        organizationId: school.id,
        schoolName: school.name,
        studentCode: st.studentCode,
        fullName: st.fullName,
        className: st.className ?? null,
        attendanceToday,
        attendanceRate: attendanceToday === 'absent' ? 0 : attendanceToday === 'late' ? 92 : 98,
      };
      if (classFilter && row.className !== classFilter) continue;
      if (statusFilter && row.attendanceToday !== statusFilter) continue;
      if (search) {
        const hay = `${row.fullName} ${row.studentCode} ${row.className ?? ''} ${row.schoolName}`.toLowerCase();
        if (!hay.includes(search)) continue;
      }
      rows.push(row);
    }
  }

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return rows;
}

export async function getRepresentativeStaffDirectory(
  userId: string,
  query?: { organizationId?: string; search?: string; department?: string; status?: string }
) {
  const schools = await assignedSchools(userId, query?.organizationId);
  const search = query?.search?.trim().toLowerCase();
  const deptFilter = query?.department?.trim();
  const statusFilter = query?.status?.trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  const rows: Array<{
    id: string;
    organizationId: string;
    schoolName: string;
    employeeCode: string;
    fullName: string;
    department: string;
    role: string;
    attendanceToday: string;
    attendanceRate: number;
  }> = [];

  for (const school of schools) {
    const hasHr = await prisma.organizationModule.findFirst({
      where: {
        organizationId: school.id,
        status: 'ACTIVE',
        module: { slug: 'hr' },
      },
    });
    const hasTimetable = await prisma.organizationModule.findFirst({
      where: {
        organizationId: school.id,
        status: 'ACTIVE',
        module: { slug: 'timetable' },
      },
    });

    const [hrRows, iamRows, timetableRows] = await Promise.all([
      hasHr ? smartAccessModuleClient.listStaffFromHr(school.id, { search: query?.search }) : Promise.resolve([]),
      listIamUsersForSmartAccess(school.id, { search: query?.search }),
      hasTimetable
        ? smartAccessModuleClient.listStaffFromTimetable(school.id, { search: query?.search })
        : Promise.resolve([]),
    ]);
    const staffList = mergeStaffLists(hrRows, iamRows, timetableRows, query?.search);
    const records = await listAttendanceRecordsSafe(school.id, { date: today });
    const staffRecords = records.filter((r) => r.notes?.includes('owner:staff'));

    for (const st of staffList) {
      const code = st.employeeNumber || st.id;
      const attendanceToday = attendanceStatusFromRecord(code, staffRecords);
      const department = staffSourceLabel(st.source);
      const row = {
        id: st.id,
        organizationId: school.id,
        schoolName: school.name,
        employeeCode: st.employeeNumber,
        fullName: st.fullName,
        department,
        role: st.position ?? 'Staff',
        attendanceToday,
        attendanceRate: attendanceToday === 'absent' ? 0 : 94,
      };
      if (deptFilter && row.department !== deptFilter) continue;
      if (statusFilter && row.attendanceToday !== statusFilter) continue;
      if (search) {
        const hay = `${row.fullName} ${row.employeeCode} ${row.department} ${row.role}`.toLowerCase();
        if (!hay.includes(search)) continue;
      }
      rows.push(row);
    }
  }

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  return rows;
}
