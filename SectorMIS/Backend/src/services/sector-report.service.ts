import type { SectorSchool } from './sector-school.types';

export function buildDailyReportText(input: {
  sector: string;
  date: string;
  schools: SectorSchool[];
  totals: Record<string, number | string>;
  observations: string[];
}) {
  const lines = [
    'SHULE+ SECTOR ATTENDANCE REPORT',
    `Date: ${input.date}`,
    `Sector: ${input.sector}`,
    `Schools: ${input.totals.totalSchools ?? input.totals.schools}`,
    `Students: ${input.totals.totalStudents ?? input.totals.students}`,
    `Student attendance: ${input.totals.attendancePercentage ?? input.totals.studentAttendancePct}%`,
    `Staff attendance: ${input.totals.staffAttendancePercentage ?? input.totals.staffAttendancePct}%`,
    `Morning compliant: ${input.schools.filter((s) => s.morningCompliant).length}/${input.schools.length}`,
    '',
    'Observations:',
    ...input.observations.map((o) => `- ${o}`),
    '',
    'Schools:',
    ...input.schools.map(
      (s) =>
        `${s.name} | ${s.onboarding} | students ${s.studentAttendancePct}% | compliant ${s.morningCompliant ? 'yes' : 'no'}`
    ),
  ];
  return lines.join('\n');
}

/** Minimal PDF (PDF 1.4 single page text stream) without external deps. */
export function buildDailyReportPdf(text: string): Buffer {
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const lines = escaped.split('\n').slice(0, 55);
  let y = 780;
  const contentLines = ['BT', '/F1 10 Tf'];
  for (const line of lines) {
    contentLines.push(`1 0 0 1 40 ${y} Tm (${line.slice(0, 90)}) Tj`);
    y -= 14;
  }
  contentLines.push('ET');
  const stream = contentLines.join('\n');
  const streamLen = Buffer.byteLength(stream, 'utf8');

  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj',
    `4 0 obj<< /Length ${streamLen} >>stream\n${stream}\nendstream\nendobj`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}
