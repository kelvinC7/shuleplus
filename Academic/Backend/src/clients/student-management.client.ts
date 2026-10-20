import { env } from '../config/env';

const SM_BASE = env.STUDENT_MANAGEMENT_API_URL;
const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

function browserSmOrigin(): string {
  const configured = env.STUDENT_MANAGEMENT_PUBLIC_URL.replace(/\/$/, '');
  if (configured) return configured;
  if (env.NODE_ENV === 'production') return 'https://studentmanagement-api.shuleplus.rw';
  return SM_BASE.replace(/\/api\/?$/i, '') || 'http://localhost:3052';
}

/** Absolute URL for student photos returned to browsers (report cards, PDF). */
export function resolveSmAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let trimmed = url.trim();
  if (LOCAL_HOST.test(trimmed)) {
    trimmed = trimmed.replace(LOCAL_HOST, browserSmOrigin());
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const origin = browserSmOrigin();
  const uploadsIdx = trimmed.indexOf('/uploads/');
  if (uploadsIdx >= 0) return `${origin}${trimmed.slice(uploadsIdx)}`;
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

async function smFetch(path: string, params?: Record<string, string>) {
  const url = new URL(`${SM_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'academic',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`StudentManagement ${res.status}: ${body}`);
  }
  const json: any = await res.json();
  return json.data ?? json;
}

export async function smListClasses(organizationId: string) {
  return smFetch('/service/classes', { organizationId });
}

export async function smListStudents(
  organizationId: string,
  params?: { classId?: string; className?: string; academicYear?: string; status?: string; search?: string }
) {
  return smFetch('/service/students', { organizationId, ...params });
}

export async function smListSubjects(organizationId: string) {
  return smFetch('/service/subjects', { organizationId });
}

export async function smGetStudentProfile(organizationId: string, studentCode: string) {
  return smFetch('/service/student-profile', { organizationId, studentCode });
}

export async function smGetStudentAcademics(organizationId: string, studentCode: string) {
  return smFetch('/service/academics', { organizationId, studentCode });
}

export async function smUpdateStudentStatus(
  organizationId: string,
  studentId: string,
  status: string
) {
  const url = new URL(`${SM_BASE}/service/students/${encodeURIComponent(studentId)}/status`);
  url.searchParams.set('organizationId', organizationId);
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'academic',
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`StudentManagement ${res.status}: ${body}`);
  }
  const json: any = await res.json();
  return json.data ?? json;
}
