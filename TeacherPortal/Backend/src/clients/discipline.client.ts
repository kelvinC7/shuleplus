import { env } from '../config/env';

export type DisciplineCaseRecord = {
  id: string;
  caseNumber: string;
  studentId?: string | null;
  studentCode?: string | null;
  studentName: string;
  className: string;
  category: string;
  severity: string;
  status: string;
  incidentDate: string;
  description?: string | null;
};

type ApiPayload<T> = { success?: boolean; data?: T };

function baseUrl() {
  return env.STUDENT_DISCIPLINE_API_URL.replace(/\/$/, '');
}

type ServiceFetchResult<T> = { data: T; available: boolean };

async function disciplineGet<T>(
  path: string,
  organizationId: string,
  query?: Record<string, string | undefined>
): Promise<ServiceFetchResult<T>> {
  const qs = new URLSearchParams({ organizationId });
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) qs.set(k, v);
    }
  }
  try {
    const response = await fetch(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}?${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'teacher-portal',
      },
    });
    if (!response.ok) {
      return { data: [] as T, available: false };
    }
    const body = (await response.json()) as ApiPayload<T>;
    return { data: (Array.isArray(body.data) ? body.data : []) as T, available: true };
  } catch {
    return { data: [] as T, available: false };
  }
}

export async function fetchClassDisciplineCases(
  organizationId: string,
  opts: { className: string; status?: string; search?: string }
): Promise<{ cases: DisciplineCaseRecord[]; serviceAvailable: boolean }> {
  const { data: rows, available } = await disciplineGet<Array<Record<string, unknown>>>(
    '/service/discipline/cases',
    organizationId,
    {
      className: opts.className,
      status: opts.status,
      search: opts.search,
    }
  );

  const cases = rows.map((r) => ({
    id: String(r.id ?? ''),
    caseNumber: String(r.caseNumber ?? ''),
    studentId: (r.studentId as string | null) ?? null,
    studentCode: (r.studentCode as string | null) ?? null,
    studentName: String(r.studentName ?? ''),
    className: String(r.className ?? ''),
    category: String(r.category ?? 'Conduct'),
    severity: String(r.severity ?? 'Medium'),
    status: String(r.status ?? 'Open'),
    incidentDate: r.incidentDate ? new Date(String(r.incidentDate)).toISOString().slice(0, 10) : '',
    description: (r.description as string | null) ?? null,
  }));

  return { cases, serviceAvailable: available };
}
