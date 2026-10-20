import { parseSchoolCodeNumeric } from './student-code';

export function courseCodeFromSubject(subject: { code?: string | null; name?: string | null }): string {
  const raw = (subject.code || subject.name || 'GEN').trim().toUpperCase();
  const cleaned = raw.replace(/[^A-Z0-9]/g, '');
  return (cleaned.slice(0, 4) || 'GEN').padEnd(3, 'X').slice(0, 4);
}

export function buildAssessmentCode(input: {
  schoolCode?: string | null;
  subject: { code?: string | null; name?: string | null };
  sequence: number;
}): string {
  const school = parseSchoolCodeNumeric(input.schoolCode ?? '001');
  const course = courseCodeFromSubject(input.subject);
  const seq = String(Math.max(1, input.sequence)).padStart(2, '0');
  return `${school}${course}${seq}`;
}

export function buildAssessmentTitle(subjectName: string, sequence: number): string {
  const seq = String(Math.max(1, sequence)).padStart(2, '0');
  return `${subjectName.trim()} · Assessment ${seq}`;
}
