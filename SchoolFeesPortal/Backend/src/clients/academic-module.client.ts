import { env } from '../config/env';

export type AcademicReportPublication = {
  id: string;
  studentId: string;
  classId: string;
  className: string | null;
  studentName: string | null;
  studentCode: string | null;
  academicYear: string;
  term: string;
  publishedAt: string;
};

export async function fetchAcademicReportPublications(
  organizationId: string,
  query: { academicYear?: string; term?: string; className?: string; search?: string }
): Promise<AcademicReportPublication[]> {
  const base = String(env.ACADEMIC_API_URL || '').replace(/\/$/, '');
  if (!base) return [];
  const prefix = base.includes('/api') ? base : `${base}/api`;
  const params = new URLSearchParams({ organizationId });
  if (query.academicYear) params.set('academicYear', query.academicYear);
  if (query.term) params.set('term', query.term);
  if (query.className) params.set('className', query.className);
  if (query.search) params.set('search', query.search);
  const res = await fetch(`${prefix}/service/report-card/publications?${params}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': env.SERVICE_API_KEY,
      'x-source-service': 'school-fees',
      'x-organization-id': organizationId,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: AcademicReportPublication[]; success?: boolean };
  const rows = json.data ?? (Array.isArray(json) ? json : []);
  return Array.isArray(rows) ? rows : [];
}
