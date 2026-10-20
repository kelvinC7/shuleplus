import { env } from '../config/env';
import { prisma } from '../config/database';
import { resolveLocalModuleBackendUrl } from '../config/local-module-urls';

export type StaffFanoutInput = {
  organizationId: string;
  iamUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  position?: string | null;
  department?: string | null;
  employeeId?: string | null;
  avatarUrl?: string | null;
  moduleSlugs: string[];
};

function isTeacherAssignment(input: StaffFanoutInput) {
  return (
    input.moduleSlugs.includes('teacher-portal') || /^teacher$/i.test((input.position ?? '').trim())
  );
}

function joinModuleApi(base: string, path: string) {
  let b = base.replace(/\/$/, '');
  if (b.endsWith('/api')) b = b.slice(0, -4);
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p.startsWith('/api') ? p : `/api${p}`}`;
}

async function resolveModuleBase(slug: string): Promise<string | null> {
  const row = await prisma.platformModule.findFirst({
    where: { slug },
    select: { slug: true, backendUrl: true },
  });
  return resolveLocalModuleBackendUrl(slug, row?.backendUrl, env.NODE_ENV);
}

async function postJson(url: string, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.MODULE_PROVISIONING_KEY,
        'x-source-service': 'IAM',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[IAM staff-fanout] ${res.status} ${url} ${text.slice(0, 180)}`);
    }
  } catch (err) {
    console.warn(`[IAM staff-fanout] skipped ${url}`, err instanceof Error ? err.message : err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * After Users & Access create/assign: push the person into Kazi + HR,
 * and into Timetable when Teacher Portal is assigned (TichaPortal login).
 */
export async function fanOutStaffFromIamUser(input: StaffFanoutInput): Promise<void> {
  const fullName = `${input.firstName} ${input.lastName}`.trim() || input.email;
  const payload = {
    organizationId: input.organizationId,
    iamUserId: input.iamUserId,
    fullName,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone ?? null,
    position: input.position ?? (isTeacherAssignment(input) ? 'Teacher' : 'Staff'),
    department: input.department ?? (isTeacherAssignment(input) ? 'Teaching' : 'Organization'),
    employeeNumber: input.employeeId ?? null,
    photoUrl: input.avatarUrl ?? null,
    teacherName: fullName,
  };

  const [kaziBase, hrBase, timetableBase] = await Promise.all([
    resolveModuleBase('kaziavance'),
    resolveModuleBase('hr'),
    resolveModuleBase('timetable'),
  ]);

  const jobs: Promise<void>[] = [];

  if (kaziBase) {
    jobs.push(postJson(joinModuleApi(kaziBase, '/api/internal/employees/from-iam'), payload));
  }
  if (hrBase) {
    jobs.push(postJson(joinModuleApi(hrBase, '/api/internal/staff/from-iam'), payload));
  }
  if (timetableBase && isTeacherAssignment(input)) {
    jobs.push(postJson(joinModuleApi(timetableBase, '/api/internal/teacher-profiles/from-iam'), payload));
  }

  await Promise.allSettled(jobs);
}

export function queueStaffFanout(input: StaffFanoutInput) {
  void fanOutStaffFromIamUser(input).catch((err) => {
    console.warn('[IAM staff-fanout] failed', err instanceof Error ? err.message : err);
  });
}
