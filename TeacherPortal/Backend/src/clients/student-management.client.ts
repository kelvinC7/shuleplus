import { env } from '../config/env';

export type SmClass = {
  id: string;
  name: string;
  stream?: string | null;
  label: string;
  grade?: { name?: string | null } | null;
  headTeacherUserId?: string | null;
  headTeacherName?: string | null;
  headTeacherEmail?: string | null;
  headTeacherSource?: string | null;
};

export type SmStudent = {
  id: string;
  studentCode: string;
  fullName: string;
  gender?: string | null;
  photoUrl?: string | null;
  className?: string | null;
  stream?: string | null;
  rollNumber?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
};

type ApiList<T> = { success?: boolean; data?: T[]; meta?: Record<string, unknown> };

function baseUrl() {
  return env.STUDENT_MANAGEMENT_API_URL.replace(/\/$/, '');
}

async function smGet<T>(path: string, organizationId: string, query?: Record<string, string | undefined>) {
  const qs = new URLSearchParams({ organizationId });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'teacher-portal',
      },
    });
  } catch {
    throw new Error('Student Management service is unavailable');
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Student Management API ${response.status}: ${text || response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function fetchSmClasses(
  organizationId: string,
  opts?: { headTeacherUserId?: string; headTeacherUserIds?: string[]; headTeacherEmail?: string }
): Promise<SmClass[]> {
  const body = await smGet<ApiList<SmClass>>('/service/classes', organizationId, {
    headTeacherUserId: opts?.headTeacherUserId,
    headTeacherUserIds: opts?.headTeacherUserIds?.join(','),
    headTeacherEmail: opts?.headTeacherEmail,
  });
  return Array.isArray(body.data) ? body.data : [];
}

export async function fetchSmStudents(
  organizationId: string,
  opts: { classId?: string; className?: string; academicYear?: string }
): Promise<{ students: SmStudent[]; meta?: Record<string, unknown> }> {
  const body = await smGet<ApiList<SmStudent>>('/service/students', organizationId, {
    classId: opts.classId,
    className: opts.className,
    academicYear: opts.academicYear,
    status: 'ACTIVE',
  });
  return { students: Array.isArray(body.data) ? body.data : [], meta: body.meta };
}

export async function fetchSmStudentsForClass(
  organizationId: string,
  classId: string,
  className: string,
  academicYear?: string
) {
  const attempts = [
    { classId, academicYear },
    { classId },
    { className, academicYear },
    { className },
  ];
  for (const q of attempts) {
    try {
      const { students, meta } = await fetchSmStudents(organizationId, q);
      if (students.length > 0) return { students, meta };
    } catch {
      // try next
    }
  }
  return { students: [] as SmStudent[], meta: { matched: false } };
}
