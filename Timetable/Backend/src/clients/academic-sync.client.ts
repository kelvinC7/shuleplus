import { env } from '../config/env';

/** Push optional per-class course default marks into Academic (report normalization). */
export async function syncCourseDefaultMarksToAcademic(
  organizationId: string,
  input: {
    className: string;
    subjectName: string;
    academicYear: string;
    term: string;
    defaultCourseMarks: number | null;
  }
) {
  if (input.defaultCourseMarks == null || !Number.isFinite(input.defaultCourseMarks)) return;

  const base = String(env.ACADEMIC_API_URL || '').replace(/\/$/, '');
  if (!base) return;

  const prefix = base.includes('/api') ? base : `${base}/api`;
  const url = `${prefix}/service/course-default-marks?organizationId=${encodeURIComponent(organizationId)}`;
  try {
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'timetable',
        'x-organization-id': organizationId,
      },
      body: JSON.stringify({
        className: input.className,
        subjectName: input.subjectName,
        academicYear: input.academicYear,
        term: input.term,
        defaultCourseMarks: input.defaultCourseMarks,
      }),
    });
  } catch (e) {
    console.warn('[timetable] Academic default marks sync failed:', e instanceof Error ? e.message : e);
  }
}
