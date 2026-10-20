import { fetchHrTeachers, fetchIamTeachingStaff } from '../clients/hr.client';
import { prisma } from '../config/database';

export type LibraryTeacher = {
  id: string;
  name: string;
  department: string | null;
  source: 'iam' | 'hr' | 'library';
  email?: string | null;
  employeeNumber?: string | null;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? '';
}

export async function resolveLibraryTeachers(
  organizationId: string,
  search?: string,
): Promise<LibraryTeacher[]> {
  const q = search?.trim() ?? '';
  const [iamRows, hrRows] = await Promise.all([
    fetchIamTeachingStaff(organizationId, q.length >= 2 ? q : undefined),
    fetchHrTeachers(organizationId, q.length >= 2 ? q : undefined),
  ]);

  const byKey = new Map<string, LibraryTeacher>();
  const emails = new Set<string>();

  for (const row of iamRows) {
    const email = normalizeEmail(row.email);
    if (email) emails.add(email);
    byKey.set(`iam:${row.id}`, {
      id: row.id,
      name: row.name,
      department: row.department,
      source: 'iam',
      email: row.email,
      employeeNumber: row.employeeId,
    });
  }

  for (const row of hrRows) {
    const email = normalizeEmail(row.email);
    if (email && emails.has(email)) continue;
    if (byKey.has(`hr:${row.id}`)) continue;
    byKey.set(`hr:${row.id}`, {
      id: row.id,
      name: row.fullName,
      department: row.department ?? row.position ?? null,
      source: 'hr',
      email: row.email,
      employeeNumber: row.employeeNumber,
    });
  }

  let teachers = Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));

  if (q.length >= 2) {
    const needle = q.toLowerCase();
    teachers = teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.id.toLowerCase().includes(needle) ||
        t.email?.toLowerCase().includes(needle) ||
        t.employeeNumber?.toLowerCase().includes(needle) ||
        t.department?.toLowerCase().includes(needle),
    );
  }

  return teachers.slice(0, 30);
}

export async function mergeLoanHistoryTeachers(
  organizationId: string,
  base: LibraryTeacher[],
): Promise<LibraryTeacher[]> {
  const loans = await prisma.loan.findMany({
    where: { organizationId, borrowerType: 'TEACHER' },
    select: { borrowerId: true, borrowerName: true, borrowerClass: true },
    distinct: ['borrowerId'],
    take: 50,
  });

  const map = new Map(base.map((t) => [t.id, t]));
  for (const loan of loans) {
    if (map.has(loan.borrowerId)) continue;
    map.set(loan.borrowerId, {
      id: loan.borrowerId,
      name: loan.borrowerName,
      department: loan.borrowerClass ?? null,
      source: 'library',
    });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
